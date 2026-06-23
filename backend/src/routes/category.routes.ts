import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all categories (with hierarchy)
router.get('/', authenticate, requirePermission(PERMISSIONS.CATEGORIES_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const flat = req.query.flat === 'true';

    if (flat) {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { items: true } } }
      });
      return res.json({ success: true, data: categories });
    }

    // Get root categories with nested children
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: { children: true }
            }
          }
        },
        _count: { select: { items: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Get category path (breadcrumb) - must come before /:id
router.get(
  '/:id/path',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const path: { id: string; name: string }[] = [];
      let currentId: string | null = req.params.id as string;

      while (currentId) {
        const category = await prisma.category.findUnique({
          where: { id: currentId },
          select: { id: true, name: true, parentId: true }
        });

        if (!category) break;

        path.unshift({ id: category.id, name: category.name });
        currentId = category.parentId;
      }

      if (path.length === 0) {
        throw new AppError('Category not found', 404);
      }

      res.json({ success: true, data: path });
    } catch (error) {
      next(error);
    }
  }
);

// Get single category
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true,
          attributeTemplates: true,
          _count: { select: { items: true } }
        }
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
);

// Create category
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
    body('icon').optional().trim(),
    body('iconSize').optional().isIn(['small', 'medium', 'large']),
    body('iconColor').optional().matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/),
    body('iconBackgroundColor').optional().matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/),
    body('parentId').optional().isUUID()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, description, icon, iconSize, iconColor, iconBackgroundColor, parentId } = req.body;

      if (parentId) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw new AppError('Parent category not found', 404);
        }
      }

      const category = await prisma.category.create({
        data: { name, description, icon, iconSize: iconSize || 'medium', iconColor, iconBackgroundColor, parentId },
        include: { parent: true }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'category',
        entityId: category.id,
        entityName: category.name,
        req,
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
);

// Update category
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  param('id').isUUID(),
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
    body('icon').optional({ nullable: true }).trim(),
    body('iconSize').optional().isIn(['small', 'medium', 'large']),
    body('iconColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/),
    body('iconBackgroundColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/),
    body('parentId').optional({ nullable: true })
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { name, description, icon, iconSize, iconColor, iconBackgroundColor, parentId } = req.body;

      const existingCategory = await prisma.category.findUnique({ where: { id } });
      if (!existingCategory) {
        throw new AppError('Category not found', 404);
      }

      // Prevent circular reference
      if (parentId === id) {
        throw new AppError('Category cannot be its own parent', 400);
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(icon !== undefined && { icon }),
          ...(iconSize !== undefined && { iconSize }),
          ...(iconColor !== undefined && { iconColor }),
          ...(iconBackgroundColor !== undefined && { iconBackgroundColor }),
          ...(parentId !== undefined && { parentId })
        },
        include: { parent: true }
      });

      // Audit log with changes
      const changes = getChanges(existingCategory, category, ['name', 'description', 'icon', 'iconSize', 'iconColor', 'iconBackgroundColor', 'parentId']);
      if (changes) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'category',
          entityId: category.id,
          entityName: category.name,
          changes,
          req,
        });
      }

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
);

// Delete category
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;

      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Check if category has items
      const itemCount = await prisma.item.count({ where: { categoryId: id } });
      if (itemCount > 0) {
        throw new AppError('Cannot delete category with items', 400);
      }

      // Check if category has children
      const childCount = await prisma.category.count({ where: { parentId: id } });
      if (childCount > 0) {
        throw new AppError('Cannot delete category with subcategories', 400);
      }

      await prisma.category.delete({ where: { id } });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'category',
        entityId: category.id,
        entityName: category.name,
        req,
      });

      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Attribute Templates
router.get(
  '/:id/attributes',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const templates = await prisma.attributeTemplate.findMany({
        where: { categoryId: id },
        orderBy: { attributeName: 'asc' }
      });

      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/attributes',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  param('id').isUUID(),
  [
    body('attributeName').trim().isLength({ min: 1, max: 100 }),
    body('attributeType').optional().isIn(['text', 'number', 'select', 'boolean', 'date']),
    body('options').optional().isArray(),
    body('isRequired').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { attributeName, attributeType, options, isRequired } = req.body;

      const template = await prisma.attributeTemplate.create({
        data: {
          categoryId: id,
          attributeName,
          attributeType: attributeType || 'text',
          options: options ? JSON.stringify(options) : null,
          isRequired: isRequired || false
        }
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:categoryId/attributes/:attributeId',
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  [param('categoryId').isUUID(), param('attributeId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const attributeId = req.params.attributeId as string;
      await prisma.attributeTemplate.delete({
        where: { id: attributeId }
      });

      res.json({ success: true, message: 'Attribute template deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

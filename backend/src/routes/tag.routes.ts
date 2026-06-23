import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all tags
router.get('/', authenticate, requirePermission(PERMISSIONS.TAGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } }
    });

    res.json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
});

// Get single tag
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TAGS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: { _count: { select: { items: true } } }
      });

      if (!tag) {
        throw new AppError('Tag not found', 404);
      }

      res.json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }
);

// Create tag
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TAGS_CREATE),
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6,8}$/), // Support RGBA hex
    body('icon').optional().trim(),
    body('iconSize').optional().isIn(['small', 'medium', 'large']),
    body('iconColor').optional().matches(/^#[0-9A-Fa-f]{6,8}$/),
    body('iconBackgroundColor').optional().matches(/^#[0-9A-Fa-f]{6,8}$/)
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, color, icon, iconSize, iconColor, iconBackgroundColor } = req.body;

      const existing = await prisma.tag.findUnique({ where: { name } });
      if (existing) {
        throw new AppError('Tag already exists', 400);
      }

      const tag = await prisma.tag.create({
        data: {
          name,
          color: color || '#6B7280',
          icon,
          iconSize: iconSize || 'medium',
          iconColor,
          iconBackgroundColor
        }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'tag',
        entityId: tag.id,
        entityName: tag.name,
        req,
      });

      res.status(201).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }
);

// Update tag
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TAGS_UPDATE),
  param('id').isUUID(),
  [
    body('name').optional().trim().isLength({ min: 1, max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6,8}$/), // Support RGBA hex
    body('icon').optional({ nullable: true }).trim(),
    body('iconSize').optional().isIn(['small', 'medium', 'large']),
    body('iconColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/),
    body('iconBackgroundColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/)
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { name, color, icon, iconSize, iconColor, iconBackgroundColor } = req.body;

      const existingTag = await prisma.tag.findUnique({ where: { id } });
      if (!existingTag) {
        throw new AppError('Tag not found', 404);
      }

      if (name) {
        const existing = await prisma.tag.findFirst({
          where: { name, NOT: { id } }
        });
        if (existing) {
          throw new AppError('Tag name already exists', 400);
        }
      }

      const tag = await prisma.tag.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(color && { color }),
          ...(icon !== undefined && { icon }),
          ...(iconSize !== undefined && { iconSize }),
          ...(iconColor !== undefined && { iconColor }),
          ...(iconBackgroundColor !== undefined && { iconBackgroundColor })
        }
      });

      // Audit log with changes
      const changes = getChanges(existingTag, tag, ['name', 'color', 'icon', 'iconSize', 'iconColor', 'iconBackgroundColor']);
      if (changes) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'tag',
          entityId: tag.id,
          entityName: tag.name,
          changes,
          req,
        });
      }

      res.json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }
);

// Delete tag
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TAGS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: { _count: { select: { items: true } } }
      });
      if (!tag) {
        throw new AppError('Tag not found', 404);
      }

      // Prevent deletion if tag is assigned to any items
      if ((tag as any)._count.items > 0) {
        throw new AppError(
          `Cannot delete tag "${tag.name}" because it is assigned to ${(tag as any)._count.items} item(s). Remove the tag from all items first.`,
          400
        );
      }

      await prisma.tag.delete({ where: { id } });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'tag',
        entityId: tag.id,
        entityName: tag.name,
        req,
      });

      res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog } from '../services/audit.service.js';
import { sanitizeSvg } from '../utils/sanitizeSvg.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all custom icons
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const icons = await prisma.customIcon.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true }
          }
        }
      });

      res.json({ success: true, data: icons });
    } catch (error) {
      next(error);
    }
  }
);

// Get icon usage (where is this icon being used)
router.get(
  '/:name/usage',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const iconName = decodeURIComponent(req.params.name as string);

      const [categories, tags, templates] = await Promise.all([
        prisma.category.findMany({
          where: { icon: iconName },
          select: { id: true, name: true }
        }),
        prisma.tag.findMany({
          where: { icon: iconName },
          select: { id: true, name: true }
        }),
        prisma.itemTemplate.findMany({
          where: { icon: iconName },
          select: { id: true, name: true }
        })
      ]);

      const totalUsage = categories.length + tags.length + templates.length;

      res.json({
        success: true,
        data: {
          iconName,
          totalUsage,
          usage: {
            categories,
            tags,
            templates
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Search external icons via Iconify API
router.get(
  '/search/external',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_READ),
  query('q').trim().isLength({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 999 }),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const searchQuery = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 64;

      // Call Iconify API
      const response = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}`
      );

      if (!response.ok) {
        throw new AppError('Failed to search icons', 502);
      }

      const data = await response.json() as { icons?: string[]; total?: number };

      // Iconify API returns { icons: string[], total: number, ... }
      res.json({
        success: true,
        data: {
          icons: data.icons || [],
          total: data.total || 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get SVG data for an icon from Iconify (for importing)
router.get(
  '/fetch/:prefix/:name',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_CREATE),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const prefix = req.params.prefix as string;
      const name = req.params.name as string;
      const iconName = `${prefix}:${name}`;

      // Fetch SVG from Iconify
      const response = await fetch(`https://api.iconify.design/${prefix}/${name}.svg`);

      if (!response.ok) {
        throw new AppError('Icon not found', 404);
      }

      const svgData = sanitizeSvg(await response.text());

      res.json({
        success: true,
        data: {
          name: iconName,
          prefix,
          svgData
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Import (add) a custom icon
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_CREATE),
  [
    body('name').trim().isLength({ min: 1 }).matches(/^[a-z0-9-]+:[a-z0-9-]+$/i),
    body('svgData').trim().isLength({ min: 1 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, svgData: rawSvgData } = req.body;
      const svgData = sanitizeSvg(rawSvgData);
      const prefix = name.split(':')[0];

      // Check if icon already exists
      const existing = await prisma.customIcon.findUnique({ where: { name } });
      if (existing) {
        throw new AppError('Icon already imported', 400);
      }

      const icon = await prisma.customIcon.create({
        data: {
          name,
          prefix,
          svgData,
          createdById: req.user!.id
        },
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true, lastName: true }
          }
        }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'icon',
        entityId: icon.id,
        entityName: icon.name,
        req,
      });

      res.status(201).json({ success: true, data: icon });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a custom icon
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const icon = await prisma.customIcon.findUnique({
        where: { id }
      });

      if (!icon) {
        throw new AppError('Icon not found', 404);
      }

      // Check if icon is being used anywhere
      const [categoryCount, tagCount, templateCount] = await Promise.all([
        prisma.category.count({ where: { icon: icon.name } }),
        prisma.tag.count({ where: { icon: icon.name } }),
        prisma.itemTemplate.count({ where: { icon: icon.name } })
      ]);

      const totalUsage = categoryCount + tagCount + templateCount;

      if (totalUsage > 0) {
        const usageDetails = [];
        if (categoryCount > 0) usageDetails.push(`${categoryCount} category(ies)`);
        if (tagCount > 0) usageDetails.push(`${tagCount} tag(s)`);
        if (templateCount > 0) usageDetails.push(`${templateCount} template(s)`);

        throw new AppError(
          `Cannot delete icon "${icon.name}" because it is being used in ${usageDetails.join(', ')}. Remove the icon from these items first.`,
          400
        );
      }

      await prisma.customIcon.delete({ where: { id } });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'icon',
        entityId: icon.id,
        entityName: icon.name,
        req,
      });

      res.json({ success: true, message: 'Icon deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CUSTOMIZED ICONS ====================

// Get all customized icons (current user's)
router.get(
  '/customized',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const icons = await prisma.customizedIcon.findMany({
        where: { createdById: req.user!.id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: icons });
    } catch (error) {
      next(error);
    }
  }
);

// Create a customized icon
router.post(
  '/customized',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_CREATE),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('sourceIcon').trim().isLength({ min: 1 }),
    body('iconColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/),
    body('backgroundColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/)
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, sourceIcon, iconColor, backgroundColor } = req.body;

      // Check if name already exists for this user
      const existing = await prisma.customizedIcon.findUnique({
        where: {
          name_createdById: {
            name,
            createdById: req.user!.id
          }
        }
      });

      if (existing) {
        throw new AppError('A customized icon with this name already exists', 400);
      }

      const icon = await prisma.customizedIcon.create({
        data: {
          name,
          sourceIcon,
          iconColor,
          backgroundColor,
          createdById: req.user!.id
        }
      });

      res.status(201).json({ success: true, data: icon });
    } catch (error) {
      next(error);
    }
  }
);

// Update a customized icon
router.put(
  '/customized/:id',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_UPDATE),
  param('id').isUUID(),
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('iconColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/),
    body('backgroundColor').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6,8}$/)
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { name, iconColor, backgroundColor } = req.body;

      const existing = await prisma.customizedIcon.findFirst({
        where: { id, createdById: req.user!.id }
      });

      if (!existing) {
        throw new AppError('Customized icon not found', 404);
      }

      // Check name uniqueness if changing
      if (name && name !== existing.name) {
        const nameExists = await prisma.customizedIcon.findUnique({
          where: {
            name_createdById: {
              name,
              createdById: req.user!.id
            }
          }
        });

        if (nameExists) {
          throw new AppError('A customized icon with this name already exists', 400);
        }
      }

      const icon = await prisma.customizedIcon.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(iconColor !== undefined && { iconColor }),
          ...(backgroundColor !== undefined && { backgroundColor })
        }
      });

      res.json({ success: true, data: icon });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a customized icon
router.delete(
  '/customized/:id',
  authenticate,
  requirePermission(PERMISSIONS.ICONS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const icon = await prisma.customizedIcon.findFirst({
        where: { id, createdById: req.user!.id }
      });

      if (!icon) {
        throw new AppError('Customized icon not found', 404);
      }

      await prisma.customizedIcon.delete({ where: { id } });

      res.json({ success: true, message: 'Customized icon deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

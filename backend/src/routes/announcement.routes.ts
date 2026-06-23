import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

const announcementInclude = {
  createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  linkedItem: {
      select: {
        id: true, name: true, sku: true, quantity: true, minQuantity: true,
        images: { where: { isPrimary: true }, select: { id: true, filename: true }, take: 1 },
        category: { select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true } },
        location: { select: { id: true, name: true, type: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true, icon: true, iconColor: true, iconBackgroundColor: true } } } },
        template: { select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true } },
      },
    },
  _count: { select: { reads: true } },
};

const allTrackedFields = [
  'title', 'message', 'type', 'icon', 'color', 'isActive', 'startDate', 'endDate',
  'linkedItemId', 'actionUrl', 'targetRoleIds', 'targetGroupIds', 'targetUserIds',
  'isPinned', 'priority', 'dismissType', 'useLinkedItemImage',
];

const newFieldValidators = [
  body('linkedItemId').optional({ nullable: true }).isUUID().withMessage('Invalid item ID'),
  body('actionUrl').optional({ nullable: true }).isString(),
  body('targetRoleIds').optional().isArray(),
  body('targetRoleIds.*').optional().isUUID(),
  body('targetGroupIds').optional().isArray(),
  body('targetGroupIds.*').optional().isUUID(),
  body('targetUserIds').optional().isArray(),
  body('targetUserIds.*').optional().isUUID(),
  body('isPinned').optional().isBoolean(),
  body('priority').optional().isInt({ min: 0, max: 100 }),
  body('dismissType').optional().isIn(['none', 'permanent', 'until_update']),
  body('useLinkedItemImage').optional().isBoolean(),
];

// ===================== STATIC ROUTES (before /:id) =====================

// Get all announcements (admin)
router.get('/', authenticate, requirePermission(PERMISSIONS.ANNOUNCEMENTS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: announcementInclude,
      orderBy: [{ isPinned: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

// Get currently active announcements (any authenticated user)
router.get('/active', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const now = new Date();
    const userId = req.user!.id;
    const userRoleId = req.user!.roleId;
    const userGroupIds = req.user!.groupIds;

    const [announcements, dismissals, timezoneSetting, showDateTimeSetting, scrollSpeedSetting, textSizeSetting] = await Promise.all([
      prisma.announcement.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
        include: {
          linkedItem: {
      select: {
        id: true, name: true, sku: true, quantity: true, minQuantity: true,
        images: { where: { isPrimary: true }, select: { id: true, filename: true }, take: 1 },
        category: { select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true } },
        location: { select: { id: true, name: true, type: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true, icon: true, iconColor: true, iconBackgroundColor: true } } } },
        template: { select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true } },
      },
    },
        },
        orderBy: [{ isPinned: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.announcementDismissal.findMany({
        where: { userId },
        select: { announcementId: true, dismissedAt: true },
      }),
      prisma.setting.findUnique({ where: { key: 'system.timezone' } }),
      prisma.setting.findUnique({ where: { key: 'header.showDateTime' } }),
      prisma.setting.findUnique({ where: { key: 'announcements.scrollSpeed' } }),
      prisma.setting.findUnique({ where: { key: 'announcements.textSize' } }),
    ]);

    // Build dismissal lookup
    const dismissalMap = new Map(dismissals.map(d => [d.announcementId, d.dismissedAt]));

    // Filter for targeting + dismissals
    const filtered = announcements.filter(a => {
      // Target audience check
      const hasTargeting = a.targetRoleIds.length > 0 || a.targetGroupIds.length > 0 || a.targetUserIds.length > 0;
      if (hasTargeting) {
        const matchesRole = userRoleId ? a.targetRoleIds.includes(userRoleId) : false;
        const matchesGroup = a.targetGroupIds.some(gid => userGroupIds.includes(gid));
        const matchesUser = a.targetUserIds.includes(userId);
        if (!matchesRole && !matchesGroup && !matchesUser) return false;
      }

      // Dismissal check
      if (a.dismissType !== 'none') {
        const dismissedAt = dismissalMap.get(a.id);
        if (dismissedAt) {
          if (a.dismissType === 'permanent') return false;
          if (a.dismissType === 'until_update' && dismissedAt >= a.updatedAt) return false;
        }
      }

      return true;
    });

    res.json({
      success: true,
      data: filtered,
      timezone: timezoneSetting?.value || 'UTC',
      showDateTime: showDateTimeSetting?.value !== 'false',
      scrollSpeed: parseInt(scrollSpeedSetting?.value || '8', 10),
      textSize: textSizeSetting?.value || 'small',
    });
  } catch (error) {
    next(error);
  }
});

// Get available recipients for targeting
router.get('/recipients', authenticate, requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const [roles, groups, users] = await Promise.all([
      prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, username: true, email: true, firstName: true, lastName: true },
        orderBy: { username: 'asc' },
      }),
    ]);
    res.json({
      success: true,
      data: {
        roles,
        groups,
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get announcement templates
router.get('/templates', authenticate, requirePermission(PERMISSIONS.ANNOUNCEMENTS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const templates = await prisma.announcementTemplate.findMany({
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// Create custom announcement template
router.post('/templates',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Template name is required'),
  body('titlePrefix').optional({ nullable: true }).isString(),
  body('messageTemplate').optional({ nullable: true }).isString(),
  body('icon').optional({ nullable: true }).isString(),
  body('color').optional({ nullable: true }).isString(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, titlePrefix, messageTemplate, icon, color } = req.body;
      const template = await prisma.announcementTemplate.create({
        data: {
          name,
          titlePrefix: titlePrefix || null,
          messageTemplate: messageTemplate || null,
          icon: icon || null,
          color: color || null,
          isBuiltIn: false,
          createdById: req.user!.id,
        },
      });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Update custom announcement template
router.put('/templates/:id',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_UPDATE),
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('titlePrefix').optional({ nullable: true }).isString(),
  body('messageTemplate').optional({ nullable: true }).isString(),
  body('icon').optional({ nullable: true }).isString(),
  body('color').optional({ nullable: true }).isString(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const template = await prisma.announcementTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      if (template.isBuiltIn) throw new AppError('Cannot edit built-in templates', 400);
      const { name, titlePrefix, messageTemplate, icon, color } = req.body;
      const updated = await prisma.announcementTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(titlePrefix !== undefined && { titlePrefix: titlePrefix || null }),
          ...(messageTemplate !== undefined && { messageTemplate: messageTemplate || null }),
          ...(icon !== undefined && { icon: icon || null }),
          ...(color !== undefined && { color: color || null }),
        },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Delete custom announcement template
router.delete('/templates/:id',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const template = await prisma.announcementTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      if (template.isBuiltIn) throw new AppError('Cannot delete built-in templates', 400);
      await prisma.announcementTemplate.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ===================== PARAMETERIZED ROUTES (/:id) =====================

// Create announcement
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 characters)'),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message is required (max 2000 characters)'),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Invalid type'),
  body('icon').optional({ nullable: true }).isString(),
  body('color').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean(),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Invalid start date'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('Invalid end date'),
  ...newFieldValidators,
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { title, message, type, icon, color, isActive, startDate, endDate,
        linkedItemId, actionUrl, targetRoleIds, targetGroupIds, targetUserIds,
        isPinned, priority, dismissType, useLinkedItemImage } = req.body;

      if (linkedItemId && actionUrl) {
        throw new AppError('Cannot set both a linked item and an action URL', 400);
      }

      if (linkedItemId) {
        const item = await prisma.item.findUnique({ where: { id: linkedItemId, deletedAt: null } });
        if (!item) throw new AppError('Linked item not found', 400);
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          message,
          type: type || 'info',
          icon: icon || null,
          color: color || '#3b82f6',
          isActive: isActive !== undefined ? isActive : true,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          linkedItemId: linkedItemId || null,
          actionUrl: actionUrl || null,
          targetRoleIds: targetRoleIds || [],
          targetGroupIds: targetGroupIds || [],
          targetUserIds: targetUserIds || [],
          isPinned: isPinned || false,
          priority: priority || 0,
          dismissType: dismissType || 'none',
          useLinkedItemImage: useLinkedItemImage || false,
          createdById: req.user!.id,
        },
        include: announcementInclude,
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'announcement',
        entityId: announcement.id,
        entityName: title,
        req: req,
      });

      res.status(201).json({ success: true, data: announcement });
    } catch (error) {
      next(error);
    }
  }
);

// Update announcement
router.put('/:id',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_UPDATE),
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('message').optional().trim().isLength({ min: 1, max: 2000 }),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']),
  body('icon').optional({ nullable: true }).isString(),
  body('color').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean(),
  body('startDate').optional({ nullable: true }).isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  ...newFieldValidators,
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) throw new AppError('Announcement not found', 404);

      const { title, message, type, icon, color, isActive, startDate, endDate,
        linkedItemId, actionUrl, targetRoleIds, targetGroupIds, targetUserIds,
        isPinned, priority, dismissType, useLinkedItemImage } = req.body;

      // Mutual exclusivity check
      const finalLinkedItemId = linkedItemId !== undefined ? linkedItemId : existing.linkedItemId;
      const finalActionUrl = actionUrl !== undefined ? actionUrl : existing.actionUrl;
      if (finalLinkedItemId && finalActionUrl) {
        throw new AppError('Cannot set both a linked item and an action URL', 400);
      }

      if (linkedItemId) {
        const item = await prisma.item.findUnique({ where: { id: linkedItemId, deletedAt: null } });
        if (!item) throw new AppError('Linked item not found', 400);
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (type !== undefined) updateData.type = type;
      if (icon !== undefined) updateData.icon = icon || null;
      if (color !== undefined) updateData.color = color;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (linkedItemId !== undefined) updateData.linkedItemId = linkedItemId || null;
      if (actionUrl !== undefined) updateData.actionUrl = actionUrl || null;
      if (targetRoleIds !== undefined) updateData.targetRoleIds = targetRoleIds;
      if (targetGroupIds !== undefined) updateData.targetGroupIds = targetGroupIds;
      if (targetUserIds !== undefined) updateData.targetUserIds = targetUserIds;
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (priority !== undefined) updateData.priority = priority;
      if (dismissType !== undefined) updateData.dismissType = dismissType;
      if (useLinkedItemImage !== undefined) updateData.useLinkedItemImage = useLinkedItemImage;

      const updated = await prisma.announcement.update({
        where: { id },
        data: updateData,
        include: announcementInclude,
      });

      const changes = getChanges(existing, updated, allTrackedFields);

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'announcement',
        entityId: id,
        entityName: updated.title,
        changes,
        req: req,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Duplicate announcement
router.post('/:id/duplicate',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const source = await prisma.announcement.findUnique({ where: { id } });
      if (!source) throw new AppError('Announcement not found', 404);

      const duplicate = await prisma.announcement.create({
        data: {
          title: `${source.title} (Copy)`,
          message: source.message,
          type: source.type,
          icon: source.icon,
          color: source.color,
          isActive: false,
          startDate: null,
          endDate: null,
          linkedItemId: source.linkedItemId,
          actionUrl: source.actionUrl,
          targetRoleIds: source.targetRoleIds,
          targetGroupIds: source.targetGroupIds,
          targetUserIds: source.targetUserIds,
          isPinned: source.isPinned,
          priority: source.priority,
          dismissType: source.dismissType,
          useLinkedItemImage: source.useLinkedItemImage,
          createdById: req.user!.id,
        },
        include: announcementInclude,
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'announcement',
        entityId: duplicate.id,
        entityName: duplicate.title,
        req: req,
      });

      res.status(201).json({ success: true, data: duplicate });
    } catch (error) {
      next(error);
    }
  }
);

// Dismiss announcement
router.post('/:id/dismiss',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement) throw new AppError('Announcement not found', 404);
      if (announcement.dismissType === 'none') throw new AppError('This announcement cannot be dismissed', 400);

      await prisma.announcementDismissal.upsert({
        where: { userId_announcementId: { userId: req.user!.id, announcementId: id } },
        create: { userId: req.user!.id, announcementId: id },
        update: { dismissedAt: new Date() },
      });

      res.json({ success: true, message: 'Announcement dismissed' });
    } catch (error) {
      next(error);
    }
  }
);

// Mark announcement as read
router.post('/:id/read',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.announcementRead.upsert({
        where: { userId_announcementId: { userId: req.user!.id, announcementId: req.params.id } },
        create: { userId: req.user!.id, announcementId: req.params.id },
        update: {},
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get who read an announcement (admin)
router.get('/:id/reads',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const reads = await prisma.announcementRead.findMany({
        where: { announcementId: req.params.id },
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { readAt: 'desc' },
      });
      res.json({ success: true, data: reads });
    } catch (error) {
      next(error);
    }
  }
);

// Delete announcement
router.delete('/:id',
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) throw new AppError('Announcement not found', 404);

      await prisma.announcement.delete({ where: { id } });

      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'announcement',
        entityId: id,
        entityName: existing.title,
        req: req,
      });

      res.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

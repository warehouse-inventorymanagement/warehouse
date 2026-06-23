import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { getExpiringItems } from '../services/quarantine.service.js';
import { getAuditLogs } from '../services/audit.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

const DEFAULT_WIDGETS = '["greeting","stat-cards","activity-feed","category-chart","quarantine-expiring","stock-summary","low-stock-alerts","recently-updated"]';

router.get('/stats', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const now = new Date();

    // Week boundaries for trend calculation
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const [
      totalItems,
      totalCategories,
      totalLocations,
      totalTags,
      totalUsers,
      quarantineCount,
      lowStockItems,
      outOfStockCount,
      itemsAddedThisWeek,
      itemsAddedLastWeek,
      expiringQuarantineItems,
      auditResult,
      categoryDistribution,
      recentItems,
      widgetsSetting,
    ] = await Promise.all([
      prisma.item.count({ where: { deletedAt: null } }),
      prisma.category.count(),
      prisma.location.count(),
      prisma.tag.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.item.count({ where: { deletedAt: { not: null } } }),
      prisma.$queryRaw`
        SELECT i.id, i.name, i.sku, i.quantity, i.min_quantity as "minQuantity",
               c.name as "categoryName"
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.quantity <= i.min_quantity AND i.min_quantity > 0 AND i.deleted_at IS NULL
        ORDER BY (i.min_quantity - i.quantity) DESC
        LIMIT 10
      ` as Promise<any[]>,
      prisma.item.count({ where: { deletedAt: null, quantity: 0 } }),
      prisma.item.count({ where: { deletedAt: null, createdAt: { gte: startOfThisWeek } } }),
      prisma.item.count({ where: { deletedAt: null, createdAt: { gte: startOfLastWeek, lt: startOfThisWeek } } }),
      getExpiringItems(7),
      getAuditLogs({ limit: 10, page: 1 }),
      prisma.$queryRaw`
        SELECT c.id, c.name, COUNT(i.id)::int as count
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id AND i.deleted_at IS NULL
        GROUP BY c.id, c.name
        ORDER BY count DESC
        LIMIT 10
      ` as Promise<{ id: string; name: string; count: number }[]>,
      prisma.item.findMany({
        where: { deletedAt: null },
        include: {
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.setting.findUnique({ where: { key: 'dashboard.widgets' } }),
    ]);

    const enabledWidgets = (() => {
      try {
        return JSON.parse(widgetsSetting?.value || DEFAULT_WIDGETS);
      } catch {
        return JSON.parse(DEFAULT_WIDGETS);
      }
    })();

    res.json({
      success: true,
      data: {
        enabledWidgets,
        counts: {
          totalItems,
          totalCategories,
          totalLocations,
          totalTags,
          totalUsers,
          quarantineCount,
          lowStockCount: (lowStockItems as any[]).length,
          outOfStockCount,
          itemsAddedThisWeek,
          itemsAddedLastWeek,
        },
        lowStockItems,
        expiringQuarantineItems: expiringQuarantineItems.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          daysUntilExpiration: item.daysUntilExpiration,
          deletedBy: item.deletedBy,
        })),
        auditLogs: auditResult.data.slice(0, 10),
        categoryDistribution,
        recentItems: recentItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          categoryName: item.category?.name || 'Uncategorized',
          primaryImage: item.images?.[0]?.filename || null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user's dashboard config
router.get('/config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: req.user!.id },
    });
    const defaultLayout = {
      widgets: ['greeting', 'stat-cards', 'stock-trend', 'activity-feed', 'category-chart', 'quarantine-expiring', 'stock-summary', 'low-stock-alerts', 'recently-updated'],
    };
    res.json({ success: true, data: config ? JSON.parse(config.layout) : defaultLayout });
  } catch (error) {
    next(error);
  }
});

// Save user's dashboard config
router.put('/config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.dashboardConfig.upsert({
      where: { userId: req.user!.id },
      update: { layout: JSON.stringify(req.body.layout) },
      create: { userId: req.user!.id, layout: JSON.stringify(req.body.layout) },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Stock movement trend (last 7 days)
router.get('/stock-trend', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const days = 7;
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [created, updated] = await Promise.all([
        prisma.itemHistory.count({
          where: { action: 'CREATED', createdAt: { gte: start, lt: end } },
        }),
        prisma.itemHistory.count({
          where: { action: { not: 'CREATED' }, createdAt: { gte: start, lt: end } },
        }),
      ]);

      results.push({
        date: start.toISOString().split('T')[0],
        created,
        updated,
      });
    }
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { getAuditLogs, getEntityHistory, EntityType, AuditAction } from '../services/audit.service.js';
import { stringify as csvStringify } from 'csv-stringify/sync';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all audit logs with filters
router.get('/', authenticate, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await getAuditLogs({
      entityType: entityType as EntityType | undefined,
      entityId: entityId as string | undefined,
      userId: userId as string | undefined,
      action: action as AuditAction | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Export audit logs as CSV
router.get('/export', authenticate, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const { entityType, entityId, userId, action, startDate, endDate } = req.query;

    // Fetch column visibility settings
    const columnSettings = await prisma.setting.findMany({
      where: { key: { startsWith: 'audit.columns.' } }
    });
    const columns: Record<string, boolean> = {};
    columnSettings.forEach(s => {
      columns[s.key.replace('audit.columns.', '')] = s.value !== 'false';
    });

    const result = await getAuditLogs({
      entityType: entityType as EntityType | undefined,
      entityId: entityId as string | undefined,
      userId: userId as string | undefined,
      action: action as AuditAction | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: 1,
      limit: 10000,
    });

    const csvData = result.data.map((log: any) => {
      const row: Record<string, string> = {};
      if (columns.timestamp !== false) row['Timestamp'] = new Date(log.createdAt).toISOString();
      row['Action'] = log.action;
      if (columns.fullName !== false) row['Full Name'] = log.user?.fullName || '';
      if (columns.username !== false) row['Username'] = log.user?.username || '';
      if (columns.role !== false) row['Role'] = log.user?.roleName || '';
      if (columns.authMethod !== false) row['Auth Method'] = log.user?.authMethod || '';
      if (columns.entityType !== false) row['Entity Type'] = log.entityType;
      if (columns.entityName !== false) row['Entity Name'] = log.entityName || '';
      if (columns.ipAddress !== false) row['IP Address'] = log.ipAddress || '';
      if (columns.userAgent !== false) row['User Agent'] = log.userAgent || '';
      if (columns.changes !== false) row['Changes'] = log.changes ? JSON.stringify(log.changes) : '';
      return row;
    });

    const csv = csvStringify(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// Get audit history for a specific entity
router.get('/:entityType/:entityId', authenticate, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;
    const history = await getEntityHistory(entityType as EntityType, entityId);

    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

// Audit stats - activity summary for dashboards
router.get('/stats/summary', authenticate, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byAction, byUser, byEntity, dailyActivity] = await Promise.all([
      // Actions breakdown
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      // Top users
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since }, userId: { not: null } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      // Entity types
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      // Daily counts
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM audit_logs
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date
      ` as Promise<{ date: string; count: number }[]>,
    ]);

    // Get usernames for top users
    const userIds = byUser.filter(u => u.userId).map(u => u.userId!);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.username]));

    res.json({
      success: true,
      data: {
        byAction: byAction.map(a => ({ action: a.action, count: a._count })),
        byUser: byUser.map(u => ({ userId: u.userId, username: userMap.get(u.userId!) || 'Unknown', count: u._count })),
        byEntity: byEntity.map(e => ({ entityType: e.entityType, count: e._count })),
        dailyActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

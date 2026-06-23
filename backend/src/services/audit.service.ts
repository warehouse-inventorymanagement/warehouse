import { Request } from 'express';
import prisma from '../lib/prisma.js';

const SENSITIVE_FIELDS = ['password', 'secret', 'apiKey', 'token', 'refreshToken', 'encryptionKey', 'bindPassword', 'smtp.password'];

function redactSensitiveChanges(changes: any): any {
  if (!changes || typeof changes !== 'object') return changes;
  const redacted = { ...changes };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        if (redacted[key].old !== undefined) redacted[key] = { old: '[REDACTED]', new: '[REDACTED]' };
        else redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = '[REDACTED]';
      }
    }
  }
  return redacted;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED';
export type EntityType = 'item' | 'category' | 'location' | 'tag' | 'user' | 'role' | 'group' | 'icon' | 'template' | 'auth' | 'device' | 'device_blocklist' | 'announcement';

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { old: any; new: any }> | any;
  req?: Request;
}

// Helper to get changes between old and new objects
export function getChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fieldsToTrack: string[]
): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};

  for (const field of fieldsToTrack) {
    const oldValue = oldObj[field];
    const newValue = newObj[field];

    // Compare values (handle arrays and objects)
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      changes[field] = { old: oldValue, new: newValue };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

// Get the real client IP address
function getClientIp(req?: Request): string | null {
  if (!req) return null;

  // Check X-Forwarded-For header first (set by reverse proxy)
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
    // The first one is the original client
    const ips = forwarded.split(',').map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }

  // Check X-Real-IP header (nginx)
  const realIp = req.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback to Express req.ip (respects trust proxy setting)
  if (req.ip) return req.ip;

  // Last resort
  return req.socket?.remoteAddress || null;
}

// Entity type → setting key mapping for conditional logging
const ENTITY_LOG_SETTINGS: Record<string, string> = {
  item: 'audit.log.items',
  category: 'audit.log.categories',
  location: 'audit.log.locations',
  tag: 'audit.log.tags',
  user: 'audit.log.users',
  role: 'audit.log.roles',
  group: 'audit.log.groups',
  auth: 'audit.log.auth',
  icon: 'audit.log.icons',
  template: 'audit.log.templates',
};

// Create an audit log entry
export async function createAuditLog(params: AuditLogParams) {
  const { userId, action, entityType, entityId, entityName, changes, req } = params;

  // Check if logging is enabled for this entity type
  const settingKey = ENTITY_LOG_SETTINGS[entityType];
  if (settingKey) {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: settingKey } });
      if (setting?.value === 'false') return null;
    } catch { /* proceed with logging on error */ }
  }

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      entityName,
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress: getClientIp(req),
      userAgent: req?.get('user-agent') || null,
    },
  });
}

// Get audit logs with filters
export async function getAuditLogs(params: {
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    entityType,
    entityId,
    userId,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params;

  const where: any = {};

  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const userSelect = {
    id: true, username: true, email: true,
    firstName: true, lastName: true, ldapDn: true,
    role: { select: { id: true, name: true } },
    groups: {
      include: { group: { include: { role: { select: { id: true, name: true } } } } },
      take: 1,
    },
  } as const;

  const [logs, total, ldapNameSetting] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.setting.findUnique({ where: { key: 'ldap.name' } }),
  ]);

  const ldapName = ldapNameSetting?.value || 'LDAP';

  // Parse changes JSON for each log and add computed user fields
  const parsedLogs = logs.map((log) => ({
    ...log,
    changes: log.changes ? redactSensitiveChanges(JSON.parse(log.changes)) : null,
    user: log.user ? {
      id: log.user.id,
      username: log.user.username,
      email: log.user.email,
      firstName: log.user.firstName,
      lastName: log.user.lastName,
      fullName: [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || null,
      roleName: log.user.role?.name || (log.user as any).groups?.[0]?.group?.role?.name || null,
      authMethod: log.user.ldapDn ? ldapName : 'Local',
    } : null,
  }));

  return {
    data: parsedLogs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// Get audit history for a specific entity
export async function getEntityHistory(entityType: EntityType, entityId: string) {
  const userSelect = {
    id: true, username: true, email: true,
    firstName: true, lastName: true, ldapDn: true,
    role: { select: { id: true, name: true } },
    groups: {
      include: { group: { include: { role: { select: { id: true, name: true } } } } },
      take: 1,
    },
  } as const;

  const [logs, ldapNameSetting] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.setting.findUnique({ where: { key: 'ldap.name' } }),
  ]);

  const ldapName = ldapNameSetting?.value || 'LDAP';

  return logs.map((log) => ({
    ...log,
    changes: log.changes ? redactSensitiveChanges(JSON.parse(log.changes)) : null,
    user: log.user ? {
      id: log.user.id,
      username: log.user.username,
      email: log.user.email,
      firstName: log.user.firstName,
      lastName: log.user.lastName,
      fullName: [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || null,
      roleName: log.user.role?.name || (log.user as any).groups?.[0]?.group?.role?.name || null,
      authMethod: log.user.ldapDn ? ldapName : 'Local',
    } : null,
  }));
}

// Log a login attempt (success or failure)
interface LoginAuditParams {
  username: string;
  success: boolean;
  userId?: string | null;
  authMethod: 'local' | 'ldap';
  platform: 'web' | 'mobile';
  reason?: string;
  req?: Request;
}

export async function createLoginAuditLog(params: LoginAuditParams) {
  const { username, success, userId, authMethod, platform, reason, req } = params;

  // Build entity name with auth method and platform for display
  // Format: "username (LDAP/Web)" or "username (Local/Mobile)"
  const methodLabel = authMethod === 'ldap' ? 'LDAP' : 'Local';
  const platformLabel = platform === 'mobile' ? 'Mobile' : 'Web';
  const entityName = `${username} (${methodLabel}/${platformLabel})`;

  // Don't store changes for login events - the action type tells the story
  // For failed logins, the reason is typically "Invalid credentials" which is implied

  return prisma.auditLog.create({
    data: {
      userId: userId || null,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: username,
      entityName,
      changes: null,
      ipAddress: getClientIp(req),
      userAgent: req?.get('user-agent') || null,
    },
  });
}

// Count recent failed login attempts for a username
export async function countRecentFailedLogins(username: string, windowMinutes: number = 15): Promise<number> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      entityType: 'auth',
      entityId: username,
      action: 'LOGIN_FAILED',
      createdAt: { gte: windowStart },
    },
  });
}

// Get recent login attempts for a username
export async function getRecentLoginAttempts(username: string, limit: number = 10) {
  return prisma.auditLog.findMany({
    where: {
      entityType: 'auth',
      entityId: username,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}


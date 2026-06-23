import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getRateLimitStatus, DEFAULT_LIMITS } from '../middleware/apiRateLimit.js';
import crypto from 'crypto';
import ipaddr from 'ipaddr.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Validate IP or CIDR format
function isValidIpOrCidr(value: string): boolean {
  try {
    if (value.includes('/')) {
      const [addr, prefix] = value.split('/');
      ipaddr.parse(addr);
      const prefixNum = parseInt(prefix, 10);
      return !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 128;
    } else {
      ipaddr.parse(value);
      return true;
    }
  } catch {
    return false;
  }
}

// Available API permissions
export const API_PERMISSIONS = [
  // Items
  { key: 'items:read', label: 'Read Items', description: 'View items and inventory levels' },
  { key: 'items:write', label: 'Write Items', description: 'Create and update items' },
  { key: 'items:delete', label: 'Delete Items', description: 'Delete items' },
  // Categories
  { key: 'categories:read', label: 'Read Categories', description: 'View categories' },
  { key: 'categories:write', label: 'Write Categories', description: 'Create and update categories' },
  // Locations
  { key: 'locations:read', label: 'Read Locations', description: 'View locations' },
  { key: 'locations:write', label: 'Write Locations', description: 'Create and update locations' },
  // Tags
  { key: 'tags:read', label: 'Read Tags', description: 'View tags' },
  { key: 'tags:write', label: 'Write Tags', description: 'Create and update tags' },
  // Inventory
  { key: 'inventory:read', label: 'Read Inventory', description: 'View stock levels and history' },
  { key: 'inventory:write', label: 'Adjust Inventory', description: 'Adjust stock quantities' },
  // Reports (read-only)
  { key: 'reports:read', label: 'Read Reports', description: 'Access reports and analytics' },
  // Webhooks
  { key: 'webhooks:read', label: 'Read Webhooks', description: 'View webhook configurations' },
  { key: 'webhooks:write', label: 'Write Webhooks', description: 'Create, update, and test webhooks' },
  { key: 'webhooks:delete', label: 'Delete Webhooks', description: 'Delete webhooks' },
];

// Generate a secure random API key
function generateApiKey(): string {
  const prefix = 'wh_'; // Warehouse prefix for easy identification
  const randomPart = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomPart}`;
}

// Hash an API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Get available permissions
router.get('/permissions', authenticate, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: API_PERMISSIONS
  });
});

// List all API keys for current user (or all if admin)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = user.role?.name === 'Admin';

    const apiKeys = await prisma.apiKey.findMany({
      where: isAdmin ? {} : { userId: user.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
        // IP Restrictions
        ipRestrictionMode: true,
        ipWhitelist: true,
        ipBlacklist: true,
        // Rate Limits
        rateLimitPerMinute: true,
        rateLimitPerHour: true,
        rateLimitPerDay: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add rate limit status to each key
    const apiKeysWithStatus = apiKeys.map(key => ({
      ...key,
      rateLimitStatus: getRateLimitStatus(key.id, {
        perMinute: key.rateLimitPerMinute,
        perHour: key.rateLimitPerHour,
        perDay: key.rateLimitPerDay,
      }),
      defaultLimits: DEFAULT_LIMITS,
    }));

    res.json({
      success: true,
      data: apiKeysWithStatus
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch API keys' });
  }
});

// Create a new API key
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, permissions, expiresAt } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one permission is required' });
    }

    // Validate permissions
    const validPermissions = API_PERMISSIONS.map(p => p.key);
    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${invalidPermissions.join(', ')}`
      });
    }

    // Generate the API key
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11); // "wh_" + first 8 chars

    // Create the API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        permissions,
        userId: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      }
    });

    // Return the full key ONLY on creation (it won't be retrievable later)
    res.status(201).json({
      success: true,
      data: {
        ...apiKey,
        key: rawKey, // Only returned once!
      },
      message: 'API key created. Save this key now - it won\'t be shown again!'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ success: false, message: 'Failed to create API key' });
  }
});

// Get a single API key details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    const isAdmin = user.role?.name === 'Admin';

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: user.id })
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
        // IP Restrictions
        ipRestrictionMode: true,
        ipWhitelist: true,
        ipBlacklist: true,
        // Rate Limits
        rateLimitPerMinute: true,
        rateLimitPerHour: true,
        rateLimitPerDay: true,
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    res.json({
      success: true,
      data: {
        ...apiKey,
        rateLimitStatus: getRateLimitStatus(apiKey.id, {
          perMinute: apiKey.rateLimitPerMinute,
          perHour: apiKey.rateLimitPerHour,
          perDay: apiKey.rateLimitPerDay,
        }),
        defaultLimits: DEFAULT_LIMITS,
      }
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch API key' });
  }
});

// Update an API key (name, permissions, active status, IP restrictions, rate limits)
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    const {
      name,
      permissions,
      isActive,
      expiresAt,
      // IP Restrictions
      ipRestrictionMode,
      ipWhitelist,
      ipBlacklist,
      // Rate Limits
      rateLimitPerMinute,
      rateLimitPerHour,
      rateLimitPerDay,
    } = req.body;
    const isAdmin = user.role?.name === 'Admin';

    // Check ownership
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: user.id })
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = API_PERMISSIONS.map(p => p.key);
      const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
      }
    }

    // Validate IP restriction mode
    if (ipRestrictionMode !== undefined && !['none', 'whitelist', 'blacklist'].includes(ipRestrictionMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP restriction mode. Must be: none, whitelist, or blacklist'
      });
    }

    // Validate IP addresses in whitelist
    if (ipWhitelist !== undefined && Array.isArray(ipWhitelist)) {
      const invalidIps = ipWhitelist.filter((ip: string) => !isValidIpOrCidr(ip));
      if (invalidIps.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid IP addresses in whitelist: ${invalidIps.join(', ')}`
        });
      }
    }

    // Validate IP addresses in blacklist
    if (ipBlacklist !== undefined && Array.isArray(ipBlacklist)) {
      const invalidIps = ipBlacklist.filter((ip: string) => !isValidIpOrCidr(ip));
      if (invalidIps.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid IP addresses in blacklist: ${invalidIps.join(', ')}`
        });
      }
    }

    // Validate rate limits (must be positive integers or null)
    const validateRateLimit = (value: any, name: string) => {
      if (value !== undefined && value !== null) {
        if (!Number.isInteger(value) || value < 1) {
          return `${name} must be a positive integer or null`;
        }
      }
      return null;
    };

    const rateLimitErrors = [
      validateRateLimit(rateLimitPerMinute, 'rateLimitPerMinute'),
      validateRateLimit(rateLimitPerHour, 'rateLimitPerHour'),
      validateRateLimit(rateLimitPerDay, 'rateLimitPerDay'),
    ].filter(Boolean);

    if (rateLimitErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: rateLimitErrors.join(', ')
      });
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(permissions !== undefined && { permissions }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        // IP Restrictions
        ...(ipRestrictionMode !== undefined && { ipRestrictionMode }),
        ...(ipWhitelist !== undefined && { ipWhitelist }),
        ...(ipBlacklist !== undefined && { ipBlacklist }),
        // Rate Limits
        ...(rateLimitPerMinute !== undefined && { rateLimitPerMinute }),
        ...(rateLimitPerHour !== undefined && { rateLimitPerHour }),
        ...(rateLimitPerDay !== undefined && { rateLimitPerDay }),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        ipRestrictionMode: true,
        ipWhitelist: true,
        ipBlacklist: true,
        rateLimitPerMinute: true,
        rateLimitPerHour: true,
        rateLimitPerDay: true,
      }
    });

    res.json({
      success: true,
      data: apiKey,
      message: 'API key updated'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ success: false, message: 'Failed to update API key' });
  }
});

// Delete (revoke) an API key
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    const isAdmin = user.role?.name === 'Admin';

    // Check ownership
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: user.id })
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    await prisma.apiKey.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'API key revoked'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke API key' });
  }
});

// Regenerate an API key (creates new key, keeps settings)
router.post('/:id/regenerate', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    const isAdmin = user.role?.name === 'Admin';

    // Check ownership
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: user.id })
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    // Generate new key
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11);

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        keyHash,
        keyPrefix,
        lastUsedAt: null, // Reset usage
        lastUsedIp: null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      }
    });

    res.json({
      success: true,
      data: {
        ...apiKey,
        key: rawKey, // Only returned once!
      },
      message: 'API key regenerated. Save this key now - it won\'t be shown again!'
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate API key' });
  }
});

// ==================== USAGE ANALYTICS ====================

// Get usage stats for a specific API key
router.get('/:id/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    const isAdmin = user.role?.name === 'Admin';

    // Parse query params
    const { startDate, endDate, groupBy = 'hour' } = req.query;

    // Check ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: user.id })
      }
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    // Default: last 24 hours
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get usage records
    const usage = await prisma.apiKeyUsage.findMany({
      where: {
        apiKeyId: id,
        timestamp: {
          gte: start,
          lte: end,
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Calculate summary stats
    const totalRequests = usage.length;
    const successRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 400).length;
    const errorRequests = usage.filter(u => u.statusCode >= 400).length;
    const avgResponseMs = totalRequests > 0
      ? Math.round(usage.reduce((sum, u) => sum + u.responseMs, 0) / totalRequests)
      : 0;

    // Group by time period
    const groupedData: Record<string, { requests: number; errors: number; avgMs: number }> = {};

    usage.forEach(u => {
      let key: string;
      const date = new Date(u.timestamp);

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'hour') {
        key = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00`;
      } else {
        // minute
        key = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = { requests: 0, errors: 0, avgMs: 0 };
      }
      groupedData[key].requests++;
      if (u.statusCode >= 400) groupedData[key].errors++;
      groupedData[key].avgMs += u.responseMs;
    });

    // Calculate averages for grouped data
    Object.keys(groupedData).forEach(key => {
      groupedData[key].avgMs = Math.round(groupedData[key].avgMs / groupedData[key].requests);
    });

    // Get top endpoints
    const endpointCounts: Record<string, number> = {};
    usage.forEach(u => {
      endpointCounts[u.endpoint] = (endpointCounts[u.endpoint] || 0) + 1;
    });
    const topEndpoints = Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // Get status code distribution
    const statusCodes: Record<number, number> = {};
    usage.forEach(u => {
      statusCodes[u.statusCode] = (statusCodes[u.statusCode] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          successRequests,
          errorRequests,
          errorRate: totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 100) : 0,
          avgResponseMs,
        },
        timeline: Object.entries(groupedData).map(([time, data]) => ({
          time,
          ...data,
        })),
        topEndpoints,
        statusCodes,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          groupBy,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API key usage:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage data' });
  }
});

// Get aggregate usage stats (admin only)
router.get('/analytics/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = user.role?.name === 'Admin';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;

    // Default: last 7 days
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all API keys with usage counts
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        user: { select: { username: true } },
        _count: {
          select: {
            usage: {
              where: {
                timestamp: { gte: start, lte: end }
              }
            }
          }
        }
      }
    });

    // Get total usage stats
    const totalUsage = await prisma.apiKeyUsage.count({
      where: {
        timestamp: { gte: start, lte: end }
      }
    });

    const errorUsage = await prisma.apiKeyUsage.count({
      where: {
        timestamp: { gte: start, lte: end },
        statusCode: { gte: 400 }
      }
    });

    // Get daily usage for chart
    const dailyUsage = await prisma.apiKeyUsage.groupBy({
      by: ['timestamp'],
      where: {
        timestamp: { gte: start, lte: end }
      },
      _count: true,
    });

    // Group by day
    const dailyData: Record<string, number> = {};
    dailyUsage.forEach(d => {
      const day = new Date(d.timestamp).toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + d._count;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests: totalUsage,
          errorRequests: errorUsage,
          errorRate: totalUsage > 0 ? Math.round((errorUsage / totalUsage) * 100) : 0,
          activeKeys: apiKeys.filter(k => k.isActive).length,
          totalKeys: apiKeys.length,
        },
        keyUsage: apiKeys.map(k => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          username: k.user.username,
          isActive: k.isActive,
          requestCount: k._count.usage,
        })).sort((a, b) => b.requestCount - a.requestCount),
        dailyUsage: Object.entries(dailyData).map(([date, count]) => ({ date, count })),
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

export default router;

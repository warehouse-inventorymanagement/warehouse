/**
 * Health check routes for monitoring and orchestration
 *
 * Provides endpoints for:
 * - Liveness probes (is the server running?)
 * - Readiness probes (is the server ready to accept traffic?)
 * - Detailed health info (for monitoring dashboards)
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getCurrentVersion } from '../services/update.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * GET /api/health
 * Basic liveness check - returns immediately if the server is running
 * Used by: Kubernetes liveness probes, load balancers
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/live
 * Alias for liveness check
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/ready
 * Readiness check - verifies the application can handle requests
 * Checks database connectivity
 * Used by: Kubernetes readiness probes, load balancers
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; latencyMs?: number }> = {};
  let isReady = true;

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart
    };
  } catch (error: any) {
    isReady = false;
    checks.database = {
      status: 'error',
      message: 'Database connection failed',
      latencyMs: Date.now() - dbStart
    };
  }

  const status = isReady ? 'ok' : 'error';
  res.status(isReady ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    checks
  });
});

/**
 * GET /api/health/detailed
 * Detailed health information for monitoring dashboards
 * Includes: database status, memory usage, uptime, version info
 */
router.get('/detailed', authenticate, async (req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; latencyMs?: number; details?: any }> = {};
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // Check database connectivity and get some stats
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;

    // Get basic counts for monitoring
    const [userCount, itemCount] = await Promise.all([
      prisma.user.count(),
      prisma.item.count()
    ]);

    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
      details: {
        connected: true,
        users: userCount,
        items: itemCount
      }
    };
  } catch (error: any) {
    overallStatus = 'error';
    checks.database = {
      status: 'error',
      message: error.message || 'Database connection failed',
      latencyMs: Date.now() - dbStart
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: 'ok',
    details: {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      rss: formatBytes(memUsage.rss),
      external: formatBytes(memUsage.external),
      heapUsedBytes: memUsage.heapUsed,
      heapTotalBytes: memUsage.heapTotal
    }
  };

  // Check if memory usage is high (over 90% of heap)
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    checks.memory.status = 'error';
    checks.memory.message = 'High memory usage';
    if (overallStatus === 'ok') overallStatus = 'degraded';
  } else if (heapUsagePercent > 75) {
    if (overallStatus === 'ok') overallStatus = 'degraded';
    checks.memory.message = 'Elevated memory usage';
  }

  // Uptime
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  // Version info
  const version = getCurrentVersion();

  res.status(overallStatus === 'error' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version,
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds)
    },
    checks,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format uptime seconds to human readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;

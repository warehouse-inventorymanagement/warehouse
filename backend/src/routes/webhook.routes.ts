import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import dns from 'dns/promises';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import prisma from '../lib/prisma.js';

const router = Router();

// SSRF Protection: block webhook URLs targeting private/internal IP ranges
async function isPrivateUrl(urlString: string): Promise<boolean> {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase();

    // Block obvious private hostnames
    if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1') {
      return true;
    }

    // Resolve hostname to IP and check against private ranges
    let ip: string;
    try {
      const result = await dns.lookup(hostname);
      ip = result.address;
    } catch {
      // If DNS resolution fails, block the request to be safe
      return true;
    }

    // Check IPv6 loopback
    if (ip === '::1') return true;

    // Check IPv4 private ranges
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
      if (parts[0] === 127) return true;                                    // 127.0.0.0/8
      if (parts[0] === 10) return true;                                     // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return true;                // 192.168.0.0/16
      if (parts[0] === 169 && parts[1] === 254) return true;                // 169.254.0.0/16
      if (parts[0] === 0) return true;                                       // 0.0.0.0/8
    }

    return false;
  } catch {
    return true;
  }
}

// Get all webhooks
router.get('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true } } },
    });
    // Don't expose secrets
    res.json({ success: true, data: webhooks.map(w => ({ ...w, secret: w.secret ? '***' : null })) });
  } catch (error) {
    next(error);
  }
});

// Create webhook
router.post('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('url').trim().isURL(),
  body('events').isArray({ min: 1 }),
  body('secret').optional().trim(),
], validate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (await isPrivateUrl(req.body.url)) {
      throw new AppError('Webhook URL must not target private or internal addresses', 400);
    }

    const webhook = await prisma.webhook.create({
      data: {
        name: req.body.name,
        url: req.body.url,
        events: req.body.events,
        secret: req.body.secret || null,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: { ...webhook, secret: webhook.secret ? '***' : null } });
  } catch (error) {
    next(error);
  }
});

// Update webhook
// Note: No per-user ownership check (IDOR) is needed here because this endpoint
// requires SETTINGS_UPDATE permission, making it admin-only by design.
router.put('/:id', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), param('id').isUUID(), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('url').optional().trim().isURL(),
  body('events').optional().isArray({ min: 1 }),
  body('isActive').optional().isBoolean(),
  body('secret').optional().trim(),
], validate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.body.url && await isPrivateUrl(req.body.url)) {
      throw new AppError('Webhook URL must not target private or internal addresses', 400);
    }

    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.url && { url: req.body.url }),
        ...(req.body.events && { events: req.body.events }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        ...(req.body.secret !== undefined && { secret: req.body.secret || null }),
      },
    });
    res.json({ success: true, data: { ...webhook, secret: webhook.secret ? '***' : null } });
  } catch (error) {
    next(error);
  }
});

// Delete webhook
// Note: No per-user ownership check (IDOR) is needed here because this endpoint
// requires SETTINGS_UPDATE permission, making it admin-only by design.
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Test webhook
router.post('/:id/test', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!webhook) throw new AppError('Webhook not found', 404);

    if (await isPrivateUrl(webhook.url)) {
      throw new AppError('Webhook URL must not target private or internal addresses', 400);
    }

    const payload = JSON.stringify({
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery' },
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'test',
    };

    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(webhook.url, { method: 'POST', headers, body: payload, signal: controller.signal });
      clearTimeout(timeout);
      res.json({ success: true, data: { status: response.status, ok: response.ok } });
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (error) {
    next(error);
  }
});

export default router;

// Utility function to dispatch webhook events (used by other services)
export async function dispatchWebhookEvent(event: string, data: any) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { isActive: true, events: { has: event } },
    });

    for (const webhook of webhooks) {
      const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
      };

      if (webhook.secret) {
        const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      // Fire and forget with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      fetch(webhook.url, { method: 'POST', headers, body: payload, signal: controller.signal })
        .then(() => clearTimeout(timeout))
        .catch(() => clearTimeout(timeout));
    }
  } catch {
    // Don't let webhook failures affect main operations
  }
}

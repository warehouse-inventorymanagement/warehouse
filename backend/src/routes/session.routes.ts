import { Router, Response } from 'express';
import { param } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get current user's active sessions
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.user!.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// Revoke a specific session
router.delete('/:id', authenticate, param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.userSession.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Revoke all other sessions (keep current)
router.post('/revoke-all', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const currentToken = req.headers.authorization?.replace('Bearer ', '') || '';
    // Delete all sessions except the current one
    const crypto = await import('crypto');
    const currentHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    await prisma.userSession.deleteMany({
      where: {
        userId: req.user!.id,
        token: { not: currentHash },
      },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

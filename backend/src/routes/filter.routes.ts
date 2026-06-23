import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all saved filters for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const filters = await prisma.savedFilter.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: filters.map(f => ({ ...f, filters: JSON.parse(f.filters) })) });
  } catch (error) {
    next(error);
  }
});

// Create saved filter
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('filters').isObject().custom((value) => {
    const json = JSON.stringify(value);
    if (json.length > 10000) throw new Error('Filter data too large (max 10KB)');
    const checkDepth = (obj: any, depth = 0): boolean => {
      if (depth > 5) return false;
      if (typeof obj !== 'object' || obj === null) return true;
      return Object.values(obj).every(v => checkDepth(v, depth + 1));
    };
    if (!checkDepth(value)) throw new Error('Filter data too deeply nested (max 5 levels)');
    return true;
  }),
], validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const filter = await prisma.savedFilter.create({
      data: {
        userId: req.user!.id,
        name: req.body.name,
        filters: JSON.stringify(req.body.filters),
      },
    });
    res.status(201).json({ success: true, data: { ...filter, filters: JSON.parse(filter.filters) } });
  } catch (error) {
    next(error);
  }
});

// Update saved filter
router.put('/:id', authenticate, param('id').isUUID(), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('filters').optional().isObject().custom((value) => {
    const json = JSON.stringify(value);
    if (json.length > 10000) throw new Error('Filter data too large (max 10KB)');
    const checkDepth = (obj: any, depth = 0): boolean => {
      if (depth > 5) return false;
      if (typeof obj !== 'object' || obj === null) return true;
      return Object.values(obj).every(v => checkDepth(v, depth + 1));
    };
    if (!checkDepth(value)) throw new Error('Filter data too deeply nested (max 5 levels)');
    return true;
  }),
], validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const filter = await prisma.savedFilter.updateMany({
      where: { id, userId: req.user!.id },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.filters && { filters: JSON.stringify(req.body.filters) }),
      },
    });
    if (filter.count === 0) return res.status(404).json({ success: false, message: 'Filter not found' });
    const updated = await prisma.savedFilter.findUnique({ where: { id } });
    res.json({ success: true, data: { ...updated!, filters: JSON.parse(updated!.filters) } });
  } catch (error) {
    next(error);
  }
});

// Delete saved filter
router.delete('/:id', authenticate, param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.savedFilter.deleteMany({ where: { id: req.params.id as string, userId: req.user!.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Set filter as default
router.patch('/:id/default', authenticate, param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    // Clear existing defaults
    await prisma.savedFilter.updateMany({
      where: { userId: req.user!.id, isDefault: true },
      data: { isDefault: false },
    });
    // Set new default
    await prisma.savedFilter.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data: { isDefault: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

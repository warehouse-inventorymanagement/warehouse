import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import bwipjs from 'bwip-js';
import prisma from '../lib/prisma.js';

const router = Router();

// Build hierarchy path for a location (returns array of names from root to location)
const buildHierarchyPath = async (locationId: string): Promise<string[]> => {
  const path: string[] = [];
  let currentId: string | null = locationId;

  while (currentId) {
    const loc = await prisma.location.findUnique({
      where: { id: currentId },
      select: { name: true, parentId: true }
    });
    if (!loc) break;
    path.unshift(loc.name);
    currentId = loc.parentId;
  }
  return path;
};

// Sanitize name for barcode (uppercase, alphanumeric only, max 10 chars)
const sanitizeForBarcode = (name: string): string => {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
};

// Barcode format options
type BarcodeFormat = 'short' | 'full';

// Generate a barcode string from hierarchy path
const generateBarcodeString = (hierarchyPath: string[], format: BarcodeFormat = 'short'): string => {
  // Short format uses only last 2 levels, full uses entire hierarchy
  const pathToUse = format === 'short' ? hierarchyPath.slice(-2) : hierarchyPath;
  const sanitizedPath = pathToUse.map(sanitizeForBarcode).join('-');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${sanitizedPath}-${randomPart}`;
};

// Generate unique barcode using hierarchy path
const generateUniqueBarcode = async (locationName: string, parentId: string | null, format: BarcodeFormat = 'short'): Promise<string> => {
  // Build hierarchy path including the new location
  const parentPath = parentId ? await buildHierarchyPath(parentId) : [];
  const fullPath = [...parentPath, locationName];

  let barcode: string;
  let exists = true;

  while (exists) {
    barcode = generateBarcodeString(fullPath, format);
    const existing = await prisma.location.findUnique({ where: { barcode } });
    exists = !!existing;
  }

  return barcode!;
};

// Valid location types in hierarchy order
const LOCATION_TYPES = ['location', 'room', 'zone', 'aisle', 'row', 'bay', 'shelf', 'bin', 'box'] as const;
type LocationType = typeof LOCATION_TYPES[number];

// Get all locations (with hierarchy)
router.get('/', authenticate, requirePermission(PERMISSIONS.LOCATIONS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const flat = req.query.flat === 'true';
    const type = req.query.type as string | undefined;

    if (flat) {
      const locations = await prisma.location.findMany({
        where: type ? { type } : undefined,
        orderBy: { name: 'asc' },
        include: {
          parent: { select: { id: true, name: true, type: true } },
          _count: { select: { items: true, children: true } }
        }
      });
      return res.json({ success: true, data: locations });
    }

    // Get root locations with nested children (deep hierarchy)
    const locations = await prisma.location.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    children: {
                      include: {
                        children: true // 5 levels deep: location -> zone -> aisle -> row -> shelf -> bin
                      }
                    }
                  }
                }
              }
            }
          }
        },
        _count: { select: { items: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
});

// Get location types
router.get('/types', authenticate, requirePermission(PERMISSIONS.LOCATIONS_READ), async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: LOCATION_TYPES.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  });
});

// Get children of a location
router.get(
  '/:id/children',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const children = await prisma.location.findMany({
        where: { parentId: id },
        include: {
          _count: { select: { items: true, children: true } }
        },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, data: children });
    } catch (error) {
      next(error);
    }
  }
);

// Get single location with items
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          parent: true,
          children: {
            include: {
              _count: { select: { items: true, children: true } }
            },
            orderBy: { name: 'asc' }
          },
          items: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              minQuantity: true,
              images: {
                where: { isPrimary: true },
                select: { filename: true },
                take: 1
              }
            },
            take: 100,
            orderBy: { name: 'asc' }
          },
          _count: { select: { items: true, children: true } }
        }
      });

      if (!location) {
        throw new AppError('Location not found', 404);
      }

      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// Get location path (breadcrumb)
router.get(
  '/:id/path',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const path: { id: string; name: string; type: string }[] = [];
      let currentId: string | null = req.params.id as string;

      while (currentId) {
        const location = await prisma.location.findUnique({
          where: { id: currentId },
          select: { id: true, name: true, type: true, parentId: true }
        });

        if (!location) break;

        path.unshift({ id: location.id, name: location.name, type: location.type });
        currentId = location.parentId;
      }

      res.json({ success: true, data: path });
    } catch (error) {
      next(error);
    }
  }
);

// Create location
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_CREATE),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
    body('type').optional().isIn(LOCATION_TYPES),
    body('address').optional().trim(),
    body('parentId').optional().isUUID(),
    body('capacity').optional().isInt({ min: 0 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { name, description, type = 'location', address, parentId, capacity } = req.body;

      if (parentId) {
        const parent = await prisma.location.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw new AppError('Parent location not found', 404);
        }
      }

      // Auto-generate barcode based on hierarchy
      const barcode = await generateUniqueBarcode(name, parentId);

      const location = await prisma.location.create({
        data: { name, description, type, address, parentId, barcode, ...(capacity !== undefined && { capacity }) },
        include: { parent: true }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'location',
        entityId: location.id,
        entityName: location.name,
        req,
      });

      res.status(201).json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// Update location
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_UPDATE),
  param('id').isUUID(),
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
    body('type').optional().isIn(LOCATION_TYPES),
    body('address').optional({ nullable: true }).trim(),
    body('parentId').optional({ nullable: true }),
    body('capacity').optional({ nullable: true }).isInt({ min: 0 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { name, description, type, address, parentId, capacity } = req.body;

      const existingLocation = await prisma.location.findUnique({ where: { id } });
      if (!existingLocation) {
        throw new AppError('Location not found', 404);
      }

      // Prevent circular reference
      if (parentId === id) {
        throw new AppError('Location cannot be its own parent', 400);
      }

      // Check if new parent is a descendant (would create cycle)
      if (parentId) {
        let checkId: string | null = parentId;
        while (checkId) {
          if (checkId === id) {
            throw new AppError('Cannot move location under its own descendant', 400);
          }
          const loc = await prisma.location.findUnique({
            where: { id: checkId },
            select: { parentId: true }
          });
          checkId = loc?.parentId || null;
        }
      }

      const location = await prisma.location.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(type && { type }),
          ...(address !== undefined && { address: address || null }),
          ...(parentId !== undefined && { parentId }),
          ...(capacity !== undefined && { capacity })
        },
        include: { parent: true }
      });

      // Audit log with changes
      const changes = getChanges(existingLocation, location, ['name', 'description', 'type', 'address', 'parentId']);
      if (changes) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'location',
          entityId: location.id,
          entityName: location.name,
          changes,
          req,
        });
      }

      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// Delete location
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const force = req.query.force === 'true';

      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          _count: { select: { items: true, children: true } }
        }
      });

      if (!location) {
        throw new AppError('Location not found', 404);
      }

      // Check if location has items
      if (location._count.items > 0) {
        throw new AppError(`Cannot delete location with ${location._count.items} items`, 400);
      }

      // Check if location has children
      if (location._count.children > 0 && !force) {
        throw new AppError(`Cannot delete location with ${location._count.children} sub-locations. Use force=true to delete recursively.`, 400);
      }

      // If force delete, delete all children recursively (cascade is set in schema)
      await prisma.location.delete({ where: { id } });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'location',
        entityId: location.id,
        entityName: location.name,
        req,
      });

      res.json({ success: true, message: 'Location deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Generate/Regenerate barcode for a location
router.post(
  '/:id/generate-barcode',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_BARCODE),
  param('id').isUUID(),
  body('format').optional().isIn(['short', 'full']).withMessage('Format must be short or full'),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const format = (req.body.format || 'short') as BarcodeFormat;

      const location = await prisma.location.findUnique({ where: { id } });
      if (!location) {
        throw new AppError('Location not found', 404);
      }

      const barcode = await generateUniqueBarcode(location.name, location.parentId, format);

      const updated = await prisma.location.update({
        where: { id },
        data: { barcode }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'location',
        entityId: location.id,
        entityName: location.name,
        changes: { barcode: { old: location.barcode, new: barcode } },
        req,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Update barcode manually
router.put(
  '/:id/barcode',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_BARCODE),
  param('id').isUUID(),
  body('barcode').trim().isLength({ min: 1, max: 50 }).withMessage('Barcode must be 1-50 characters'),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { barcode } = req.body;

      const location = await prisma.location.findUnique({ where: { id } });
      if (!location) {
        throw new AppError('Location not found', 404);
      }

      // Check if barcode is already in use by another location
      const existing = await prisma.location.findUnique({ where: { barcode } });
      if (existing && existing.id !== id) {
        throw new AppError('This barcode is already in use by another location', 400);
      }

      const updated = await prisma.location.update({
        where: { id },
        data: { barcode }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'location',
        entityId: location.id,
        entityName: location.name,
        changes: { barcode: { old: location.barcode, new: barcode } },
        req,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Get barcode image (Code128)
router.get(
  '/:id/barcode',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;

      const location = await prisma.location.findUnique({ where: { id } });
      if (!location) {
        throw new AppError('Location not found', 404);
      }

      if (!location.barcode) {
        throw new AppError('Location does not have a barcode', 400);
      }

      const png = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: location.barcode,
        scale: 4,
        eclevel: 'M',
        padding: 2,
      } as any);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${location.barcode}.png"`);
      res.send(png);
    } catch (error) {
      next(error);
    }
  }
);

// Lookup location by barcode
router.get(
  '/scan/:code',
  authenticate,
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const code = req.params.code as string;

      const location = await prisma.location.findUnique({
        where: { barcode: code },
        include: {
          parent: true,
          children: {
            include: {
              _count: { select: { items: true, children: true } }
            },
            orderBy: { name: 'asc' }
          },
          items: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              minQuantity: true,
              images: {
                where: { isPrimary: true },
                take: 1
              }
            },
            orderBy: { name: 'asc' }
          },
          _count: { select: { items: true, children: true } }
        }
      });

      if (!location) {
        throw new AppError('Location not found for this barcode', 404);
      }

      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// Capacity overview - all locations with capacity info
router.get('/capacity-overview', authenticate, requirePermission(PERMISSIONS.LOCATIONS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: { capacity: { not: null } },
      select: {
        id: true,
        name: true,
        type: true,
        capacity: true,
        barcode: true,
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    const data = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      capacity: loc.capacity,
      currentLoad: loc._count.items,
      fillPercent: loc.capacity ? Math.round((loc._count.items / loc.capacity) * 100) : 0,
      barcode: loc.barcode,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Print labels - generate printable HTML with QR codes
router.post('/print-labels', authenticate, requirePermission(PERMISSIONS.LOCATIONS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No location IDs provided', 400);
    }

    const locations = await prisma.location.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, type: true, barcode: true },
    });

    // Generate QR codes as base64 for each location
    const labels = await Promise.all(locations.map(async (loc) => {
      const code = loc.barcode || loc.id;
      try {
        const png = await bwipjs.toBuffer({
          bcid: 'qrcode',
          text: code,
          scale: 3,
          width: 30,
          height: 30,
        });
        return {
          name: loc.name,
          type: loc.type,
          barcode: code,
          qrDataUrl: `data:image/png;base64,${png.toString('base64')}`,
        };
      } catch {
        return { name: loc.name, type: loc.type, barcode: code, qrDataUrl: '' };
      }
    }));

    // Return printable HTML
    const html = `<!DOCTYPE html>
<html><head><title>Location Labels</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; }
  .label { display: inline-block; width: 2.5in; height: 1.5in; border: 1px dashed #ccc; margin: 0.1in; padding: 0.15in; text-align: center; page-break-inside: avoid; vertical-align: top; }
  .label img { width: 80px; height: 80px; }
  .label .name { font-weight: bold; font-size: 11px; margin-top: 4px; }
  .label .type { font-size: 9px; color: #666; }
  .label .code { font-size: 8px; color: #999; margin-top: 2px; }
  @media print { .label { border: 1px solid #eee; } }
</style></head><body>
${labels.map(l => `<div class="label">
  ${l.qrDataUrl ? `<img src="${l.qrDataUrl}" />` : ''}
  <div class="name">${l.name}</div>
  <div class="type">${l.type}</div>
  <div class="code">${l.barcode}</div>
</div>`).join('\n')}
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

export default router;

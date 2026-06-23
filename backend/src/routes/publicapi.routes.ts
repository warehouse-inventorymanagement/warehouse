import { Router, Request, Response, NextFunction } from 'express';
import { authenticateApiKey, requireApiPermission } from '../middleware/apiKeyAuth.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Apply API key authentication to all routes
router.use(authenticateApiKey);

// Middleware to ensure API key is present (after authenticateApiKey runs)
const ensureApiKey = (req: Request, res: Response, next: Function) => {
  if (!req.apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required. Provide via X-API-Key header or Authorization: Bearer <key>'
    });
  }
  next();
};

router.use(ensureApiKey);

// Apply rate limiting after authentication
router.use(apiRateLimit);

// Middleware to track API usage (async, non-blocking)
const trackUsage = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Log usage asynchronously
    if (req.apiKey) {
      const responseMs = Date.now() - startTime;
      prisma.apiKeyUsage.create({
        data: {
          apiKeyId: req.apiKey.id,
          endpoint: req.originalUrl.split('?')[0], // Remove query params
          method: req.method,
          statusCode: res.statusCode,
          responseMs,
          requestIp: req.clientIp || req.ip || 'unknown',
        }
      }).catch(err => console.error('Failed to log API usage:', err));
    }
    return originalJson(body);
  };

  next();
};

router.use(trackUsage);

// ==================== ITEMS ====================

/**
 * @openapi
 * /items:
 *   get:
 *     summary: List all items
 *     description: Retrieve a paginated list of items with optional filtering
 *     tags: [Items]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Items per page (max 100)
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search in name, SKU, and description
 *       - name: categoryId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - name: locationId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *       - name: lowStock
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter to show only low stock items
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Invalid or missing API key
 *       403:
 *         description: Missing required permission
 */
router.get('/items', requireApiPermission('items:read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', search, categoryId, locationId, lowStock } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (lowStock === 'true') {
      where.AND = [
        { minQuantity: { gt: 0 } },
        { quantity: { lte: prisma.item.fields.minQuantity } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
          images: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.item.count({ where })
    ]);

    res.json({
      success: true,
      data: items.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        category: item.category,
        location: item.location,
        tags: item.tags.map(t => t.tag),
        primaryImage: item.images[0]?.filename || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('API Error - GET /items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

/**
 * @openapi
 * /items/{id}:
 *   get:
 *     summary: Get a single item
 *     description: Retrieve detailed information about a specific item
 *     tags: [Items]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 */
router.get('/items/:id', requireApiPermission('items:read'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, type: true } },
        tags: { include: { tag: true } },
        images: true,
        attributes: true,
        template: { select: { id: true, name: true } },
      }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({
      success: true,
      data: {
        ...item,
        tags: item.tags.map(t => t.tag),
      }
    });
  } catch (error) {
    console.error('API Error - GET /items/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch item' });
  }
});

/**
 * @openapi
 * /items:
 *   post:
 *     summary: Create a new item
 *     description: Create a new inventory item
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Item name
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit (unique)
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               locationId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 default: 0
 *               minQuantity:
 *                 type: integer
 *                 default: 0
 *                 description: Low stock threshold
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tag IDs
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Invalid request (missing name, duplicate SKU)
 */
router.post('/items', requireApiPermission('items:write'), async (req: Request, res: Response) => {
  try {
    const { name, sku, description, categoryId, locationId, quantity, minQuantity, tags, attributes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // Check for duplicate SKU
    if (sku) {
      const existingSku = await prisma.item.findFirst({ where: { sku, deletedAt: null } });
      if (existingSku) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }
    }

    const item = await prisma.item.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        categoryId: categoryId || null,
        locationId: locationId || null,
        quantity: quantity || 0,
        minQuantity: minQuantity || 0,
        createdById: req.apiKey!.userId,
        tags: tags?.length ? {
          create: tags.map((tagId: string) => ({ tagId }))
        } : undefined,
        attributes: attributes?.length ? {
          create: attributes.map((attr: any) => ({
            attributeName: attr.name,
            attributeValue: attr.value,
          }))
        } : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attributes: true,
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...item,
        tags: item.tags.map(t => t.tag),
      }
    });
  } catch (error) {
    console.error('API Error - POST /items:', error);
    res.status(500).json({ success: false, message: 'Failed to create item' });
  }
});

// PATCH /api/v1/items/:id - Update item
router.patch('/items/:id', requireApiPermission('items:write'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, sku, description, categoryId, locationId, minQuantity, tags, attributes } = req.body;

    const existing = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Check for duplicate SKU
    if (sku && sku !== existing.sku) {
      const existingSku = await prisma.item.findFirst({ where: { sku, deletedAt: null, NOT: { id } } });
      if (existingSku) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(description !== undefined && { description: description || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(minQuantity !== undefined && { minQuantity }),
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attributes: true,
      }
    });

    // Update tags if provided
    if (tags !== undefined) {
      await prisma.itemTag.deleteMany({ where: { itemId: id } });
      if (tags.length > 0) {
        await prisma.itemTag.createMany({
          data: tags.map((tagId: string) => ({ itemId: id, tagId }))
        });
      }
    }

    // Update attributes if provided
    if (attributes !== undefined) {
      await prisma.itemAttribute.deleteMany({ where: { itemId: id } });
      if (attributes.length > 0) {
        await prisma.itemAttribute.createMany({
          data: attributes.map((attr: any) => ({
            itemId: id,
            attributeName: attr.name,
            attributeValue: attr.value,
          }))
        });
      }
    }

    // Refetch with updates
    const updatedItem = await prisma.item.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attributes: true,
      }
    });

    res.json({
      success: true,
      data: {
        ...updatedItem,
        tags: updatedItem?.tags.map(t => t.tag),
      }
    });
  } catch (error) {
    console.error('API Error - PATCH /items/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
});

// DELETE /api/v1/items/:id - Soft delete item
router.delete('/items/:id', requireApiPermission('items:delete'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await prisma.item.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: req.apiKey!.userId,
      }
    });

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('API Error - DELETE /items/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
});

// ==================== INVENTORY ====================

/**
 * @openapi
 * /items/{id}/adjust:
 *   post:
 *     summary: Adjust stock quantity
 *     description: Add or remove stock from an item. Use positive values to add, negative to remove.
 *     tags: [Inventory]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Quantity to add (positive) or remove (negative)
 *                 example: -5
 *               notes:
 *                 type: string
 *                 description: Optional note for the adjustment
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     oldQuantity:
 *                       type: integer
 *                     newQuantity:
 *                       type: integer
 *                     adjustment:
 *                       type: integer
 *       400:
 *         description: Insufficient stock or invalid quantity
 *       404:
 *         description: Item not found
 */
router.post('/items/:id/adjust', requireApiPermission('inventory:write'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { quantity, notes } = req.body;

    if (quantity === undefined || typeof quantity !== 'number') {
      return res.status(400).json({ success: false, message: 'Quantity adjustment is required' });
    }

    const item = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const newQuantity = item.quantity + quantity;
    if (newQuantity < 0) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    const [updatedItem] = await prisma.$transaction([
      prisma.item.update({
        where: { id },
        data: { quantity: newQuantity }
      }),
      prisma.itemHistory.create({
        data: {
          itemId: id,
          userId: req.apiKey!.userId,
          action: quantity > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          oldQuantity: item.quantity,
          newQuantity,
          notes: notes || `API adjustment: ${quantity > 0 ? '+' : ''}${quantity}`,
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        id: updatedItem.id,
        name: updatedItem.name,
        oldQuantity: item.quantity,
        newQuantity: updatedItem.quantity,
        adjustment: quantity,
      }
    });
  } catch (error) {
    console.error('API Error - POST /items/:id/adjust:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
});

// GET /api/v1/items/:id/history - Get item history
router.get('/items/:id/history', requireApiPermission('inventory:read'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { limit = '50' } = req.query;

    const item = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const history = await prisma.itemHistory.findMany({
      where: { itemId: id },
      include: {
        user: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100)
    });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('API Error - GET /items/:id/history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// ==================== CATEGORIES ====================

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', requireApiPermission('categories:read'), async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { items: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('API Error - GET /categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// POST /api/v1/categories - Create category
router.post('/categories', requireApiPermission('categories:write'), async (req: Request, res: Response) => {
  try {
    const { name, description, parentId, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        parentId: parentId || null,
        icon: icon || null,
      }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('API Error - POST /categories:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// ==================== LOCATIONS ====================

/**
 * @openapi
 * /locations:
 *   get:
 *     summary: List all locations
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: List of locations with hierarchy
 */
router.get('/locations', requireApiPermission('locations:read'), async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      include: {
        parent: { select: { id: true, name: true, type: true } },
        _count: { select: { items: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('API Error - GET /locations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// POST /api/v1/locations - Create location
router.post('/locations', requireApiPermission('locations:write'), async (req: Request, res: Response) => {
  try {
    const { name, description, type, parentId, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const location = await prisma.location.create({
      data: {
        name,
        description: description || null,
        type: type || 'location',
        parentId: parentId || null,
        address: address || null,
      }
    });

    res.status(201).json({ success: true, data: location });
  } catch (error) {
    console.error('API Error - POST /locations:', error);
    res.status(500).json({ success: false, message: 'Failed to create location' });
  }
});

// ==================== TAGS ====================

/**
 * @openapi
 * /tags:
 *   get:
 *     summary: List all tags
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: List of tags
 */
router.get('/tags', requireApiPermission('tags:read'), async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('API Error - GET /tags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tags' });
  }
});

// POST /api/v1/tags - Create tag
router.post('/tags', requireApiPermission('tags:write'), async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#6B7280',
      }
    });

    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Tag name already exists' });
    }
    console.error('API Error - POST /tags:', error);
    res.status(500).json({ success: false, message: 'Failed to create tag' });
  }
});

// ==================== REPORTS ====================

/**
 * @openapi
 * /reports/low-stock:
 *   get:
 *     summary: Get low stock items
 *     description: Returns items where quantity is at or below minimum threshold
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: List of low stock items
 */
router.get('/reports/low-stock', requireApiPermission('reports:read'), async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        deletedAt: null,
        minQuantity: { gt: 0 },
        quantity: { lte: prisma.item.fields.minQuantity }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minQuantity: true,
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' }
    });

    // Filter in memory since Prisma doesn't support comparing fields directly
    const lowStockItems = items.filter(item => item.quantity <= item.minQuantity);

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    console.error('API Error - GET /reports/low-stock:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock report' });
  }
});

// GET /api/v1/reports/inventory-summary - Get inventory summary
router.get('/reports/inventory-summary', requireApiPermission('reports:read'), async (req: Request, res: Response) => {
  try {
    const [totalItems, totalQuantity, categoryCount, locationCount, lowStockCount] = await Promise.all([
      prisma.item.count({ where: { deletedAt: null } }),
      prisma.item.aggregate({
        where: { deletedAt: null },
        _sum: { quantity: true }
      }),
      prisma.category.count(),
      prisma.location.count(),
      prisma.item.count({
        where: {
          deletedAt: null,
          minQuantity: { gt: 0 },
          quantity: { lte: prisma.item.fields.minQuantity }
        }
      }).then(async () => {
        // Get actual count by filtering
        const items = await prisma.item.findMany({
          where: {
            deletedAt: null,
            minQuantity: { gt: 0 }
          },
          select: { quantity: true, minQuantity: true }
        });
        return items.filter(i => i.quantity <= i.minQuantity).length;
      })
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        totalQuantity: totalQuantity._sum.quantity || 0,
        categoryCount,
        locationCount,
        lowStockCount: await lowStockCount,
      }
    });
  } catch (error) {
    console.error('API Error - GET /reports/inventory-summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory summary' });
  }
});

// ==================== WEBHOOKS ====================

/**
 * @openapi
 * /webhooks:
 *   get:
 *     summary: List all webhooks
 *     description: Retrieve all configured webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Webhook'
 *       401:
 *         description: Unauthorized
 */
router.get('/webhooks', requireApiPermission('webhooks:read'), async (req: Request, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('API Error - GET /webhooks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch webhooks' });
  }
});

/**
 * @openapi
 * /webhooks:
 *   post:
 *     summary: Create a webhook
 *     description: Create a new webhook to receive event notifications
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url, events]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name for the webhook
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL to send webhook payloads to
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [item.created, item.updated, item.deleted, category.created, category.updated, category.deleted]
 *                 description: Events to subscribe to
 *               secret:
 *                 type: string
 *                 description: Optional secret for HMAC-SHA256 signature verification
 *     responses:
 *       201:
 *         description: Webhook created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Webhook'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/webhooks', requireApiPermission('webhooks:write'), async (req: Request, res: Response) => {
  try {
    const { name, url, events, secret } = req.body;

    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'name, url, and events (non-empty array) are required' });
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        events,
        secret: secret || null,
        userId: req.apiKey!.userId,
      },
    });

    res.status(201).json({ success: true, data: { ...webhook, secret: webhook.secret ? '***' : null } });
  } catch (error) {
    console.error('API Error - POST /webhooks:', error);
    res.status(500).json({ success: false, message: 'Failed to create webhook' });
  }
});

/**
 * @openapi
 * /webhooks/{id}:
 *   patch:
 *     summary: Update a webhook
 *     description: Update an existing webhook's configuration
 *     tags: [Webhooks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               secret:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Webhook updated
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/webhooks/:id', requireApiPermission('webhooks:write'), async (req: Request, res: Response) => {
  try {
    const { name, url, events, isActive, secret } = req.body;

    const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(events !== undefined && { events }),
        ...(isActive !== undefined && { isActive }),
        ...(secret !== undefined && { secret: secret || null }),
      },
    });

    res.json({ success: true, data: { ...webhook, secret: webhook.secret ? '***' : null } });
  } catch (error) {
    console.error('API Error - PATCH /webhooks/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to update webhook' });
  }
});

/**
 * @openapi
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     description: Permanently delete a webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook deleted
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/webhooks/:id', requireApiPermission('webhooks:delete'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    console.error('API Error - DELETE /webhooks/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to delete webhook' });
  }
});

/**
 * @openapi
 * /webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook
 *     description: Send a test payload to the webhook URL to verify it's working
 *     tags: [Webhooks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       description: HTTP status code from the webhook endpoint
 *                     ok:
 *                       type: boolean
 *                       description: Whether the response was successful (2xx)
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.post('/webhooks/:id/test', requireApiPermission('webhooks:write'), async (req: Request, res: Response) => {
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    const crypto = await import('crypto');
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

    const response = await fetch(webhook.url, { method: 'POST', headers, body: payload });
    res.json({ success: true, data: { status: response.status, ok: response.ok } });
  } catch (error) {
    console.error('API Error - POST /webhooks/:id/test:', error);
    res.status(500).json({ success: false, message: 'Failed to test webhook' });
  }
});

export default router;

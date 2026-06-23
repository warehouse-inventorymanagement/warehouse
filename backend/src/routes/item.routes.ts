import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuid } from 'uuid';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import bwipjs from 'bwip-js';
// sharp removed — only browser-native image formats accepted
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import { softDeleteItem, softDeleteItems, getSubItems, softDeleteImage, restoreImage as restoreQuarantineImage, getDeletedImagesForItem } from '../services/quarantine.service.js';
import { triggerItemQuarantinedNotification, triggerItemCreatedNotification } from '../services/notification.service.js';
import { createVersion, getVersions, getVersion, rollbackToVersion } from '../services/itemVersion.service.js';
import { dispatchWebhookEvent } from './webhook.routes.js';
import { sanitizeSvg } from '../utils/sanitizeSvg.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * Generate a unique SKU
 * Format: PREFIX-YYMMDD-XXXX (e.g., ITEM-240126-A7B3)
 */
async function generateUniqueSku(prefix: string = 'ITEM'): Promise<string> {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  let sku: string;
  let exists = true;

  while (exists) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    sku = `${prefix}-${datePart}-${random}`;
    const existing = await prisma.item.findUnique({ where: { sku } });
    exists = !!existing;
  }

  return sku!;
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/bmp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: JPEG, PNG, GIF, WebP, SVG, AVIF, BMP.'));
    }
  }
});

// Import upload configuration (accepts CSV or ZIP)
const importStorage = multer.memoryStorage();
const importUpload = multer({
  storage: importStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for ZIP with images
  fileFilter: (req, file, cb) => {
    const isCSV = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
    const isZIP = file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip');
    if (isCSV || isZIP) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or ZIP files are allowed'));
    }
  }
});

// Store for tracking extracted ZIP temp directories per session
const extractedZipPaths = new Map<string, string>();

// Helper to get mimeType from filename
const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
};

// Helper to build location path with full data
const buildLocationDataFromId = (locationId: string, allLocations: any[]): {
  path: string;
  types: string;
  descriptions: string;
  addresses: string;
} => {
  const names: string[] = [];
  const types: string[] = [];
  const descriptions: string[] = [];
  const addresses: string[] = [];
  let current = allLocations.find(l => l.id === locationId);
  while (current) {
    names.unshift(current.name);
    types.unshift(current.type || '');
    descriptions.unshift(current.description || '');
    addresses.unshift(current.address || '');
    current = current.parentId ? allLocations.find(l => l.id === current.parentId) : undefined;
  }
  return {
    path: names.join(' > '),
    types: types.join(';'),
    descriptions: descriptions.join(';'),
    addresses: addresses.join(';')
  };
};

// Helper to build category path with full data
const buildCategoryDataFromId = (categoryId: string, allCategories: any[]): {
  path: string;
  descriptions: string;
  icons: string;
  iconColors: string;
  iconBgColors: string;
} => {
  const names: string[] = [];
  const descriptions: string[] = [];
  const icons: string[] = [];
  const iconColors: string[] = [];
  const iconBgColors: string[] = [];
  let current = allCategories.find(c => c.id === categoryId);
  while (current) {
    names.unshift(current.name);
    descriptions.unshift(current.description || '');
    icons.unshift(current.icon || '');
    iconColors.unshift(current.iconColor || '');
    iconBgColors.unshift(current.iconBackgroundColor || '');
    current = current.parentId ? allCategories.find(c => c.id === current.parentId) : undefined;
  }
  return {
    path: names.join(' > '),
    descriptions: descriptions.join(';'),
    icons: icons.join(';'),
    iconColors: iconColors.join(';'),
    iconBgColors: iconBgColors.join(';')
  };
};

// Helper to build location path array for API response
async function buildLocationPath(locationId: string | null): Promise<{ id: string; name: string; type: string }[]> {
  if (!locationId) return [];
  const path: { id: string; name: string; type: string }[] = [];
  let currentId: string | null = locationId;
  while (currentId) {
    const loc = await prisma.location.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, type: true, parentId: true }
    });
    if (!loc) break;
    path.unshift({ id: loc.id, name: loc.name, type: loc.type });
    currentId = loc.parentId;
  }
  return path;
}

// Helper to build category path array for API response
async function buildCategoryPath(categoryId: string | null): Promise<{ id: string; name: string }[]> {
  if (!categoryId) return [];
  const path: { id: string; name: string }[] = [];
  let currentId: string | null = categoryId;
  while (currentId) {
    const cat = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true }
    });
    if (!cat) break;
    path.unshift({ id: cat.id, name: cat.name });
    currentId = cat.parentId;
  }
  return path;
}

// Export options interface
interface ExportOptions {
  includeImages?: boolean;
  includeTags?: boolean;
  includeCategory?: boolean;
  includeLocation?: boolean;
}

// Helper function to export items as ZIP with images
const exportItemsToZip = async (where: any, res: Response, options: ExportOptions = {}) => {
  const {
    includeImages = true,
    includeTags = true,
    includeCategory = true,
    includeLocation = true
  } = options;

  const uploadDir = process.env.UPLOAD_DIR || './uploads';

  // Build include object conditionally
  const itemInclude: any = {
    template: true,
    attributes: true
  };
  if (includeCategory) itemInclude.category = true;
  if (includeLocation) itemInclude.location = true;
  if (includeTags) itemInclude.tags = { include: { tag: true } };
  if (includeImages) itemInclude.images = { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }] };

  const [items, allLocations, allCategories] = await Promise.all([
    prisma.item.findMany({
      where,
      include: itemInclude,
      orderBy: { name: 'asc' }
    }),
    includeLocation ? prisma.location.findMany() : Promise.resolve([]),
    includeCategory ? prisma.category.findMany() : Promise.resolve([])
  ]);

  // Collect all unique image filenames (only if including images)
  const imageFilenames = new Set<string>();
  if (includeImages) {
    items.forEach(item => {
      if (item.images) {
        item.images.forEach((img: any) => imageFilenames.add(img.filename));
      }
    });
  }

  const csvData = items.map(item => {
    const categoryData = includeCategory && item.categoryId
      ? buildCategoryDataFromId(item.categoryId, allCategories)
      : { path: '', descriptions: '', icons: '', iconColors: '', iconBgColors: '' };
    const locationData = includeLocation && item.locationId
      ? buildLocationDataFromId(item.locationId, allLocations)
      : { path: '', types: '', descriptions: '', addresses: '' };

    return {
      name: item.name,
      sku: item.sku || '',
      description: item.description || '',
      category: categoryData.path,
      categoryDescriptions: categoryData.descriptions,
      categoryIcons: categoryData.icons,
      categoryIconColors: categoryData.iconColors,
      categoryIconBgColors: categoryData.iconBgColors,
      location: locationData.path,
      locationTypes: locationData.types,
      locationDescriptions: locationData.descriptions,
      locationAddresses: locationData.addresses,
      template: (item.template as any)?.name || '',
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      tags: includeTags && item.tags ? item.tags.map((t: any) => t.tag.name).join(';') : '',
      tagColors: includeTags && item.tags ? item.tags.map((t: any) => t.tag.color || '').join(';') : '',
      tagIcons: includeTags && item.tags ? item.tags.map((t: any) => t.tag.icon || '').join(';') : '',
      tagIconColors: includeTags && item.tags ? item.tags.map((t: any) => t.tag.iconColor || '').join(';') : '',
      tagIconBgColors: includeTags && item.tags ? item.tags.map((t: any) => t.tag.iconBackgroundColor || '').join(';') : '',
      attributes: item.attributes.map((a: any) => `${a.attributeName}=${a.attributeValue}`).join(';'),
      images: includeImages && item.images ? (item.images as any[]).map((img: any) => img.filename).join(';') : '',
      primaryImage: includeImages && item.images ? ((item.images as any[]).find((img: any) => img.isPrimary)?.filename || (item.images as any[])[0]?.filename || '') : ''
    };
  });

  const csv = csvStringify(csvData, { header: true });
  const dateStr = new Date().toISOString().split('T')[0];

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 9 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="items-export-${dateStr}.zip"`);

  archive.pipe(res);

  // Add CSV file
  archive.append(csv, { name: 'items.csv' });

  // Add images only if option enabled
  if (includeImages) {
    for (const filename of imageFilenames) {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `images/${filename}` });
      }
    }
  }

  await archive.finalize();
};

// GET /items/export - Export filtered items to ZIP
router.get('/export', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const locationId = req.query.locationId as string;
    const templateId = req.query.templateId as string;
    const tagIds = req.query.tags as string;
    const lowStock = req.query.lowStock === 'true';

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (templateId) where.templateId = templateId;
    if (tagIds) {
      const tags = tagIds.split(',');
      where.tags = { some: { tagId: { in: tags } } };
    }
    if (lowStock) {
      where.quantity = { lte: prisma.item.fields.minQuantity };
    }

    await exportItemsToZip(where, res);
  } catch (error) {
    next(error);
  }
});

// POST /items/export - Export items to ZIP with options
router.post('/export', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const { itemIds, options, filters } = req.body;

    const where: any = { deletedAt: null };

    // If specific items selected, filter by IDs
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      where.id = { in: itemIds };
    } else if (filters) {
      // Apply filters if no specific items selected
      const { search, categoryId, locationId, templateId, tags, lowStock } = filters;

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (categoryId) where.categoryId = categoryId;
      if (locationId) where.locationId = locationId;
      if (templateId) where.templateId = templateId;
      if (tags) {
        const tagList = tags.split(',');
        where.tags = { some: { tagId: { in: tagList } } };
      }
      if (lowStock) {
        where.quantity = { lte: prisma.item.fields.minQuantity };
      }
    }

    await exportItemsToZip(where, res, options || {});
  } catch (error) {
    next(error);
  }
});

// GET /items/import/template - Download CSV template
router.get('/import/template', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), (req: AuthRequest, res: Response) => {
  const template = [
    {
      name: 'Example Item',
      sku: 'SKU-001',
      description: 'Item description',
      category: 'Electronics > Computers',
      categoryDescriptions: 'Electronics category;Computer equipment',
      categoryIcons: ';cpu',
      categoryIconColors: ';#3b82f6',
      categoryIconBgColors: ';#dbeafe',
      location: 'Warehouse > Shelf A1',
      locationTypes: 'location;shelf',
      locationDescriptions: 'Main warehouse;Storage shelf A1',
      locationAddresses: '123 Main St;',
      template: '',
      quantity: 10,
      minQuantity: 5,
      tags: 'tag1;tag2',
      tagColors: '#ef4444;#22c55e',
      tagIcons: 'star;check',
      tagIconColors: '#ffffff;#ffffff',
      tagIconBgColors: '#ef4444;#22c55e',
      attributes: 'color=red;size=large',
      images: '',
      primaryImage: ''
    }
  ];

  const csv = csvStringify(template, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="items-import-template.csv"');
  res.send(csv);
});

// POST /items/import/preview - Preview/validate import (CSV or ZIP)
router.post('/import/preview', authenticate, requirePermission(PERMISSIONS.ITEMS_CREATE), importUpload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    let csvContent: string;
    let extractedPath: string | null = null;
    let extractedImageCount = 0;
    const extractedImages: string[] = [];

    const isZip = req.file.originalname.endsWith('.zip') ||
                  req.file.mimetype === 'application/zip' ||
                  req.file.mimetype === 'application/x-zip-compressed';

    if (isZip) {
      // Extract ZIP to temp directory
      const tempDir = path.join(os.tmpdir(), `import-${uuid()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      // Write buffer to temp file for extraction
      const tempZipPath = path.join(tempDir, 'import.zip');
      fs.writeFileSync(tempZipPath, req.file.buffer);

      // Extract ZIP
      await extractZip(tempZipPath, { dir: tempDir });

      // Read CSV from extracted contents
      const csvPath = path.join(tempDir, 'items.csv');
      if (!fs.existsSync(csvPath)) {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
        throw new AppError('ZIP file must contain items.csv', 400);
      }

      csvContent = fs.readFileSync(csvPath, 'utf-8');

      // Check for images folder
      const imagesDir = path.join(tempDir, 'images');
      if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir).filter(f => !f.includes('..') && !path.isAbsolute(f) && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
        extractedImages.push(...files);
        extractedImageCount = files.length;
      }

      extractedPath = tempDir;

      // Store temp path for later import
      const sessionId = uuid();
      extractedZipPaths.set(sessionId, tempDir);

      // Clean up temp zip file
      fs.unlinkSync(tempZipPath);

      // Store session ID in response for import
      (req as any).importSessionId = sessionId;
    } else {
      // Plain CSV file
      csvContent = req.file.buffer.toString('utf-8');
    }

    let records: any[];
    try {
      records = csvParse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    } catch (parseError: any) {
      if (extractedPath) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
      }
      throw new AppError(`CSV parse error: ${parseError.message}`, 400);
    }

    const MAX_IMPORT_ROWS = 10000;
    if (records.length > MAX_IMPORT_ROWS) {
      if (extractedPath) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
      }
      return res.status(400).json({ success: false, message: `Import limited to ${MAX_IMPORT_ROWS} rows. Your file has ${records.length} rows.` });
    }

    // Parse missing reference handling options
    type MissingRefAction = 'create' | 'skip-field' | 'skip-row';
    interface MissingRefHandling {
      categories: MissingRefAction;
      tags: MissingRefAction;
      locations: MissingRefAction;
    }
    const defaultHandling: MissingRefHandling = { categories: 'skip-row', tags: 'skip-row', locations: 'skip-row' };
    let missingRefHandling: MissingRefHandling = defaultHandling;
    if (req.body.missingRefHandling) {
      try {
        missingRefHandling = { ...defaultHandling, ...JSON.parse(req.body.missingRefHandling) };
      } catch (e) {
        // Use defaults
      }
    }

    const [categories, locations, templates, tags, existingItems] = await Promise.all([
      prisma.category.findMany(),
      prisma.location.findMany(),
      prisma.itemTemplate.findMany(),
      prisma.tag.findMany(),
      prisma.item.findMany({ where: { sku: { not: null }, deletedAt: null }, select: { sku: true } })
    ]);

    const skuSet = new Set(existingItems.map(i => i.sku));
    const valid: any[] = [];
    const errors: any[] = [];

    // Track missing refs for each type
    const missingRefs = {
      categories: new Set<string>(),
      tags: new Set<string>(),
      locations: new Set<string>()
    };

    records.forEach((record: any, index: number) => {
      const rowNum = index + 2;
      const rowErrors: string[] = [];

      // Validate required fields
      if (!record.name?.trim()) {
        rowErrors.push('name is required');
      }

      const quantity = parseInt(record.quantity);
      if (isNaN(quantity) || quantity < 0) {
        rowErrors.push('quantity must be a non-negative number');
      }

      const minQuantity = parseInt(record.minQuantity);
      if (isNaN(minQuantity) || minQuantity < 0) {
        rowErrors.push('minQuantity must be a non-negative number');
      }

      // Resolve category (by name or path)
      let categoryId = null;
      let categoryPath: string | null = null;
      let categoryHierarchyData: { descriptions: string[]; icons: string[]; iconColors: string[]; iconBgColors: string[] } | null = null;
      if (record.category?.trim()) {
        const fullPath = record.category.trim();
        const pathParts = fullPath.split(' > ').map((p: string) => p.trim());
        const leafName = pathParts[pathParts.length - 1];
        const cat = categories.find(c => c.name.toLowerCase() === leafName.toLowerCase());
        if (!cat) {
          missingRefs.categories.add(leafName);
          categoryPath = fullPath; // Store full path for hierarchy creation
          if (missingRefHandling.categories === 'skip-row') {
            rowErrors.push(`category "${leafName}" not found`);
          } else if (missingRefHandling.categories === 'skip-field') {
            categoryPath = null; // Will be null in import
          } else if (missingRefHandling.categories === 'create') {
            // Parse hierarchy data (semicolon-separated, matching path order)
            categoryHierarchyData = {
              descriptions: (record.categoryDescriptions || '').split(';').map((s: string) => s.trim()),
              icons: (record.categoryIcons || '').split(';').map((s: string) => s.trim()),
              iconColors: (record.categoryIconColors || '').split(';').map((s: string) => s.trim()),
              iconBgColors: (record.categoryIconBgColors || '').split(';').map((s: string) => s.trim())
            };
          }
        } else {
          categoryId = cat.id;
          categoryPath = null; // Don't need to create
        }
      }

      // Resolve location (by name or path)
      let locationId = null;
      let locationPath: string | null = null;
      let locationHierarchyData: { types: string[]; descriptions: string[]; addresses: string[] } | null = null;
      if (record.location?.trim()) {
        const fullPath = record.location.trim();
        const pathParts = fullPath.split(' > ').map((p: string) => p.trim());
        const leafName = pathParts[pathParts.length - 1];
        const loc = locations.find(l => l.name.toLowerCase() === leafName.toLowerCase());
        if (!loc) {
          missingRefs.locations.add(leafName);
          locationPath = fullPath; // Store full path for hierarchy creation
          if (missingRefHandling.locations === 'skip-row') {
            rowErrors.push(`location "${record.location}" not found`);
          } else if (missingRefHandling.locations === 'skip-field') {
            locationPath = null; // Will be null in import
          } else if (missingRefHandling.locations === 'create') {
            // Parse hierarchy data (semicolon-separated, matching path order)
            locationHierarchyData = {
              types: (record.locationTypes || '').split(';').map((s: string) => s.trim().toLowerCase() || 'room'),
              descriptions: (record.locationDescriptions || '').split(';').map((s: string) => s.trim()),
              addresses: (record.locationAddresses || '').split(';').map((s: string) => s.trim())
            };
          }
        } else {
          locationId = loc.id;
          locationPath = null;
        }
      }

      // Resolve template
      let templateId = null;
      if (record.template?.trim()) {
        const tpl = templates.find(t => t.name.toLowerCase() === record.template.trim().toLowerCase());
        if (!tpl) {
          rowErrors.push(`template "${record.template}" not found`);
        } else {
          templateId = tpl.id;
        }
      }

      // Resolve tags
      const tagIds: string[] = [];
      const missingTagsToCreate: { name: string; color?: string; icon?: string; iconColor?: string; iconBackgroundColor?: string }[] = [];
      if (record.tags?.trim()) {
        const tagNames = record.tags.split(';').map((t: string) => t.trim()).filter(Boolean);
        // Parse tag styling columns (semicolon-separated, same order as tags)
        const tagColors = record.tagColors?.split(';').map((c: string) => c.trim()) || [];
        const tagIcons = record.tagIcons?.split(';').map((i: string) => i.trim()) || [];
        const tagIconColors = record.tagIconColors?.split(';').map((c: string) => c.trim()) || [];
        const tagIconBgColors = record.tagIconBgColors?.split(';').map((c: string) => c.trim()) || [];

        for (let i = 0; i < tagNames.length; i++) {
          const tagName = tagNames[i];
          const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          if (!tag) {
            missingRefs.tags.add(tagName);
            if (missingRefHandling.tags === 'skip-row') {
              rowErrors.push(`tag "${tagName}" not found`);
            } else if (missingRefHandling.tags === 'create') {
              missingTagsToCreate.push({
                name: tagName,
                color: tagColors[i] || undefined,
                icon: tagIcons[i] || undefined,
                iconColor: tagIconColors[i] || undefined,
                iconBackgroundColor: tagIconBgColors[i] || undefined
              });
            }
            // If 'skip-field', we just don't add this tag
          } else {
            tagIds.push(tag.id);
          }
        }
      }

      // Parse attributes
      const attributes: { name: string; value: string }[] = [];
      if (record.attributes?.trim()) {
        const attrPairs = record.attributes.split(';').map((a: string) => a.trim()).filter(Boolean);
        for (const pair of attrPairs) {
          const eqIndex = pair.indexOf('=');
          if (eqIndex > 0) {
            attributes.push({
              name: pair.substring(0, eqIndex).trim(),
              value: pair.substring(eqIndex + 1).trim()
            });
          }
        }
      }

      // Parse images - check if they exist in extracted ZIP
      const imageFilenames: string[] = [];
      if (record.images?.trim()) {
        const requestedImages = record.images.split(';').map((f: string) => f.trim()).filter(Boolean);
        for (const img of requestedImages) {
          if (extractedImages.length > 0) {
            // Check if image exists in extracted ZIP
            if (extractedImages.includes(img)) {
              imageFilenames.push(img);
            }
          } else {
            // CSV-only import, just store filename
            imageFilenames.push(img);
          }
        }
      }
      const primaryImage = record.primaryImage?.trim() || '';

      if (rowErrors.length > 0) {
        errors.push(...rowErrors.map(msg => ({ row: rowNum, field: '', message: msg })));
      } else {
        valid.push({
          name: record.name.trim(),
          sku: record.sku?.trim() || null,
          description: record.description?.trim() || null,
          categoryId,
          locationId,
          templateId,
          quantity: parseInt(record.quantity) || 0,
          minQuantity: parseInt(record.minQuantity) || 0,
          tagIds,
          attributes,
          imageFilenames,
          primaryImage,
          existingSku: record.sku?.trim() ? skuSet.has(record.sku.trim()) : false,
          // Data for auto-creation (if handling is 'create')
          createCategoryPath: missingRefHandling.categories === 'create' ? categoryPath : null,
          createCategoryHierarchyData: missingRefHandling.categories === 'create' ? categoryHierarchyData : null,
          createLocationPath: missingRefHandling.locations === 'create' ? locationPath : null,
          createLocationHierarchyData: missingRefHandling.locations === 'create' ? locationHierarchyData : null,
          createTags: missingRefHandling.tags === 'create' ? missingTagsToCreate : []
        });
      }
    });

    // Get session ID for ZIP imports
    const sessionId = (req as any).importSessionId;

    res.json({
      success: true,
      data: {
        valid,
        errors,
        total: records.length,
        imageCount: extractedImageCount,
        sessionId: sessionId || null,
        missingRefs: {
          categories: Array.from(missingRefs.categories),
          tags: Array.from(missingRefs.tags),
          locations: Array.from(missingRefs.locations)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /items/import - Execute import
router.post('/import', authenticate, requirePermission(PERMISSIONS.ITEMS_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { rows, sessionId, missingRefHandling } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No valid rows to import', 400);
    }

    let created = 0;
    let updated = 0;
    let imagesImported = 0;
    let categoriesCreated = 0;
    let tagsCreated = 0;
    let locationsCreated = 0;
    const importErrors: string[] = [];
    const createdItemIds: string[] = [];

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Get extracted temp path if this is a ZIP import
    let extractedImagesPath: string | null = null;
    if (sessionId && extractedZipPaths.has(sessionId)) {
      const tempDir = extractedZipPaths.get(sessionId)!;
      const imagesDir = path.join(tempDir, 'images');
      if (fs.existsSync(imagesDir)) {
        extractedImagesPath = imagesDir;
      }
    }

    // If ZIP import, copy images from temp folder to uploads first
    const copiedImages = new Set<string>();
    if (extractedImagesPath) {
      for (const row of rows) {
        if (row.imageFilenames?.length) {
          for (const filename of row.imageFilenames) {
            if (copiedImages.has(filename)) continue; // Already copied
            const srcPath = path.join(extractedImagesPath, filename);
            const destPath = path.join(uploadDir, filename);
            if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
              fs.copyFileSync(srcPath, destPath);
              copiedImages.add(filename);
              imagesImported++;
            } else if (fs.existsSync(destPath)) {
              // Image already exists in uploads (e.g., same filename from previous import)
              copiedImages.add(filename);
            }
          }
        }
      }
    }

    // Auto-create missing categories, tags, and locations if needed
    const createdCategoryMap = new Map<string, string>(); // path -> leaf id
    const createdTagMap = new Map<string, string>(); // name -> id
    const createdLocationMap = new Map<string, string>(); // path -> leaf id

    // Collect all unique paths/entities to create with hierarchy data
    const categoryPathsToCreate = new Map<string, {
      path: string;
      hierarchyData: { descriptions: string[]; icons: string[]; iconColors: string[]; iconBgColors: string[] } | null;
    }>();
    const tagDataToCreate = new Map<string, { name: string; color?: string; icon?: string; iconColor?: string; iconBackgroundColor?: string }>();
    const locationPathsToCreate = new Map<string, {
      path: string;
      hierarchyData: { types: string[]; descriptions: string[]; addresses: string[] } | null;
    }>();

    for (const row of rows) {
      if (row.createCategoryPath) {
        if (!categoryPathsToCreate.has(row.createCategoryPath.toLowerCase())) {
          categoryPathsToCreate.set(row.createCategoryPath.toLowerCase(), {
            path: row.createCategoryPath,
            hierarchyData: row.createCategoryHierarchyData || null
          });
        }
      }
      if (row.createLocationPath) {
        if (!locationPathsToCreate.has(row.createLocationPath.toLowerCase())) {
          locationPathsToCreate.set(row.createLocationPath.toLowerCase(), {
            path: row.createLocationPath,
            hierarchyData: row.createLocationHierarchyData || null
          });
        }
      }
      if (row.createTags?.length) {
        for (const tagData of row.createTags) {
          if (!tagDataToCreate.has(tagData.name.toLowerCase())) {
            tagDataToCreate.set(tagData.name.toLowerCase(), tagData);
          }
        }
      }
    }

    // Fetch existing categories and locations for hierarchy building
    const existingCategories = await prisma.category.findMany();
    const existingLocations = await prisma.location.findMany();

    // Helper to create category hierarchy from path
    const createCategoryHierarchy = async (
      fullPath: string,
      hierarchyData: { descriptions: string[]; icons: string[]; iconColors: string[]; iconBgColors: string[] } | null
    ): Promise<string> => {
      const parts = fullPath.split(' > ').map(p => p.trim());
      let parentId: string | null = null;
      let leafId: string = '';

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];

        // Check if this category already exists (with this parent)
        let existing = existingCategories.find(
          c => c.name.toLowerCase() === name.toLowerCase() && c.parentId === parentId
        );

        if (!existing) {
          // Create the category with data from hierarchy arrays
          const createData: any = { name, parentId };
          if (hierarchyData) {
            if (hierarchyData.descriptions[i]) createData.description = hierarchyData.descriptions[i];
            if (hierarchyData.icons[i]) createData.icon = hierarchyData.icons[i];
            if (hierarchyData.iconColors[i]) createData.iconColor = hierarchyData.iconColors[i];
            if (hierarchyData.iconBgColors[i]) createData.iconBackgroundColor = hierarchyData.iconBgColors[i];
          }
          try {
            existing = await prisma.category.create({ data: createData });
            existingCategories.push(existing); // Add to cache
            categoriesCreated++;
          } catch (e) {
            // Race condition - try to find it again
            existing = existingCategories.find(
              c => c.name.toLowerCase() === name.toLowerCase() && c.parentId === parentId
            );
            if (!existing) throw e;
          }
        }

        parentId = existing.id;
        leafId = existing.id;
      }

      return leafId;
    };

    // Helper to create location hierarchy from path
    const createLocationHierarchy = async (
      fullPath: string,
      hierarchyData: { types: string[]; descriptions: string[]; addresses: string[] } | null
    ): Promise<string> => {
      const parts = fullPath.split(' > ').map(p => p.trim());
      let parentId: string | null = null;
      let leafId: string = '';

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];

        // Check if this location already exists (with this parent)
        let existing = existingLocations.find(
          l => l.name.toLowerCase() === name.toLowerCase() && l.parentId === parentId
        );

        if (!existing) {
          // Create the location with data from hierarchy arrays
          const createData: any = {
            name,
            parentId,
            type: hierarchyData?.types[i] || 'room'
          };
          if (hierarchyData) {
            if (hierarchyData.descriptions[i]) createData.description = hierarchyData.descriptions[i];
            if (hierarchyData.addresses[i]) createData.address = hierarchyData.addresses[i];
          }
          try {
            existing = await prisma.location.create({ data: createData });
            existingLocations.push(existing); // Add to cache
            locationsCreated++;
          } catch (e) {
            // Race condition - try to find it again
            existing = existingLocations.find(
              l => l.name.toLowerCase() === name.toLowerCase() && l.parentId === parentId
            );
            if (!existing) throw e;
          }
        }

        parentId = existing.id;
        leafId = existing.id;
      }

      return leafId;
    };

    // Create category hierarchies
    for (const [pathKey, data] of categoryPathsToCreate) {
      try {
        const leafId = await createCategoryHierarchy(data.path, data.hierarchyData);
        createdCategoryMap.set(pathKey, leafId);
      } catch (e) {
        console.error('Failed to create category hierarchy:', data.path, e);
      }
    }

    // Create location hierarchies
    for (const [pathKey, data] of locationPathsToCreate) {
      try {
        const leafId = await createLocationHierarchy(data.path, data.hierarchyData);
        createdLocationMap.set(pathKey, leafId);
      } catch (e) {
        console.error('Failed to create location hierarchy:', data.path, e);
      }
    }

    // Create missing tags with styling
    for (const [key, data] of tagDataToCreate) {
      try {
        const tag = await prisma.tag.create({
          data: {
            name: data.name,
            color: data.color || '#6b7280', // Default gray if no color
            icon: data.icon || null,
            iconColor: data.iconColor || null,
            iconBackgroundColor: data.iconBackgroundColor || null
          }
        });
        createdTagMap.set(key, tag.id);
        tagsCreated++;
      } catch (e) {
        // May already exist, try to find it
        const existing = await prisma.tag.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
        if (existing) {
          createdTagMap.set(key, existing.id);
        }
      }
    }

    for (const row of rows) {
      try {
        // Resolve created refs
        let categoryId = row.categoryId;
        let locationId = row.locationId;
        const allTagIds = [...(row.tagIds || [])];

        // Use created category if needed
        if (!categoryId && row.createCategoryPath) {
          categoryId = createdCategoryMap.get(row.createCategoryPath.toLowerCase()) || null;
        }

        // Use created location if needed
        if (!locationId && row.createLocationPath) {
          locationId = createdLocationMap.get(row.createLocationPath.toLowerCase()) || null;
        }

        // Add created tags
        if (row.createTags?.length) {
          for (const tagData of row.createTags) {
            const tagId = createdTagMap.get(tagData.name.toLowerCase());
            if (tagId) {
              allTagIds.push(tagId);
            }
          }
        }

        if (row.existingSku && row.sku) {
          // Update existing item
          const existing = await prisma.item.findFirst({ where: { sku: row.sku, deletedAt: null } });
          if (existing) {
            await prisma.item.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                description: row.description,
                categoryId,
                locationId,
                templateId: row.templateId,
                quantity: row.quantity,
                minQuantity: row.minQuantity
              }
            });

            // Update tags
            await prisma.itemTag.deleteMany({ where: { itemId: existing.id } });
            if (allTagIds.length) {
              await prisma.itemTag.createMany({
                data: allTagIds.map((tagId: string) => ({ itemId: existing.id, tagId }))
              });
            }

            // Update attributes
            await prisma.itemAttribute.deleteMany({ where: { itemId: existing.id } });
            if (row.attributes?.length) {
              await prisma.itemAttribute.createMany({
                data: row.attributes.map((attr: any) => ({
                  itemId: existing.id,
                  attributeName: attr.name,
                  attributeValue: attr.value
                }))
              });
            }

            // Update images if provided
            if (row.imageFilenames?.length) {
              // Get existing images to avoid duplicates
              const existingImages = await prisma.itemImage.findMany({
                where: { itemId: existing.id, deletedAt: null },
                select: { filename: true }
              });
              const existingFilenames = new Set(existingImages.map(img => img.filename));

              for (const filename of row.imageFilenames) {
                // Only add if file exists and not already linked
                const filePath = path.join(uploadDir, filename);
                if (fs.existsSync(filePath) && !existingFilenames.has(filename)) {
                  const isPrimary = filename === row.primaryImage;
                  if (isPrimary) {
                    // Unset current primary
                    await prisma.itemImage.updateMany({
                      where: { itemId: existing.id, isPrimary: true },
                      data: { isPrimary: false }
                    });
                  }
                  const fileSize = fs.statSync(filePath).size;
                  await prisma.itemImage.create({
                    data: {
                      itemId: existing.id,
                      filename,
                      originalName: filename,
                      mimeType: getMimeType(filename),
                      size: fileSize,
                      isPrimary
                    }
                  });
                }
              }
            }

            updated++;
          }
        } else {
          // Create new item
          const item = await prisma.item.create({
            data: {
              name: row.name,
              sku: row.sku,
              description: row.description,
              categoryId,
              locationId,
              templateId: row.templateId,
              quantity: row.quantity,
              minQuantity: row.minQuantity,
              createdById: req.user!.id,
              tags: allTagIds.length
                ? { create: allTagIds.map((tagId: string) => ({ tagId })) }
                : undefined,
              attributes: row.attributes?.length
                ? {
                    create: row.attributes.map((attr: any) => ({
                      attributeName: attr.name,
                      attributeValue: attr.value
                    }))
                  }
                : undefined
            }
          });

          // Link images if provided
          if (row.imageFilenames?.length) {
            let firstImage = true;
            for (const filename of row.imageFilenames) {
              const filePath = path.join(uploadDir, filename);
              if (fs.existsSync(filePath)) {
                const isPrimary = row.primaryImage ? filename === row.primaryImage : firstImage;
                const fileSize = fs.statSync(filePath).size;
                await prisma.itemImage.create({
                  data: {
                    itemId: item.id,
                    filename,
                    originalName: filename,
                    mimeType: getMimeType(filename),
                    size: fileSize,
                    isPrimary
                  }
                });
                firstImage = false;
              }
            }
          }

          createdItemIds.push(item.id);
          created++;
        }
      } catch (err: any) {
        importErrors.push(`Row "${row.name}": ${err.message}`);
      }
    }

    // Clean up temp folder if this was a ZIP import
    if (sessionId && extractedZipPaths.has(sessionId)) {
      const tempDir = extractedZipPaths.get(sessionId)!;
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to clean up temp import folder:', e);
      }
      extractedZipPaths.delete(sessionId);
    }

    // Create audit log
    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'item',
      entityId: 'bulk-import',
      entityName: `Imported ${created + updated} items`,
      changes: { created: { old: null, new: created }, updated: { old: null, new: updated } },
      req
    });

    // Save import history
    await prisma.importHistory.create({
      data: {
        userId: req.user!.id,
        filename: sessionId || 'csv-import',
        totalRows: rows.length,
        successRows: created + updated,
        failedRows: importErrors.length,
        errors: importErrors.length > 0 ? JSON.stringify(importErrors) : null,
        itemIds: createdItemIds,
      },
    });

    res.json({
      success: true,
      data: {
        created,
        updated,
        imagesImported,
        categoriesCreated,
        tagsCreated,
        locationsCreated,
        errors: importErrors
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get import history
router.get('/import/history', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const history = await prisma.importHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, username: true } } },
    });
    res.json({ success: true, data: history.map(h => ({ ...h, errors: h.errors ? JSON.parse(h.errors) : [] })) });
  } catch (error) {
    next(error);
  }
});

// Global search across items, categories, locations, tags
// Search by serial number (global)
router.get(
  '/search/serial',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json({ success: true, data: [] });
      }

      const instances = await prisma.itemInstance.findMany({
        where: {
          serialNumber: { contains: q, mode: 'insensitive' }
        },
        include: {
          item: {
            select: {
              id: true, name: true, sku: true,
              images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }], take: 1 },
              category: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } }
            }
          }
        },
        take: 20
      });

      const results = instances.map(inst => ({
        ...inst,
        item: {
          ...inst.item,
          primaryImage: inst.item.images[0] || null,
          images: undefined
        }
      }));

      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/global-search', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ data: { items: [], categories: [], locations: [], tags: [] } });
    }

    const [items, categories, locations, tags] = await Promise.all([
      prisma.item.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, sku: true },
        take: 5,
      }),
      prisma.category.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 5,
      }),
      prisma.location.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, type: true },
        take: 5,
      }),
      prisma.tag.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 5,
      }),
    ]);

    res.json({ data: { items, categories, locations, tags } });
  } catch (error) {
    next(error);
  }
});

// Check for duplicate items by name or SKU
router.get('/check-duplicates', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const name = (req.query.name as string || '').trim();
    const sku = (req.query.sku as string || '').trim();
    const excludeId = req.query.excludeId as string | undefined;

    if (!name && !sku) {
      return res.json({ data: { nameMatches: [], skuMatch: null } });
    }

    const excludeFilter = excludeId ? { id: { not: excludeId } } : {};
    const notDeleted = { deletedAt: null };

    let nameMatches: { id: string; name: string; sku: string | null }[] = [];
    let skuMatch: { id: string; name: string; sku: string | null } | null = null;

    // Check exact SKU match
    if (sku) {
      const existing = await prisma.item.findFirst({
        where: { sku, ...excludeFilter, ...notDeleted },
        select: { id: true, name: true, sku: true },
      });
      skuMatch = existing;
    }

    // Check similar names (case-insensitive contains + exact match)
    if (name && name.length >= 2) {
      const results = await prisma.item.findMany({
        where: {
          ...excludeFilter,
          ...notDeleted,
          OR: [
            { name: { equals: name, mode: 'insensitive' as const } },
            { name: { contains: name, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true, name: true, sku: true },
        take: 5,
      });
      nameMatches = results;
    }

    res.json({ data: { nameMatches, skuMatch } });
  } catch (error) {
    next(error);
  }
});

// Toggle watch on an item
router.post('/:id/watch', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const itemId = req.params.id as string;
    const userId = req.user!.id;

    const existing = await prisma.itemWatch.findUnique({
      where: { userId_itemId: { userId, itemId } }
    });

    if (existing) {
      await prisma.itemWatch.delete({ where: { userId_itemId: { userId, itemId } } });
      res.json({ success: true, data: { watching: false } });
    } else {
      await prisma.itemWatch.create({ data: { userId, itemId } });
      res.json({ success: true, data: { watching: true } });
    }
  } catch (error) {
    next(error);
  }
});

// Check if current user watches an item
router.get('/:id/watch', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.itemWatch.findUnique({
      where: { userId_itemId: { userId: req.user!.id, itemId: req.params.id as string } }
    });
    res.json({ success: true, data: { watching: !!existing } });
  } catch (error) {
    next(error);
  }
});

// Get all watched items for current user
router.get('/watched/list', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const watches = await prisma.itemWatch.findMany({
      where: { userId: req.user!.id },
      include: {
        item: {
          include: {
            category: true,
            location: true,
            tags: { include: { tag: true } },
            images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const items = watches
      .filter(w => w.item.deletedAt === null)
      .map(w => ({
        ...w.item,
        tags: w.item.tags.map(t => t.tag)
      }));

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Get item versions
router.get('/:id/versions', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), param('id').isUUID(), validate, async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getVersions(req.params.id as string, page, limit);
    res.json({ success: true, data: result.versions, pagination: { page, limit, total: result.total, pages: result.pages } });
  } catch (error) {
    next(error);
  }
});

// Get specific item version
router.get('/:id/versions/:version', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    const version = await getVersion(req.params.id as string, parseInt(req.params.version as string));
    if (!version) {
      throw new AppError('Version not found', 404);
    }
    res.json({ success: true, data: { ...version, snapshot: JSON.parse(version.snapshot) } });
  } catch (error) {
    next(error);
  }
});

// Rollback item to a specific version
router.post('/:id/versions/:version/rollback', authenticate, requirePermission(PERMISSIONS.ITEMS_UPDATE), param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    await rollbackToVersion(req.params.id as string, parseInt(req.params.version as string), req.user!.id);

    // Create audit log
    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'item',
      entityId: req.params.id as string,
      entityName: `Rolled back to version ${req.params.version}`,
      req,
    });

    // Re-fetch the updated item
    const item = await prisma.item.findUnique({
      where: { id: req.params.id as string },
      include: {
        category: true,
        location: true,
        template: { select: { id: true, name: true, icon: true, iconColor: true } },
        tags: { include: { tag: true } },
        attributes: true,
      },
    });

    res.json({ success: true, data: { ...item!, tags: item!.tags.map(t => t.tag) } });
  } catch (error) {
    next(error);
  }
});

// Get all items with search, filter, pagination
router.get('/', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const locationId = req.query.locationId as string;
    const templateId = req.query.templateId as string;
    const tagIds = req.query.tags as string;
    const lowStock = req.query.lowStock === 'true';
    const componentFilter = req.query.componentFilter as string;
    const sortBy = (req.query.sortBy as string) || 'updatedAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    // Only show non-deleted items
    const where: any = {
      deletedAt: null
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { attributes: { some: { attributeValue: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (tagIds) {
      const tags = tagIds.split(',');
      where.tags = { some: { tagId: { in: tags } } };
    }

    if (lowStock) {
      where.quantity = { lte: prisma.item.fields.minQuantity };
    }

    if (componentFilter === 'standalone') {
      where.subItems = { none: {} };
      where.parentItems = { none: {} };
    } else if (componentFilter === 'has_components') {
      where.subItems = { some: {} };
    } else if (componentFilter === 'is_component') {
      where.parentItems = { some: {} };
    } else if (componentFilter === 'no_components') {
      where.subItems = { none: {} };
    } else if (componentFilter === 'top_level') {
      where.parentItems = { none: {} };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true } },
          location: { select: { id: true, name: true, type: true, barcode: true } },
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          createdBy: { select: { id: true, username: true } },
          _count: { select: { subItems: true, parentItems: true } }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      }),
      prisma.item.count({ where })
    ]);

    // Transform to cleaner format
    const transformed = items.map(item => ({
      ...item,
      tags: item.tags.map(t => t.tag),
      primaryImage: item.images[0] || null,
      images: undefined
    }));

    res.json({
      success: true,
      data: transformed,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Get low stock items
router.get('/low-stock', authenticate, requirePermission(PERMISSIONS.ITEMS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const items = await prisma.$queryRaw`
      SELECT i.*, c.name as category_name, l.name as location_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.quantity <= i.min_quantity AND i.min_quantity > 0 AND i.deleted_at IS NULL
      ORDER BY (i.min_quantity - i.quantity) DESC
      LIMIT 100
    `;

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Lookup item by SKU (for scanner)
router.get(
  '/scan/:code',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const code = req.params.code as string;

      const item = await prisma.item.findFirst({
        where: {
          sku: code,
          deletedAt: null
        },
        include: {
          category: true,
          location: { select: { id: true, name: true, type: true, barcode: true } },
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          attributes: true,
          images: true
        }
      });

      if (!item) {
        throw new AppError('Item not found for this SKU', 404);
      }

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }
);

// Get single item
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const item = await prisma.item.findFirst({
        where: { id, deletedAt: null },
        include: {
          category: true,
          location: true,
          template: {
            include: {
              fields: { orderBy: { sortOrder: 'asc' } },
              suggestedItems: {
                include: { suggestedTemplate: { select: { id: true, name: true, icon: true, iconColor: true } } },
                orderBy: { sortOrder: 'asc' }
              }
            }
          },
          tags: { include: { tag: true } },
          images: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }] },
          attributes: true,
          model3d: true,
          createdBy: { select: { id: true, username: true } },
          subItems: {
            include: {
              childItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  quantity: true,
                  images: {
                    where: { isPrimary: true },
                    select: { filename: true },
                    take: 1
                  },
                  template: {
                    select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true }
                  },
                  category: {
                    select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true }
                  },
                  tags: {
                    include: { tag: true }
                  },
                  _count: { select: { subItems: true } }
                }
              }
            }
          },
          parentItems: {
            include: {
              parentItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  images: {
                    where: { isPrimary: true },
                    select: { filename: true },
                    take: 1
                  },
                  template: {
                    select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true }
                  },
                  category: {
                    select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true }
                  },
                  tags: {
                    include: { tag: true }
                  }
                }
              }
            }
          },
          instances: { orderBy: { createdAt: 'desc' } },
          _count: { select: { instances: true, subItems: true, parentItems: true } }
        }
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Transform tags
      const transformed: any = {
        ...item,
        tags: item.tags.map(t => t.tag)
      };

      // Include paths if requested (for mobile app hierarchy display)
      if (req.query.includePaths === 'true') {
        const [locationPath, categoryPath] = await Promise.all([
          buildLocationPath(item.locationId),
          buildCategoryPath(item.categoryId)
        ]);
        transformed.locationPath = locationPath;
        transformed.categoryPath = categoryPath;
      }

      res.json({ success: true, data: transformed });
    } catch (error) {
      next(error);
    }
  }
);

// Get item history with detailed changes from audit log
router.get(
  '/:id/history',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const [history, total, auditLogs, ldapNameSetting] = await Promise.all([
        prisma.itemHistory.findMany({
          where: { itemId: id },
          include: {
            user: {
              select: {
                id: true, username: true, firstName: true, lastName: true,
                ldapDn: true,
                role: { select: { id: true, name: true } },
                groups: {
                  include: { group: { include: { role: { select: { id: true, name: true } } } } },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.itemHistory.count({ where: { itemId: id } }),
        // Fetch audit logs for this item to get detailed changes
        prisma.auditLog.findMany({
          where: { entityType: 'item', entityId: id },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.setting.findUnique({ where: { key: 'ldap.name' } }),
      ]);

      const ldapName = ldapNameSetting?.value || 'LDAP';

      // Merge audit log changes into history entries
      const historyWithChanges = history.map(h => {
        // Find matching audit log entry (within 2 seconds of history entry)
        const auditEntry = auditLogs.find(a =>
          Math.abs(new Date(a.createdAt).getTime() - new Date(h.createdAt).getTime()) < 2000
        );
        const roleName = h.user.role?.name || (h.user as any).groups?.[0]?.group?.role?.name || null;
        const fullName = [h.user.firstName, h.user.lastName].filter(Boolean).join(' ') || null;
        return {
          ...h,
          user: {
            id: h.user.id,
            username: h.user.username,
            fullName,
            roleName,
            authMethod: (h.user as any).ldapDn ? ldapName : 'Local',
          },
          changes: auditEntry?.changes ? JSON.parse(auditEntry.changes as string) : null,
          auditLogId: auditEntry?.id || null
        };
      });

      res.json({
        success: true,
        data: historyWithChanges,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create item
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  [
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('sku').optional().trim(),
    body('description').optional().trim(),
    body('categoryId').optional().isUUID(),
    body('locationId').optional().isUUID(),
    body('templateId').optional().isUUID(),
    body('quantity').optional().isInt({ min: 0 }),
    body('minQuantity').optional().isInt({ min: 0 }),
    body('tags').optional().isArray(),
    body('attributes').optional().isArray(),
    body('price').optional({ nullable: true }).isDecimal(),
    body('currency').optional({ nullable: true }).isString().isLength({ min: 3, max: 3 }),
    body('trackSerialNumbers').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const {
        name, sku: providedSku, description, categoryId, locationId, templateId,
        quantity, minQuantity, tags, attributes, price, currency, trackSerialNumbers
      } = req.body;

      // Check unique SKU if provided
      if (providedSku) {
        const existing = await prisma.item.findUnique({ where: { sku: providedSku } });
        if (existing) {
          throw new AppError('SKU already exists', 400);
        }
      }

      // Auto-generate SKU if not provided
      const sku = providedSku || await generateUniqueSku('ITEM');

      const item = await prisma.item.create({
        data: {
          name,
          sku,
          description,
          categoryId,
          locationId,
          templateId,
          quantity: quantity || 0,
          minQuantity: minQuantity || 0,
          price: price !== undefined ? price : undefined,
          currency: currency || undefined,
          trackSerialNumbers: trackSerialNumbers || false,
          createdById: req.user!.id,
          tags: tags?.length
            ? { create: tags.map((tagId: string) => ({ tagId })) }
            : undefined,
          attributes: attributes?.length
            ? {
                create: attributes.map((attr: any) => ({
                  attributeName: attr.name,
                  attributeValue: attr.value
                }))
              }
            : undefined
        },
        include: {
          category: true,
          location: true,
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          attributes: true
        }
      });

      // Log creation in item history
      await prisma.itemHistory.create({
        data: {
          itemId: item.id,
          userId: req.user!.id,
          action: 'CREATED',
          newQuantity: item.quantity,
          notes: 'Item created'
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        req,
      });

      // Create initial version snapshot
      await createVersion(item.id, req.user!.id, 'CREATED', 'Item created');

      // Send item created notification (in background, respects frequency setting)
      triggerItemCreatedNotification(
        {
          id: item.id,
          name: item.name,
          sku: item.sku,
          categoryName: item.category?.name,
          locationName: item.location?.name,
        },
        { username: req.user!.username }
      ).catch(err => {
        console.error('Failed to trigger item created notification:', err);
      });

      // Dispatch webhook event
      dispatchWebhookEvent('item.created', { id: item.id, name: item.name, sku: item.sku });

      res.status(201).json({
        success: true,
        data: { ...item, tags: item.tags.map(t => t.tag) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update item
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  [
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('sku').optional().trim(),
    body('description').optional().trim(),
    body('categoryId').optional({ nullable: true }),
    body('locationId').optional({ nullable: true }),
    body('templateId').optional({ nullable: true }),
    body('minQuantity').optional().isInt({ min: 0 }),
    body('tags').optional().isArray(),
    body('attributes').optional().isArray(),
    body('price').optional({ nullable: true }),
    body('currency').optional({ nullable: true }).isString().isLength({ min: 3, max: 3 }),
    body('trackSerialNumbers').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const {
        name, sku, description, categoryId, locationId, templateId,
        minQuantity, tags, attributes, price, currency, trackSerialNumbers
      } = req.body;

      // Get existing item for audit
      const existingItem = await prisma.item.findUnique({
        where: { id },
        include: { category: true, location: true }
      });

      if (!existingItem) {
        throw new AppError('Item not found', 404);
      }

      // Capture version snapshot before changes
      await createVersion(existingItem.id, req.user!.id, 'UPDATED', 'Before update');

      // Check unique SKU if changed
      if (sku) {
        const existing = await prisma.item.findFirst({
          where: { sku, NOT: { id } }
        });
        if (existing) {
          throw new AppError('SKU already exists', 400);
        }
      }

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
              attributeValue: attr.value
            }))
          });
        }
      }

      const item = await prisma.item.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(sku !== undefined && { sku }),
          ...(description !== undefined && { description }),
          ...(categoryId !== undefined && { categoryId }),
          ...(locationId !== undefined && { locationId }),
          ...(templateId !== undefined && { templateId }),
          ...(minQuantity !== undefined && { minQuantity }),
          ...(price !== undefined && { price: price === null ? null : price }),
          ...(currency !== undefined && { currency: currency === null ? null : currency }),
          ...(trackSerialNumbers !== undefined && { trackSerialNumbers })
        },
        include: {
          category: true,
          location: true,
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          attributes: true
        }
      });

      // Log update in item history
      await prisma.itemHistory.create({
        data: {
          itemId: item.id,
          userId: req.user!.id,
          action: 'UPDATED',
          notes: 'Item details updated'
        }
      });

      // Create audit log with changes
      const changes = getChanges(
        { ...existingItem, categoryName: existingItem.category?.name, locationName: existingItem.location?.name },
        { ...item, categoryName: item.category?.name, locationName: item.location?.name },
        ['name', 'sku', 'description', 'categoryId', 'categoryName', 'locationId', 'locationName', 'minQuantity']
      );
      if (changes) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'item',
          entityId: item.id,
          entityName: item.name,
          changes,
          req,
        });
      }

      // Dispatch webhook event
      dispatchWebhookEvent('item.updated', { id: item.id, name: item.name, sku: item.sku });

      // Notify watchers of this item (excluding the user who made the change)
      try {
        const watchers = await prisma.itemWatch.findMany({
          where: { itemId: id, userId: { not: req.user!.id } },
          include: { user: { select: { email: true, username: true } } }
        });
        if (watchers.length > 0) {
          const { sendEmail, isSmtpConfigured } = await import('../services/email.service.js');
          const { getFrontendUrl } = await import('../services/settings.service.js');
          if (await isSmtpConfigured()) {
            const frontendUrl = await getFrontendUrl();
            const changedBy = req.user!.username;
            for (const w of watchers) {
              sendEmail(
                w.user.email,
                `Item Updated: ${item.name}`,
                `<p>Hi ${w.user.username},</p>
                <p>An item you're watching has been updated by <strong>${changedBy}</strong>:</p>
                <p><strong>${item.name}</strong>${item.sku ? ` (${item.sku})` : ''}</p>
                <p><a href="${frontendUrl}/items/${item.id}">View Item</a></p>`
              ).catch(() => {}); // fire and forget
            }
          }
        }
      } catch {
        // Don't fail the update if notification fails
      }

      res.json({
        success: true,
        data: { ...item, tags: item.tags.map(t => t.tag) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate SKU for an item
router.post(
  '/:id/generate-sku',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_BARCODE),
  param('id').isUUID(),
  body('regenerate').optional().isBoolean(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { regenerate } = req.body;

      const item = await prisma.item.findUnique({
        where: { id },
        include: { category: true, template: true }
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      if (item.sku && !regenerate) {
        throw new AppError('Item already has a SKU. Pass regenerate: true to generate a new one.', 400);
      }

      const oldSku = item.sku;

      // Generate prefix from template or category name, or default to 'ITEM'
      const prefix = (
        item.template?.name?.substring(0, 4).toUpperCase() ||
        item.category?.name?.substring(0, 4).toUpperCase() ||
        'ITEM'
      ).replace(/[^A-Z0-9]/g, '');

      const sku = await generateUniqueSku(prefix || 'ITEM');

      const updated = await prisma.item.update({
        where: { id },
        data: { sku },
        include: {
          category: true,
          location: true,
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          attributes: true
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        changes: oldSku
          ? { sku: { old: oldSku, new: sku } }
          : `SKU generated: ${sku}`,
        req,
      });

      res.json({
        success: true,
        data: { ...updated, tags: updated.tags.map(t => t.tag) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get SKU barcode image
router.get(
  '/:id/barcode',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;

      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      if (!item.sku) {
        throw new AppError('Item does not have a SKU', 400);
      }

      const png = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: item.sku,
        scale: 4,
        eclevel: 'M',
        padding: 2,
      } as any);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${item.sku}.png"`);
      res.send(png);
    } catch (error) {
      next(error);
    }
  }
);

// Update SKU
router.put(
  '/:id/sku',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_BARCODE),
  param('id').isUUID(),
  body('sku').trim().isLength({ min: 1, max: 100 }).withMessage('SKU must be between 1 and 100 characters'),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { sku } = req.body;

      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Check if SKU is already used by another item
      const existingSku = await prisma.item.findFirst({
        where: { sku, NOT: { id } }
      });
      if (existingSku) {
        throw new AppError('SKU already in use by another item', 400);
      }

      const oldSku = item.sku;

      const updated = await prisma.item.update({
        where: { id },
        data: { sku },
        include: {
          category: true,
          location: true,
          template: { select: { id: true, name: true, icon: true, iconColor: true } },
          tags: { include: { tag: true } },
          attributes: true
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        changes: { sku: { old: oldSku, new: sku } },
        req,
      });

      res.json({
        success: true,
        data: { ...updated, tags: updated.tags.map(t => t.tag) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update quantity
router.patch(
  '/:id/quantity',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  [
    body('quantity').isInt({ min: 0 }),
    body('notes').optional().trim()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { quantity, notes } = req.body;

      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      const oldQuantity = item.quantity;

      const updated = await prisma.item.update({
        where: { id },
        data: { quantity }
      });

      // Log quantity change
      await prisma.itemHistory.create({
        data: {
          itemId: id,
          userId: req.user!.id,
          action: quantity > oldQuantity ? 'STOCK_IN' : 'STOCK_OUT',
          oldQuantity,
          newQuantity: quantity,
          notes: notes || `Quantity changed from ${oldQuantity} to ${quantity}`
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        changes: { quantity: { old: oldQuantity, new: quantity } },
        req,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Upload images
router.post(
  '/:id/images',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  validate,
  upload.array('images', 10),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Sanitize any SVG files in-place before persisting metadata
      for (const file of files) {
        if (file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg')) {
          const filePath = path.join(file.destination, file.filename);
          const raw = fs.readFileSync(filePath, 'utf8');
          fs.writeFileSync(filePath, sanitizeSvg(raw), 'utf8');
        }
      }

      // Check if item has any non-deleted images
      const existingCount = await prisma.itemImage.count({ where: { itemId: id, deletedAt: null } });

      const images = await prisma.itemImage.createManyAndReturn({
        data: files.map((file, index) => ({
          itemId: id,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          isPrimary: existingCount === 0 && index === 0
        }))
      });

      res.status(201).json({ success: true, data: images });
    } catch (error) {
      next(error);
    }
  }
);

// Set primary image
router.patch(
  '/:itemId/images/:imageId/primary',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('itemId').isUUID(), param('imageId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.itemId as string;
      const imageId = req.params.imageId as string;

      // Unset current primary
      await prisma.itemImage.updateMany({
        where: { itemId, isPrimary: true },
        data: { isPrimary: false }
      });

      // Set new primary
      const image = await prisma.itemImage.update({
        where: { id: imageId },
        data: { isPrimary: true }
      });

      res.json({ success: true, data: image });
    } catch (error) {
      next(error);
    }
  }
);

// Update image background color
router.patch(
  '/:itemId/images/:imageId/background',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('itemId').isUUID(), param('imageId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const imageId = req.params.imageId as string;
      const { backgroundColor } = req.body;

      const image = await prisma.itemImage.findUnique({ where: { id: imageId } });
      if (!image) {
        throw new AppError('Image not found', 404);
      }

      const updated = await prisma.itemImage.update({
        where: { id: imageId },
        data: { backgroundColor: backgroundColor || null }
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Delete image (soft-delete to quarantine)
router.delete(
  '/:itemId/images/:imageId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('itemId').isUUID(), param('imageId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const imageId = req.params.imageId as string;

      const image = await prisma.itemImage.findUnique({ where: { id: imageId } });
      if (!image) {
        throw new AppError('Image not found', 404);
      }

      // Soft-delete: keep file on disk, mark as deleted
      await softDeleteImage(imageId, req.user!.id);

      res.json({ success: true, message: 'Image moved to quarantine' });
    } catch (error) {
      next(error);
    }
  }
);

// Restore image from quarantine
router.post(
  '/:itemId/images/:imageId/restore',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('itemId').isUUID(), param('imageId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const imageId = req.params.imageId as string;

      const image = await prisma.itemImage.findUnique({ where: { id: imageId } });
      if (!image || !image.deletedAt) {
        throw new AppError('Quarantined image not found', 404);
      }

      await restoreQuarantineImage(imageId);

      res.json({ success: true, message: 'Image restored' });
    } catch (error) {
      next(error);
    }
  }
);

// Get deleted images for an item
router.get(
  '/:id/images/deleted',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;
      const images = await getDeletedImagesForItem(itemId);
      res.json({ success: true, data: images });
    } catch (error) {
      next(error);
    }
  }
);

// Reorder images
router.patch(
  '/:id/images/reorder',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    body('imageIds').isArray({ min: 1 }).withMessage('imageIds must be a non-empty array'),
    body('imageIds.*').isUUID(),
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;
      const { imageIds } = req.body as { imageIds: string[] };

      // Verify item exists
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) throw new AppError('Item not found', 404);

      // Update sort order for each image
      await prisma.$transaction(
        imageIds.map((imageId: string, index: number) =>
          prisma.itemImage.updateMany({
            where: { id: imageId, itemId },
            data: { sortOrder: index },
          })
        )
      );

      res.json({ success: true, message: 'Image order updated' });
    } catch (error) {
      next(error);
    }
  }
);

// Get sub-item tree (lazy-loaded)
router.get(
  '/:id/sub-items/tree',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;

      const subItems = await prisma.subItem.findMany({
        where: { parentItemId: id },
        include: {
          childItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              images: {
                where: { isPrimary: true },
                select: { filename: true },
                take: 1,
              },
              template: {
                select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true },
              },
              category: {
                select: { id: true, name: true, icon: true, iconColor: true, iconBackgroundColor: true },
              },
              tags: { include: { tag: true } },
              _count: { select: { subItems: true } },
            },
          },
        },
      });

      const tree = subItems.map((sub) => ({
        id: sub.id,
        childItemId: sub.childItemId,
        quantityRequired: sub.quantityRequired,
        partNumber: sub.partNumber,
        childItem: sub.childItem,
        hasChildren: sub.childItem._count.subItems > 0,
        childrenCount: sub.childItem._count.subItems,
      }));

      res.json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  }
);

// Sub-items (parts)
router.post(
  '/:id/sub-items',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  [
    body('childItemId').isUUID(),
    body('quantityRequired').optional().isInt({ min: 1 }),
    body('partNumber').optional().trim()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { childItemId, quantityRequired, partNumber } = req.body;

      if (id === childItemId) {
        throw new AppError('Item cannot be a sub-item of itself', 400);
      }

      // Cycle detection: check if parentId appears as a descendant of childItemId
      const visited = new Set<string>();
      const queue = [childItemId];
      let depth = 0;
      const maxDepth = 10;

      while (queue.length > 0 && depth < maxDepth) {
        const levelSize = queue.length;
        for (let i = 0; i < levelSize; i++) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);

          const children = await prisma.subItem.findMany({
            where: { parentItemId: current },
            select: { childItemId: true },
          });

          for (const child of children) {
            if (child.childItemId === id) {
              throw new AppError('Cannot add this item as a sub-item: it would create a circular dependency', 400);
            }
            queue.push(child.childItemId);
          }
        }
        depth++;
      }

      const subItem = await prisma.subItem.create({
        data: {
          parentItemId: id,
          childItemId,
          quantityRequired: quantityRequired || 1,
          partNumber,
          notes: req.body.notes || undefined
        },
        include: {
          childItem: { select: { id: true, name: true, sku: true } }
        }
      });

      // Audit log for sub-item addition
      const parentItem = await prisma.item.findUnique({ where: { id }, select: { name: true } });
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: id,
        entityName: parentItem?.name,
        changes: {
          subItemAdded: {
            old: null,
            new: {
              childItemId,
              childItemName: subItem.childItem.name,
              quantityRequired: subItem.quantityRequired,
              partNumber: subItem.partNumber || null,
            },
          },
        },
        req,
      });

      res.status(201).json({ success: true, data: subItem });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:parentId/sub-items/:subItemId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('parentId').isUUID(), param('subItemId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const parentId = req.params.parentId as string;
      const subItemId = req.params.subItemId as string;

      // Fetch sub-item details before deleting for audit log
      const subItemRecord = await prisma.subItem.findUnique({
        where: { id: subItemId },
        include: {
          childItem: { select: { id: true, name: true } },
          parentItem: { select: { id: true, name: true } },
        },
      });

      await prisma.subItem.delete({ where: { id: subItemId } });

      // Audit log for sub-item removal
      if (subItemRecord) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'item',
          entityId: parentId,
          entityName: subItemRecord.parentItem.name,
          changes: {
            subItemRemoved: {
              old: {
                childItemId: subItemRecord.childItemId,
                childItemName: subItemRecord.childItem.name,
                quantityRequired: subItemRecord.quantityRequired,
                partNumber: subItemRecord.partNumber || null,
              },
              new: null,
            },
          },
          req,
        });
      }

      res.json({ success: true, message: 'Sub-item removed' });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk duplicate items
router.post(
  '/bulk/duplicate',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  [
    body('itemIds').isArray({ min: 1, max: 50 }).withMessage('Select 1-50 items to duplicate'),
    body('itemIds.*').isUUID(),
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { itemIds } = req.body;

      const sourceItems = await prisma.item.findMany({
        where: { id: { in: itemIds }, deletedAt: null },
        include: {
          tags: { select: { tagId: true } },
          attributes: { select: { attributeName: true, attributeValue: true } },
          subItems: { select: { childItemId: true, quantityRequired: true, partNumber: true } },
          images: { where: { deletedAt: null }, select: { filename: true, originalName: true, mimeType: true, size: true, isPrimary: true, backgroundColor: true } },
        },
      });

      if (sourceItems.length === 0) {
        throw new AppError('No items found to duplicate', 404);
      }

      const createdIds: string[] = [];

      for (const source of sourceItems) {
        const newSku = await generateUniqueSku('ITEM');

        const newItem = await prisma.item.create({
          data: {
            name: `${source.name} (Copy)`,
            sku: newSku,
            description: source.description,
            categoryId: source.categoryId,
            locationId: source.locationId,
            templateId: source.templateId,
            quantity: 0,
            minQuantity: source.minQuantity,
            createdById: req.user!.id,
            tags: source.tags.length > 0
              ? { create: source.tags.map((t) => ({ tagId: t.tagId })) }
              : undefined,
            attributes: source.attributes.length > 0
              ? {
                  create: source.attributes.map((a) => ({
                    attributeName: a.attributeName,
                    attributeValue: a.attributeValue,
                  })),
                }
              : undefined,
          },
        });

        // Copy sub-item relationships
        if (source.subItems.length > 0) {
          await prisma.subItem.createMany({
            data: source.subItems.map((sub) => ({
              parentItemId: newItem.id,
              childItemId: sub.childItemId,
              quantityRequired: sub.quantityRequired,
              partNumber: sub.partNumber,
            })),
          });
        }

        // Copy images
        if (source.images.length > 0) {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          for (const img of source.images) {
            const ext = path.extname(img.filename);
            const newFilename = `${uuid()}${ext}`;
            const srcPath = path.join(uploadDir, img.filename);
            const destPath = path.join(uploadDir, newFilename);
            try {
              if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                await prisma.itemImage.create({
                  data: {
                    itemId: newItem.id,
                    filename: newFilename,
                    originalName: img.originalName,
                    mimeType: img.mimeType,
                    size: img.size,
                    isPrimary: img.isPrimary,
                    backgroundColor: img.backgroundColor,
                  },
                });
              }
            } catch {
              // Skip image if copy fails
            }
          }
        }

        await prisma.itemHistory.create({
          data: {
            itemId: newItem.id,
            userId: req.user!.id,
            action: 'CREATED',
            newQuantity: 0,
            notes: `Duplicated from ${source.name} (${source.sku})`,
          },
        });

        await createAuditLog({
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'item',
          entityId: newItem.id,
          entityName: newItem.name,
          changes: { duplicatedFrom: { old: null, new: { id: source.id, name: source.name, sku: source.sku } } },
          req,
        });

        createdIds.push(newItem.id);
      }

      res.status(201).json({
        success: true,
        data: { created: createdIds.length, createdIds },
        message: `Successfully duplicated ${createdIds.length} item(s)`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk update items
router.patch(
  '/bulk',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    body('itemIds').isArray({ min: 1 }).withMessage('At least one item ID is required'),
    body('itemIds.*').isUUID(),
    body('categoryId').optional({ nullable: true }),
    body('locationId').optional({ nullable: true }),
    body('templateId').optional({ nullable: true }),
    body('addTags').optional().isArray(),
    body('addTags.*').optional().isUUID(),
    body('removeTags').optional().isArray(),
    body('removeTags.*').optional().isUUID()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { itemIds, categoryId, locationId, templateId, addTags, removeTags } = req.body;

      // Verify all items exist
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds }, deletedAt: null },
        select: { id: true, name: true }
      });

      if (items.length !== itemIds.length) {
        throw new AppError('One or more items not found', 404);
      }

      let updatedCount = 0;

      // Use transaction for all updates
      await prisma.$transaction(async (tx) => {
        // Update category if provided
        if (categoryId !== undefined) {
          await tx.item.updateMany({
            where: { id: { in: itemIds } },
            data: { categoryId: categoryId || null }
          });
        }

        // Update location if provided
        if (locationId !== undefined) {
          await tx.item.updateMany({
            where: { id: { in: itemIds } },
            data: { locationId: locationId || null }
          });
        }

        // Update template if provided
        if (templateId !== undefined) {
          await tx.item.updateMany({
            where: { id: { in: itemIds } },
            data: { templateId: templateId || null }
          });
        }

        // Add tags if provided
        if (addTags && addTags.length > 0) {
          for (const itemId of itemIds) {
            for (const tagId of addTags) {
              // Use upsert to avoid duplicates
              await tx.itemTag.upsert({
                where: { itemId_tagId: { itemId, tagId } },
                create: { itemId, tagId },
                update: {}
              });
            }
          }
        }

        // Remove tags if provided
        if (removeTags && removeTags.length > 0) {
          await tx.itemTag.deleteMany({
            where: {
              itemId: { in: itemIds },
              tagId: { in: removeTags }
            }
          });
        }

        updatedCount = itemIds.length;

        // Create history entries for each item
        for (const item of items) {
          const changes: string[] = [];
          if (categoryId !== undefined) changes.push('category');
          if (locationId !== undefined) changes.push('location');
          if (templateId !== undefined) changes.push('device type');
          if (addTags?.length) changes.push(`added ${addTags.length} tag(s)`);
          if (removeTags?.length) changes.push(`removed ${removeTags.length} tag(s)`);

          await tx.itemHistory.create({
            data: {
              itemId: item.id,
              userId: req.user!.id,
              action: 'BULK_UPDATED',
              notes: `Bulk update: ${changes.join(', ')}`
            }
          });
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: 'bulk',
        entityName: `${updatedCount} items`,
        changes: {
          itemIds: { old: null, new: itemIds },
          ...(categoryId !== undefined && { categoryId: { old: null, new: categoryId } }),
          ...(locationId !== undefined && { locationId: { old: null, new: locationId } }),
          ...(templateId !== undefined && { templateId: { old: null, new: templateId } }),
          ...(addTags?.length && { addedTags: { old: null, new: addTags } }),
          ...(removeTags?.length && { removedTags: { old: null, new: removeTags } })
        },
        req,
      });

      res.json({
        success: true,
        data: { updated: updatedCount },
        message: `Successfully updated ${updatedCount} items`
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get sub-items for delete cascade selection
router.get(
  '/:id/sub-items-for-delete',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const subItems = await getSubItems(id);
      res.json({ success: true, data: subItems });
    } catch (error) {
      next(error);
    }
  }
);

// Delete item (soft delete - moves to quarantine)
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { subItemIds } = req.body || {}; // Optional array of sub-item IDs to also delete

      const item = await prisma.item.findFirst({
        where: { id, deletedAt: null }
      });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Soft delete the main item
      await softDeleteItem(id, req.user!.id);

      // Also soft delete selected sub-items if provided
      if (Array.isArray(subItemIds) && subItemIds.length > 0) {
        await softDeleteItems(subItemIds, req.user!.id);
      }

      // Log to item history
      await prisma.itemHistory.create({
        data: {
          itemId: id,
          userId: req.user!.id,
          action: 'QUARANTINED',
          notes: 'Item moved to quarantine'
        }
      });

      // Create audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        req,
      });

      // Send notification (async, respects frequency setting)
      triggerItemQuarantinedNotification(
        { id: item.id, name: item.name, sku: item.sku },
        { username: req.user!.username }
      ).catch(err => console.error('Failed to trigger quarantine notification:', err));

      res.json({ success: true, message: 'Item moved to quarantine' });
    } catch (error) {
      next(error);
    }
  }
);

// Restore item fields from a previous audit log entry
router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  body('auditLogId').isUUID().withMessage('Audit log ID is required'),
  body('fields').optional().isArray().withMessage('Fields must be an array'),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { auditLogId, fields } = req.body;

      // Verify item exists
      const existingItem = await prisma.item.findFirst({
        where: { id, deletedAt: null },
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } }
        }
      });
      if (!existingItem) {
        throw new AppError('Item not found', 404);
      }

      // Fetch the audit log entry
      const auditLog = await prisma.auditLog.findUnique({
        where: { id: auditLogId }
      });
      if (!auditLog) {
        throw new AppError('Audit log entry not found', 404);
      }
      if (auditLog.entityId !== id || auditLog.entityType !== 'item') {
        throw new AppError('Audit log entry does not belong to this item', 400);
      }
      if (!auditLog.changes) {
        throw new AppError('No changes found in audit log entry', 400);
      }

      const changes = JSON.parse(auditLog.changes as string);
      const fieldsToRestore = fields || Object.keys(changes);

      // Build update object from "old" values
      const updateData: Record<string, any> = {};
      const restoredChanges: Record<string, { old: any; new: any }> = {};

      for (const field of fieldsToRestore) {
        if (changes[field] !== undefined) {
          // Map the field to the correct database field
          const dbField = field;
          updateData[dbField] = changes[field].old;
          restoredChanges[field] = {
            old: (existingItem as any)[field],
            new: changes[field].old
          };
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new AppError('No valid fields to restore', 400);
      }

      // Apply the restore
      const item = await prisma.item.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          location: true,
          tags: { include: { tag: true } },
          images: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }] },
          template: true,
          attributes: true,
          createdBy: { select: { id: true, username: true } }
        }
      });

      // Create item history entry
      await prisma.itemHistory.create({
        data: {
          itemId: id,
          userId: req.user!.id,
          action: 'RESTORED',
          notes: `Restored ${fieldsToRestore.length} field(s): ${fieldsToRestore.join(', ')}`
        }
      });

      // Create audit log for restore action
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        changes: restoredChanges,
        req,
      });

      // Transform response
      const transformed = {
        ...item,
        tags: item.tags.map(t => t.tag)
      };

      res.json({ success: true, data: transformed, message: 'Item restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Configure multer for 3D model uploads
const modelUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for 3D models
  fileFilter: (req, file, cb) => {
    const extAllowed = ['.glb', '.gltf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (extAllowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .glb and .gltf files are allowed.'));
    }
  }
});

/**
 * POST /api/items/:id/model3d
 * Upload a 3D model for an item (replaces existing)
 */
router.post(
  '/:id/model3d',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  validate,
  modelUpload.single('model'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      const item = await prisma.item.findFirst({ where: { id: itemId, deletedAt: null } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Delete existing model file if any
      const existing = await prisma.itemModel3D.findUnique({ where: { itemId } });
      if (existing) {
        const oldPath = path.join(process.env.UPLOAD_DIR || './uploads', existing.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        await prisma.itemModel3D.delete({ where: { itemId } });
      }

      const model = await prisma.itemModel3D.create({
        data: {
          itemId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype || 'model/gltf-binary',
          size: file.size,
        }
      });

      res.json({ success: true, data: model });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/items/:id/model3d
 * Delete a 3D model from an item
 */
router.delete(
  '/:id/model3d',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;

      const model = await prisma.itemModel3D.findUnique({ where: { itemId } });
      if (!model) {
        throw new AppError('No 3D model found for this item', 404);
      }

      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', model.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await prisma.itemModel3D.delete({ where: { itemId } });

      res.json({ success: true, message: '3D model deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/items/:id/360
 * Toggle is360Set flag on an item
 */
router.patch(
  '/:id/360',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  param('id').isUUID(),
  body('enabled').isBoolean(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;
      const { enabled } = req.body;

      const item = await prisma.item.findFirst({ where: { id: itemId, deletedAt: null } });
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      await prisma.item.update({
        where: { id: itemId },
        data: { is360Set: enabled }
      });

      res.json({ success: true, message: `360° mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      next(error);
    }
  }
);

// Update sub-item (quantity, partNumber, notes)
router.patch(
  '/:parentId/sub-items/:subItemId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('parentId').isUUID(),
    param('subItemId').isUUID(),
    body('quantityRequired').optional().isInt({ min: 1 }),
    body('partNumber').optional({ nullable: true }).trim(),
    body('notes').optional({ nullable: true }).trim()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { quantityRequired, partNumber, notes } = req.body;

      const subItem = await prisma.subItem.update({
        where: { id: req.params.subItemId as string },
        data: {
          ...(quantityRequired !== undefined && { quantityRequired }),
          ...(partNumber !== undefined && { partNumber: partNumber || null }),
          ...(notes !== undefined && { notes: notes || null })
        },
        include: {
          childItem: { select: { id: true, name: true, sku: true } }
        }
      });

      res.json({ success: true, data: subItem });
    } catch (error) {
      next(error);
    }
  }
);

// Reorder sub-items
router.patch(
  '/:id/sub-items/reorder',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    body('order').isArray(),
    body('order.*.id').isUUID(),
    body('order.*.sortOrder').isInt({ min: 0 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { order } = req.body;
      await Promise.all(
        order.map((item: { id: string; sortOrder: number }) =>
          prisma.subItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder }
          })
        )
      );
      res.json({ success: true, message: 'Sub-items reordered' });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk add sub-items
router.post(
  '/:id/sub-items/bulk',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    body('items').isArray({ min: 1, max: 50 }),
    body('items.*.childItemId').isUUID(),
    body('items.*.quantityRequired').optional().isInt({ min: 1 }),
    body('items.*.partNumber').optional().trim(),
    body('items.*.notes').optional().trim()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const parentId = req.params.id as string;
      const { items } = req.body;
      const results = [];

      for (const item of items) {
        if (item.childItemId === parentId) continue; // skip self-reference

        try {
          const subItem = await prisma.subItem.create({
            data: {
              parentItemId: parentId,
              childItemId: item.childItemId,
              quantityRequired: item.quantityRequired || 1,
              partNumber: item.partNumber || undefined,
              notes: item.notes || undefined
            },
            include: { childItem: { select: { id: true, name: true } } }
          });
          results.push({ success: true, data: subItem });
        } catch (e: any) {
          results.push({ success: false, childItemId: item.childItemId, error: e.message });
        }
      }

      res.status(201).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
);

// BOM (Bill of Materials) - can build count
router.get(
  '/:id/bom',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const item = await prisma.item.findUnique({
        where: { id },
        select: { name: true, quantity: true, price: true, currency: true }
      });
      if (!item) throw new AppError('Item not found', 404);

      const subItems = await prisma.subItem.findMany({
        where: { parentItemId: id },
        include: {
          childItem: {
            select: { id: true, name: true, quantity: true, price: true, currency: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      let canBuild = Infinity;
      let totalCost = 0;
      const components = subItems.map(si => {
        const available = si.childItem.quantity;
        const needed = si.quantityRequired;
        const buildable = needed > 0 ? Math.floor(available / needed) : Infinity;
        canBuild = Math.min(canBuild, buildable);

        const unitPrice = si.childItem.price ? Number(si.childItem.price) : 0;
        const lineCost = unitPrice * needed;
        totalCost += lineCost;

        return {
          id: si.id,
          childItem: si.childItem,
          quantityRequired: needed,
          quantityAvailable: available,
          canBuild: buildable,
          lineCost,
          partNumber: si.partNumber,
          notes: si.notes
        };
      });

      if (canBuild === Infinity) canBuild = 0;

      res.json({
        success: true,
        data: {
          item: item.name,
          canBuild,
          totalCost,
          currency: item.currency || subItems[0]?.childItem?.currency || 'USD',
          components
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== Linked Items =====

// Get linked items
router.get(
  '/:id/links',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const [linksFrom, linksTo] = await Promise.all([
        prisma.itemLink.findMany({
          where: { itemAId: id },
          include: {
            itemB: {
              select: {
                id: true, name: true, sku: true, quantity: true,
                images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }], take: 1 },
                category: { select: { id: true, name: true, icon: true, iconColor: true } }
              }
            }
          }
        }),
        prisma.itemLink.findMany({
          where: { itemBId: id },
          include: {
            itemA: {
              select: {
                id: true, name: true, sku: true, quantity: true,
                images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }], take: 1 },
                category: { select: { id: true, name: true, icon: true, iconColor: true } }
              }
            }
          }
        })
      ]);

      const links = [
        ...linksFrom.map(l => ({
          id: l.id,
          linkType: l.linkType,
          notes: l.notes,
          item: { ...l.itemB, primaryImage: l.itemB.images[0] || null, images: undefined }
        })),
        ...linksTo.map(l => ({
          id: l.id,
          linkType: l.linkType,
          notes: l.notes,
          item: { ...l.itemA, primaryImage: l.itemA.images[0] || null, images: undefined }
        }))
      ];

      res.json({ success: true, data: links });
    } catch (error) {
      next(error);
    }
  }
);

// Create item link
router.post(
  '/:id/links',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    body('linkedItemId').isUUID(),
    body('linkType').isIn(['related', 'accessory', 'alternative']),
    body('notes').optional().trim()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { linkedItemId, linkType, notes } = req.body;

      if (id === linkedItemId) {
        throw new AppError('Cannot link an item to itself', 400);
      }

      // Check if link already exists in either direction
      const existing = await prisma.itemLink.findFirst({
        where: {
          OR: [
            { itemAId: id, itemBId: linkedItemId },
            { itemAId: linkedItemId, itemBId: id }
          ]
        }
      });
      if (existing) {
        throw new AppError('Items are already linked', 400);
      }

      const link = await prisma.itemLink.create({
        data: { itemAId: id, itemBId: linkedItemId, linkType, notes },
        include: {
          itemB: { select: { id: true, name: true, sku: true } }
        }
      });

      res.status(201).json({ success: true, data: link });
    } catch (error) {
      next(error);
    }
  }
);

// Delete item link
router.delete(
  '/:id/links/:linkId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('id').isUUID(), param('linkId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.itemLink.delete({ where: { id: req.params.linkId as string } });
      res.json({ success: true, message: 'Link removed' });
    } catch (error) {
      next(error);
    }
  }
);

// ===== Item Instances (Serial Numbers) =====

// Get instances for an item
router.get(
  '/:id/instances',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const instances = await prisma.itemInstance.findMany({
        where: { itemId: req.params.id as string },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: instances });
    } catch (error) {
      next(error);
    }
  }
);

// Create instance
router.post(
  '/:id/instances',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    body('serialNumber').trim().isLength({ min: 1, max: 200 }),
    body('status').optional().isIn(['in_stock', 'checked_out', 'rma', 'retired']),
    body('condition').optional().isIn(['new', 'used', 'refurbished', 'damaged']),
    body('notes').optional().trim(),
    body('acquiredDate').optional({ nullable: true }).isISO8601(),
    body('warrantyExpiry').optional({ nullable: true }).isISO8601(),
    body('purchasePrice').optional({ nullable: true }).isDecimal()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const itemId = req.params.id as string;
      const { serialNumber, status, condition, notes, acquiredDate, warrantyExpiry, purchasePrice } = req.body;

      const instance = await prisma.itemInstance.create({
        data: {
          itemId,
          serialNumber,
          status: status || 'in_stock',
          condition: condition || 'new',
          notes,
          acquiredDate: acquiredDate ? new Date(acquiredDate) : undefined,
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
          purchasePrice: purchasePrice || undefined
        }
      });

      res.status(201).json({ success: true, data: instance });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return next(new AppError('Serial number already exists for this item', 400));
      }
      next(error);
    }
  }
);

// Update instance
router.patch(
  '/:id/instances/:instanceId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [
    param('id').isUUID(),
    param('instanceId').isUUID(),
    body('serialNumber').optional().trim().isLength({ min: 1, max: 200 }),
    body('status').optional().isIn(['in_stock', 'checked_out', 'rma', 'retired']),
    body('condition').optional().isIn(['new', 'used', 'refurbished', 'damaged']),
    body('notes').optional({ nullable: true }).trim(),
    body('acquiredDate').optional({ nullable: true }).isISO8601(),
    body('warrantyExpiry').optional({ nullable: true }).isISO8601(),
    body('purchasePrice').optional({ nullable: true }).isDecimal()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { serialNumber, status, condition, notes, acquiredDate, warrantyExpiry, purchasePrice } = req.body;

      const instance = await prisma.itemInstance.update({
        where: { id: req.params.instanceId as string },
        data: {
          ...(serialNumber !== undefined && { serialNumber }),
          ...(status !== undefined && { status }),
          ...(condition !== undefined && { condition }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(acquiredDate !== undefined && { acquiredDate: acquiredDate ? new Date(acquiredDate) : null }),
          ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
          ...(purchasePrice !== undefined && { purchasePrice: purchasePrice || null })
        }
      });

      res.json({ success: true, data: instance });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return next(new AppError('Serial number already exists for this item', 400));
      }
      next(error);
    }
  }
);

// Delete instance
router.delete(
  '/:id/instances/:instanceId',
  authenticate,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  [param('id').isUUID(), param('instanceId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.itemInstance.delete({ where: { id: req.params.instanceId as string } });
      res.json({ success: true, message: 'Instance deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

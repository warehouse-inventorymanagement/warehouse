import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma.js';

export interface QuarantinedItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  deletedAt: Date;
  deletedBy: {
    id: string;
    username: string;
  } | null;
  expiresAt: Date;
  daysUntilExpiration: number;
}

/**
 * Get the quarantine retention period in days from settings
 */
export async function getRetentionDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'quarantine.retentionDays' }
  });
  return parseInt(setting?.value || '30', 10);
}

/**
 * Soft delete an item (move to quarantine)
 */
export async function softDeleteItem(
  itemId: string,
  deletedById: string
): Promise<void> {
  await prisma.item.update({
    where: { id: itemId },
    data: {
      deletedAt: new Date(),
      deletedById
    }
  });
}

/**
 * Soft delete multiple items (move to quarantine)
 */
export async function softDeleteItems(
  itemIds: string[],
  deletedById: string
): Promise<void> {
  await prisma.item.updateMany({
    where: { id: { in: itemIds } },
    data: {
      deletedAt: new Date(),
      deletedById
    }
  });
}

/**
 * Restore an item from quarantine
 */
export async function restoreItem(itemId: string): Promise<void> {
  await prisma.item.update({
    where: { id: itemId },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });
}

/**
 * Restore multiple items from quarantine
 */
export async function restoreItems(itemIds: string[]): Promise<void> {
  await prisma.item.updateMany({
    where: { id: { in: itemIds } },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });
}

/**
 * Permanently delete an item and its associated images
 */
export async function permanentDeleteItem(itemId: string): Promise<void> {
  // Get images to delete from disk
  const images = await prisma.itemImage.findMany({
    where: { itemId }
  });

  // Delete the item (cascades to images, attributes, tags, history, sub-items)
  await prisma.item.delete({
    where: { id: itemId }
  });

  // Delete image files from disk
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  for (const image of images) {
    const filePath = path.join(uploadDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Permanently delete multiple items
 */
export async function permanentDeleteItems(itemIds: string[]): Promise<void> {
  for (const itemId of itemIds) {
    await permanentDeleteItem(itemId);
  }
}

/**
 * Get all quarantined items with pagination
 */
export async function getQuarantinedItems(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ items: QuarantinedItem[]; total: number }> {
  const retentionDays = await getRetentionDays();

  const where: any = {
    deletedAt: { not: null }
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        deletedBy: {
          select: {
            id: true,
            username: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { deletedAt: 'desc' }
    }),
    prisma.item.count({ where })
  ]);

  const now = new Date();
  const quarantinedItems: QuarantinedItem[] = items.map(item => {
    const deletedAt = item.deletedAt!;
    const expiresAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const daysUntilExpiration = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      deletedAt,
      deletedBy: item.deletedBy,
      expiresAt,
      daysUntilExpiration
    };
  });

  return { items: quarantinedItems, total };
}

/**
 * Get items that are expiring soon (within specified days)
 */
export async function getExpiringItems(daysBeforeExpiration: number = 4): Promise<QuarantinedItem[]> {
  const retentionDays = await getRetentionDays();
  const now = new Date();

  // Calculate the date range for items that will expire within daysBeforeExpiration
  // Items deleted (retentionDays - daysBeforeExpiration) days ago will expire in daysBeforeExpiration days
  const maxDeletedAt = new Date(now.getTime() - (retentionDays - daysBeforeExpiration) * 24 * 60 * 60 * 1000);
  const minDeletedAt = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      deletedAt: {
        not: null,
        gte: minDeletedAt,
        lte: maxDeletedAt
      }
    },
    include: {
      deletedBy: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  return items.map(item => {
    const deletedAt = item.deletedAt!;
    const expiresAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const daysUntilExpiration = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      deletedAt,
      deletedBy: item.deletedBy,
      expiresAt,
      daysUntilExpiration
    };
  });
}

/**
 * Get items that have exceeded their retention period
 */
export async function getExpiredItems(): Promise<string[]> {
  const retentionDays = await getRetentionDays();
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate
      }
    },
    select: { id: true }
  });

  return items.map(item => item.id);
}

// ==================== IMAGE QUARANTINE ====================

export interface QuarantinedImage {
  id: string;
  itemId: string;
  filename: string;
  originalName: string;
  itemName: string;
  deletedAt: Date;
  deletedBy: { id: string; username: string } | null;
  expiresAt: Date;
  daysUntilExpiration: number;
}

/**
 * Soft delete an image (move to quarantine)
 */
export async function softDeleteImage(imageId: string, deletedById: string): Promise<void> {
  await prisma.itemImage.update({
    where: { id: imageId },
    data: {
      deletedAt: new Date(),
      deletedById
    }
  });
}

/**
 * Restore an image from quarantine
 */
export async function restoreImage(imageId: string): Promise<void> {
  await prisma.itemImage.update({
    where: { id: imageId },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });
}

/**
 * Restore multiple images from quarantine
 */
export async function restoreImages(imageIds: string[]): Promise<void> {
  await prisma.itemImage.updateMany({
    where: { id: { in: imageIds } },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });
}

/**
 * Permanently delete an image and its file
 */
export async function permanentDeleteImage(imageId: string): Promise<void> {
  const image = await prisma.itemImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  await prisma.itemImage.delete({ where: { id: imageId } });

  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.join(uploadDir, image.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Permanently delete multiple images
 */
export async function permanentDeleteImages(imageIds: string[]): Promise<void> {
  for (const imageId of imageIds) {
    await permanentDeleteImage(imageId);
  }
}

/**
 * Get all quarantined images with pagination
 */
export async function getQuarantinedImages(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ images: QuarantinedImage[]; total: number }> {
  const retentionDays = await getRetentionDays();

  const where: any = {
    deletedAt: { not: null }
  };

  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { item: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [images, total] = await Promise.all([
    prisma.itemImage.findMany({
      where,
      include: {
        item: { select: { id: true, name: true } },
        deletedBy: { select: { id: true, username: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { deletedAt: 'desc' }
    }),
    prisma.itemImage.count({ where })
  ]);

  const now = new Date();
  const quarantinedImages: QuarantinedImage[] = images.map(image => {
    const deletedAt = image.deletedAt!;
    const expiresAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const daysUntilExpiration = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      id: image.id,
      itemId: image.itemId,
      filename: image.filename,
      originalName: image.originalName,
      itemName: image.item.name,
      deletedAt,
      deletedBy: image.deletedBy,
      expiresAt,
      daysUntilExpiration
    };
  });

  return { images: quarantinedImages, total };
}

/**
 * Get images that have exceeded their retention period
 */
export async function getExpiredImages(): Promise<string[]> {
  const retentionDays = await getRetentionDays();
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const images = await prisma.itemImage.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate
      }
    },
    select: { id: true }
  });

  return images.map(image => image.id);
}

/**
 * Get deleted images for a specific item
 */
export async function getDeletedImagesForItem(itemId: string): Promise<QuarantinedImage[]> {
  const retentionDays = await getRetentionDays();

  const images = await prisma.itemImage.findMany({
    where: {
      itemId,
      deletedAt: { not: null }
    },
    include: {
      item: { select: { id: true, name: true } },
      deletedBy: { select: { id: true, username: true } }
    },
    orderBy: { deletedAt: 'desc' }
  });

  const now = new Date();
  return images.map(image => {
    const deletedAt = image.deletedAt!;
    const expiresAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const daysUntilExpiration = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      id: image.id,
      itemId: image.itemId,
      filename: image.filename,
      originalName: image.originalName,
      itemName: image.item.name,
      deletedAt,
      deletedBy: image.deletedBy,
      expiresAt,
      daysUntilExpiration
    };
  });
}

/**
 * Get sub-items of an item (for cascade delete UI)
 */
export async function getSubItems(itemId: string): Promise<{ id: string; name: string; sku: string | null }[]> {
  const subItems = await prisma.subItem.findMany({
    where: { parentItemId: itemId },
    include: {
      childItem: {
        select: {
          id: true,
          name: true,
          sku: true,
          deletedAt: true
        }
      }
    }
  });

  // Only return items that are not already deleted
  return subItems
    .filter(si => si.childItem.deletedAt === null)
    .map(si => ({
      id: si.childItem.id,
      name: si.childItem.name,
      sku: si.childItem.sku
    }));
}

import prisma from '../lib/prisma.js';

interface ItemSnapshot {
  name: string;
  sku: string | null;
  description: string | null;
  categoryId: string | null;
  locationId: string | null;
  templateId: string | null;
  quantity: number;
  minQuantity: number;
  tagIds: string[];
  attributes: { name: string; value: string }[];
}

async function captureSnapshot(itemId: string): Promise<ItemSnapshot> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      tags: true,
      attributes: true,
    },
  });

  return {
    name: item.name,
    sku: item.sku,
    description: item.description,
    categoryId: item.categoryId,
    locationId: item.locationId,
    templateId: item.templateId,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    tagIds: item.tags.map(t => t.tagId),
    attributes: item.attributes.map(a => ({ name: a.attributeName, value: a.attributeValue })),
  };
}

export async function createVersion(
  itemId: string,
  userId: string,
  action: 'CREATED' | 'UPDATED' | 'RESTORED',
  summary?: string
) {
  const snapshot = await captureSnapshot(itemId);

  // Get next version number
  const last = await prisma.itemVersion.findFirst({
    where: { itemId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;

  return prisma.itemVersion.create({
    data: {
      itemId,
      version,
      snapshot: JSON.stringify(snapshot),
      userId,
      action,
      summary,
    },
  });
}

export async function getVersions(itemId: string, page = 1, limit = 20) {
  const [versions, total] = await Promise.all([
    prisma.itemVersion.findMany({
      where: { itemId },
      orderBy: { version: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.itemVersion.count({ where: { itemId } }),
  ]);

  return { versions, total, pages: Math.ceil(total / limit) };
}

export async function getVersion(itemId: string, version: number) {
  return prisma.itemVersion.findUnique({
    where: { itemId_version: { itemId, version } },
    include: { user: { select: { id: true, username: true } } },
  });
}

export async function rollbackToVersion(itemId: string, version: number, userId: string) {
  const ver = await prisma.itemVersion.findUnique({
    where: { itemId_version: { itemId, version } },
  });
  if (!ver) throw new Error('Version not found');

  const snapshot: ItemSnapshot = JSON.parse(ver.snapshot);

  // Apply snapshot in a transaction
  await prisma.$transaction(async (tx) => {
    // Update scalar fields
    await tx.item.update({
      where: { id: itemId },
      data: {
        name: snapshot.name,
        sku: snapshot.sku,
        description: snapshot.description,
        categoryId: snapshot.categoryId,
        locationId: snapshot.locationId,
        templateId: snapshot.templateId,
        quantity: snapshot.quantity,
        minQuantity: snapshot.minQuantity,
      },
    });

    // Replace tags
    await tx.itemTag.deleteMany({ where: { itemId } });
    if (snapshot.tagIds.length > 0) {
      await tx.itemTag.createMany({
        data: snapshot.tagIds.map(tagId => ({ itemId, tagId })),
      });
    }

    // Replace attributes
    await tx.itemAttribute.deleteMany({ where: { itemId } });
    if (snapshot.attributes.length > 0) {
      await tx.itemAttribute.createMany({
        data: snapshot.attributes.map(a => ({
          itemId,
          attributeName: a.name,
          attributeValue: a.value,
        })),
      });
    }
  });

  // Create a new version recording the rollback
  await createVersion(itemId, userId, 'RESTORED', `Rolled back to version ${version}`);
}

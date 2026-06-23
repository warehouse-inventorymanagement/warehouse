import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export interface DeviceInfo {
  name?: string;
  deviceUuid?: string;    // Android ID or app-generated UUID (recommended for Android 10+)
  imei?: string;
  serialNumber?: string;
  androidVersion?: string;
  manufacturer?: string;
  model?: string;
}

export interface DeviceFilters {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  isBlocked?: boolean;
}

/**
 * Generate a unique hash for device identification
 * Priority: deviceUuid > imei > serialNumber > model+manufacturer
 */
export function generateDeviceHash(deviceInfo: DeviceInfo): string {
  const { deviceUuid, imei, serialNumber, model, manufacturer } = deviceInfo;

  // Use deviceUuid as primary identifier (works on Android 10+)
  // Fall back to other identifiers for older devices
  const identifiers = [deviceUuid, imei, serialNumber, model, manufacturer].filter(Boolean).join('|');

  if (!identifiers) {
    // If no identifiers provided, generate a random hash
    return crypto.randomBytes(32).toString('hex');
  }

  return crypto.createHash('sha256').update(identifiers).digest('hex');
}

/**
 * Find a device by its hash or create a new one
 * Returns isBlocklisted=true if device is on the permanent blocklist
 */
export async function findOrCreateDevice(
  userId: string,
  deviceInfo: DeviceInfo
): Promise<{ device: any; isNew: boolean; isBlocklisted: boolean }> {
  const deviceHash = generateDeviceHash(deviceInfo);

  // Check blocklist FIRST - this persists even after device deletion
  const blocklisted = await isHashBlocklisted(deviceHash);

  // Check if device exists for this user
  let device = await prisma.device.findFirst({
    where: {
      deviceHash,
      userId
    }
  });

  if (blocklisted) {
    // Device is on blocklist - create or update as blocked
    const name = deviceInfo.name ||
      [deviceInfo.manufacturer, deviceInfo.model].filter(Boolean).join(' ') ||
      'Unknown Device';

    if (device) {
      // Update existing device to ensure it's blocked
      device = await prisma.device.update({
        where: { id: device.id },
        data: {
          isBlocked: true,
          blockedAt: device.blockedAt || new Date(),
          blockedReason: device.blockedReason || 'Device is on blocklist',
          lastActiveAt: new Date(),
          // Update fields if missing
          ...(deviceInfo.deviceUuid && !device.deviceUuid ? { deviceUuid: deviceInfo.deviceUuid } : {}),
          ...(deviceInfo.androidVersion && !device.androidVersion ? { androidVersion: deviceInfo.androidVersion } : {}),
          ...(deviceInfo.manufacturer && !device.manufacturer ? { manufacturer: deviceInfo.manufacturer } : {}),
          ...(deviceInfo.model && !device.model ? { model: deviceInfo.model } : {})
        }
      });
    } else {
      // Create new device as blocked
      device = await prisma.device.create({
        data: {
          userId,
          name,
          deviceUuid: deviceInfo.deviceUuid,
          imei: deviceInfo.imei,
          serialNumber: deviceInfo.serialNumber,
          androidVersion: deviceInfo.androidVersion,
          manufacturer: deviceInfo.manufacturer,
          model: deviceInfo.model,
          deviceHash,
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: 'Device is on blocklist',
          lastActiveAt: new Date()
        }
      });
    }
    return { device, isNew: !device, isBlocklisted: true };
  }

  if (device) {
    // Update last active time and fill in missing fields (like deviceUuid if added later)
    device = await prisma.device.update({
      where: { id: device.id },
      data: {
        lastActiveAt: new Date(),
        // Update deviceUuid if it was missing and now provided
        ...(deviceInfo.deviceUuid && !device.deviceUuid ? { deviceUuid: deviceInfo.deviceUuid } : {}),
        // Update other fields if they were missing
        ...(deviceInfo.androidVersion && !device.androidVersion ? { androidVersion: deviceInfo.androidVersion } : {}),
        ...(deviceInfo.manufacturer && !device.manufacturer ? { manufacturer: deviceInfo.manufacturer } : {}),
        ...(deviceInfo.model && !device.model ? { model: deviceInfo.model } : {})
      }
    });
    return { device, isNew: false, isBlocklisted: false };
  }

  // Create new device
  const name = deviceInfo.name ||
    [deviceInfo.manufacturer, deviceInfo.model].filter(Boolean).join(' ') ||
    'Unknown Device';

  device = await prisma.device.create({
    data: {
      userId,
      name,
      deviceUuid: deviceInfo.deviceUuid,
      imei: deviceInfo.imei,
      serialNumber: deviceInfo.serialNumber,
      androidVersion: deviceInfo.androidVersion,
      manufacturer: deviceInfo.manufacturer,
      model: deviceInfo.model,
      deviceHash,
      lastActiveAt: new Date()
    }
  });

  return { device, isNew: true, isBlocklisted: false };
}

/**
 * Get devices for a specific user
 */
export async function getDevicesByUserId(
  userId: string,
  options: DeviceFilters = {}
) {
  const { page = 1, limit = 20, search, isBlocked } = options;
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (typeof isBlocked === 'boolean') {
    where.isBlocked = isBlocked;
  }

  const [devices, total] = await Promise.all([
    prisma.device.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastActiveAt: 'desc' }
    }),
    prisma.device.count({ where })
  ]);

  return {
    devices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get all devices (admin function)
 */
export async function getAllDevices(options: DeviceFilters = {}) {
  const { page = 1, limit = 20, search, userId, isBlocked } = options;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  if (typeof isBlocked === 'boolean') {
    where.isBlocked = isBlocked;
  }

  const [devices, total] = await Promise.all([
    prisma.device.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { lastActiveAt: 'desc' }
    }),
    prisma.device.count({ where })
  ]);

  return {
    devices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get a single device by ID
 */
export async function getDeviceById(deviceId: string) {
  return prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
}

/**
 * Get a device by its hash
 */
export async function getDeviceByHash(deviceHash: string) {
  return prisma.device.findUnique({
    where: { deviceHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}

/**
 * Update a device
 */
export async function updateDevice(
  deviceId: string,
  data: { name?: string }
) {
  return prisma.device.update({
    where: { id: deviceId },
    data
  });
}

/**
 * Block a device and revoke all its sessions
 * Also adds to permanent blocklist so device stays blocked even if deleted
 */
export async function blockDevice(
  deviceId: string,
  reason?: string,
  blockedById?: string
) {
  // Get device first to access its hash
  const existingDevice = await prisma.device.findUnique({
    where: { id: deviceId }
  });

  if (!existingDevice) {
    throw new AppError('Device not found', 404);
  }

  // Add to permanent blocklist FIRST
  await addToBlocklist(
    existingDevice.deviceHash,
    {
      deviceName: existingDevice.name,
      deviceUuid: existingDevice.deviceUuid,
      manufacturer: existingDevice.manufacturer,
      model: existingDevice.model,
      userId: existingDevice.userId
    },
    reason,
    blockedById
  );

  // Update device status
  const device = await prisma.device.update({
    where: { id: deviceId },
    data: {
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: reason || 'Blocked by user'
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });

  // Revoke all sessions for this device
  await revokeDeviceSessions(deviceId);

  return device;
}

/**
 * Unblock a device
 */
export async function unblockDevice(deviceId: string) {
  return prisma.device.update({
    where: { id: deviceId },
    data: {
      isBlocked: false,
      blockedAt: null,
      blockedReason: null
    }
  });
}

/**
 * Delete a device
 */
export async function deleteDevice(deviceId: string) {
  // First revoke all sessions
  await revokeDeviceSessions(deviceId);

  // Then delete the device
  return prisma.device.delete({
    where: { id: deviceId }
  });
}

/**
 * Check if a device is blocked by its hash
 */
export async function isDeviceBlocked(deviceHash: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { deviceHash },
    select: { isBlocked: true }
  });

  return device?.isBlocked ?? false;
}

/**
 * Check if a device is blocked by its ID
 */
export async function isDeviceBlockedById(deviceId: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { isBlocked: true }
  });

  return device?.isBlocked ?? false;
}

/**
 * Revoke all refresh tokens for a device
 */
export async function revokeDeviceSessions(deviceId: string) {
  return prisma.refreshToken.deleteMany({
    where: { deviceId }
  });
}

/**
 * Update device's last active timestamp
 */
export async function updateLastActive(deviceId: string) {
  return prisma.device.update({
    where: { id: deviceId },
    data: { lastActiveAt: new Date() }
  });
}

/**
 * Verify device ownership or admin access
 */
export async function verifyDeviceAccess(
  deviceId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ device: any; canAccess: boolean }> {
  const device = await getDeviceById(deviceId);

  if (!device) {
    throw new AppError('Device not found', 404);
  }

  const canAccess = isAdmin || device.userId === userId;

  return { device, canAccess };
}

// ============================================
// BLOCKLIST FUNCTIONS
// ============================================

/**
 * Add a device hash to the permanent blocklist
 */
export async function addToBlocklist(
  deviceHash: string,
  deviceInfo: {
    deviceName?: string | null;
    deviceUuid?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    userId?: string | null;
  },
  reason?: string,
  blockedById?: string
) {
  return prisma.deviceBlocklist.upsert({
    where: { deviceHash },
    create: {
      deviceHash,
      reason: reason || 'Blocked by user',
      blockedById,
      deviceName: deviceInfo.deviceName,
      deviceUuid: deviceInfo.deviceUuid,
      manufacturer: deviceInfo.manufacturer,
      model: deviceInfo.model,
      userId: deviceInfo.userId
    },
    update: {
      reason: reason || 'Blocked by user',
      blockedById,
      blockedAt: new Date()
    }
  });
}

/**
 * Remove a device hash from the blocklist
 */
export async function removeFromBlocklist(deviceHash: string) {
  return prisma.deviceBlocklist.delete({
    where: { deviceHash }
  });
}

/**
 * Check if a device hash is in the blocklist
 */
export async function isHashBlocklisted(deviceHash: string): Promise<boolean> {
  const entry = await prisma.deviceBlocklist.findUnique({
    where: { deviceHash },
    select: { id: true }
  });
  return !!entry;
}

/**
 * Get blocklist entry by hash
 */
export async function getBlocklistEntry(deviceHash: string) {
  return prisma.deviceBlocklist.findUnique({
    where: { deviceHash },
    include: {
      blockedBy: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}

/**
 * Get all blocklist entries (admin)
 */
export async function getBlocklist(options: { page?: number; limit?: number; search?: string } = {}) {
  const { page = 1, limit = 20, search } = options;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { deviceName: { contains: search, mode: 'insensitive' } },
      { deviceUuid: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.deviceBlocklist.findMany({
      where,
      skip,
      take: limit,
      include: {
        blockedBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { blockedAt: 'desc' }
    }),
    prisma.deviceBlocklist.count({ where })
  ]);

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

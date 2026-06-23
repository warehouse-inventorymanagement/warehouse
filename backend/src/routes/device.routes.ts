/**
 * Device routes - manage user devices for mobile app access
 */

import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { AppError } from '../middleware/error.middleware.js';
import * as deviceService from '../services/device.service.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// Validation middleware
const validate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

/**
 * GET /api/devices
 * Get current user's devices
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('isBlocked').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, isBlocked } = req.query;

      const result = await deviceService.getDevicesByUserId(req.user!.id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined
      });

      res.json({
        success: true,
        data: result.devices,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/devices/all
 * Admin: Get all devices across all users
 */
router.get('/all',
  authenticate,
  requirePermission(PERMISSIONS.DEVICES_MANAGE),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('userId').optional().isUUID(),
    query('isBlocked').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, userId, isBlocked } = req.query;

      const result = await deviceService.getAllDevices({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        userId: userId as string,
        isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined
      });

      res.json({
        success: true,
        data: result.devices,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// BLOCKLIST MANAGEMENT ROUTES (Admin only)
// These must come BEFORE /:id routes
// ============================================

/**
 * GET /api/devices/blocklist
 * Admin: Get all blocklisted device hashes
 */
router.get('/blocklist',
  authenticate,
  requirePermission(PERMISSIONS.DEVICES_MANAGE),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString()
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search } = req.query;

      const result = await deviceService.getBlocklist({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string
      });

      res.json({
        success: true,
        data: result.entries,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/devices/blocklist/:hash
 * Admin: Remove a device hash from the blocklist
 */
router.delete('/blocklist/:hash',
  authenticate,
  requirePermission(PERMISSIONS.DEVICES_MANAGE),
  [param('hash').isString().isLength({ min: 64, max: 64 })],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const hash = req.params.hash as string;

      // Get blocklist entry for audit log
      const entry = await deviceService.getBlocklistEntry(hash);
      if (!entry) {
        throw new AppError('Blocklist entry not found', 404);
      }

      await deviceService.removeFromBlocklist(hash);

      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'device_blocklist',
        entityId: entry.id,
        entityName: entry.deviceName || hash.substring(0, 8) + '...',
        req
      });

      res.json({
        success: true,
        message: 'Device removed from blocklist successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// DEVICE ROUTES BY ID
// ============================================

/**
 * GET /api/devices/:id
 * Get a single device (owner or admin)
 */
router.get('/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roleName === 'Admin' ||
        req.user!.permissions?.includes(PERMISSIONS.DEVICES_MANAGE);

      const { device, canAccess } = await deviceService.verifyDeviceAccess(
        req.params.id as string,
        req.user!.id,
        isAdmin
      );

      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      res.json({
        success: true,
        data: device
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/devices/:id
 * Update a device (rename)
 */
router.put('/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('name').optional().isString().isLength({ min: 1, max: 100 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roleName === 'Admin' ||
        req.user!.permissions?.includes(PERMISSIONS.DEVICES_MANAGE);

      const { device, canAccess } = await deviceService.verifyDeviceAccess(
        req.params.id as string,
        req.user!.id,
        isAdmin
      );

      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      const { name } = req.body;
      const updatedDevice = await deviceService.updateDevice(req.params.id as string, { name });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'device',
        entityId: device.id,
        entityName: device.name,
        changes: JSON.stringify({ name: { old: device.name, new: name } }),
        req
      });

      res.json({
        success: true,
        data: updatedDevice,
        message: 'Device updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/devices/:id/block
 * Block a device
 */
router.post('/:id/block',
  authenticate,
  [
    param('id').isUUID(),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roleName === 'Admin' ||
        req.user!.permissions?.includes(PERMISSIONS.DEVICES_MANAGE);

      const { device, canAccess } = await deviceService.verifyDeviceAccess(
        req.params.id as string,
        req.user!.id,
        isAdmin
      );

      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      if (device.isBlocked) {
        throw new AppError('Device is already blocked', 400);
      }

      const { reason } = req.body;
      const blockedDevice = await deviceService.blockDevice(req.params.id as string, reason, req.user!.id);

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'device',
        entityId: device.id,
        entityName: device.name,
        changes: JSON.stringify({
          isBlocked: { old: false, new: true },
          blockedReason: { old: null, new: reason || 'Blocked by user' }
        }),
        req
      });

      res.json({
        success: true,
        data: blockedDevice,
        message: 'Device blocked successfully. All active sessions have been revoked.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/devices/:id/unblock
 * Unblock a device
 */
router.post('/:id/unblock',
  authenticate,
  [param('id').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roleName === 'Admin' ||
        req.user!.permissions?.includes(PERMISSIONS.DEVICES_MANAGE);

      const { device, canAccess } = await deviceService.verifyDeviceAccess(
        req.params.id as string,
        req.user!.id,
        isAdmin
      );

      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      if (!device.isBlocked) {
        throw new AppError('Device is not blocked', 400);
      }

      // Unblock the device and remove from blocklist
      const unblockedDevice = await deviceService.unblockDevice(req.params.id as string);

      // Also remove from permanent blocklist so device can re-register freely
      await deviceService.removeFromBlocklist(device.deviceHash).catch(() => {
        // Ignore error if not in blocklist
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'device',
        entityId: device.id,
        entityName: device.name,
        changes: JSON.stringify({
          isBlocked: { old: true, new: false },
          blockedReason: { old: device.blockedReason, new: null }
        }),
        req
      });

      res.json({
        success: true,
        data: unblockedDevice,
        message: 'Device unblocked successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/devices/:id
 * Delete a device
 */
router.delete('/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roleName === 'Admin' ||
        req.user!.permissions?.includes(PERMISSIONS.DEVICES_MANAGE);

      const { device, canAccess } = await deviceService.verifyDeviceAccess(
        req.params.id as string,
        req.user!.id,
        isAdmin
      );

      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      await deviceService.deleteDevice(req.params.id as string);

      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'device',
        entityId: device.id,
        entityName: device.name,
        req
      });

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

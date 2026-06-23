import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware.js';
import { Permission } from '../constants/permissions.js';
import prisma from '../lib/prisma.js';
import * as deviceService from '../services/device.service.js';
import { triggerBlockedDeviceAttemptNotification } from '../services/notification.service.js';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  employeeId: string | null;
  phone: string | null;
  address: string | null;
  gender: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  groupIds: string[];
  effectiveRoleSource: 'group' | 'ldap' | 'direct' | null; // Where the role came from
  deviceId?: string | null; // Device ID if logged in from mobile app
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Role priority order (higher index = higher privilege)
const ROLE_PRIORITY: Record<string, number> = {
  'Viewer': 1,
  'User': 2,
  'Technician': 3,
  'Manager': 4,
  'Admin': 5
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string; deviceId?: string };

    // Check if device is blocked (if deviceId is present in token)
    if (decoded.deviceId) {
      const isBlocked = await deviceService.isDeviceBlockedById(decoded.deviceId);
      if (isBlocked) {
        // Get device and user info for notification
        const device = await deviceService.getDeviceById(decoded.deviceId);
        if (device) {
          // Trigger notification in background
          triggerBlockedDeviceAttemptNotification(
            { id: device.userId, username: device.user?.username || '', email: device.user?.email || '' },
            device,
            req.ip
          ).catch(err => console.error('Failed to trigger blocked device notification:', err));
        }
        throw new AppError('This device has been blocked. Please contact an administrator.', 403);
      }

      // Update device last active time in background
      deviceService.updateLastActive(decoded.deviceId).catch(() => {});
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        phone: true,
        address: true,
        gender: true,
        isActive: true,
        roleId: true,
        ldapRoleId: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
        ldapRole: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
        groups: {
          include: {
            group: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Determine effective role with priority: groups > ldapRole > role
    let effectiveRole: { id: string; name: string; permissions: string[] } | null = null;
    let effectiveRoleSource: 'group' | 'ldap' | 'direct' | null = null;

    // Check group memberships first (pick highest priority role)
    if (user.groups.length > 0) {
      let highestPriority = -1;
      for (const ug of user.groups) {
        const role = ug.group.role;
        const priority = ROLE_PRIORITY[role.name] || 0;
        if (priority > highestPriority) {
          highestPriority = priority;
          effectiveRole = role;
        }
      }
      if (effectiveRole) {
        effectiveRoleSource = 'group';
      }
    }

    // Fallback to LDAP-determined role
    if (!effectiveRole && user.ldapRole) {
      effectiveRole = user.ldapRole;
      effectiveRoleSource = 'ldap';
    }

    // Fallback to direct role assignment
    if (!effectiveRole && user.role) {
      effectiveRole = user.role;
      effectiveRoleSource = 'direct';
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      phone: user.phone,
      address: user.address,
      gender: user.gender,
      roleId: effectiveRole?.id || null,
      roleName: effectiveRole?.name || null,
      permissions: effectiveRole?.permissions || [],
      groupIds: user.groups.map((ug: any) => ug.groupId),
      effectiveRoleSource,
      deviceId: decoded.deviceId || null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    next(error);
  }
};

// Check if user has specific permission(s)
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    // Admins bypass permission checks (handles newly added permissions not yet in DB role)
    if (isAdmin(req.user)) {
      return next();
    }

    const userPermissions = req.user.permissions;

    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(
        new AppError(
          `Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
};

// Check if user has ALL specified permissions
export const requireAllPermissions = (...requiredPermissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userPermissions = req.user.permissions;

    // Check if user has ALL of the required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (p) => !userPermissions.includes(p)
      );
      return next(
        new AppError(`Missing permissions: ${missing.join(', ')}`, 403)
      );
    }

    next();
  };
};

// Helper to check if user has a permission (for use in controllers)
export const hasPermission = (req: AuthRequest, permission: Permission): boolean => {
  return req.user?.permissions.includes(permission) || false;
};

// Check if user is admin (has admin role or admin-level permissions)
export const isAdmin = (user: AuthUser): boolean => {
  return user.roleName === 'Admin' || user.permissions.includes('users:create');
};

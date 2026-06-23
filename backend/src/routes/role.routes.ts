import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { PERMISSIONS, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import { triggerPermissionChangeNotification } from '../services/notification.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Both /bootstrap and /reset-admin create or overwrite the default admin
// account with a known password and take no auth token, by design, so they
// can be run from the setup script (see package.json "bootstrap") even
// before any account exists. Restricting them to loopback callers prevents
// remote, unauthenticated admin takeover while preserving that workflow.
// req.ip (not req.socket.remoteAddress) is used so this still works
// correctly behind a configured trusted reverse proxy (see index.ts trust
// proxy setup), where the raw socket peer is always the proxy itself.
function isLoopbackRequest(req: { ip?: string }): boolean {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

// Get all roles
router.get('/', authenticate, requirePermission(PERMISSIONS.ROLES_READ), async (req: AuthRequest, res: Response) => {
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: { users: true },
      },
      groups: {
        include: {
          _count: {
            select: { users: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    data: roles.map((role) => ({
      ...role,
      userCount: role._count.users,
      groupCount: role.groups.length,
      groupUserCount: role.groups.reduce((sum, group) => sum + group._count.users, 0),
      groups: undefined,
      _count: undefined,
    })),
  });
});

// Get all available permissions
router.get('/permissions', authenticate, requirePermission(PERMISSIONS.ROLES_READ), async (req: AuthRequest, res: Response) => {
  // Group permissions by resource
  const grouped: Record<string, string[]> = {};

  for (const permission of ALL_PERMISSIONS) {
    const [resource] = permission.split(':');
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(permission);
  }

  res.json({
    data: {
      all: ALL_PERMISSIONS,
      grouped,
      defaults: DEFAULT_ROLE_PERMISSIONS,
    },
  });
});

// Get single role
router.get('/:id', authenticate, requirePermission(PERMISSIONS.ROLES_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    res.json({ data: role });
  } catch (error) {
    next(error);
  }
});

// Create role
router.post('/', authenticate, requirePermission(PERMISSIONS.ROLES_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      throw new AppError('Role name is required', 400);
    }

    // Validate permissions
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter((p: string) => !ALL_PERMISSIONS.includes(p as any));
      if (invalidPerms.length > 0) {
        throw new AppError(`Invalid permissions: ${invalidPerms.join(', ')}`, 400);
      }
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions || [],
      },
    });

    // Audit log
    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'role',
      entityId: role.id,
      entityName: role.name,
      req,
    });

    res.status(201).json({ data: role });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A role with this name already exists', 400));
    }
    next(error);
  }
});

// Update role
router.put('/:id', authenticate, requirePermission(PERMISSIONS.ROLES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name, description, permissions } = req.body;

    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new AppError('Role not found', 404);
    }

    if (existingRole.isSystem && name && name !== existingRole.name) {
      throw new AppError('Cannot rename system roles', 400);
    }

    // Validate permissions
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter((p: string) => !ALL_PERMISSIONS.includes(p as any));
      if (invalidPerms.length > 0) {
        throw new AppError(`Invalid permissions: ${invalidPerms.join(', ')}`, 400);
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions,
      },
    });

    // Audit log with changes
    const changes = getChanges(existingRole, role, ['name', 'description', 'permissions']);
    if (changes) {
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'role',
        entityId: role.id,
        entityName: role.name,
        changes,
        req,
      });

      // Send permission change notification (in background)
      const changedFields = Object.keys(changes);
      const details = changedFields.includes('permissions')
        ? 'Permissions were modified'
        : `Fields updated: ${changedFields.join(', ')}`;

      triggerPermissionChangeNotification(
        {
          type: 'role_updated',
          entityName: role.name,
          details,
        },
        { username: req.user!.username }
      ).catch(err => {
        console.error('Failed to send permission change notification:', err);
      });
    }

    res.json({ data: role });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A role with this name already exists', 400));
    }
    next(error);
  }
});

// Delete role
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.ROLES_DELETE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.isSystem) {
      throw new AppError('Cannot delete system roles', 400);
    }

    if ((role as any)._count.users > 0) {
      throw new AppError(`Cannot delete role with ${(role as any)._count.users} assigned users. Reassign users first.`, 400);
    }

    await prisma.role.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'role',
      entityId: role.id,
      entityName: role.name,
      req,
    });

    // Send permission change notification (in background)
    triggerPermissionChangeNotification(
      {
        type: 'role_deleted',
        entityName: role.name,
        details: 'Role was permanently deleted',
      },
      { username: req.user!.username }
    ).catch(err => {
      console.error('Failed to send permission change notification:', err);
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Seed default roles (one-time setup) - requires auth
router.post('/seed', authenticate, requirePermission(PERMISSIONS.ROLES_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const defaultRoles = [
      { name: 'Admin', description: 'Full system access', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true },
      { name: 'Manager', description: 'Manage inventory and view users', permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER, isSystem: true },
      { name: 'Technician', description: 'Settings and audit log access', permissions: DEFAULT_ROLE_PERMISSIONS.TECHNICIAN, isSystem: true },
      { name: 'User', description: 'Basic inventory operations', permissions: DEFAULT_ROLE_PERMISSIONS.USER, isSystem: true },
      { name: 'Viewer', description: 'Read-only access', permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER, isSystem: true },
    ];

    const created = [];
    for (const roleData of defaultRoles) {
      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });
      if (!existing) {
        const role = await prisma.role.create({ data: roleData });
        created.push(role);
      }
    }

    res.json({
      message: `Created ${created.length} default roles`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

// Bootstrap endpoint - PUBLIC (no auth required)
// Creates default roles, default admin user, and assigns roles to existing users
// Only works if no roles exist yet (first-time setup)
router.post('/bootstrap', async (req, res: Response, next) => {
  try {
    if (!isLoopbackRequest(req)) {
      return res.status(403).json({
        success: false,
        message: 'This endpoint can only be called from localhost.',
      });
    }

    // Check if roles already exist
    const existingRoles = await prisma.role.count();

    if (existingRoles > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bootstrap already completed. Roles already exist in the system.',
      });
    }

    // Create default roles
    const defaultRoles = [
      { name: 'Admin', description: 'Full system access', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true },
      { name: 'Manager', description: 'Manage inventory and view users', permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER, isSystem: true },
      { name: 'Technician', description: 'Settings and audit log access', permissions: DEFAULT_ROLE_PERMISSIONS.TECHNICIAN, isSystem: true },
      { name: 'User', description: 'Basic inventory operations', permissions: DEFAULT_ROLE_PERMISSIONS.USER, isSystem: true },
      { name: 'Viewer', description: 'Read-only access', permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER, isSystem: true },
    ];

    const createdRoles = [];
    for (const roleData of defaultRoles) {
      const role = await prisma.role.create({ data: roleData });
      createdRoles.push(role);
    }

    // Find Admin role
    const adminRole = createdRoles.find((r) => r.name === 'Admin');
    const userRole = createdRoles.find((r) => r.name === 'User');

    // Create default admin user (warehouse/warehouse)
    let defaultAdminCreated = false;
    if (adminRole) {
      const existingAdmin = await prisma.user.findUnique({ where: { username: 'warehouse' } });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('warehouse', 12);
        await prisma.user.create({
          data: {
            username: 'warehouse',
            email: 'admin@warehouse.local',
            passwordHash,
            roleId: adminRole.id,
          },
        });
        defaultAdminCreated = true;
      }
    }

    // Assign User role to existing users without roles
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: null },
      orderBy: { createdAt: 'asc' },
    });

    const updatedUsers = [];
    for (const user of usersWithoutRole) {
      if (userRole) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: userRole.id },
        });
        updatedUsers.push({
          username: user.username,
          assignedRole: userRole.name,
        });
      }
    }

    res.json({
      success: true,
      message: 'Bootstrap completed successfully',
      data: {
        rolesCreated: createdRoles.map((r) => r.name),
        defaultAdminCreated,
        defaultAdminCredentials: defaultAdminCreated ? { username: 'warehouse', password: 'warehouse' } : null,
        usersUpdated: updatedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync system roles with latest permissions - updates existing system roles
router.post('/sync-permissions', authenticate, requirePermission(PERMISSIONS.ROLES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const rolePermissionMap: Record<string, readonly string[]> = {
      'Admin': DEFAULT_ROLE_PERMISSIONS.ADMIN,
      'Manager': DEFAULT_ROLE_PERMISSIONS.MANAGER,
      'Technician': DEFAULT_ROLE_PERMISSIONS.TECHNICIAN,
      'User': DEFAULT_ROLE_PERMISSIONS.USER,
      'Viewer': DEFAULT_ROLE_PERMISSIONS.VIEWER,
    };

    const updated = [];
    for (const [roleName, permissions] of Object.entries(rolePermissionMap)) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role && role.isSystem) {
        // Check if permissions are different
        const currentPerms = new Set(role.permissions);
        const newPerms = new Set(permissions);
        const needsUpdate = permissions.some(p => !currentPerms.has(p)) ||
                           role.permissions.some(p => !newPerms.has(p));

        if (needsUpdate) {
          await prisma.role.update({
            where: { id: role.id },
            data: { permissions: [...permissions] },
          });
          updated.push({
            name: roleName,
            oldCount: role.permissions.length,
            newCount: permissions.length,
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated.length} system roles with latest permissions`,
      data: { updated },
    });
  } catch (error) {
    next(error);
  }
});

// Reset/create default admin user - PUBLIC (for recovery)
router.post('/reset-admin', async (req, res: Response, next) => {
  try {
    if (!isLoopbackRequest(req)) {
      return res.status(403).json({
        success: false,
        message: 'This endpoint can only be called from localhost.',
      });
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });

    if (!adminRole) {
      return res.status(400).json({
        success: false,
        message: 'Admin role not found. Run /bootstrap first.',
      });
    }

    const passwordHash = await bcrypt.hash('warehouse', 12);

    const user = await prisma.user.upsert({
      where: { username: 'warehouse' },
      update: {
        passwordHash,
        roleId: adminRole.id,
        isActive: true
      },
      create: {
        username: 'warehouse',
        email: 'admin@warehouse.local',
        passwordHash,
        roleId: adminRole.id,
      },
    });

    res.json({
      success: true,
      message: 'Default admin user created/reset',
      data: {
        username: 'warehouse',
        password: 'warehouse',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

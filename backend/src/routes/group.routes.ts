import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all groups
router.get('/', authenticate, requirePermission(PERMISSIONS.GROUPS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        role: {
          select: { id: true, name: true }
        },
        _count: {
          select: { users: true }
        },
        users: {
          take: 5, // Preview of first 5 members
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      data: groups.map(group => ({
        ...group,
        userCount: (group as any)._count.users,
        memberPreview: group.users.map(ug => ({
          id: ug.user.id,
          username: ug.user.username
        })),
        users: undefined,
        _count: undefined
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get single group with members
router.get('/:id', authenticate, requirePermission(PERMISSIONS.GROUPS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        role: {
          select: { id: true, name: true, permissions: true }
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                ldapDn: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    res.json({
      data: {
        ...group,
        members: group.users.map(ug => ug.user),
        users: undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create group
router.post('/', authenticate, requirePermission(PERMISSIONS.GROUPS_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, description, roleId } = req.body;

    if (!name) {
      throw new AppError('Group name is required', 400);
    }

    if (!roleId) {
      throw new AppError('Role is required', 400);
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new AppError('Role not found', 404);
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        roleId
      },
      include: {
        role: {
          select: { id: true, name: true }
        }
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      req
    });

    res.status(201).json({ data: group });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A group with this name already exists', 400));
    }
    next(error);
  }
});

// Update group
router.put('/:id', authenticate, requirePermission(PERMISSIONS.GROUPS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name, description, roleId } = req.body;

    const existingGroup = await prisma.group.findUnique({
      where: { id }
    });

    if (!existingGroup) {
      throw new AppError('Group not found', 404);
    }

    // Verify role exists if changing
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new AppError('Role not found', 404);
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name,
        description,
        roleId
      },
      include: {
        role: {
          select: { id: true, name: true }
        }
      }
    });

    const changes = getChanges(existingGroup, group, ['name', 'description', 'roleId']);
    if (changes) {
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'group',
        entityId: group.id,
        entityName: group.name,
        changes,
        req
      });
    }

    res.json({ data: group });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A group with this name already exists', 400));
    }
    next(error);
  }
});

// Delete group
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.GROUPS_DELETE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    // Delete group (cascade will remove user associations)
    await prisma.group.delete({
      where: { id }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      req
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add user to group
router.post('/:id/members', authenticate, requirePermission(PERMISSIONS.GROUPS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const groupId = req.params.id as string;
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    const existing = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: { userId, groupId }
      }
    });

    if (existing) {
      throw new AppError('User is already a member of this group', 400);
    }

    await prisma.userGroup.create({
      data: {
        userId,
        groupId
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      changes: JSON.stringify({ members: { added: user.username } }),
      req
    });

    res.json({ message: 'User added to group successfully' });
  } catch (error) {
    next(error);
  }
});

// Remove user from group
router.delete('/:id/members/:userId', authenticate, requirePermission(PERMISSIONS.GROUPS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const groupId = req.params.id as string;
    const userId = req.params.userId as string;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const membership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: { userId, groupId }
      }
    });

    if (!membership) {
      throw new AppError('User is not a member of this group', 400);
    }

    await prisma.userGroup.delete({
      where: {
        userId_groupId: { userId, groupId }
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      changes: JSON.stringify({ members: { removed: user.username } }),
      req
    });

    res.json({ message: 'User removed from group successfully' });
  } catch (error) {
    next(error);
  }
});

// Get users available to add to a group (not already members)
router.get('/:id/available-users', authenticate, requirePermission(PERMISSIONS.GROUPS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const groupId = req.params.id as string;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    // Get users not in this group
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        groups: {
          none: {
            groupId
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        ldapDn: true
      },
      orderBy: { username: 'asc' }
    });

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

export default router;

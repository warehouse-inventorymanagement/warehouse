import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import { triggerPermissionChangeNotification } from '../services/notification.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all users
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const where = search
        ? {
            OR: [
              { id: { contains: search } },
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } }
            ]
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            phone: true,
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            isActive: true,
            canAccessQuarantine: true,
            ldapDn: true,
            createdAt: true
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single user
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const user = await prisma.user.findUnique({
        where: { id },
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
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
            },
          },
          isActive: true,
          canAccessQuarantine: true,
          ldapDn: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Create user
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_CREATE),
  [
    body('username').trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 8 }),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('employeeId').optional().trim().isLength({ max: 50 }),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('address').optional().trim().isLength({ max: 500 }),
    body('gender').optional().isIn(['male', 'female', '']),
    body('roleId').optional().isUUID()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { username, email, password, firstName, lastName, employeeId, phone, address, gender, roleId } = req.body;

      const existing = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] }
      });

      if (existing) {
        throw new AppError('Username or email already exists', 400);
      }

      // Verify role exists if provided
      if (roleId) {
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
          throw new AppError('Role not found', 400);
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 12) : null;

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          firstName,
          lastName,
          employeeId,
          phone,
          address,
          gender,
          roleId
        },
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
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
          canAccessQuarantine: true,
          createdAt: true
        }
      });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'user',
        entityId: user.id,
        entityName: user.username,
        req,
      });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Update user
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_UPDATE),
  param('id').isUUID(),
  [
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('employeeId').optional().trim().isLength({ max: 50 }),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('address').optional().trim().isLength({ max: 500 }),
    body('gender').optional().isIn(['male', 'female', '']),
    body('roleId').optional().isUUID(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const { username, email, firstName, lastName, employeeId, phone, address, gender, roleId, isActive } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: { role: true },
      });

      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // Prevent self-role change
      if (id === req.user!.id && roleId && roleId !== existingUser.roleId) {
        throw new AppError('Cannot change your own role', 400);
      }

      // Prevent self-deactivation
      if (id === req.user!.id && isActive === false) {
        throw new AppError('Cannot deactivate your own account', 400);
      }

      // Check username uniqueness if changing
      if (username && username !== existingUser.username) {
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
          throw new AppError('Username already taken by another user', 400);
        }
      }

      // Check email uniqueness if changing
      if (email && email !== existingUser.email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new AppError('Email already used by another user', 400);
        }
      }

      // Verify role exists if changing
      if (roleId) {
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
          throw new AppError('Role not found', 400);
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(username && { username }),
          ...(email && { email }),
          ...(firstName !== undefined && { firstName: firstName || null }),
          ...(lastName !== undefined && { lastName: lastName || null }),
          ...(employeeId !== undefined && { employeeId: employeeId || null }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(address !== undefined && { address: address || null }),
          ...(gender !== undefined && { gender: gender || null }),
          ...(roleId !== undefined && { roleId }),
          ...(typeof isActive === 'boolean' && { isActive })
        },
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
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
          canAccessQuarantine: true,
          updatedAt: true
        }
      });

      // Audit log with changes
      const changes = getChanges(
        { ...existingUser, roleName: existingUser.role?.name },
        { ...user, roleName: user.role?.name },
        ['username', 'email', 'roleId', 'roleName', 'isActive']
      );
      if (changes) {
        await createAuditLog({
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'user',
          entityId: user.id,
          entityName: user.username,
          changes,
          req,
        });

        // Send permission change notifications (in background)
        if (changes.roleId || changes.roleName) {
          triggerPermissionChangeNotification(
            {
              type: 'user_role_changed',
              entityName: user.username,
              details: `Role changed from "${existingUser.role?.name || 'None'}" to "${user.role?.name || 'None'}"`,
            },
            { username: req.user!.username }
          ).catch(err => {
            console.error('Failed to send permission change notification:', err);
          });
        }

        if (changes.isActive && changes.isActive.new === false) {
          triggerPermissionChangeNotification(
            {
              type: 'user_deactivated',
              entityName: user.username,
              details: 'User account was deactivated',
            },
            { username: req.user!.username }
          ).catch(err => {
            console.error('Failed to send permission change notification:', err);
          });
        }
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Delete user
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_DELETE),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = req.params.id as string;

      if (id === req.user!.id) {
        throw new AppError('Cannot delete your own account', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await prisma.user.delete({ where: { id } });

      // Audit log
      await createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        entityType: 'user',
        entityId: user.id,
        entityName: user.username,
        req,
      });

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Avatar Upload ───

const avatarDir = path.join(process.env.UPLOAD_DIR || './uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post(
  '/me/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      const userId = req.user!.id;
      const hash = crypto.createHash('md5').update(req.file.buffer).digest('hex').slice(0, 12);
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${userId}-${hash}${ext}`;
      const filePath = path.join(avatarDir, filename);

      if (!fs.existsSync(filePath)) {
        // Clean up old avatars for this user
        try {
          const existing = fs.readdirSync(avatarDir).filter(f => f.startsWith(`${userId}-`));
          for (const old of existing) fs.unlinkSync(path.join(avatarDir, old));
        } catch { /* best effort */ }
        fs.writeFileSync(filePath, req.file.buffer);
      }

      const avatarPath = `avatars/${filename}`;
      await prisma.user.update({ where: { id: userId }, data: { avatarPath } });

      res.json({ success: true, data: { avatarPath } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

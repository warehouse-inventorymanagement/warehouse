import { Router } from 'express';
import { body } from 'express-validator';
import * as authService from '../services/auth.service.js';
import * as tfaService from '../services/tfa.service.js';
import { isLdapEnabled } from '../services/ldap.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createLoginAuditLog, countRecentFailedLogins } from '../services/audit.service.js';
import { triggerFailedLoginNotification } from '../services/notification.service.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Password complexity: min 8 chars, must include uppercase, lowercase, number, and special character
const passwordValidation = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one number')
  .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character');

// Register
router.post(
  '/register',
  authLimiter,
  [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    passwordValidation
  ],
  validate,
  async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      const result = await authService.register(username, email, password);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  authLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username or email required'),
    body('password').notEmpty().withMessage('Password required'),
    body('deviceInfo').optional().isObject(),
    body('deviceInfo.name').optional().isString(),
    body('deviceInfo.imei').optional().isString(),
    body('deviceInfo.serialNumber').optional().isString(),
    body('deviceInfo.androidVersion').optional().isString(),
    body('deviceInfo.manufacturer').optional().isString(),
    body('deviceInfo.model').optional().isString()
  ],
  validate,
  async (req, res, next) => {
    const { username, password, deviceInfo } = req.body;
    const reqInfo = { ip: req.ip, userAgent: req.get('user-agent') };
    try {
      const result = await authService.login(username, password, deviceInfo, reqInfo);

      // Check if 2FA is required
      if ('requires2FA' in result && result.requires2FA) {
        res.json({ success: true, data: result });
        return;
      }

      // Log successful login
      await createLoginAuditLog({
        username,
        success: true,
        userId: (result as any).user.id,
        authMethod: 'local',
        platform: deviceInfo ? 'mobile' : 'web',
        req,
      });

      // Check password expiry
      let passwordExpired = false;
      try {
        const expirySetting = await prisma.setting.findUnique({ where: { key: 'security.passwordExpiryDays' } });
        const expiryDays = expirySetting ? parseInt(expirySetting.value) : 0;
        if (expiryDays > 0 && (result as any).user?.id) {
          const user = await prisma.user.findUnique({ where: { id: (result as any).user.id }, select: { passwordChangedAt: true } });
          if (user?.passwordChangedAt) {
            const daysSinceChange = Math.floor((Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24));
            passwordExpired = daysSinceChange >= expiryDays;
          }
        }
      } catch {}

      res.json({ success: true, data: { ...result, passwordExpired } });
    } catch (error: any) {
      // Log failed login attempt
      await createLoginAuditLog({
        username,
        success: false,
        authMethod: 'local',
        platform: deviceInfo ? 'mobile' : 'web',
        reason: error.message || 'Invalid credentials',
        req,
      });

      // Check if we need to send failed login notification (3+ attempts)
      const failedCount = await countRecentFailedLogins(username);
      if (failedCount >= 3) {
        // Send notification in background (don't await)
        triggerFailedLoginNotification(username, failedCount, req).catch(err => {
          console.error('Failed to trigger failed login notification:', err);
        });
      }

      next(error);
    }
  }
);

// LDAP Login
router.post(
  '/ldap-login',
  authLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required'),
    body('deviceInfo').optional().isObject(),
    body('deviceInfo.name').optional().isString(),
    body('deviceInfo.imei').optional().isString(),
    body('deviceInfo.serialNumber').optional().isString(),
    body('deviceInfo.androidVersion').optional().isString(),
    body('deviceInfo.manufacturer').optional().isString(),
    body('deviceInfo.model').optional().isString()
  ],
  validate,
  async (req, res, next) => {
    const { username, password, deviceInfo } = req.body;
    const reqInfo = { ip: req.ip, userAgent: req.get('user-agent') };
    try {
      const result = await authService.loginWithLdap(username, password, deviceInfo, reqInfo);

      // Check if 2FA is required
      if ('requires2FA' in result && result.requires2FA) {
        res.json({ success: true, data: result });
        return;
      }

      // Log successful LDAP login
      await createLoginAuditLog({
        username,
        success: true,
        userId: (result as any).user.id,
        authMethod: 'ldap',
        platform: deviceInfo ? 'mobile' : 'web',
        req,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      // Log failed LDAP login attempt
      await createLoginAuditLog({
        username,
        success: false,
        authMethod: 'ldap',
        platform: deviceInfo ? 'mobile' : 'web',
        reason: error.message || 'LDAP authentication failed',
        req,
      });

      // Check if we need to send failed login notification (3+ attempts)
      const failedCount = await countRecentFailedLogins(username);
      if (failedCount >= 3) {
        // Send notification in background (don't await)
        triggerFailedLoginNotification(username, failedCount, req).catch(err => {
          console.error('Failed to trigger failed login notification:', err);
        });
      }

      next(error);
    }
  }
);

// Refresh Token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }
    const reqInfo = { ip: req.ip, userAgent: req.get('user-agent') };
    const tokens = await authService.refreshAccessToken(refreshToken, reqInfo);
    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Request Password Reset
router.post(
  '/forgot-password',
  passwordResetLimiter,
  body('email').isEmail().normalizeEmail(),
  validate,
  async (req, res, next) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token required'),
    passwordValidation
  ],
  validate,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Change Password (authenticated)
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character')
  ],
  validate,
  async (req: AuthRequest, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Fetch extra user fields not on the auth middleware
    const extraInfo = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { twoFactorEnabled: true, twoFactorMethod: true, avatarPath: true, ldapDn: true }
    });

    // Return in same format as login (with nested role object)
    const userData = {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      employeeId: req.user!.employeeId,
      phone: req.user!.phone,
      address: req.user!.address,
      gender: req.user!.gender,
      avatarPath: extraInfo?.avatarPath || null,
      isLdap: !!extraInfo?.ldapDn,
      roleId: req.user!.roleId,
      role: req.user!.roleId ? {
        id: req.user!.roleId,
        name: req.user!.roleName,
        permissions: req.user!.permissions,
      } : null,
      twoFactorEnabled: extraInfo?.twoFactorEnabled || false,
    };
    res.json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
});

// Check if LDAP is enabled (public)
router.get('/ldap-status', async (req, res, next) => {
  try {
    const enabled = await isLdapEnabled();
    res.json({ success: true, data: { enabled } });
  } catch (error) {
    next(error);
  }
});

// ─── Two-Factor Authentication Endpoints ───

// Rate limiting for 2FA verification attempts (in-memory, per pending token)
const tfaAttempts = new Map<string, { count: number; lastAttempt: number }>();
const TFA_MAX_ATTEMPTS = 5;
const TFA_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tfaAttempts) {
    if (now - val.lastAttempt > TFA_LOCKOUT_MS) tfaAttempts.delete(key);
  }
}, 10 * 60 * 1000);

// Verify 2FA code (completes login)
router.post(
  '/verify-2fa',
  [
    body('pendingToken').notEmpty().withMessage('Pending token required'),
    body('code').notEmpty().withMessage('Verification code required'),
    body('method').optional().isIn(['totp', 'email']).withMessage('Method must be totp or email')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { pendingToken, code, method } = req.body;

      // Rate limit check
      const attempt = tfaAttempts.get(pendingToken);
      if (attempt && attempt.count >= TFA_MAX_ATTEMPTS) {
        const elapsed = Date.now() - attempt.lastAttempt;
        if (elapsed < TFA_LOCKOUT_MS) {
          throw new AppError('Too many failed attempts. Please try logging in again.', 429);
        }
        tfaAttempts.delete(pendingToken);
      }

      let result;
      try {
        result = await authService.verifyTwoFactor(pendingToken, code, method);
      } catch (error: any) {
        // Track failed attempt
        const current = tfaAttempts.get(pendingToken) || { count: 0, lastAttempt: 0 };
        tfaAttempts.set(pendingToken, { count: current.count + 1, lastAttempt: Date.now() });
        throw error;
      }

      // Success — clean up attempt tracking
      tfaAttempts.delete(pendingToken);

      // Log successful 2FA login
      await createLoginAuditLog({
        username: result.user.username,
        success: true,
        userId: result.user.id,
        authMethod: '2fa',
        platform: 'web',
        req,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Resend email 2FA code
router.post(
  '/2fa/resend',
  [
    body('pendingToken').notEmpty().withMessage('Pending token required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { pendingToken } = req.body;
      const { userId } = tfaService.verifyPendingToken(pendingToken);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true, twoFactorMethod: true, twoFactorEnabled: true }
      });

      if (!user || !user.twoFactorEnabled || !tfaService.hasMethod(user.twoFactorMethod, 'email')) {
        throw new AppError('Email 2FA is not enabled', 400);
      }

      const code = tfaService.generateEmailCode();
      await tfaService.saveEmailCode(userId, code);
      await tfaService.sendTwoFactorEmail(user.email, user.username, code);

      res.json({ success: true, message: 'Verification code sent' });
    } catch (error) {
      next(error);
    }
  }
);

// Setup 2FA (authenticated — starts enrollment)
router.post(
  '/2fa/setup',
  authenticate,
  [
    body('method').isIn(['totp', 'email']).withMessage('Method must be totp or email')
  ],
  validate,
  async (req: AuthRequest, res, next) => {
    try {
      const { method } = req.body;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true, twoFactorEnabled: true, twoFactorMethod: true, twoFactorSecret: true }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if this specific method is already configured
      if (tfaService.hasMethod(user.twoFactorMethod, method)) {
        throw new AppError(`${method === 'totp' ? 'Authenticator' : 'Email'} 2FA is already enabled.`, 400);
      }

      // Only generate backup codes if this is the first method (no existing 2FA)
      const isFirstMethod = !user.twoFactorEnabled;
      let plainCodes: string[] | undefined;
      let hashedCodes: string[] | undefined;
      if (isFirstMethod) {
        const backup = await tfaService.generateBackupCodes();
        plainCodes = backup.plainCodes;
        hashedCodes = backup.hashedCodes;
      }

      const newMethod = tfaService.addMethod(user.twoFactorMethod, method);

      if (method === 'totp') {
        const { secret, qrCodeDataUrl } = await tfaService.generateTotpSecret(user.username);

        // Store encrypted secret (not enabled yet until confirm)
        const updateData: any = {
          twoFactorSecret: tfaService.encryptTotpSecret(secret),
          twoFactorMethod: newMethod,
        };
        if (hashedCodes) updateData.twoFactorBackupCodes = hashedCodes;

        await prisma.user.update({ where: { id: userId }, data: updateData });

        res.json({
          success: true,
          data: { method: 'totp', secret, qrCodeDataUrl, ...(plainCodes ? { backupCodes: plainCodes } : {}) }
        });
      } else {
        // Email method — send a test code
        const code = tfaService.generateEmailCode();
        await tfaService.saveEmailCode(userId, code);
        await tfaService.sendTwoFactorEmail(user.email, user.username, code);

        const updateData: any = { twoFactorMethod: newMethod };
        if (hashedCodes) updateData.twoFactorBackupCodes = hashedCodes;

        await prisma.user.update({ where: { id: userId }, data: updateData });

        res.json({
          success: true,
          data: { method: 'email', ...(plainCodes ? { backupCodes: plainCodes } : {}) }
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Confirm 2FA setup (verify code to activate)
router.post(
  '/2fa/confirm',
  authenticate,
  [
    body('code').notEmpty().withMessage('Verification code required'),
    body('method').isIn(['totp', 'email']).withMessage('Method must be totp or email')
  ],
  validate,
  async (req: AuthRequest, res, next) => {
    try {
      const { code, method } = req.body;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorMethod: true,
          twoFactorSecret: true,
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.twoFactorMethod || !tfaService.hasMethod(user.twoFactorMethod, method)) {
        throw new AppError('Please run setup first for this method', 400);
      }

      let verified = false;

      if (method === 'totp' && user.twoFactorSecret) {
        verified = tfaService.verifyTotpCode(user.twoFactorSecret, code);
      } else if (method === 'email') {
        verified = await tfaService.verifyEmailCode(userId, code);
      }

      if (!verified) {
        throw new AppError('Invalid verification code', 400);
      }

      // Activate 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorEmailCode: null,
          twoFactorEmailExp: null,
        }
      });

      res.json({ success: true, message: 'Two-factor authentication enabled' });
    } catch (error) {
      next(error);
    }
  }
);

// Disable 2FA (authenticated, requires re-authentication)
router.post(
  '/2fa/disable',
  authenticate,
  [
    body('password').optional().isString(),
    body('code').optional().isString(),
    body('method').optional().isIn(['totp', 'email']).withMessage('Method must be totp or email')
  ],
  validate,
  async (req: AuthRequest, res, next) => {
    try {
      const { password, code, method } = req.body;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
          ldapDn: true,
          twoFactorEnabled: true,
          twoFactorMethod: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true,
        }
      });

      if (!user || !user.twoFactorEnabled) {
        throw new AppError('2FA is not enabled', 400);
      }

      // Re-authenticate: local users use password, LDAP users use 2FA code
      if (user.ldapDn) {
        if (!code) {
          throw new AppError('Verification code required', 400);
        }
        let verified = false;
        if (tfaService.hasMethod(user.twoFactorMethod, 'totp') && user.twoFactorSecret) {
          verified = tfaService.verifyTotpCode(user.twoFactorSecret, code);
        }
        if (!verified && user.twoFactorBackupCodes.length > 0) {
          const remaining = await tfaService.verifyBackupCode(code, user.twoFactorBackupCodes);
          if (remaining !== null) verified = true;
        }
        if (!verified) {
          throw new AppError('Invalid verification code', 401);
        }
      } else {
        if (!password) {
          throw new AppError('Password required', 400);
        }
        if (!user.passwordHash) {
          throw new AppError('Cannot verify identity', 400);
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new AppError('Invalid password', 401);
        }
      }

      if (method) {
        // Disable only the specified method
        const remaining = tfaService.removeMethod(user.twoFactorMethod, method);
        const updateData: any = {
          twoFactorMethod: remaining,
        };

        if (!remaining) {
          // No methods left — fully disable 2FA
          updateData.twoFactorEnabled = false;
          updateData.twoFactorSecret = null;
          updateData.twoFactorBackupCodes = [];
          updateData.twoFactorEmailCode = null;
          updateData.twoFactorEmailExp = null;
        } else {
          // Clear method-specific fields
          if (method === 'totp') {
            updateData.twoFactorSecret = null;
          } else if (method === 'email') {
            updateData.twoFactorEmailCode = null;
            updateData.twoFactorEmailExp = null;
          }
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });
      } else {
        // Disable all 2FA
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorMethod: null,
            twoFactorBackupCodes: [],
            twoFactorEmailCode: null,
            twoFactorEmailExp: null,
          }
        });
      }

      res.json({ success: true, message: 'Two-factor authentication disabled' });
    } catch (error) {
      next(error);
    }
  }
);

// Regenerate backup codes (authenticated, requires re-authentication)
router.post(
  '/2fa/backup-codes/regenerate',
  authenticate,
  [
    body('password').optional().isString(),
    body('code').optional().isString()
  ],
  validate,
  async (req: AuthRequest, res, next) => {
    try {
      const { password, code } = req.body;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
          ldapDn: true,
          twoFactorEnabled: true,
          twoFactorMethod: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true,
        }
      });

      if (!user || !user.twoFactorEnabled) {
        throw new AppError('2FA is not enabled', 400);
      }

      // Re-authenticate
      if (user.ldapDn) {
        if (!code) throw new AppError('Verification code required', 400);
        let verified = false;
        if (tfaService.hasMethod(user.twoFactorMethod, 'totp') && user.twoFactorSecret) {
          verified = tfaService.verifyTotpCode(user.twoFactorSecret, code);
        }
        if (!verified) throw new AppError('Invalid verification code', 401);
      } else {
        if (!password) throw new AppError('Password required', 400);
        if (!user.passwordHash) throw new AppError('Cannot verify identity', 400);
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new AppError('Invalid password', 401);
      }

      const { plainCodes, hashedCodes } = await tfaService.generateBackupCodes();

      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: hashedCodes }
      });

      res.json({ success: true, data: { backupCodes: plainCodes } });
    } catch (error) {
      next(error);
    }
  }
);

// Get 2FA status (authenticated)
router.get(
  '/2fa/status',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          twoFactorEnabled: true,
          twoFactorMethod: true,
          twoFactorBackupCodes: true,
        }
      });

      const methods = tfaService.getMethods(user?.twoFactorMethod);
      res.json({
        success: true,
        data: {
          enabled: user?.twoFactorEnabled || false,
          method: user?.twoFactorMethod || null,
          methods,
          totpConfigured: methods.includes('totp'),
          emailConfigured: methods.includes('email'),
          backupCodesRemaining: user?.twoFactorBackupCodes?.length || 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

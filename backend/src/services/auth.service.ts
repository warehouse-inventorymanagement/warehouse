import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/error.middleware.js';
import { sendPasswordResetEmail } from './email.service.js';
import { ldapAuthenticate } from './ldap.service.js';
import prisma from '../lib/prisma.js';
import * as deviceService from './device.service.js';
import { triggerNewDeviceNotification, triggerBlockedDeviceAttemptNotification } from './notification.service.js';
import * as tfaService from './tfa.service.js';

// ─── Avatar helpers ───

const getAvatarDir = () => path.join(process.env.UPLOAD_DIR || './uploads', 'avatars');

/**
 * Detect image format from magic bytes.
 */
function detectImageExt(buf: Buffer): string {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return '.png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return '.webp';
  return '.jpg'; // default to jpg
}

/**
 * Save an LDAP photo buffer to disk. Returns the relative path (e.g. "avatars/uuid-hash.jpg").
 * Uses an MD5 hash prefix so we skip re-writing identical files and clean up old ones.
 */
export async function saveLdapAvatar(userId: string, photoBuffer: Buffer): Promise<string> {
  const avatarDir = getAvatarDir();
  if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

  const ext = detectImageExt(photoBuffer);
  const hash = crypto.createHash('md5').update(photoBuffer).digest('hex').slice(0, 12);
  const filename = `${userId}-${hash}${ext}`;
  const filePath = path.join(avatarDir, filename);

  if (!fs.existsSync(filePath)) {
    // Clean up old avatars for this user
    try {
      const existing = fs.readdirSync(avatarDir).filter(f => f.startsWith(`${userId}-`));
      for (const old of existing) fs.unlinkSync(path.join(avatarDir, old));
    } catch { /* best effort cleanup */ }
    fs.writeFileSync(filePath, photoBuffer);
    console.log(`[LDAP Avatar] Saved ${photoBuffer.length} bytes as ${filename} (detected: ${ext})`);
  }

  return `avatars/${filename}`;
}

// Helper to format user response with role
const formatUserResponse = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  employeeId: user.employeeId,
  phone: user.phone,
  address: user.address,
  gender: user.gender,
  avatarPath: user.avatarPath || null,
  isLdap: !!user.ldapDn,
  roleId: user.roleId,
  role: user.role ? {
    id: user.role.id,
    name: user.role.name,
    permissions: user.role.permissions,
  } : null,
});

interface TokenPayload {
  userId: string;
  deviceId?: string;
}

export const generateTokens = (userId: string, deviceId?: string) => {
  const payload: TokenPayload = { userId };
  if (deviceId) {
    payload.deviceId = deviceId;
  }

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any }
  );

  return { accessToken, refreshToken };
};

export const register = async (
  username: string,
  email: string,
  password: string,
  roleId?: string
) => {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] }
  });

  if (existingUser) {
    throw new AppError('Username or email already exists', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // If no roleId provided, try to find the default "User" role
  let assignRoleId = roleId;
  if (!assignRoleId) {
    const defaultRole = await prisma.role.findUnique({ where: { name: 'User' } });
    if (defaultRole) {
      assignRoleId = defaultRole.id;
    }
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      roleId: assignRoleId || null
    },
    include: {
      role: {
        select: { id: true, name: true, permissions: true }
      }
    }
  });

  const tokens = generateTokens(user.id);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return { user: formatUserResponse(user), ...tokens };
};

export const login = async (
  usernameOrEmail: string,
  password: string,
  deviceInfo?: deviceService.DeviceInfo,
  reqInfo?: { ip?: string; userAgent?: string }
) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      isActive: true
    },
    include: {
      role: {
        select: { id: true, name: true, permissions: true }
      }
    },
    // 2FA fields are scalar and always returned
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if user has a password (not LDAP-only user)
  if (!user.passwordHash) {
    throw new AppError('Please use LDAP login', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  let deviceId: string | undefined;

  // Handle device registration if deviceInfo provided
  if (deviceInfo) {
    // Find or create device - this also checks the blocklist
    const { device, isNew, isBlocklisted } = await deviceService.findOrCreateDevice(user.id, deviceInfo);
    deviceId = device.id;

    // Check if device is blocked (either from blocklist or previously blocked)
    if (isBlocklisted || device.isBlocked) {
      // Trigger blocked device notification
      await triggerBlockedDeviceAttemptNotification(
        { id: user.id, username: user.username, email: user.email },
        device,
        reqInfo?.ip
      );
      throw new AppError('This device has been blocked. Please contact an administrator.', 403);
    }

    // Trigger notification for new device
    if (isNew) {
      await triggerNewDeviceNotification(
        { id: user.id, username: user.username, email: user.email },
        device
      );
    }
  }

  // Check if user has 2FA enabled
  if (user.twoFactorEnabled && user.twoFactorMethod) {
    const pendingToken = tfaService.createPendingToken(user.id, deviceId);
    const methods = tfaService.getMethods(user.twoFactorMethod);

    // If only email method (no TOTP), auto-send code for convenience
    if (methods.length === 1 && methods[0] === 'email') {
      const code = tfaService.generateEmailCode();
      await tfaService.saveEmailCode(user.id, code);
      await tfaService.sendTwoFactorEmail(user.email, user.username, code);
    }

    return {
      requires2FA: true,
      pendingToken,
      methods,
    };
  }

  const tokens = generateTokens(user.id, deviceId);

  // Store refresh token with device association
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    user: formatUserResponse(user),
    ...tokens
  };
};

export const loginWithLdap = async (
  username: string,
  password: string,
  deviceInfo?: deviceService.DeviceInfo,
  reqInfo?: { ip?: string; userAgent?: string }
) => {
  const ldapUser = await ldapAuthenticate(username, password);

  if (!ldapUser) {
    throw new AppError('LDAP authentication failed. Check credentials.', 401);
  }

  // Get the target role based on LDAP group membership (used as fallback)
  const ldapRole = ldapUser.roleName
    ? await prisma.role.findUnique({ where: { name: ldapUser.roleName } })
    : null;

  // Find or create user
  let user = await prisma.user.findFirst({
    where: { OR: [{ username }, { ldapDn: ldapUser.dn }] },
    include: {
      role: {
        select: { id: true, name: true, permissions: true }
      },
      ldapRole: {
        select: { id: true, name: true, permissions: true }
      },
      groups: {
        include: {
          group: {
            include: {
              role: {
                select: { id: true, name: true, permissions: true }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    // New LDAP user - create with ldapRoleId for fallback
    user = await prisma.user.create({
      data: {
        username,
        email: ldapUser.email || `${username}@ldap.local`,
        firstName: ldapUser.firstName,
        lastName: ldapUser.lastName,
        phone: ldapUser.phone,
        employeeId: ldapUser.employeeId,
        gender: ldapUser.gender,
        ldapDn: ldapUser.dn,
        ldapRoleId: ldapRole?.id || null // Store LDAP-determined role for fallback
      },
      include: {
        role: {
          select: { id: true, name: true, permissions: true }
        },
        ldapRole: {
          select: { id: true, name: true, permissions: true }
        },
        groups: {
          include: {
            group: {
              include: {
                role: {
                  select: { id: true, name: true, permissions: true }
                }
              }
            }
          }
        }
      }
    });
  } else {
    // Existing user - update ldapRoleId if LDAP role changed
    const ldapRoleChanged = user.ldapRole?.name !== ldapUser.roleName;

    if (ldapRoleChanged || !user.ldapDn) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ldapDn: ldapUser.dn,
          ldapRoleId: ldapRole?.id || null, // Update LDAP-determined role
          // Update user info from LDAP
          email: ldapUser.email || user.email,
          firstName: ldapUser.firstName || user.firstName,
          lastName: ldapUser.lastName || user.lastName,
          phone: ldapUser.phone || user.phone,
          employeeId: ldapUser.employeeId || user.employeeId,
          gender: ldapUser.gender || user.gender,
        },
        include: {
          role: {
            select: { id: true, name: true, permissions: true }
          },
          ldapRole: {
            select: { id: true, name: true, permissions: true }
          },
          groups: {
            include: {
              group: {
                include: {
                  role: {
                    select: { id: true, name: true, permissions: true }
                  }
                }
              }
            }
          }
        }
      });
    }
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 401);
  }

  // Sync LDAP profile photo
  if (ldapUser.photo && ldapUser.photo.length > 0) {
    console.log(`[LDAP Avatar] Photo found for ${username}: ${ldapUser.photo.length} bytes, first bytes: [${ldapUser.photo.slice(0, 4).join(', ')}]`);
    try {
      const newAvatarPath = await saveLdapAvatar(user.id, ldapUser.photo);
      if (newAvatarPath !== user.avatarPath) {
        await prisma.user.update({ where: { id: user.id }, data: { avatarPath: newAvatarPath } });
        (user as any).avatarPath = newAvatarPath;
        console.log(`[LDAP Avatar] Updated avatarPath for ${username}: ${newAvatarPath}`);
      }
    } catch (err) {
      console.error('[LDAP Avatar] Failed to save:', err);
    }
  } else {
    console.log(`[LDAP Avatar] No photo found in LDAP for ${username}`);
  }

  let deviceId: string | undefined;

  // Handle device registration if deviceInfo provided
  if (deviceInfo) {
    // Find or create device - this also checks the blocklist
    const { device, isNew, isBlocklisted } = await deviceService.findOrCreateDevice(user.id, deviceInfo);
    deviceId = device.id;

    // Check if device is blocked (either from blocklist or previously blocked)
    if (isBlocklisted || device.isBlocked) {
      // Trigger blocked device notification
      await triggerBlockedDeviceAttemptNotification(
        { id: user.id, username: user.username, email: user.email },
        device,
        reqInfo?.ip
      );
      throw new AppError('This device has been blocked. Please contact an administrator.', 403);
    }

    // Trigger notification for new device
    if (isNew) {
      await triggerNewDeviceNotification(
        { id: user.id, username: user.username, email: user.email },
        device
      );
    }
  }

  // Check if user has 2FA enabled
  if (user.twoFactorEnabled && user.twoFactorMethod) {
    const pendingToken = tfaService.createPendingToken(user.id, deviceId);
    const methods = tfaService.getMethods(user.twoFactorMethod);

    // If only email method (no TOTP), auto-send code for convenience
    if (methods.length === 1 && methods[0] === 'email') {
      const code = tfaService.generateEmailCode();
      await tfaService.saveEmailCode(user.id, code);
      await tfaService.sendTwoFactorEmail(user.email, user.username, code);
    }

    return {
      requires2FA: true,
      pendingToken,
      methods,
    };
  }

  const tokens = generateTokens(user.id, deviceId);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // Determine effective role for response (groups > ldapRole > role)
  let effectiveRole = null;
  if (user.groups.length > 0) {
    // Get highest priority role from groups
    const ROLE_PRIORITY: Record<string, number> = {
      'Viewer': 1, 'User': 2, 'Technician': 3, 'Manager': 4, 'Admin': 5
    };
    let highestPriority = -1;
    for (const ug of user.groups) {
      const role = ug.group.role;
      const priority = ROLE_PRIORITY[role.name] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        effectiveRole = role;
      }
    }
  }
  if (!effectiveRole && user.ldapRole) {
    effectiveRole = user.ldapRole;
  }
  if (!effectiveRole && user.role) {
    effectiveRole = user.role;
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      phone: user.phone,
      address: user.address,
      gender: user.gender,
      avatarPath: user.avatarPath || null,
      roleId: effectiveRole?.id || null,
      role: effectiveRole ? {
        id: effectiveRole.id,
        name: effectiveRole.name,
        permissions: effectiveRole.permissions,
      } : null,
    },
    ...tokens
  };
};

export const refreshAccessToken = async (
  refreshToken: string,
  reqInfo?: { ip?: string; userAgent?: string }
) => {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: true,
      device: true
    }
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (!storedToken.user.isActive) {
    throw new AppError('Account is disabled', 401);
  }

  // Check if device is blocked
  if (storedToken.device?.isBlocked) {
    // Delete the token since device is blocked
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Trigger notification
    await triggerBlockedDeviceAttemptNotification(
      {
        id: storedToken.user.id,
        username: storedToken.user.username,
        email: storedToken.user.email
      },
      storedToken.device,
      reqInfo?.ip
    );

    throw new AppError('This device has been blocked. Please contact an administrator.', 403);
  }

  // Update device last active time
  if (storedToken.deviceId) {
    await deviceService.updateLastActive(storedToken.deviceId);
  }

  // Generate new tokens (preserve deviceId)
  const tokens = generateTokens(storedToken.userId, storedToken.deviceId || undefined);

  // Delete old refresh token and create new one
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: storedToken.userId,
      deviceId: storedToken.deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  return tokens;
};

export const logout = async (refreshToken: string) => {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if user exists
    return;
  }

  if (user.ldapDn && !user.passwordHash) {
    throw new AppError('LDAP users cannot reset password here', 400);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp }
  });

  await sendPasswordResetEmail(user.email, user.username, resetToken);
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gt: new Date() }
    }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExp: null
    }
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
};

export const verifyTwoFactor = async (
  pendingToken: string,
  code: string,
  method?: 'totp' | 'email'
) => {
  const { userId, deviceId } = tfaService.verifyPendingToken(pendingToken);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        select: { id: true, name: true, permissions: true }
      },
      groups: {
        include: {
          group: {
            include: {
              role: {
                select: { id: true, name: true, permissions: true }
              }
            }
          }
        }
      },
      ldapRole: {
        select: { id: true, name: true, permissions: true }
      }
    }
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  if (!user.twoFactorEnabled || !user.twoFactorMethod) {
    throw new AppError('2FA is not enabled for this user', 400);
  }

  // Determine which method to verify with
  const enabledMethods = tfaService.getMethods(user.twoFactorMethod);
  const verifyMethod = method || enabledMethods[0];

  if (!enabledMethods.includes(verifyMethod)) {
    throw new AppError('This 2FA method is not enabled', 400);
  }

  let verified = false;

  if (verifyMethod === 'totp' && user.twoFactorSecret) {
    verified = tfaService.verifyTotpCode(user.twoFactorSecret, code);
  } else if (verifyMethod === 'email') {
    verified = await tfaService.verifyEmailCode(userId, code);
  }

  // If not verified by primary method, try backup codes
  if (!verified && user.twoFactorBackupCodes.length > 0) {
    const remaining = await tfaService.verifyBackupCode(code, user.twoFactorBackupCodes);
    if (remaining !== null) {
      verified = true;
      // Update backup codes (remove used one)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: remaining }
      });
    }
  }

  if (!verified) {
    throw new AppError('Invalid verification code', 401);
  }

  // Clear email code if used
  if (verifyMethod === 'email') {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEmailCode: null, twoFactorEmailExp: null }
    });
  }

  // Generate tokens (same as normal login completion)
  const tokens = generateTokens(userId, deviceId);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId,
      deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // Determine effective role (groups > ldapRole > role)
  let effectiveRole = null;
  if (user.groups && user.groups.length > 0) {
    const ROLE_PRIORITY: Record<string, number> = {
      'Viewer': 1, 'User': 2, 'Technician': 3, 'Manager': 4, 'Admin': 5
    };
    let highestPriority = -1;
    for (const ug of user.groups) {
      const role = ug.group.role;
      const priority = ROLE_PRIORITY[role.name] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        effectiveRole = role;
      }
    }
  }
  if (!effectiveRole && user.ldapRole) {
    effectiveRole = user.ldapRole;
  }
  if (!effectiveRole && user.role) {
    effectiveRole = user.role;
  }

  // For LDAP users use effective role, for local users use formatUserResponse
  const userResponse = user.ldapDn ? {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    employeeId: user.employeeId,
    phone: user.phone,
    address: user.address,
    gender: user.gender,
    avatarPath: user.avatarPath || null,
    isLdap: true,
    roleId: effectiveRole?.id || null,
    role: effectiveRole ? {
      id: effectiveRole.id,
      name: effectiveRole.name,
      permissions: effectiveRole.permissions,
    } : null,
  } : formatUserResponse(user);

  return {
    user: userResponse,
    ...tokens
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.passwordHash) {
    throw new AppError('Cannot change password', 400);
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
};

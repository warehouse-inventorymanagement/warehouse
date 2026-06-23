import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { sendEmail } from './email.service.js';
import { safeEncrypt, safeDecrypt } from './encryption.service.js';

// TOTP configuration
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
};

/**
 * Check if a user has a specific 2FA method enabled.
 * twoFactorMethod is a comma-separated string like 'totp', 'email', or 'totp,email'.
 */
export function hasMethod(userMethod: string | null | undefined, check: 'totp' | 'email'): boolean {
  if (!userMethod) return false;
  return userMethod.split(',').includes(check);
}

/**
 * Get all enabled methods as an array.
 */
export function getMethods(userMethod: string | null | undefined): ('totp' | 'email')[] {
  if (!userMethod) return [];
  return userMethod.split(',').filter(m => m === 'totp' || m === 'email') as ('totp' | 'email')[];
}

/**
 * Add a method to the comma-separated method string.
 */
export function addMethod(userMethod: string | null | undefined, method: 'totp' | 'email'): string {
  const methods = getMethods(userMethod);
  if (!methods.includes(method)) methods.push(method);
  return methods.join(',');
}

/**
 * Remove a method from the comma-separated method string. Returns null if empty.
 */
export function removeMethod(userMethod: string | null | undefined, method: 'totp' | 'email'): string | null {
  const methods = getMethods(userMethod).filter(m => m !== method);
  return methods.length > 0 ? methods.join(',') : null;
}

/**
 * Generate a TOTP secret and QR code for authenticator app enrollment
 */
export async function generateTotpSecret(username: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(username, 'Warehouse', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrCodeDataUrl };
}

/**
 * Encrypt a TOTP secret for database storage
 */
export function encryptTotpSecret(secret: string): string {
  return safeEncrypt(secret) || secret;
}

/**
 * Decrypt a TOTP secret from database storage
 */
export function decryptTotpSecret(encryptedSecret: string): string {
  return safeDecrypt(encryptedSecret);
}

/**
 * Verify a TOTP code against an encrypted secret
 */
export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = decryptTotpSecret(encryptedSecret);
  return authenticator.check(code, secret);
}

/**
 * Generate 10 random backup codes and their bcrypt hashes
 */
export async function generateBackupCodes(): Promise<{
  plainCodes: string[];
  hashedCodes: string[];
}> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex'); // 8-char hex
    plainCodes.push(code);
    const hash = await bcrypt.hash(code, 10);
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify a backup code against hashed codes list.
 * Returns remaining hashed codes (the used one is removed), or null if no match.
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<string[] | null> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code, hashedCodes[i]);
    if (match) {
      // Remove used code
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return remaining;
    }
  }
  return null;
}

/**
 * Generate a 6-digit numeric email OTP code
 */
export function generateEmailCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Escape HTML special characters to prevent injection in email templates
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Send 2FA code via email
 */
export async function sendTwoFactorEmail(
  email: string,
  username: string,
  code: string
): Promise<void> {
  const safeUsername = escapeHtml(username);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Two-Factor Authentication Code</h2>
      <p>Hello ${safeUsername},</p>
      <p>Your verification code is:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                     color: #1f2937; background-color: #f3f4f6; padding: 16px 32px;
                     border-radius: 8px; display: inline-block;">
          ${code}
        </span>
      </div>
      <p>This code will expire in <strong>5 minutes</strong>.</p>
      <p>If you didn't attempt to log in, please secure your account immediately.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This email was sent by Warehouse Inventory System
      </p>
    </div>
  `;

  try {
    await sendEmail(email, 'Your Verification Code - Warehouse', html);
  } catch (error) {
    console.error('Failed to send 2FA email:', error);
    throw new Error('Failed to send verification code email');
  }
}

/**
 * Create a short-lived pending token for 2FA verification.
 * This is NOT an access token — it only proves the user passed step 1 (credentials).
 * Carries deviceId so the final token generation preserves device association.
 */
export function createPendingToken(userId: string, deviceId?: string): string {
  return jwt.sign(
    { userId, deviceId, purpose: '2fa-pending' },
    process.env.JWT_SECRET!,
    { expiresIn: '5m' }
  );
}

/**
 * Verify a pending 2FA token and return the userId and deviceId.
 */
export function verifyPendingToken(token: string): { userId: string; deviceId?: string } {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as any;
    if (payload.purpose !== '2fa-pending') {
      throw new Error('Invalid token purpose');
    }
    return { userId: payload.userId, deviceId: payload.deviceId };
  } catch {
    throw new Error('Invalid or expired verification token');
  }
}

/**
 * Save email OTP code to the user record
 */
export async function saveEmailCode(userId: string, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, 10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEmailCode: hash,
      twoFactorEmailExp: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
  });
}

/**
 * Verify email OTP code
 */
export async function verifyEmailCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEmailCode: true, twoFactorEmailExp: true },
  });

  if (!user?.twoFactorEmailCode || !user?.twoFactorEmailExp) {
    return false;
  }

  // Check expiry
  if (new Date() > user.twoFactorEmailExp) {
    return false;
  }

  return bcrypt.compare(code, user.twoFactorEmailCode);
}

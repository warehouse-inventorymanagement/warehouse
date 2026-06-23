import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

// Default values
let rateLimitEnabled = true;
let generalLimit = 500;
let authLimit = 10;
let passwordResetLimit = 5;

// Load rate limit settings from database
export async function loadRateLimitSettings() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['rateLimit.enabled', 'rateLimit.general', 'rateLimit.auth', 'rateLimit.passwordReset'] }
      }
    });
    for (const s of settings) {
      if (s.key === 'rateLimit.enabled') {
        rateLimitEnabled = s.value !== 'false';
        continue;
      }
      const val = parseInt(s.value);
      if (isNaN(val) || val < 1) continue;
      if (s.key === 'rateLimit.general') generalLimit = val;
      if (s.key === 'rateLimit.auth') authLimit = val;
      if (s.key === 'rateLimit.passwordReset') passwordResetLimit = val;
    }
    console.log(`Rate limiting: ${rateLimitEnabled ? 'enabled' : 'disabled'} (general=${generalLimit}/min, auth=${authLimit}/15min, passwordReset=${passwordResetLimit}/hr)`);
  } catch {
    console.log('Could not load rate limit settings, using defaults');
  }
}

// Wrap a limiter to skip when disabled
function withToggle(limiter: ReturnType<typeof rateLimit>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!rateLimitEnabled) return next();
    return limiter(req, res, next);
  };
}

const _generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: () => generalLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const _authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => authLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

const _passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => passwordResetLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts, please try again later.' },
});

export const generalLimiter = withToggle(_generalLimiter);
export const authLimiter = withToggle(_authLimiter);
export const passwordResetLimiter = withToggle(_passwordResetLimiter);

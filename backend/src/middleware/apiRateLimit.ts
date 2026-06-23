import { Request, Response, NextFunction } from 'express';

// Default rate limits
const DEFAULT_LIMITS = {
  perMinute: 60,
  perHour: 1000,
  perDay: 10000,
};

// In-memory storage for rate limit tracking
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map: apiKeyId -> windowType -> entry
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [keyId, windows] of rateLimitStore.entries()) {
    for (const [windowType, entry] of windows.entries()) {
      if (entry.resetAt < now) {
        windows.delete(windowType);
      }
    }
    if (windows.size === 0) {
      rateLimitStore.delete(keyId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get or create rate limit entry for a specific window
 */
function getEntry(apiKeyId: string, windowType: string, windowMs: number): RateLimitEntry {
  if (!rateLimitStore.has(apiKeyId)) {
    rateLimitStore.set(apiKeyId, new Map());
  }

  const keyWindows = rateLimitStore.get(apiKeyId)!;
  const now = Date.now();

  if (!keyWindows.has(windowType) || keyWindows.get(windowType)!.resetAt < now) {
    keyWindows.set(windowType, {
      count: 0,
      resetAt: now + windowMs,
    });
  }

  return keyWindows.get(windowType)!;
}

/**
 * Check rate limit for a specific window
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
function checkLimit(
  apiKeyId: string,
  windowType: string,
  windowMs: number,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const entry = getEntry(apiKeyId, windowType, windowMs);

  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count < limit;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: entry.resetAt,
  };
}

/**
 * API rate limiting middleware
 * Must be used after authenticateApiKey middleware
 */
export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  // Only apply to API key authenticated requests
  if (!req.isApiKeyAuth || !req.apiKey) {
    return next();
  }

  const apiKeyId = req.apiKey.id;
  const limits = req.apiKey.rateLimits;

  // Get effective limits (custom or default)
  const perMinute = limits.perMinute ?? DEFAULT_LIMITS.perMinute;
  const perHour = limits.perHour ?? DEFAULT_LIMITS.perHour;
  const perDay = limits.perDay ?? DEFAULT_LIMITS.perDay;

  // Check all windows (minute is most restrictive, check first)
  const minuteCheck = checkLimit(apiKeyId, 'minute', 60 * 1000, perMinute);
  const hourCheck = checkLimit(apiKeyId, 'hour', 60 * 60 * 1000, perHour);
  const dayCheck = checkLimit(apiKeyId, 'day', 24 * 60 * 60 * 1000, perDay);

  // Set rate limit headers (use minute window as primary)
  res.setHeader('X-RateLimit-Limit', perMinute);
  res.setHeader('X-RateLimit-Remaining', minuteCheck.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(minuteCheck.resetAt / 1000));

  // Also include hour/day info in custom headers
  res.setHeader('X-RateLimit-Limit-Hour', perHour);
  res.setHeader('X-RateLimit-Remaining-Hour', hourCheck.remaining);
  res.setHeader('X-RateLimit-Limit-Day', perDay);
  res.setHeader('X-RateLimit-Remaining-Day', dayCheck.remaining);

  // Check if any limit exceeded
  if (!minuteCheck.allowed) {
    const retryAfter = Math.ceil((minuteCheck.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded (per minute)',
      message: `You have exceeded the rate limit of ${perMinute} requests per minute. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  if (!hourCheck.allowed) {
    const retryAfter = Math.ceil((hourCheck.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded (per hour)',
      message: `You have exceeded the rate limit of ${perHour} requests per hour.`,
      retryAfter,
    });
  }

  if (!dayCheck.allowed) {
    const retryAfter = Math.ceil((dayCheck.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded (per day)',
      message: `You have exceeded the rate limit of ${perDay} requests per day.`,
      retryAfter,
    });
  }

  next();
}

/**
 * Get current rate limit status for an API key (for dashboard)
 */
export function getRateLimitStatus(apiKeyId: string, limits: { perMinute: number | null; perHour: number | null; perDay: number | null }) {
  const perMinute = limits.perMinute ?? DEFAULT_LIMITS.perMinute;
  const perHour = limits.perHour ?? DEFAULT_LIMITS.perHour;
  const perDay = limits.perDay ?? DEFAULT_LIMITS.perDay;

  const keyWindows = rateLimitStore.get(apiKeyId);
  const now = Date.now();

  const getWindowStatus = (windowType: string, limit: number) => {
    const entry = keyWindows?.get(windowType);
    if (!entry || entry.resetAt < now) {
      return { used: 0, limit, remaining: limit, resetAt: null };
    }
    return {
      used: entry.count,
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  };

  return {
    minute: getWindowStatus('minute', perMinute),
    hour: getWindowStatus('hour', perHour),
    day: getWindowStatus('day', perDay),
  };
}

export { DEFAULT_LIMITS };

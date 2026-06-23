import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import ipaddr from 'ipaddr.js';
import prisma from '../lib/prisma.js';

// Hash an API key for comparison
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check if an IP address matches a list of IPs/CIDRs
 * Supports both IPv4 and IPv6, including IPv4-mapped IPv6 addresses
 */
function ipMatchesList(clientIp: string, ipList: string[]): boolean {
  if (!clientIp || ipList.length === 0) return false;

  try {
    // Parse client IP, handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
    let parsedClientIp = ipaddr.parse(clientIp);

    // Convert IPv4-mapped IPv6 to IPv4 for comparison
    if (parsedClientIp.kind() === 'ipv6') {
      const ipv6 = parsedClientIp as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        parsedClientIp = ipv6.toIPv4Address();
      }
    }

    for (const entry of ipList) {
      try {
        if (entry.includes('/')) {
          // CIDR notation (e.g., 192.168.1.0/24)
          const [rangeAddr, prefixLengthStr] = entry.split('/');
          let parsedRange = ipaddr.parse(rangeAddr);
          const prefixLength = parseInt(prefixLengthStr, 10);

          // Convert IPv4-mapped IPv6 range to IPv4
          if (parsedRange.kind() === 'ipv6') {
            const ipv6Range = parsedRange as ipaddr.IPv6;
            if (ipv6Range.isIPv4MappedAddress()) {
              parsedRange = ipv6Range.toIPv4Address();
            }
          }

          // Check if IPs are same type and in range
          if (parsedClientIp.kind() === parsedRange.kind()) {
            if (parsedClientIp.match(parsedRange, prefixLength)) {
              return true;
            }
          }
        } else {
          // Single IP address
          let parsedEntry = ipaddr.parse(entry);

          // Convert IPv4-mapped IPv6 to IPv4
          if (parsedEntry.kind() === 'ipv6') {
            const ipv6Entry = parsedEntry as ipaddr.IPv6;
            if (ipv6Entry.isIPv4MappedAddress()) {
              parsedEntry = ipv6Entry.toIPv4Address();
            }
          }

          if (parsedClientIp.kind() === parsedEntry.kind() &&
              parsedClientIp.toString() === parsedEntry.toString()) {
            return true;
          }
        }
      } catch {
        // Invalid entry in list, skip
        console.warn(`Invalid IP entry in list: ${entry}`);
      }
    }
  } catch {
    // Invalid client IP
    console.warn(`Invalid client IP: ${clientIp}`);
  }

  return false;
}

/**
 * Validate IP against API key restrictions
 * Returns null if allowed, error message if blocked
 */
function validateIpRestrictions(
  clientIp: string,
  mode: string,
  whitelist: string[],
  blacklist: string[]
): string | null {
  if (mode === 'none') {
    return null; // No restrictions
  }

  if (mode === 'whitelist') {
    if (whitelist.length === 0) {
      return 'IP whitelist is empty - all IPs are blocked';
    }
    if (!ipMatchesList(clientIp, whitelist)) {
      return `IP ${clientIp} is not in the whitelist`;
    }
    return null;
  }

  if (mode === 'blacklist') {
    if (ipMatchesList(clientIp, blacklist)) {
      return `IP ${clientIp} is blacklisted`;
    }
    return null;
  }

  return null; // Unknown mode, allow
}

// Extend Request type to include apiKey info
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        name: string;
        permissions: string[];
        userId: string;
        user: {
          id: string;
          username: string;
          email: string;
        };
        rateLimits: {
          perMinute: number | null;
          perHour: number | null;
          perDay: number | null;
        };
      };
      isApiKeyAuth?: boolean;
      clientIp?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using API keys
 * Accepts key in header: X-API-Key or Authorization: Bearer <key>
 */
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // Get API key from headers
    let apiKey = req.headers['x-api-key'] as string;

    // Also check Authorization header (Bearer token)
    if (!apiKey) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Only use as API key if it starts with our prefix
        if (token.startsWith('wh_')) {
          apiKey = token;
        }
      }
    }

    if (!apiKey) {
      return next(); // No API key provided, let other auth handle it
    }

    // Hash the provided key and look it up
    const keyHash = hashApiKey(apiKey);

    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
          }
        }
      }
    });

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Check if key is active
    if (!keyRecord.isActive) {
      return res.status(401).json({
        success: false,
        message: 'API key is inactive'
      });
    }

    // Check if key has expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'API key has expired'
      });
    }

    // Check if user is active
    if (!keyRecord.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    // Get client IP
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    req.clientIp = clientIp;

    // Check IP restrictions
    const ipError = validateIpRestrictions(
      clientIp,
      keyRecord.ipRestrictionMode,
      keyRecord.ipWhitelist,
      keyRecord.ipBlacklist
    );

    if (ipError) {
      return res.status(403).json({
        success: false,
        message: `IP restriction: ${ipError}`
      });
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: clientIp,
      }
    }).catch(err => console.error('Failed to update API key last used:', err));

    // Attach API key info to request
    req.apiKey = {
      id: keyRecord.id,
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      userId: keyRecord.userId,
      user: keyRecord.user,
      rateLimits: {
        perMinute: keyRecord.rateLimitPerMinute,
        perHour: keyRecord.rateLimitPerHour,
        perDay: keyRecord.rateLimitPerDay,
      },
    };
    req.isApiKeyAuth = true;

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

/**
 * Middleware to require a specific API permission
 * Use after authenticateApiKey
 */
export function requireApiPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    if (!req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Missing required permission: ${permission}`
      });
    }

    next();
  };
}

/**
 * Middleware that allows either JWT auth or API key auth
 * Checks API key first, then falls back to JWT
 */
export function authenticateApiOrJwt(req: Request, res: Response, next: NextFunction) {
  // If already authenticated via API key, continue
  if (req.isApiKeyAuth && req.apiKey) {
    return next();
  }

  // Check for API key
  let apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('wh_')) {
        apiKey = token;
      }
    }
  }

  if (apiKey) {
    // Has API key, use API key auth
    return authenticateApiKey(req, res, next);
  }

  // No API key, let the next middleware (JWT) handle it
  next();
}

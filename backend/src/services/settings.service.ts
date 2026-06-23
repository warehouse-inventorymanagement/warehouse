import prisma from '../lib/prisma.js';

/**
 * Get the frontend URL from server settings
 * Falls back to FRONTEND_URL env var or localhost
 */
export async function getFrontendUrl(): Promise<string> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['server.protocol', 'server.hostname', 'server.port']
      }
    }
  });

  const settingsMap: Record<string, string> = {};
  settings.forEach(s => {
    settingsMap[s.key] = s.value;
  });

  const protocol = settingsMap['server.protocol'] || 'http';
  const hostname = settingsMap['server.hostname'];
  const port = settingsMap['server.port'];

  // If hostname is configured, build URL from settings
  if (hostname) {
    // If port is empty, try to extract from FRONTEND_URL env var as fallback
    let effectivePort = port;
    if (!effectivePort && process.env.FRONTEND_URL) {
      try {
        const envUrl = new URL(process.env.FRONTEND_URL);
        // Only use the port if it's non-standard (not 80 for http, not 443 for https)
        if (envUrl.port) {
          effectivePort = envUrl.port;
        }
      } catch {
        // Invalid URL, ignore
      }
    }
    const portSuffix = effectivePort ? `:${effectivePort}` : '';
    return `${protocol}://${hostname}${portSuffix}`;
  }

  // Fall back to environment variable or default
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

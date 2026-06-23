/**
 * Nginx Logs Service
 * Reads and imports nginx log files into the in-memory logging service
 */

import fs from 'fs';
import { loggingService } from './logging.service.js';
import prisma from '../lib/prisma.js';

// Track file positions for incremental reading
let accessLogPosition = 0;
let errorLogPosition = 0;

// Cached log paths
let cachedAccessLog: string | null = null;
let cachedErrorLog: string | null = null;

/**
 * Get nginx log paths from database settings, falling back to env vars
 */
async function getNginxLogPaths(): Promise<{ accessLog: string | null; errorLog: string | null }> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['nginx.accessLog', 'nginx.errorLog']
        }
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return {
      accessLog: settingsMap['nginx.accessLog'] || process.env.NGINX_ACCESS_LOG || null,
      errorLog: settingsMap['nginx.errorLog'] || process.env.NGINX_ERROR_LOG || null
    };
  } catch {
    // Fallback to env vars if database not available
    return {
      accessLog: process.env.NGINX_ACCESS_LOG || null,
      errorLog: process.env.NGINX_ERROR_LOG || null
    };
  }
}

/**
 * Check if nginx log monitoring is configured
 */
export async function isNginxLoggingConfigured(): Promise<boolean> {
  const paths = await getNginxLogPaths();
  return !!(paths.accessLog || paths.errorLog);
}

/**
 * Read last N lines from a file
 */
function readLastLines(filePath: string, maxLines: number): string[] {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(-maxLines);
  } catch (error: any) {
    loggingService.log('error', `[Nginx] Failed to read log file ${filePath}: ${error.message}`, 'backend');
    return [];
  }
}

/**
 * Read new lines from a file since last position
 */
function readNewLines(filePath: string, lastPosition: number): { lines: string[]; newPosition: number } {
  try {
    if (!fs.existsSync(filePath)) {
      return { lines: [], newPosition: 0 };
    }

    const stats = fs.statSync(filePath);

    // If file was truncated (rotated), start from beginning
    if (stats.size < lastPosition) {
      lastPosition = 0;
    }

    if (stats.size === lastPosition) {
      return { lines: [], newPosition: lastPosition };
    }

    const readSize = stats.size - lastPosition;
    // Max 1MB per read to prevent memory issues
    if (readSize > 1024 * 1024) {
      lastPosition = stats.size - (1024 * 1024);
    }

    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(stats.size - lastPosition);
    fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
    fs.closeSync(fd);

    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    return { lines, newPosition: stats.size };
  } catch (error: any) {
    loggingService.log('error', `[Nginx] Failed to read new lines from ${filePath}: ${error.message}`, 'backend');
    return { lines: [], newPosition: lastPosition };
  }
}

/**
 * Parse nginx access log line
 * Common log format: IP - - [timestamp] "request" status size "referer" "user-agent"
 */
function parseAccessLogLine(line: string): { message: string; level: 'info' | 'warn' | 'error' } {
  const statusMatch = line.match(/"\s+(\d{3})\s+/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 200;
  const requestMatch = line.match(/"(\w+)\s+([^\s"]+)/);
  const ipMatch = line.match(/^([\d.]+)/);

  let level: 'info' | 'warn' | 'error' = 'info';
  if (status >= 500) level = 'error';
  else if (status >= 400) level = 'warn';

  // Build cleaner message
  const ip = ipMatch ? ipMatch[1] : '-';
  const method = requestMatch ? requestMatch[1] : '-';
  const path = requestMatch ? requestMatch[2] : '-';
  const message = `${ip} ${method} ${path} ${status}`;

  return { message, level };
}

/**
 * Parse nginx error log line
 * Format: timestamp [level] pid#tid: message
 */
function parseErrorLogLine(line: string): { message: string; level: 'info' | 'warn' | 'error' | 'debug' } {
  let level: 'info' | 'warn' | 'error' | 'debug' = 'error';

  if (line.includes('[warn]')) {
    level = 'warn';
  } else if (line.includes('[notice]') || line.includes('[info]')) {
    level = 'info';
  } else if (line.includes('[debug]')) {
    level = 'debug';
  }

  return { message: line, level };
}

/**
 * Import initial nginx logs (last N lines from each log file)
 */
export async function importNginxLogs(maxLines: number = 50): Promise<void> {
  const paths = await getNginxLogPaths();
  cachedAccessLog = paths.accessLog;
  cachedErrorLog = paths.errorLog;

  if (!paths.accessLog && !paths.errorLog) {
    return;
  }

  loggingService.log('info', '[Nginx] Importing initial nginx logs...', 'backend');

  // Import access logs
  if (paths.accessLog) {
    const accessLines = readLastLines(paths.accessLog, maxLines);
    for (const line of accessLines) {
      const { message, level } = parseAccessLogLine(line);
      loggingService.nginx(level, message);
    }

    // Set initial position to end of file
    try {
      if (fs.existsSync(paths.accessLog)) {
        accessLogPosition = fs.statSync(paths.accessLog).size;
      }
    } catch {
      // Ignore
    }

    loggingService.log('info', `[Nginx] Imported ${accessLines.length} access log entries`, 'backend');
  }

  // Import error logs
  if (paths.errorLog) {
    const errorLines = readLastLines(paths.errorLog, maxLines);
    for (const line of errorLines) {
      const { message, level } = parseErrorLogLine(line);
      loggingService.nginx(level, message);
    }

    // Set initial position to end of file
    try {
      if (fs.existsSync(paths.errorLog)) {
        errorLogPosition = fs.statSync(paths.errorLog).size;
      }
    } catch {
      // Ignore
    }

    loggingService.log('info', `[Nginx] Imported ${errorLines.length} error log entries`, 'backend');
  }
}

/**
 * Poll for new nginx log entries
 */
export function pollNginxLogs(): void {
  // Use cached paths from last import
  if (!cachedAccessLog && !cachedErrorLog) {
    return;
  }

  // Poll access logs
  if (cachedAccessLog) {
    const { lines, newPosition } = readNewLines(cachedAccessLog, accessLogPosition);
    accessLogPosition = newPosition;

    for (const line of lines) {
      const { message, level } = parseAccessLogLine(line);
      loggingService.nginx(level, message);
    }
  }

  // Poll error logs
  if (cachedErrorLog) {
    const { lines, newPosition } = readNewLines(cachedErrorLog, errorLogPosition);
    errorLogPosition = newPosition;

    for (const line of lines) {
      const { message, level } = parseErrorLogLine(line);
      loggingService.nginx(level, message);
    }
  }
}

let nginxPollInterval: NodeJS.Timeout | null = null;

/**
 * Start watching nginx logs (polls every 5 seconds)
 */
export async function startNginxLogWatcher(): Promise<void> {
  const configured = await isNginxLoggingConfigured();
  if (!configured) {
    loggingService.log('debug', '[Nginx] Nginx log paths not configured, skipping log watcher', 'backend');
    return;
  }

  // Import initial logs
  await importNginxLogs(50);

  // Verify log files are readable
  const paths = await getNginxLogPaths();
  if (paths.accessLog && fs.existsSync(paths.accessLog)) {
    try {
      fs.accessSync(paths.accessLog, fs.constants.R_OK);
    } catch {
      loggingService.log('warn', `[Nginx] Access log file exists but is not readable: ${paths.accessLog}. Check file permissions.`, 'backend');
    }
  }
  if (paths.errorLog && fs.existsSync(paths.errorLog)) {
    try {
      fs.accessSync(paths.errorLog, fs.constants.R_OK);
    } catch {
      loggingService.log('warn', `[Nginx] Error log file exists but is not readable: ${paths.errorLog}. Check file permissions.`, 'backend');
    }
  }

  // Start polling
  nginxPollInterval = setInterval(pollNginxLogs, 5000);
  loggingService.log('info', '[Nginx] Started nginx log watcher (polling every 5s)', 'backend');
}

/**
 * Reload nginx log configuration (call after settings change)
 */
export async function reloadNginxLogWatcher(): Promise<void> {
  // Stop existing watcher
  stopNginxLogWatcher();

  // Reset positions
  accessLogPosition = 0;
  errorLogPosition = 0;

  // Start with new config
  await startNginxLogWatcher();
}

/**
 * Stop watching nginx logs
 */
export function stopNginxLogWatcher(): void {
  if (nginxPollInterval) {
    clearInterval(nginxPollInterval);
    nginxPollInterval = null;
    loggingService.log('info', '[Nginx] Stopped nginx log watcher', 'backend');
  }
}

/**
 * Logging service that captures logs in memory for the admin logs viewer
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'backend' | 'frontend' | 'smtp' | 'ldap' | 'nginx';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: LogSource;
  metadata?: Record<string, any>;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 5000; // Keep last 5000 logs in memory
  private logIdCounter: number = 0;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };
  }

  /**
   * Initialize the logging service and intercept console methods
   */
  initialize(): void {
    // Override console methods to capture logs
    console.log = (...args: any[]) => {
      this.addLog('info', args);
      this.originalConsole.log(...args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      this.originalConsole.error(...args);
    };

    console.debug = (...args: any[]) => {
      this.addLog('debug', args);
      this.originalConsole.debug(...args);
    };

    this.addLog('info', ['[LoggingService] Backend logging service initialized']);
  }

  /**
   * Redact sensitive data from log messages
   */
  private redactMessage(message: string): string {
    return message
      .replace(/(?:password|secret|token|apiKey|authorization|cookie|jwt|refreshToken)\s*[=:]\s*['"]?[^\s'",$\]}{)]+/gi, (match) => {
        const separator = match.includes('=') ? '=' : ':';
        const key = match.split(/[=:]/)[0];
        return `${key}${separator}[REDACTED]`;
      })
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/wh_[A-Za-z0-9_-]+/g, 'wh_[REDACTED]');
  }

  /**
   * Add a log entry
   */
  private addLog(level: LogLevel, args: any[]): void {
    let message = args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    message = this.redactMessage(message);

    if (message.length > 5000) {
      message = message.substring(0, 5000) + '... [truncated]';
    }

    const entry: LogEntry = {
      id: `log-${++this.logIdCounter}`,
      timestamp: new Date(),
      level,
      message,
      source: 'backend',
    };

    this.logs.push(entry);

    // Trim to max size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get recent logs
   */
  getLogs(options: {
    limit?: number;
    level?: LogLevel | LogLevel[];
    source?: LogSource | LogSource[];
    since?: Date;
    search?: string;
  } = {}): LogEntry[] {
    let result = [...this.logs];

    // Filter by level
    if (options.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level];
      result = result.filter(log => levels.includes(log.level));
    }

    // Filter by source
    if (options.source) {
      const sources = Array.isArray(options.source) ? options.source : [options.source];
      result = result.filter(log => sources.includes(log.source));
    }

    // Filter by time
    if (options.since) {
      result = result.filter(log => log.timestamp >= options.since!);
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(log => log.message.toLowerCase().includes(searchLower));
    }

    // Apply limit (most recent first)
    if (options.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * Get logs since a specific log ID (for polling)
   */
  getLogsSince(lastLogId: string | null): LogEntry[] {
    if (!lastLogId) {
      return this.logs.slice(-100); // Return last 100 if no ID provided
    }

    const index = this.logs.findIndex(log => log.id === lastLogId);
    if (index === -1) {
      return this.logs.slice(-100);
    }

    return this.logs.slice(index + 1);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.addLog('info', ['[LoggingService] Logs cleared']);
  }

  /**
   * Get log statistics
   */
  getStats(): { total: number; byLevel: Record<LogLevel, number>; bySource: Record<LogSource, number> } {
    const byLevel: Record<LogLevel, number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };

    const bySource: Record<LogSource, number> = {
      backend: 0,
      frontend: 0,
      smtp: 0,
      ldap: 0,
      nginx: 0,
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
      bySource[log.source]++;
    });

    return {
      total: this.logs.length,
      byLevel,
      bySource,
    };
  }

  /**
   * Manually add a log entry (for external use)
   */
  log(level: LogLevel, message: string, source: LogSource = 'backend', metadata?: Record<string, any>): void {
    const redactedMessage = this.redactMessage(message);
    const entry: LogEntry = {
      id: `log-${++this.logIdCounter}`,
      timestamp: new Date(),
      level,
      message: redactedMessage,
      source,
      metadata,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also output to console (only for backend logs to avoid duplicates)
    if (source === 'backend') {
      switch (level) {
        case 'info':
          this.originalConsole.log(message);
          break;
        case 'warn':
          this.originalConsole.warn(message);
          break;
        case 'error':
          this.originalConsole.error(message);
          break;
        case 'debug':
          this.originalConsole.debug(message);
          break;
      }
    }
  }

  /**
   * Add a log entry with a specific source (convenience methods)
   */
  smtp(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.log(level, `[SMTP] ${message}`, 'smtp', metadata);
  }

  ldap(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.log(level, `[LDAP] ${message}`, 'ldap', metadata);
  }

  nginx(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.log(level, message, 'nginx', metadata);
  }

  /**
   * Log with request context
   */
  request(level: LogLevel, message: string, req?: { method?: string; url?: string; ip?: string; userId?: string }): void {
    const prefix = req ? `[${req.method} ${req.url}]${req.userId ? ` [user:${req.userId}]` : ''}` : '';
    this.log(level, `${prefix} ${message}`, 'backend');
  }

  /**
   * Add frontend log entries
   */
  addFrontendLogs(logs: Array<{ level: LogLevel; message: string; timestamp?: string; metadata?: Record<string, any> }>): void {
    for (const log of logs) {
      const entry: LogEntry = {
        id: `log-${++this.logIdCounter}`,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        level: log.level,
        message: log.message,
        source: 'frontend',
        metadata: log.metadata,
      };

      this.logs.push(entry);
    }

    // Trim to max size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

// Singleton instance
export const loggingService = new LoggingService();

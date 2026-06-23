/**
 * Frontend logging service that sends logs to the backend for viewing in Settings/Logs
 * Intercepts all console.log/warn/error/debug calls globally
 */


type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class FrontendLogger {
  private buffer: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxBufferSize = 50;
  private flushIntervalMs = 10000; // Flush every 10 seconds if there are logs
  private isInitialized = false;
  private isFlushing = false;
  private flushCooldownUntil = 0; // Backoff: don't retry until this timestamp
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  } | null = null;

  /**
   * Initialize the logger - intercepts console methods and starts flush interval
   */
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Intercept console methods
    console.log = (...args: any[]) => {
      this.captureLog('info', args);
      this.originalConsole!.log(...args);
    };

    console.warn = (...args: any[]) => {
      this.captureLog('warn', args);
      this.originalConsole!.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.captureLog('error', args);
      this.originalConsole!.error(...args);
    };

    console.debug = (...args: any[]) => {
      this.captureLog('debug', args);
      this.originalConsole!.debug(...args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', [`Unhandled error: ${event.message} at ${event.filename}:${event.lineno}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [`Unhandled promise rejection: ${event.reason}`]);
    });

    // Periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    this.captureLog('info', ['[Logger] Frontend logging initialized']);
  }

  /**
   * Capture a log from console interception
   */
  private captureLog(level: LogLevel, args: any[]): void {
    // Skip certain noisy logs
    const message = this.formatArgs(args);
    if (this.shouldSkipLog(message)) return;

    this.addLog(level, message);
  }

  /**
   * Format arguments into a string message
   */
  private formatArgs(args: any[]): string {
    return args
      .map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'object') {
          try {
            if (arg instanceof Error) {
              return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
            }
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  /**
   * Filter out noisy/unimportant logs
   */
  private shouldSkipLog(message: string): boolean {
    const skipPatterns = [
      /^\[HMR\]/, // Hot module replacement
      /^\[vite\]/, // Vite dev server
      /^Download the React DevTools/,
      /^Warning: ReactDOM.render is no longer supported/,
      /^%c/, // Styled console logs (usually from libraries)
    ];
    return skipPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Log an info message (use this for explicit logging with metadata)
   */
  info(message: string, metadata?: Record<string, any>): void {
    const fullMessage = metadata ? `${message} ${JSON.stringify(metadata)}` : message;
    if (this.originalConsole) {
      this.originalConsole.log(`[Frontend] ${message}`, metadata || '');
    }
    this.addLog('info', `[Frontend] ${fullMessage}`);
  }

  /**
   * Log a warning message (use this for explicit logging with metadata)
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const fullMessage = metadata ? `${message} ${JSON.stringify(metadata)}` : message;
    if (this.originalConsole) {
      this.originalConsole.warn(`[Frontend] ${message}`, metadata || '');
    }
    this.addLog('warn', `[Frontend] ${fullMessage}`);
  }

  /**
   * Log an error message (use this for explicit logging with metadata)
   */
  error(message: string, metadata?: Record<string, any>): void {
    const fullMessage = metadata ? `${message} ${JSON.stringify(metadata)}` : message;
    if (this.originalConsole) {
      this.originalConsole.error(`[Frontend] ${message}`, metadata || '');
    }
    this.addLog('error', `[Frontend] ${fullMessage}`);
  }

  /**
   * Log a debug message (use this for explicit logging with metadata)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const fullMessage = metadata ? `${message} ${JSON.stringify(metadata)}` : message;
    if (this.originalConsole) {
      this.originalConsole.debug(`[Frontend] ${message}`, metadata || '');
    }
    this.addLog('debug', `[Frontend] ${fullMessage}`);
  }

  /**
   * Add a log entry to the buffer
   */
  private addLog(level: LogLevel, message: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    this.buffer.push(entry);

    // Flush immediately if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else {
      // Schedule a flush soon for important logs
      if (level === 'error' || level === 'warn') {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Schedule a flush in a short time (for important logs)
   */
  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flush();
    }, 2000); // Flush errors/warnings within 2 seconds
  }

  /**
   * Flush logs to the backend.
   * Uses raw fetch (not the axios api instance) to avoid triggering the
   * axios error interceptor, which calls console.error and would re-enter
   * the logger, creating an infinite flush loop when the backend is down.
   */
  async flush(sync = false): Promise<void> {
    if (this.buffer.length === 0) return;
    if (this.isFlushing) return;
    if (Date.now() < this.flushCooldownUntil) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];
    this.isFlushing = true;

    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const body = JSON.stringify({ logs: logsToSend });

    try {
      if (sync) {
        fetch('/api/settings/logs/frontend', {
          method: 'POST',
          headers,
          body: new Blob([body], { type: 'application/json' }),
          keepalive: true,
        }).catch(() => {});
      } else {
        const res = await fetch('/api/settings/logs/frontend', {
          method: 'POST',
          headers,
          body,
        });
        if (!res.ok) {
          // Backend unavailable or rejected — back off for 30s, drop this batch
          this.flushCooldownUntil = Date.now() + 30_000;
        }
      }
    } catch {
      // Network error (backend not up) — back off, don't re-buffer or log the error
      this.flushCooldownUntil = Date.now() + 30_000;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Stop the logger
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.flush(true);
    this.isInitialized = false;
  }
}

// Singleton instance
export const logger = new FrontendLogger();

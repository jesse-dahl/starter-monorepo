/**
 * Client-side logger
 * Proxies logs through Fastify server to BetterStack with host context
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: string | number | boolean | null | undefined | LogContext | LogContext[];
}

export interface HostInfo {
  hostname: string;
  href: string;
  pathname?: string;
  userAgent?: string;
  referrer?: string;
}

export interface ClientLoggerOptions {
  /**
   * Fastify endpoint for logging (should end with /api/logs)
   */
  endpoint?: string;
  
  /**
   * Minimum log level to send
   */
  level?: LogLevel;
  
  /**
   * Whether to also log to console (useful for development)
   */
  enableConsole?: boolean;
  
  /**
   * Service name for this client
   */
  service?: string;
  
  /**
   * Maximum number of logs to batch before sending
   */
  batchSize?: number;
  
  /**
   * Maximum time to wait before sending batch (milliseconds)
   */
  batchTimeout?: number;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  hostInfo: HostInfo;
  timestamp: string;
}

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export class ClientLogger {
  private endpoint!: string;
  private minLevel!: number;
  private enableConsole!: boolean;
  private service!: string;
  private batchSize!: number;
  private batchTimeout!: number;
  private logBatch: LogEntry[] = [];
  private batchTimer: number | null = null;
  private isConfigured: boolean = false;

  constructor(options: ClientLoggerOptions = {}) {
    this.updateConfig(options);
    this.setupEventListeners();
  }

  /**
   * Update logger configuration
   * Called when app initializes or config changes
   */
  updateConfig(options: ClientLoggerOptions = {}) {
    // Smart default for endpoint:
    // 1. Use provided endpoint (highest priority)
    // 2. Use VITE_LOG_ENDPOINT if available
    // 3. Use VITE_API_URL + /api/logs if available  
    // 4. Fall back to current origin + /api/logs (lowest priority)
    this.endpoint = options.endpoint || 
                   import.meta.env.VITE_LOG_ENDPOINT ||
                   (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/logs` : `${window.location.origin}/api/logs`);
    
    // Use environment variable for log level if not specified
    const defaultLogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';
    this.minLevel = LOG_LEVELS[options.level || defaultLogLevel];
    
    this.enableConsole = options.enableConsole ?? (import.meta.env.DEV || import.meta.env.NODE_ENV === 'development');
    this.service = options.service || 'client';
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 5000; // 5 seconds
    this.isConfigured = true;
  }

  private setupEventListeners() {
    // Flush logs before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      
      // Also flush on visibility change (mobile apps, tab switching)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  private getHostInfo(): HostInfo {
    return {
      hostname: window.location.hostname,
      href: window.location.href,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private consoleLog(level: LogLevel, message: string, context?: LogContext) {
    if (!this.enableConsole) return;

    const logMethod = level === 'trace' || level === 'debug' ? 'debug' :
                     level === 'info' ? 'info' :
                     level === 'warn' ? 'warn' : 'error';
    
    const prefix = `[${this.service}:${level.toUpperCase()}]`;
    
    if (context && Object.keys(context).length > 0) {
      console[logMethod](prefix, message, context);
    } else {
      console[logMethod](prefix, message);
    }
  }

  private addToBatch(entry: LogEntry) {
    this.logBatch.push(entry);
    
    // Send immediately if batch is full
    if (this.logBatch.length >= this.batchSize) {
      this.flush();
    }
    // Otherwise, set a timer to send later
    else if (!this.batchTimer) {
      this.batchTimer = window.setTimeout(() => {
        this.flush();
      }, this.batchTimeout);
    }
  }

  private async sendLogs(logs: LogEntry[]) {
    // If not configured yet, just log to console if enabled
    if (!this.isConfigured) {
      if (this.enableConsole) {
        logs.forEach(log => {
          this.consoleLog(log.level, log.message, log.context);
        });
      }
      return;
    }

    try {
      // Send logs individually to match BFF endpoint schema
      const promises = logs.map(log => 
        fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            level: log.level,
            message: log.message,
            context: {
              ...log.context,
              service: this.service,
              timestamp: log.timestamp,
            },
            hostInfo: log.hostInfo,
          }),
        })
      );

      await Promise.all(promises);
    } catch (error) {
      // Fallback to console if network fails
      if (this.enableConsole) {
        console.error('[ClientLogger] Failed to send logs:', error);
        logs.forEach(log => {
          this.consoleLog(log.level, log.message, log.context);
        });
      }
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    // Always log to console if enabled
    this.consoleLog(level, message, context);

    // Create log entry for remote logging
    const entry: LogEntry = {
      level,
      message,
      context,
      hostInfo: this.getHostInfo(),
      timestamp: new Date().toISOString(),
    };

    this.addToBatch(entry);
  }

  /**
   * Send any pending logs immediately
   */
  flush() {
    if (this.logBatch.length === 0) return;

    const logsToSend = [...this.logBatch];
    this.logBatch = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.sendLogs(logsToSend);
  }

  /**
   * Create a child logger with additional context
   */
  child(bindings: LogContext): ClientLogger {
    const childLogger = new ClientLogger({
      endpoint: this.endpoint,
      level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k as LogLevel] === this.minLevel) as LogLevel,
      enableConsole: this.enableConsole,
      service: this.service,
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout,
    });

    // Override log method to include bindings
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, context?: LogContext) => {
      originalLog(level, message, { ...bindings, ...context });
    };

    return childLogger;
  }

  // Public logging methods
  trace(message: string, context?: LogContext) {
    this.log('trace', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string | Error, context?: LogContext) {
    if (message instanceof Error) {
      this.log('error', message.message, {
        error: message.name,
        stack: message.stack,
        ...context,
      });
    } else {
      this.log('error', message, context);
    }
  }

  fatal(message: string | Error, context?: LogContext) {
    if (message instanceof Error) {
      this.log('fatal', message.message, {
        error: message.name,
        stack: message.stack,
        ...context,
      });
    } else {
      this.log('fatal', message, context);
    }
  }
}

// Default logger instance - always available, no optional chaining needed!
export const logger = new ClientLogger();

/**
 * Configure the logger
 */
export function configureLogger(options: ClientLoggerOptions) {
  logger.updateConfig(options);
}

// Hook into global error handlers
if (typeof window !== 'undefined') {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message,
      stack: event.error?.stack,
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
    });
  });
} 
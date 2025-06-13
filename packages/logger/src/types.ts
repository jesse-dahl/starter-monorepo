import type { LoggerOptions as PinoLoggerOptions, DestinationStream } from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

export interface LoggerOptions extends Omit<PinoLoggerOptions, 'level'> {
  /**
   * Log level for the logger
   * @default 'info'
   */
  level?: LogLevel;
  
  /**
   * Whether to enable pretty printing in development
   * @default true in development, false in production
   */
  prettyPrint?: boolean;
  
  /**
   * Additional transport streams for external log services
   */
  transports?: DestinationStream[];
  
  /**
   * Service name to include in logs
   */
  service?: string;
  
  /**
   * Environment context
   */
  environment?: string;
}

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  trace: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string | Error, context?: LogContext) => void;
  fatal: (message: string | Error, context?: LogContext) => void;
  child: (bindings: LogContext) => Logger;
} 
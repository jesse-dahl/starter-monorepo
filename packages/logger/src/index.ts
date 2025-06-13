export { createLogger } from './logger';
export type { 
  Logger, 
  LoggerOptions, 
  LogContext, 
  LogLevel 
} from './types';

// Default logger instance for easy import and use
import { createLogger } from './logger';

/**
 * Default logger instance with standard configuration.
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@starter-kit/logger';
 * 
 * logger.info('Application started');
 * logger.error('Something went wrong', { userId: '123', action: 'login' });
 * ```
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context bindings.
 * 
 * Usage:
 * ```typescript
 * import { createChildLogger } from '@starter-kit/logger';
 * 
 * const userLogger = createChildLogger({ userId: '123', module: 'auth' });
 * userLogger.info('User logged in');
 * ```
 */
export const createChildLogger = (bindings: Record<string, unknown>) => {
  return logger.child(bindings);
}; 
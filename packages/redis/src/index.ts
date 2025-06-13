import { env } from '@starter-kit/env';
import { createLogger } from '@starter-kit/logger';
import { initializeClient, getClient, disconnect, healthCheck as checkHealth } from './client';
import type { RedisClient, RedisOptions, RedisHealthCheck } from './types';

const logger = createLogger({ service: 'redis' });

// Environment-based default configuration
const getDefaultRedisOptions = (): RedisOptions => {
  const config = env();
  
  // Parse Redis URL if provided
  if (config.REDIS_URL) {
    const url = new URL(config.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1) || '0', 10),
      username: url.username || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
      instanceName: 'redis-default',
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      showFriendlyErrorStack: config.NODE_ENV !== 'production'
    };
  }

  // Fallback to individual env vars
  return {
    host: config.REDIS_HOST || 'localhost',
    port: parseInt(config.REDIS_PORT || '6379', 10),
    password: config.REDIS_PASSWORD,
    db: parseInt(config.REDIS_DB || '0', 10),
    instanceName: 'redis-default',
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    showFriendlyErrorStack: config.NODE_ENV !== 'production'
  };
};

// Track if we've initialized with defaults
let defaultsInitialized = false;

/**
 * Initialize Redis with custom options
 * Must be called before using getRedis() if you want custom configuration
 */
export const initializeRedis = (options?: RedisOptions): void => {
  const finalOptions = options || getDefaultRedisOptions();
  initializeClient(finalOptions);
  defaultsInitialized = true;
  
  logger.info('Redis initialized', {
    instanceName: finalOptions.instanceName,
    host: finalOptions.host,
    port: finalOptions.port
  });
};

/**
 * Get the Redis client instance
 * Automatically initializes with default configuration if not already done
 */
export const getRedis = async (): Promise<RedisClient> => {
  if (!defaultsInitialized) {
    initializeRedis();
    defaultsInitialized = true;
  }
  
  return getClient();
};

/**
 * Gracefully shutdown Redis connections
 */
export const shutdownRedis = async (): Promise<void> => {
  logger.info('Shutting down Redis connections');
  await disconnect();
  defaultsInitialized = false;
};

/**
 * Check Redis health
 */
export const checkRedisHealth = async (): Promise<RedisHealthCheck> => {
  try {
    return await checkHealth();
  } catch (error) {
    return {
      status: 'disconnected' as any,
      connected: false,
      error: 'Redis health check failed'
    };
  }
};

/**
 * Execute a Redis command with automatic connection management
 */
export const withRedis = async <T>(
  operation: (client: RedisClient) => Promise<T>
): Promise<T> => {
  const client = await getRedis();
  return operation(client);
};

// Export types
export type { 
  RedisClient, 
  RedisOptions, 
  RedisHealthCheck,
  ConnectionState 
} from './types';

// Export client functions for advanced use cases
export { getConnectionState, reset } from './client';

// Default Redis instance for simple use cases
export const redis = {
  get: getRedis,
  shutdown: shutdownRedis,
  health: checkRedisHealth,
  with: withRedis,
  initialize: initializeRedis
}; 
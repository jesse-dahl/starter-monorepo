import Redis from 'ioredis';
import { createLogger } from '@starter-kit/logger';
import type { RedisClient, RedisOptions, ConnectionState, RedisHealthCheck } from './types';
import { ConnectionState as ConnState } from './types';

const logger = createLogger({ service: 'redis-client' });

// Module-level state for singleton behavior
let client: RedisClient | null = null;
let connectionState: ConnectionState = ConnState.DISCONNECTED;
let options: RedisOptions | null = null;
let reconnectAttempts = 0;
let shutdownInProgress = false;
let connectionPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Prepare Redis options with sensible defaults
 */
const prepareOptions = (rawOptions: RedisOptions): RedisOptions => {
  return {
    ...rawOptions,
    instanceName: rawOptions.instanceName || 'redis-client',
    connectionTimeout: rawOptions.connectionTimeout || 10000,
    enableAutoReconnect: rawOptions.enableAutoReconnect !== false,
    maxReconnectAttempts: rawOptions.maxReconnectAttempts ?? 10,
    lazyConnect: true, // Always use lazy connect for better control
    retryStrategy: (times) => {
      if (shutdownInProgress) {
        return null; // Stop retrying during shutdown
      }
      
      const maxAttempts = options?.maxReconnectAttempts ?? 10;
      if (maxAttempts !== -1 && times > maxAttempts) {
        logger.error('Max reconnection attempts reached', {
          attempts: times,
          maxAttempts
        });
        return null;
      }

      const delay = Math.min(times * 50, 2000);
      logger.warn('Reconnecting to Redis', {
        attempt: times,
        delay,
        maxAttempts
      });
      
      reconnectAttempts = times;
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Only reconnect when we get READONLY error
        logger.warn('Reconnecting due to READONLY error');
        return true;
      }
      return false;
    }
  };
};

/**
 * Set up Redis event handlers
 */
const setupEventHandlers = (redisClient: RedisClient): void => {
  redisClient.on('connect', () => {
    connectionState = ConnState.CONNECTED;
    logger.info('Redis connected event', {
      instanceName: options?.instanceName
    });
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready event', {
      instanceName: options?.instanceName
    });
  });

  redisClient.on('error', (error) => {
    logger.error('Redis error event', {
      error,
      instanceName: options?.instanceName,
      connectionState
    });
    
    if (connectionState !== ConnState.RECONNECTING) {
      connectionState = ConnState.ERROR;
    }
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed', {
      instanceName: options?.instanceName,
      shutdownInProgress
    });
    
    if (!shutdownInProgress) {
      connectionState = ConnState.DISCONNECTED;
    }
  });

  redisClient.on('reconnecting', (delay: number) => {
    connectionState = ConnState.RECONNECTING;
    logger.info('Redis reconnecting', {
      delay,
      attempt: reconnectAttempts,
      instanceName: options?.instanceName
    });
  });

  redisClient.on('end', () => {
    logger.info('Redis connection ended', {
      instanceName: options?.instanceName
    });
    connectionState = ConnState.DISCONNECTED;
  });
};

/**
 * Perform the actual connection
 */
const performConnection = async (): Promise<void> => {
  if (client && connectionState === ConnState.CONNECTED) {
    return;
  }

  if (!options) {
    throw new Error('Redis options not initialized');
  }

  logger.info('Connecting to Redis', {
    instanceName: options.instanceName,
    host: options.host,
    port: options.port
  });

  connectionState = ConnState.CONNECTING;
  client = new Redis(options);

  // Set up event handlers
  setupEventHandlers(client);

  try {
    await client.connect();
    connectionState = ConnState.CONNECTED;
    reconnectAttempts = 0;
    
    logger.info('Successfully connected to Redis', {
      instanceName: options.instanceName
    });
  } catch (error) {
    connectionState = ConnState.ERROR;
    logger.error('Failed to connect to Redis', {
      error,
      instanceName: options.instanceName
    });
    throw error;
  }
};

/**
 * Connect to Redis
 */
const connect = async (): Promise<void> => {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = performConnection();
  
  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
};

/**
 * Gracefully disconnect from Redis
 */
export const disconnect = async (): Promise<void> => {
  if (!client || connectionState === ConnState.DISCONNECTED) {
    return;
  }

  logger.info('Disconnecting from Redis', {
    instanceName: options?.instanceName
  });

  connectionState = ConnState.DISCONNECTING;

  try {
    await client.quit();
    logger.info('Redis disconnected gracefully', {
      instanceName: options?.instanceName
    });
  } catch (error) {
    logger.warn('Error during graceful disconnect, forcing disconnect', {
      error,
      instanceName: options?.instanceName
    });
    
    try {
      client.disconnect();
    } catch (disconnectError) {
      logger.error('Error during forced disconnect', {
        error: disconnectError,
        instanceName: options?.instanceName
      });
    }
  }

  client = null;
  connectionState = ConnState.DISCONNECTED;
};

/**
 * Reconnect to Redis
 */
const reconnect = async (): Promise<void> => {
  if (connectionState === ConnState.CONNECTING || connectionState === ConnState.CONNECTED) {
    return;
  }

  logger.info('Attempting to reconnect to Redis', {
    instanceName: options?.instanceName,
    previousState: connectionState
  });

  if (client) {
    client.removeAllListeners();
    await disconnect();
  }

  await connect();
};

/**
 * Initialize the Redis client with options
 */
export const initializeClient = (redisOptions: RedisOptions): void => {
  if (isInitialized) {
    logger.warn('Redis client already initialized');
    return;
  }

  options = prepareOptions(redisOptions);
  setupShutdownHandlers();
  isInitialized = true;
};

/**
 * Get the Redis client (creates if necessary)
 */
export const getClient = async (): Promise<RedisClient> => {
  if (!isInitialized || !options) {
    throw new Error('Redis client not initialized. Call initializeClient() first.');
  }

  if (shutdownInProgress) {
    throw new Error('Redis client is shutting down');
  }

  if (!client) {
    await connect();
  } else if (connectionState === ConnState.ERROR || connectionState === ConnState.DISCONNECTED) {
    await reconnect();
  }

  return client!;
};

/**
 * Parse Redis INFO command output
 */
const parseRedisInfo = (info: string): Record<string, string> => {
  const lines = info.split('\r\n');
  const parsed: Record<string, string> = {};

  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        parsed[key] = value;
      }
    }
  }

  return parsed;
};

/**
 * Perform health check
 */
export const healthCheck = async (): Promise<RedisHealthCheck> => {
  const result: RedisHealthCheck = {
    status: connectionState,
    connected: false
  };

  if (!client || connectionState !== ConnState.CONNECTED) {
    result.error = 'Client not connected';
    return result;
  }

  try {
    const start = Date.now();
    await client.ping();
    result.latency = Date.now() - start;
    result.connected = true;

    // Get additional info if requested
    const info = await client.info();
    const parsed = parseRedisInfo(info);
    
    result.info = {
      version: parsed.redis_version || 'unknown',
      usedMemory: parsed.used_memory_human || 'unknown',
      connectedClients: parseInt(parsed.connected_clients || '0', 10),
      uptimeInSeconds: parseInt(parsed.uptime_in_seconds || '0', 10)
    };

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Health check failed';
    return result;
  }
};

/**
 * Get connection state
 */
export const getConnectionState = (): ConnectionState => {
  return connectionState;
};

/**
 * Setup shutdown handlers
 */
const setupShutdownHandlers = (): void => {
  const shutdownHandler = async (signal: string) => {
    if (shutdownInProgress) {
      return;
    }

    shutdownInProgress = true;
    logger.info('Shutting down Redis client', { signal, instanceName: options?.instanceName });

    try {
      await disconnect();
      logger.info('Redis client shutdown complete', { instanceName: options?.instanceName });
    } catch (error) {
      logger.error('Error during Redis shutdown', {
        error,
        instanceName: options?.instanceName
      });
    }
  };

  // Handle various shutdown signals
  process.once('SIGINT', () => shutdownHandler('SIGINT'));
  process.once('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.once('beforeExit', () => shutdownHandler('beforeExit'));
};

/**
 * Reset the client (mainly for testing)
 */
export const reset = async (): Promise<void> => {
  await disconnect();
  client = null;
  options = null;
  connectionState = ConnState.DISCONNECTED;
  reconnectAttempts = 0;
  shutdownInProgress = false;
  connectionPromise = null;
  isInitialized = false;
}; 
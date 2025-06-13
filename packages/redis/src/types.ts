import type { RedisOptions as IoredisRedisOptions, Redis as IoredisRedisClient } from 'ioredis';

/**
 * Redis client options that extend the standard ioredis options
 */
export interface RedisOptions extends IoredisRedisOptions {
  /**
   * Unique identifier for this Redis instance (useful for logging)
   */
  instanceName?: string;
  
  /**
   * Whether to enable connection pooling
   */
  enableConnectionPool?: boolean;
  
  /**
   * Maximum number of connections in the pool
   */
  maxPoolSize?: number;
  
  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;
  
  /**
   * Whether to enable automatic reconnection
   */
  enableAutoReconnect?: boolean;
  
  /**
   * Maximum reconnection attempts (-1 for infinite)
   */
  maxReconnectAttempts?: number;
}

/**
 * Redis client instance type
 */
export type RedisClient = IoredisRedisClient;

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Health check result
 */
export interface RedisHealthCheck {
  status: ConnectionState;
  connected: boolean;
  latency?: number;
  error?: string;
  info?: {
    version: string;
    usedMemory: string;
    connectedClients: number;
    uptimeInSeconds: number;
  };
} 
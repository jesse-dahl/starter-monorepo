/* eslint-disable turbo/no-undeclared-env-vars */
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const serverSchema = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DIRECT_DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  POOLING_DATABASE_URL: z.string().url(),
  SUPABASE_DB_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
  FASTIFY_PORT: z.string().default('4000'),
  FASTIFY_HOST: z.string().default('0.0.0.0'),
  COOKIE_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  AUTH_COOKIE_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_DATABASE: z.string().optional(),
  REDIS_SSL: z.boolean().optional(),
  REDIS_TLS: z.boolean().optional(),
  REDIS_DB: z.string().optional(),
  LOG_TARGET: z.enum(['stdout', 'logtail']).default('stdout'),
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),
  LOGTAIL_ENDPOINT: z.string().optional(),
  LOG_HTTP_URL: z.string().optional(),
  LOG_HTTP_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
} as const;

const clientSchema = {
  VITE_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_API_URL: z.string().url().optional(),
  VITE_LOG_ENDPOINT: z.string().url().optional(),
  VITE_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
} as const;

/**
 * Load in env vars for client and server apps. The only reason this is a function is because
 * One project a long time ago I needed to support different 'process env locations' and it was a bitch
 * to update every single env var to be able to pass something in.
 *
 * Note Vite Apps require additional configuration to support process.env instead of import.meta.env
 */
export const env = () => createEnv({
  server: serverSchema,
  client: clientSchema,
  runtimeEnvStrict: {
    // server
    NODE_ENV: process.env.NODE_ENV,
    // database
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    POOLING_DATABASE_URL: process.env.POOLING_DATABASE_URL,
    // supabase
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    // fastify
    LOG_LEVEL: process.env.LOG_LEVEL,
    FASTIFY_PORT: process.env.FASTIFY_PORT,
    FASTIFY_HOST: process.env.FASTIFY_HOST,
    // cookies
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    // resend
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    // auth
    AUTH_COOKIE_KEY: process.env.AUTH_COOKIE_KEY,
    // redis
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    REDIS_DATABASE: process.env.REDIS_DATABASE,
    REDIS_SSL: process.env.REDIS_SSL,
    REDIS_TLS: process.env.REDIS_TLS,
    REDIS_DB: process.env.REDIS_DB,
    // logging
    LOG_TARGET: process.env.LOG_TARGET,
    LOG_HTTP_URL: process.env.LOG_HTTP_URL,
    LOG_HTTP_TOKEN: process.env.LOG_HTTP_TOKEN,
    LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
    LOGTAIL_ENDPOINT: process.env.LOGTAIL_ENDPOINT,
    // client
    VITE_NODE_ENV: process.env.VITE_NODE_ENV,
    VITE_API_URL: process.env.VITE_API_URL,
    VITE_LOG_ENDPOINT: process.env.VITE_LOG_ENDPOINT,
    VITE_LOG_LEVEL: process.env.VITE_LOG_LEVEL,
    // stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  },
  clientPrefix: 'VITE_',
  emptyStringAsUndefined: true,
});
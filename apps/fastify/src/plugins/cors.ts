import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '@starter-kit/env';
import { createLogger } from '@starter-kit/logger';

const fastifyLogger = createLogger({
  service: 'fastify',
  level: (env().LOG_LEVEL as any) || 'info',
});

async function corsPlugin(app: FastifyInstance) {
  const { NODE_ENV, CORS_ALLOWED_ORIGINS } = env();

  const allowedOrigins = (CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.register(cors, {
    origin: (origin, cb) => {
      // Non-browser requests
      if (!origin) return cb(null, true);

      // Always allow localhost during development for convenience
      if (NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return cb(null, true);
      }

      // Explicitly allow origins from env var in any environment
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        return cb(null, true);
      }

      // Reject anything else in production
      if (NODE_ENV === 'production') {
        fastifyLogger.warn('Blocked CORS request from disallowed origin', { origin });
        return cb(new Error('Origin not allowed'), false);
      }

      // Fallback to allow during non-production when not matched (useful for staging)
      return cb(null, true);
    },
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    maxAge: 86400, // 24 hours
  });
}

export default fp(corsPlugin, { name: 'cors' }); 
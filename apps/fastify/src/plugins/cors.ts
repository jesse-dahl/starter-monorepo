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
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return cb(null, true);
      }

      if (origin.startsWith('https://')) {
        fastifyLogger.info('Request from domain', {
          origin,
          timestamp: new Date().toISOString(),
        });
        return cb(null, true);
      }

      if (env().NODE_ENV === 'production' && origin.startsWith('http://')) {
        fastifyLogger.warn('Blocked insecure HTTP request', {
          blockedOrigin: origin,
        });
        return cb(new Error('HTTPS required'), false);
      }

      // Allow HTTP in development
      return cb(null, true);
    },
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });
}

export default fp(corsPlugin, { name: 'cors' }); 
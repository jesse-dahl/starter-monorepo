import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createLogger } from '@starter-kit/logger';

const fastifyLogger = createLogger({
  service: 'fastify',
  level: 'info',
});

async function loggingHooks(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const requestLogger = fastifyLogger.child({
      requestId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    });

    if (request.url.includes('/api')) {
      requestLogger.info('API request received', {
        body: request.body,
        headers: {
          'content-type': request.headers['content-type'],
          'content-length': request.headers['content-length'],
        },
      });
    } else {
      requestLogger.debug('Request received');
    }

    (request as any).logger = requestLogger;
  });

  app.addHook('onResponse', async (request, reply) => {
    const requestLogger = (request as any).logger || fastifyLogger;

    if (request.url.includes('/api')) {
      requestLogger.info('API request completed', {
        statusCode: reply.statusCode,
      });
    } else {
      requestLogger.debug('Request completed', {
        statusCode: reply.statusCode,
      });
    }
  });
}

export default fp(loggingHooks); 
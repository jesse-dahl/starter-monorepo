import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createLogger } from '@starter-kit/logger';

const fastifyLogger = createLogger({
  service: 'fastify',
  level: 'info',
});

async function logsRoute(app: FastifyInstance) {
  app.post(
    '/api/logs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['level', 'message', 'hostInfo'],
          properties: {
            level: {
              type: 'string',
              enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
            },
            message: { type: 'string' },
            context: { type: 'object' },
            hostInfo: {
              type: 'object',
              required: ['hostname', 'href'],
              properties: {
                hostname: { type: 'string' },
                href: { type: 'string' },
                pathname: { type: 'string' },
                userAgent: { type: 'string' },
                referrer: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          level,
          message,
          context = {},
          hostInfo,
        } = request.body as {
          level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
          message: string;
          context?: Record<string, any>;
          hostInfo: {
            hostname: string;
            href: string;
            pathname?: string;
            userAgent?: string;
            referrer?: string;
          };
        };

        const clientLogger = fastifyLogger.child({
          source: 'client',
          hostDomain: hostInfo.hostname,
          hostUrl: hostInfo.href,
          hostPath: hostInfo.pathname,
          userAgent: hostInfo.userAgent || request.headers['user-agent'],
          referrer: hostInfo.referrer,
          clientIp: request.ip,
          timestamp: new Date().toISOString(),
        });

        clientLogger[level](message, context);

        reply.code(204).send(); // No content response
      } catch (error) {
        const requestLogger = (request as any).logger || fastifyLogger;
        requestLogger.error(error as Error, {
          operation: 'client_logging',
          body: request.body,
        });
        reply.code(500).send({ error: 'Failed to process log' });
      }
    },
  );
}

export default fp(logsRoute); 
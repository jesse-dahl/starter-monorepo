import Fastify from 'fastify';
import { apiRoutes } from '@starter-kit/api/routes';
import { env } from '@starter-kit/env';
import { createLogger } from '@starter-kit/logger';

// plugins
import corsPlugin from './plugins/cors';
import cookiePlugin from './plugins/cookie';
import swaggerPlugin from './plugins/swagger';

// hooks
import loggingHooks from './hooks/logging';

// routes
import healthRoute from './routes/health';
import logsRoute from './routes/logs';

const PORT = env().FASTIFY_PORT || 4000;
const HOST = env().FASTIFY_HOST || '0.0.0.0';

// Create logger instance for the fastify server
const fastifyLogger = createLogger({ 
  service: 'fastify',
  level: (env().LOG_LEVEL as any) || 'info'
});

const fastify = Fastify({ logger: false });

// Register plugins
fastify.register(corsPlugin);
fastify.register(cookiePlugin);
fastify.register(swaggerPlugin);

// Register hooks
fastify.register(loggingHooks);

// Register routes
fastify.register(apiRoutes, { prefix: '/api' });
fastify.register(healthRoute);
fastify.register(logsRoute);

const start = async () => {
  try {
    fastifyLogger.info('Starting Fastify server', { port: PORT, host: HOST });
    await fastify.listen({ port: Number(PORT), host: HOST });
    fastifyLogger.info('Fastify server started successfully', { 
      port: PORT, 
      host: HOST,
    });
  } catch (err) {
    fastifyLogger.fatal(err as Error, { operation: 'server_start' });
    process.exit(1);
  }
};

start(); 
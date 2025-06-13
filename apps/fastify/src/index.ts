import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { apiRoutes } from '@starter-kit/api/routes';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '@starter-kit/env';
import { createLogger } from '@starter-kit/logger';

const PORT = env().FASTIFY_PORT || 4000;
const HOST = env().FASTIFY_HOST || '0.0.0.0';

// Create logger instance for the fastify server
const fastifyLogger = createLogger({ 
  service: 'fastify',
  level: (env().LOG_LEVEL as any) || 'info'
});

const fastify = Fastify({ logger: false });

fastify.register(cors, {
  // Allow any origin for embeddable application
  // Use a function to log which domains are embedding the app
  origin: (origin, cb) => {
    // Allow requests with no origin (like from Postman/curl)
    if (!origin) return cb(null, true);
    
    // For development, allow localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    
    // For production embed usage, allow all HTTPS origins
    // Log the embedding domain for monitoring
    if (origin.startsWith('https://')) {
      fastifyLogger.info('Embed request from domain', { 
        embeddingDomain: origin,
        timestamp: new Date().toISOString()
      });
      return cb(null, true);
    }
    
    // Block HTTP origins in production for security
    if (env().NODE_ENV === 'production' && origin.startsWith('http://')) {
      fastifyLogger.warn('Blocked insecure HTTP embed attempt', { 
        blockedOrigin: origin 
      });
      return cb(new Error('HTTPS required for embed'), false);
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
    'Origin'
  ]
});

fastify.register(cookie, {
  secret: env().COOKIE_SECRET,
  hook: 'onRequest'
});

// Register OpenAPI/Swagger plugins
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'My API',
      version: '1.0.0',
    },
  },
});

fastify.register(swaggerUi, { routePrefix: '/docs' });

// Register API routes from external package
fastify.register(apiRoutes, { prefix: '/api' });

fastify.listen({ port: 3000 }, () => {
  console.log('Server running on port 3000');
});
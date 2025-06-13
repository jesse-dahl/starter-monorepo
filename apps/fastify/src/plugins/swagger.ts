import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

async function swaggerPlugin(app: FastifyInstance) {
  app.register(swagger, {
    openapi: {
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    },
  });

  app.register(swaggerUi, { routePrefix: '/docs' });
}

export default fp(swaggerPlugin, { name: 'swagger' }); 
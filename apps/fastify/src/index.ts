import Fastify from 'fastify';
// import { apiRoutes } from '@your-monorepo/api';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const app = Fastify({ logger: true });

// Register OpenAPI/Swagger plugins
app.register(swagger, {
  openapi: {
    info: {
      title: 'My API',
      version: '1.0.0',
    },
  },
});

app.register(swaggerUi, { routePrefix: '/docs' });

// Register API routes from external package
// app.register(apiRoutes, { prefix: '/api' });

app.listen({ port: 3000 }, () => {
  console.log('Server running on port 3000');
});
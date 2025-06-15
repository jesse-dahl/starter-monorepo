import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { employeeRoutes, userRoutes, authRoutes } from './modules';

export const apiRoutes = fp(async (app: FastifyInstance) => {
  app.register(employeeRoutes, { prefix: '/employees' });
  app.register(userRoutes, { prefix: '/users' });
  app.register(authRoutes, { prefix: '/auth' });
});
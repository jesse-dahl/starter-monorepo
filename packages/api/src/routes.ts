import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { employeeRoutes, userRoutes } from './modules';

export const apiRoutes = fp(async (app: FastifyInstance) => {
  app.register(employeeRoutes, { prefix: '/employees' });
  app.register(userRoutes, { prefix: '/users' });
});
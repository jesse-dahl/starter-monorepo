import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { employeeRoutes } from './modules';

export const apiRoutes = fp(async (app: FastifyInstance) => {
  app.register(employeeRoutes, { prefix: '/empployees' });
});
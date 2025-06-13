import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { env } from '@starter-kit/env';

async function cookiePlugin(app: FastifyInstance) {
  app.register(cookie, {
    secret: env().COOKIE_SECRET,
    hook: 'onRequest',
  });
}

export default fp(cookiePlugin, { name: 'cookie' }); 
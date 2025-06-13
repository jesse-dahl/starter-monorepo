import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { env } from '@starter-kit/env';

async function cookiePlugin(app: FastifyInstance) {
  const secret = env().COOKIE_SECRET;
  if (!secret) {
    throw new Error('COOKIE_SECRET env var must be set');
  }

  app.register(cookie, {
    secret,
    hook: 'onRequest',
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  });
}

export default fp(cookiePlugin, { name: 'cookie' }); 
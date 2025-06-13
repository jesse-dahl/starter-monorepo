import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'ok' };
  });
}

export default fp(healthRoute); 
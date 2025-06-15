import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import {
  RequestOtpBodySchema,
  VerifyOtpBodySchema,
  RequestOtpBody,
  VerifyOtpBody,
  VerifyOtpResponseSchema,
  RefreshSessionResponseSchema,
  LogoutResponseSchema,
} from './auth.schema';
import { authService } from '@starter-kit/services';
import {
  buildAccessTokenCookie,
  buildRefreshTokenCookie,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@starter-kit/auth';
import '@fastify/cookie';

export async function authRoutes(app: FastifyInstance) {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // POST /auth/otp/request
  app.post<{
    Body: RequestOtpBody;
  }>('/otp/request', {
    schema: {
      body: RequestOtpBodySchema,
      response: {
        204: RequestOtpBodySchema.optional(), // no content
      },
      tags: ['auth'],
      summary: 'Request OTP email',
    },
  }, async (request, reply) => {
    const { email } = request.body;
    const result = await authService.requestOtpEmail(email);
    if (!result.success) {
      return reply.code(400).send({ error: result.error });
    }
    return reply.code(204).send();
  });

  // POST /auth/otp/verify
  app.post<{
    Body: VerifyOtpBody;
  }>('/otp/verify', {
    schema: {
      body: VerifyOtpBodySchema,
      response: {
        200: VerifyOtpResponseSchema,
      },
      tags: ['auth'],
      summary: 'Verify OTP and sign in',
    },
  }, async (request, reply) => {
    const { email, code } = request.body;
    const tokenPair = await authService.verifyOtpCode(email, code);

    if (!tokenPair) {
      return reply.code(401).send({ error: 'Invalid code' });
    }

    // Set cookies
    const maxAge = tokenPair.expiresAt - Math.floor(Date.now() / 1000);
    const accessCookie = buildAccessTokenCookie(tokenPair.accessToken, maxAge);
    const refreshCookie = buildRefreshTokenCookie(tokenPair.refreshToken);

    (reply as any).setCookie(accessCookie.name, accessCookie.value, accessCookie.options);
    (reply as any).setCookie(refreshCookie.name, refreshCookie.value, refreshCookie.options);

    const user = await authService.getUserFromAccessToken(tokenPair.accessToken);

    return { user };
  });

  // POST /auth/refresh
  app.post('/refresh', {
    schema: {
      response: {
        200: RefreshSessionResponseSchema,
      },
      tags: ['auth'],
      summary: 'Refresh access / refresh tokens',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = (request as any).cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      return reply.code(401).send({ error: 'No refresh token' });
    }

    const tokenPair = await authService.refreshSession(refreshToken);
    if (!tokenPair) {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }

    const accessMaxAge = tokenPair.expiresAt - Math.floor(Date.now() / 1000);
    const accessCookie = buildAccessTokenCookie(tokenPair.accessToken, accessMaxAge);
    const refreshCookie = buildRefreshTokenCookie(tokenPair.refreshToken);

    (reply as any).setCookie(accessCookie.name, accessCookie.value, accessCookie.options);
    (reply as any).setCookie(refreshCookie.name, refreshCookie.value, refreshCookie.options);

    return { success: true };
  });

  // POST /auth/logout
  app.post('/logout', {
    schema: {
      response: {
        200: LogoutResponseSchema,
      },
      tags: ['auth'],
      summary: 'Clear auth cookies',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Clear cookies by setting empty value and maxAge 0
    (reply as any).clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    (reply as any).clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return { success: true };
  });

  // GET /auth/me
  app.get('/me', {
    schema: {
      response: {
        200: VerifyOtpResponseSchema,
      },
      tags: ['auth'],
      summary: 'Get current user from access token',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const accessToken = (request as any).cookies?.[ACCESS_TOKEN_COOKIE];
    if (!accessToken) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const user = await authService.getUserFromAccessToken(accessToken);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    return { user };
  });
} 
import { jwtVerify, JWTPayload } from 'jose';
import { env } from '@starter-kit/env';
import { TokenPair } from './types';
import { DEFAULT_ACCESS_TOKEN_MAX_AGE, DEFAULT_REFRESH_TOKEN_MAX_AGE } from './constants';

/**
 * Supabase already returns access + refresh tokens. This helper simply converts
 * the Supabase session object into our internal TokenPair representation.
 */
export function toTokenPair(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}): TokenPair {
  const { access_token, refresh_token, expires_in } = session;
  const expiresAt = Math.floor(Date.now() / 1000) + expires_in;
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt,
  };
}

/**
 * Verifies an access token using the Supabase JWT secret. Returns the decoded
 * payload if valid, otherwise null.
 */
export async function verifyAccessToken<T extends JWTPayload = JWTPayload>(
  token: string
): Promise<T | null> {
  try {
    const jwtSecret = env().SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET must be set in env');
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify<T>(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export interface CookieObject {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  };
}

export function buildAccessTokenCookie(
  token: string,
  maxAge: number = DEFAULT_ACCESS_TOKEN_MAX_AGE
): CookieObject {
  return {
    name: 'access_token',
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    },
  };
}

export function buildRefreshTokenCookie(
  token: string,
  maxAge: number = DEFAULT_REFRESH_TOKEN_MAX_AGE
): CookieObject {
  return {
    name: 'refresh_token',
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    },
  };
} 
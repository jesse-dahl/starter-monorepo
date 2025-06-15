export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Supabase access tokens expire in 1 hour by default (3600 seconds)
export const DEFAULT_ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1h in seconds
// Supabase refresh tokens expire in 60 days by default (5184000 seconds)
export const DEFAULT_REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 60; // 60 days 
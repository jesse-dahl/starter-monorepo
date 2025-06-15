import supabase, { supabaseAdmin } from '@starter-kit/supabase/client';
import { createLogger } from '@starter-kit/logger';
import { TokenPair } from '../types';
import { toTokenPair } from '../tokens';

const logger = createLogger({ service: 'auth-supabase-provider' });

export interface SignInWithOtpOptions {
  emailRedirectTo?: string;
  // By default, Supabase will create a user if one doesn't exist.
  shouldCreateUser?: boolean;
}

/**
 * Requests that Supabase send a one-time code to the supplied email. This
 * returns void if Supabase accepts the request. Any delivery failures will be
 * handled internally by Supabase. For a custom email template via Resend you
 * would *not* use this helper – instead generate a code manually, persist it,
 * and send via @starter-kit/resend. That flow is outside the scope of this
 * boilerplate.
 */
export async function requestOtpEmail(
  email: string,
  options: SignInWithOtpOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: options.emailRedirectTo,
      shouldCreateUser: options.shouldCreateUser ?? true,
      emailOtpType: 'code', // ensures a 6-digit code email, not magic-link
    } as any,
  });

  if (error) {
    logger.error('Failed to request OTP', { error });
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Verifies a 6-digit OTP code and returns a TokenPair if valid.
 */
export async function verifyOtpCode(
  email: string,
  code: string
): Promise<TokenPair | null> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (error || !data?.session) {
    if (error) logger.warn('Invalid OTP', { error });
    return null;
  }

  return toTokenPair(data.session);
}

/**
 * Exchange a refresh token for a new TokenPair. Keeps the user signed in.
 */
export async function refreshSession(
  refreshToken: string
): Promise<TokenPair | null> {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
    if (error) logger.warn('Failed to refresh session', { error });
    return null;
  }
  return toTokenPair(data.session);
}

/**
 * Fetches the current user using a validated access token.
 */
export async function getUserFromAccessToken(accessToken: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error) {
    logger.warn('Failed to fetch user from access token', { error });
    return null;
  }
  return data?.user ?? null;
} 
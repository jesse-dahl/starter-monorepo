import supabase, { supabaseAdmin } from '@starter-kit/supabase/client';
import { createLogger } from '@starter-kit/logger';
import { TokenPair } from '../types';
import { toTokenPair } from '../tokens';
import { sendOtpEmail } from '@starter-kit/resend';
import { withRedis } from '@starter-kit/redis';

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
  // Generate the OTP without sending Supabase's default email. We use
  // the Admin API so we get the token payload back and can pass it along
  // to Resend. The type `magiclink` returns both `action_link` (for links)
  // and a six-digit `token` used for OTP flows.
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      shouldCreateUser: options.shouldCreateUser ?? true,
      redirect_to: options.emailRedirectTo,
    } as any,
  } as any);

  if (error || !data) {
    logger.error('Failed to generate OTP link', { error });
    return { success: false, error: error?.message || 'Link generation failed' };
  }

  // The OTP token is available on `data.properties.token`
  // Fallback to empty string if Supabase changes shape – the template will reflect it.
  const token = (data as any).properties?.token ?? '';

  try {
    // First cache OTP in Redis (10-minute TTL). If this fails we bail out so
    // the user never receives a code we cannot later validate.
    const redisSetOk = await withRedis(async (client) => {
      try {
        await client.set(`otp:${email}`, token, 'EX', 600);
        return true;
      } catch (err) {
        logger.error('Failed to cache OTP in Redis', { error: err });
        return false;
      }
    });

    if (!redisSetOk) {
      return { success: false, error: 'Internal error – OTP cache failed' };
    }

    // Now dispatch the email
    await sendOtpEmail(email, token);

    logger.debug('Sent OTP email via Resend', { email });
    return { success: true };
  } catch (sendErr: any) {
    logger.error('Failed to dispatch Resend email', { error: sendErr });
    return { success: false, error: sendErr?.message || 'Email dispatch failed' };
  }
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

  // Compare with cached token (if exists) to guard against code reuse/incorrect code
  try {
    const match = await withRedis(async (client) => client.get(`otp:${email}`));
    if (!match || match !== code) {
      logger.warn('OTP mismatch or expired in Redis', { email });
      return null;
    }
    // delete cached token after successful usage
    await withRedis(async (client) => client.del(`otp:${email}`));
  } catch (redisErr) {
    logger.warn('Redis lookup failed', { error: redisErr });
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
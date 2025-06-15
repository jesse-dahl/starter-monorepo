import type { TokenPair, AuthUser } from "@starter-kit/auth";

export interface IAuthService {
  /**
   * Sends a one-time passcode email to the given address.
   * Returns `{ success: true }` when Supabase accepted the request or
   * `{ success: false, error }` when it did not.
   */
  requestOtpEmail(email: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Verifies a 6-digit OTP code and returns a TokenPair when valid. Returns null on failure.
   */
  verifyOtpCode(email: string, code: string): Promise<TokenPair | null>;

  /**
   * Exchanges a refresh token for a new TokenPair. Returns null on failure.
   */
  refreshSession(refreshToken: string): Promise<TokenPair | null>;

  /**
   * Fetches the AuthUser represented by the (already validated) access token.
   */
  getUserFromAccessToken(accessToken: string): Promise<AuthUser | null>;
} 
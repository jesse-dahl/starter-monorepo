import { createLogger } from "@starter-kit/logger";
import { supabaseAuthProvider } from "@starter-kit/auth";
import type { TokenPair, AuthUser } from "@starter-kit/auth";
import type { IAuthService } from "../interfaces/IAuthService";

const logger = createLogger({ service: "auth-service" });

async function requestOtpEmail(email: string) {
  logger.debug(`Requesting OTP for ${email}`);
  return supabaseAuthProvider.requestOtpEmail(email);
}

async function verifyOtpCode(email: string, code: string): Promise<TokenPair | null> {
  logger.debug(`Verifying OTP for ${email}`);
  return supabaseAuthProvider.verifyOtpCode(email, code);
}

async function refreshSession(refreshToken: string): Promise<TokenPair | null> {
  logger.debug(`Refreshing session`);
  return supabaseAuthProvider.refreshSession(refreshToken);
}

async function getUserFromAccessToken(accessToken: string): Promise<AuthUser | null> {
  return supabaseAuthProvider.getUserFromAccessToken(accessToken);
}

export const authService: IAuthService = {
  requestOtpEmail,
  verifyOtpCode,
  refreshSession,
  getUserFromAccessToken,
}; 
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  // epoch seconds of the access token expiry so calling layers can decide when to rotate
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  // Add more fields as required (role, metadata, etc.)
  [key: string]: unknown;
} 
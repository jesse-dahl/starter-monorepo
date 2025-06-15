import { z } from 'zod';

export const RequestOtpBodySchema = z.object({
  email: z.string().email(),
});

export const VerifyOtpBodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const RefreshSessionResponseSchema = z.object({
  success: z.boolean(),
});

export const LogoutResponseSchema = z.object({
  success: z.boolean(),
});

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export const VerifyOtpResponseSchema = z.object({
  user: AuthUserSchema.optional(),
});

export type RequestOtpBody = z.infer<typeof RequestOtpBodySchema>;
export type VerifyOtpBody = z.infer<typeof VerifyOtpBodySchema>;
export type VerifyOtpResponse = z.infer<typeof VerifyOtpResponseSchema>; 
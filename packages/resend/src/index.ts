import { resend } from './client';
import React from 'react';
import PlaidVerifyIdentityEmail from './templates/otp.template';

/**
 * Sends the OTP verification email using the shared React-Email template.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: 'auth@starter-kit.dev',
    to: [to],
    subject: 'Your verification code',
    react: React.createElement(PlaidVerifyIdentityEmail, { validationCode: code }),
  });
} 
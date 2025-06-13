import Stripe from 'stripe';
import { env } from '@starter-kit/env';

const stripeSecretKey = env().STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing Stripe secret key in environment variables.');
}

export const stripe = new Stripe(stripeSecretKey);
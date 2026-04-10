import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'PORT',
  'RESTAURANT_NAME',
  'APP_BASE_URL',
  'PAYMENT_PROVIDER_URL',
  'PAYMENT_PROVIDER_SECRET',
  'PAYMENT_PROVIDER_WEBHOOK_SECRET',
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

export const PORT = parseInt(process.env.PORT, 10);
export const DATABASE_URL = process.env.DATABASE_URL;
export const RESTAURANT_NAME = process.env.RESTAURANT_NAME;
export const APP_BASE_URL = process.env.APP_BASE_URL;
export const PAYMENT_PROVIDER_URL = process.env.PAYMENT_PROVIDER_URL;
export const PAYMENT_PROVIDER_SECRET = process.env.PAYMENT_PROVIDER_SECRET;
export const PAYMENT_PROVIDER_WEBHOOK_SECRET = process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET;

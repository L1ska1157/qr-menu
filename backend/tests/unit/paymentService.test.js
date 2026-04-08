import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock env before importing service
jest.unstable_mockModule('../../src/config/env.js', () => ({
  PAYMENT_PROVIDER_URL: 'https://test-provider.example.com/checkout',
  PAYMENT_PROVIDER_SECRET: 'test-secret',
  PAYMENT_PROVIDER_WEBHOOK_SECRET: 'webhook-secret-key',
  APP_BASE_URL: 'http://localhost:3000',
}));

const { verifyWebhookSignature } = await import('../../src/services/paymentService.js');

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', () => {
    const body = Buffer.from('{"event":"payment.completed"}');
    const sig = crypto.createHmac('sha256', 'webhook-secret-key').update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const body = Buffer.from('{"event":"payment.completed"}');
    const badSig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, badSig)).toBe(false);
  });
});

import crypto from 'crypto';
import { PAYMENT_PROVIDER_URL, PAYMENT_PROVIDER_SECRET, PAYMENT_PROVIDER_WEBHOOK_SECRET, APP_BASE_URL } from '../config/env.js';

export async function initiateCheckout(paymentId, orderIds, amountCents, sessionId) {
  console.log(`[payment] initiateCheckout payment=${paymentId} orders=${orderIds.join(',')} amount=${amountCents} session=${sessionId}`);
  console.log(`[payment] calling provider: ${PAYMENT_PROVIDER_URL}`);

  const res = await fetch(PAYMENT_PROVIDER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAYMENT_PROVIDER_SECRET}`,
    },
    body: JSON.stringify({
      amount: amountCents,
      metadata: { payment_id: paymentId, order_ids: orderIds },
      success_url: `${APP_BASE_URL}/orders.html?payment=success&session_id=${sessionId}`,
      cancel_url: `${APP_BASE_URL}/orders.html?payment=failed&session_id=${sessionId}`,
    }),
  });

  console.log(`[payment] provider responded: ${res.status}`);

  if (!res.ok) {
    throw new Error(`Payment provider error: ${res.status}`);
  }

  const data = await res.json();
  const redirectUrl = data.checkout_url ?? data.redirect_url ?? data.url;
  console.log(`[payment] redirect URL: ${redirectUrl}`);
  return redirectUrl;
}

export function verifyWebhookSignature(rawBody, sigHeader) {
  const expected = crypto
    .createHmac('sha256', PAYMENT_PROVIDER_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'));
}

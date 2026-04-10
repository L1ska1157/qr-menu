import crypto from 'crypto';
import { Router } from 'express';
import express from 'express';
import { APP_BASE_URL, PAYMENT_PROVIDER_WEBHOOK_SECRET } from '../config/env.js';

const router = Router();
router.use(express.urlencoded({ extended: false }));

// ref → { amountCents, metadata, successUrl, failureUrl }
const pending = new Map();

// POST /stub/payment/checkout — called by initiateCheckout()
router.post('/stub/payment/checkout', (req, res) => {
  const { amount, metadata, success_url, cancel_url } = req.body;
  const ref = crypto.randomUUID();
  pending.set(ref, { amountCents: amount, metadata, successUrl: success_url, failureUrl: cancel_url });
  console.log(`[stub] checkout created ref=${ref} amount=${amount} payment_id=${metadata?.payment_id}`);
  res.json({ checkout_url: `${APP_BASE_URL}/stub/payment/ui?ref=${ref}` });
});

// GET /stub/payment/ui — served to the browser after location.href redirect
router.get('/stub/payment/ui', (req, res) => {
  const session = pending.get(req.query.ref);
  if (!session) {
    return res.status(404).type('text/plain').send('Payment session not found or already processed.');
  }

  const amount = (session.amountCents / 100).toFixed(2);
  const ref = req.query.ref;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment — Dev Stub</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 20px 60px rgba(0,0,0,.4);
    }
    .badge {
      display: inline-block;
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffc107;
      border-radius: 4px;
      font-size: .7rem;
      font-weight: 600;
      letter-spacing: .05em;
      padding: 2px 8px;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    h1 { font-size: 1.1rem; color: #111; margin-bottom: .25rem; }
    .amount { font-size: 2rem; font-weight: 700; color: #111; margin-bottom: 1.75rem; }
    hr { border: none; border-top: 1px solid #eee; margin-bottom: 1.5rem; }
    .label { font-size: .75rem; color: #666; margin-bottom: .75rem; text-transform: uppercase; letter-spacing: .05em; }
    .btn {
      display: block;
      width: 100%;
      padding: .75rem 1rem;
      border: none;
      border-radius: 8px;
      font-size: .95rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: .6rem;
    }
    .btn-success { background: #198754; color: #fff; }
    .btn-success:hover { background: #157347; }
    .btn-failure { background: #dc3545; color: #fff; }
    .btn-failure:hover { background: #bb2d3b; }
    form { margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Dev stub</div>
    <h1>Payment simulation</h1>
    <div class="amount">€${amount}</div>
    <hr>
    <p class="label">Choose an outcome to simulate</p>

    <form method="POST" action="/stub/payment/simulate">
      <input type="hidden" name="ref" value="${ref}">
      <input type="hidden" name="outcome" value="success">
      <button class="btn btn-success" type="submit">Pay — simulate success</button>
    </form>

    <form method="POST" action="/stub/payment/simulate">
      <input type="hidden" name="ref" value="${ref}">
      <input type="hidden" name="outcome" value="failure">
      <button class="btn btn-failure" type="submit">Simulate failure</button>
    </form>
  </div>
</body>
</html>`);
});

// POST /stub/payment/simulate — handles button choice
router.post('/stub/payment/simulate', async (req, res) => {
  const { ref, outcome } = req.body;
  const session = pending.get(ref);
  if (!session) {
    return res.status(410).type('text/plain').send('This payment session has already been processed.');
  }

  pending.delete(ref);
  const { metadata, successUrl, failureUrl } = session;
  console.log(`[stub] simulate outcome=${outcome} ref=${ref} payment_id=${metadata?.payment_id}`);

  if (outcome === 'success') {
    console.log(`[stub] firing success webhook`);
    await fireWebhook(ref, metadata, 'completed');
    console.log(`[stub] webhook fired, redirecting to success URL`);
    return res.redirect(successUrl);
  }

  console.log(`[stub] firing failure webhook`);
  await fireWebhook(ref, metadata, 'failed');
  console.log(`[stub] webhook fired, redirecting to failure URL`);
  res.redirect(failureUrl);
});

async function fireWebhook(providerRef, metadata, status) {
  const body = JSON.stringify({ reference: providerRef, metadata, status });
  const sig = crypto
    .createHmac('sha256', PAYMENT_PROVIDER_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  console.log(`[stub] POST ${APP_BASE_URL}/webhooks/payment status=${status}`);
  const res = await fetch(`${APP_BASE_URL}/webhooks/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',   // must NOT be application/json — see spec
      'x-provider-signature': sig,
    },
    body,
  });
  console.log(`[stub] webhook response: ${res.status}`);
}

export default router;

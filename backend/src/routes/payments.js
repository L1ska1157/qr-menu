import express, { Router } from 'express';
import { pool } from '../config/db.js';
import validateSession from '../middleware/validateSession.js';
import { createPayment, updatePaymentStatus, getPaymentByProviderRef, getPaymentById, getSessionPayments } from '../db/queries/payments.js';
import { markOrdersPaid, getOrders } from '../db/queries/orders.js';
import { initiateCheckout, verifyWebhookSignature } from '../services/paymentService.js';

const router = Router();

// POST /api/payments/initiate
router.post('/api/payments/initiate', validateSession, async (req, res, next) => {
  const { order_ids } = req.body;

  if (!order_ids || !order_ids.length) {
    return next({ code: 'INVALID_ORDER_IDS', message: 'order_ids must be a non-empty array' });
  }

  // Verify orders belong to session and are unpaid
  const { rows: orderRows } = await pool.query(
    `SELECT id FROM orders WHERE id = ANY($1::uuid[]) AND session_id = $2 AND is_paid = false`,
    [order_ids, req.session.id]
  );
  if (orderRows.length !== order_ids.length) {
    return next({ code: 'INVALID_ORDER_IDS', message: 'Some order IDs are invalid, already paid, or belong to a different session' });
  }

  // Check no pending payment in progress
  const { rows: pendingRows } = await pool.query(
    `SELECT id FROM payments WHERE session_id = $1 AND status = 'pending' LIMIT 1`,
    [req.session.id]
  );
  if (pendingRows.length) {
    return next({ code: 'PAYMENT_IN_PROGRESS', message: 'A payment is already in progress for this session' });
  }

  // Sum total
  const { rows: totalRows } = await pool.query(
    `SELECT COALESCE(SUM(total_cents), 0)::int AS total FROM orders WHERE id = ANY($1::uuid[])`,
    [order_ids]
  );
  const amountCents = totalRows[0].total;

  const payment = await createPayment(req.session.id, amountCents);
  try {
    const redirectUrl = await initiateCheckout(payment.id, order_ids, amountCents, req.session.id);
    res.json({ payment_id: payment.id, redirect_url: redirectUrl, amount_cents: amountCents });
  } catch (err) {
    next(err);
  }
});

// POST /webhooks/payment — raw body needed for HMAC
router.post('/webhooks/payment', express.raw({ type: '*/*' }), async (req, res, next) => {
  const sig = req.headers['x-provider-signature'];
  if (!sig || !verifyWebhookSignature(req.body, sig)) {
    return next({ code: 'INVALID_SIGNATURE', message: 'Signature verification failed' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return next({ code: 'INVALID_PAYLOAD', message: 'Cannot parse webhook body' });
  }

  const providerRef = payload.reference ?? payload.transaction_id ?? payload.id;
  const metaPaymentId = payload.metadata?.payment_id;

  let payment = providerRef ? await getPaymentByProviderRef(providerRef) : null;
  if (!payment && metaPaymentId) payment = await getPaymentById(metaPaymentId);

  if (!payment) {
    return next({ code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' });
  }

  // Idempotent
  if (payment.status === 'completed') return res.status(200).end();

  const status = payload.status === 'failed' ? 'failed' : 'completed';
  await updatePaymentStatus(payment.id, status, providerRef, new Date());

  if (status === 'completed') {
    const orderIds = payload.metadata?.order_ids ?? [];
    if (orderIds.length) await markOrdersPaid(orderIds, payment.id);
  }

  res.status(200).end();
});

// GET /api/payments/status/:session_id
router.get('/api/payments/status/:session_id', validateSession, async (req, res) => {
  const payments = await getSessionPayments(req.session.id);
  res.json({ session_id: req.session.id, payments });
});

export default router;

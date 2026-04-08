import { pool } from '../../config/db.js';

export async function createPayment(sessionId, amountCents) {
  const { rows } = await pool.query(`
    INSERT INTO payments (session_id, amount_cents)
    VALUES ($1, $2)
    RETURNING id, session_id, amount_cents, status, initiated_at
  `, [sessionId, amountCents]);
  return rows[0];
}

export async function updatePaymentStatus(paymentId, status, providerRef, completedAt) {
  await pool.query(`
    UPDATE payments
       SET status = $2,
           provider_reference = $3,
           completed_at = $4
     WHERE id = $1
  `, [paymentId, status, providerRef, completedAt]);
}

export async function getPaymentByProviderRef(providerRef) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE provider_reference = $1 LIMIT 1',
    [providerRef]
  );
  return rows[0] ?? null;
}

export async function getPaymentById(paymentId) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE id = $1',
    [paymentId]
  );
  return rows[0] ?? null;
}

export async function getSessionPayments(sessionId) {
  const { rows } = await pool.query(`
    SELECT
      p.id           AS payment_id,
      p.provider_reference,
      p.amount_cents,
      p.status,
      p.completed_at,
      ARRAY_AGG(o.id) FILTER (WHERE o.id IS NOT NULL) AS paid_order_ids
    FROM payments p
    LEFT JOIN orders o ON o.payment_id = p.id
    WHERE p.session_id = $1
      AND p.status = 'completed'
    GROUP BY p.id
    ORDER BY p.completed_at ASC
  `, [sessionId]);
  return rows;
}

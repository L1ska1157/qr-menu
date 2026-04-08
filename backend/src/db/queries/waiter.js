import { pool } from '../../config/db.js';

export async function createWaiterRequest(sessionId, tableId) {
  const { rows } = await pool.query(`
    INSERT INTO waiter_requests (session_id, table_id)
    VALUES ($1, $2)
    RETURNING id, session_id, table_id, requested_at, status
  `, [sessionId, tableId]);
  return rows[0];
}

export async function getLastWaiterRequest(sessionId) {
  const { rows } = await pool.query(`
    SELECT requested_at
      FROM waiter_requests
     WHERE session_id = $1
     ORDER BY requested_at DESC
     LIMIT 1
  `, [sessionId]);
  return rows[0] ?? null;
}

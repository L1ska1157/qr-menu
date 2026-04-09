import { pool } from '../../config/db.js';

export async function getActiveSession(tableId) {
  const { rows } = await pool.query(
    `SELECT id, table_id, status
       FROM table_sessions
      WHERE table_id = $1
        AND status = 'active'
      LIMIT 1`,
    [tableId]
  );
  return rows[0] ?? null;
}

export async function createSession(tableId) {
  const { rows } = await pool.query(
    `INSERT INTO table_sessions (table_id)
     VALUES ($1)
     RETURNING id, table_id, opened_at, status`,
    [tableId]
  );
  return rows[0];
}

export async function closeSession(sessionId) {
  await pool.query(
    `UPDATE table_sessions
        SET status = 'closed', closed_at = now()
      WHERE id = $1`,
    [sessionId]
  );
}


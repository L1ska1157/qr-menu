import { pool } from '../config/db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function validateSession(req, res, next) {
  const { session_id } = req.query;

  if (!session_id || !UUID_RE.test(session_id)) {
    return next({ code: 'INVALID_SESSION_ID', message: 'session_id must be a valid UUID' });
  }

  const { rows } = await pool.query(
    'SELECT id, table_id, status FROM table_sessions WHERE id = $1',
    [session_id]
  );

  if (!rows.length) {
    return next({ code: 'SESSION_NOT_FOUND', message: 'Session not found' });
  }

  if (rows[0].status === 'closed') {
    return next({ code: 'SESSION_CLOSED', message: 'This session has been closed' });
  }

  req.session = rows[0];
  next();
}

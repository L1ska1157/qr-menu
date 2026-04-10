import { pool } from '../config/db.js';

const { rowCount } = await pool.query(
  "UPDATE table_sessions SET status = 'closed', closed_at = now() WHERE status = 'active'"
);

console.log(`${rowCount} session(s) closed.`);
await pool.end();

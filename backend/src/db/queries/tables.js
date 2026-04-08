import { pool } from '../../config/db.js';

export async function getTableById(id) {
  const { rows } = await pool.query(
    'SELECT id, table_number FROM tables WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

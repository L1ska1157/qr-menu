import { pool } from '../../config/db.js';

export async function getTableByNumber(tableNumber) {
  const { rows } = await pool.query(
    'SELECT id, table_number FROM tables WHERE table_number = $1',
    [tableNumber]
  );
  return rows[0] ?? null;
}

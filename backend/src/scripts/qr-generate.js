import { APP_BASE_URL } from '../config/env.js';
import { pool } from '../config/db.js';

const { rows: tables } = await pool.query(
  'SELECT id, table_number FROM tables ORDER BY table_number'
);

if (!tables.length) {
  console.log('No tables found. Run db:seed first.');
} else {
  console.log(`QR links for all tables (${tables.length} total):\n`);
  for (const table of tables) {
    console.log(`Table ${table.table_number}: ${APP_BASE_URL}/?table_id=${table.id}`);
  }
}

await pool.end();

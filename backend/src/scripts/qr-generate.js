import { APP_BASE_URL } from '../config/env.js';
import { getTableByNumber } from '../db/queries/qr.js';
import { pool } from '../config/db.js';

const args = process.argv.slice(2);
const tableFlag = args.indexOf('--table');
if (tableFlag === -1 || !args[tableFlag + 1]) {
  console.error('Usage: npm run qr:generate -- --table <number>');
  process.exit(1);
}

const tableNumber = parseInt(args[tableFlag + 1], 10);
const table = await getTableByNumber(tableNumber);

if (!table) {
  console.error(`Table ${tableNumber} not found. Run db:seed first.`);
  await pool.end();
  process.exit(1);
}

const url = `${APP_BASE_URL}/?table_id=${table.id}`;
console.log(`QR URL for table ${tableNumber}: ${url}`);
await pool.end();

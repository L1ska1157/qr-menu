import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dir, 'migrations');

const files = (await readdir(migrationsDir))
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  console.log(`Running migration: ${file}`);
  await pool.query(sql);
}

console.log('Migrations complete');
await pool.end();

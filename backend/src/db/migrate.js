import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dir, 'migrations');

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const { rows: applied } = await pool.query('SELECT filename FROM schema_migrations');
const appliedSet = new Set(applied.map(r => r.filename));

const files = (await readdir(migrationsDir))
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`Skipping migration (already applied): ${file}`);
    continue;
  }

  const sql = await readFile(join(migrationsDir, file), 'utf8');
  console.log(`Running migration: ${file}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Migration failed: ${file}`);
    throw err;
  } finally {
    client.release();
  }
}

console.log('Migrations complete');
await pool.end();

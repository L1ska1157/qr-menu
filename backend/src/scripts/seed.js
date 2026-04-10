import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(__dir, '../db/seed.sql'), 'utf8');

await pool.query(sql);
console.log('Seeded successfully.');
await pool.end();

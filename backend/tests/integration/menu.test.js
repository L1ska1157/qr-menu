/**
 * Integration tests for GET /api/menu
 * Requires: running PostgreSQL with migrations + seed applied
 * Run: npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { createSession } from '../../src/db/queries/sessions.js';

let sessionId;
let tableId;

beforeAll(async () => {
  const { rows } = await pool.query('SELECT id FROM tables LIMIT 1');
  tableId = rows[0].id;
  const session = await createSession(tableId);
  sessionId = session.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM table_sessions WHERE id = $1', [sessionId]);
  await pool.end();
});

describe('GET /api/menu', () => {
  it('returns 200 with categories array', async () => {
    const res = await request(app).get(`/api/menu?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it('each category has items array', async () => {
    const res = await request(app).get(`/api/menu?session_id=${sessionId}`);
    for (const cat of res.body.categories) {
      expect(Array.isArray(cat.items)).toBe(true);
      expect(cat.items.length).toBeGreaterThan(0);
    }
  });

  it('returns 400 for missing session_id', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_SESSION_ID');
  });

  it('returns 404 for unknown session_id', async () => {
    const res = await request(app).get('/api/menu?session_id=00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

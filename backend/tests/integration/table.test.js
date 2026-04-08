import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';

let tableId;
let sessionId;

beforeAll(async () => {
  await pool.query('INSERT INTO tables (table_number) VALUES (999) ON CONFLICT DO NOTHING');
  const { rows } = await pool.query('SELECT id FROM tables LIMIT 1');
  tableId = rows[0].id;
});

afterAll(async () => {
  if (sessionId) await pool.query('DELETE FROM table_sessions WHERE id = $1', [sessionId]);
  await pool.end();
});

describe('Table API', () => {
  it('GET /api/table/:id/status returns free for table with no session', async () => {
    const res = await request(app).get(`/api/table/${tableId}/status`);
    expect(res.status).toBe(200);
    expect(['free', 'taken']).toContain(res.body.status);
    expect(res.body.restaurant_name).toBeDefined();
    expect(res.body.table_number).toBeDefined();
  });

  it('POST /api/table/:id/session creates session', async () => {
    // First ensure no active session
    await pool.query(`UPDATE table_sessions SET status='closed', closed_at=now() WHERE table_id=$1 AND status IN ('active','paid')`, [tableId]);
    const res = await request(app).post(`/api/table/${tableId}/session`);
    expect(res.status).toBe(201);
    sessionId = res.body.session_id;
    expect(sessionId).toBeDefined();
  });

  it('second POST returns 409 SESSION_ALREADY_ACTIVE', async () => {
    const res = await request(app).post(`/api/table/${tableId}/session`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SESSION_ALREADY_ACTIVE');
  });

  it('GET returns taken when session exists', async () => {
    const res = await request(app).get(`/api/table/${tableId}/status`);
    expect(res.body.status).toBe('taken');
    expect(res.body.session_id).toBe(sessionId);
  });

  it('returns 404 for unknown table id', async () => {
    const res = await request(app).get('/api/table/00000000-0000-0000-0000-000000000000/status');
    expect(res.status).toBe(404);
  });
});

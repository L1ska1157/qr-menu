import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { createSession } from '../../src/db/queries/sessions.js';

let sessionId;

beforeAll(async () => {
  const { rows: tables } = await pool.query('SELECT id FROM tables LIMIT 1');
  const session = await createSession(tables[0].id);
  sessionId = session.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM waiter_requests WHERE session_id = $1', [sessionId]);
  await pool.query('DELETE FROM table_sessions WHERE id = $1', [sessionId]);
  await pool.end();
});

describe('Waiter API', () => {
  it('GET /api/waiter/status returns inactive initially', async () => {
    const res = await request(app).get(`/api/waiter/status?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.cooldown_active).toBe(false);
    expect(res.body.cooldown_remaining_seconds).toBe(0);
  });

  it('POST /api/waiter/call creates request', async () => {
    const res = await request(app).post(`/api/waiter/call?session_id=${sessionId}`);
    expect(res.status).toBe(201);
    expect(res.body.request_id).toBeDefined();
  });

  it('second call within cooldown returns 429', async () => {
    const res = await request(app).post(`/api/waiter/call?session_id=${sessionId}`);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('COOLDOWN_ACTIVE');
  });

  it('GET /api/waiter/status shows active cooldown', async () => {
    const res = await request(app).get(`/api/waiter/status?session_id=${sessionId}`);
    expect(res.body.cooldown_active).toBe(true);
    expect(res.body.cooldown_remaining_seconds).toBeGreaterThan(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { createSession } from '../../src/db/queries/sessions.js';

let sessionId, menuItemId;

beforeAll(async () => {
  const { rows: tables } = await pool.query('SELECT id FROM tables LIMIT 1');
  const session = await createSession(tables[0].id);
  sessionId = session.id;
  const { rows: items } = await pool.query('SELECT id FROM menu_items WHERE is_available = true LIMIT 1');
  menuItemId = items[0].id;
});

afterAll(async () => {
  await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
  await pool.query('DELETE FROM table_sessions WHERE id = $1', [sessionId]);
  await pool.end();
});

describe('Cart API', () => {
  it('GET /api/cart returns empty cart initially', async () => {
    const res = await request(app).get(`/api/cart?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('POST /api/cart/items adds item', async () => {
    const res = await request(app)
      .post(`/api/cart/items?session_id=${sessionId}`)
      .send({ menu_item_id: menuItemId, quantity: 2 });
    expect(res.status).toBe(201);
  });

  it('GET /api/cart returns added item', async () => {
    const res = await request(app).get(`/api/cart?session_id=${sessionId}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(2);
  });

  it('PATCH /api/cart/items/:id updates quantity', async () => {
    const res = await request(app)
      .patch(`/api/cart/items/${menuItemId}?session_id=${sessionId}`)
      .send({ quantity: 5 });
    expect(res.status).toBe(200);
    const cart = await request(app).get(`/api/cart?session_id=${sessionId}`);
    expect(cart.body.items[0].quantity).toBe(5);
  });

  it('DELETE /api/cart/items/:id removes item', async () => {
    const res = await request(app).delete(`/api/cart/items/${menuItemId}?session_id=${sessionId}`);
    expect(res.status).toBe(204);
    const cart = await request(app).get(`/api/cart?session_id=${sessionId}`);
    expect(cart.body.items).toHaveLength(0);
  });
});

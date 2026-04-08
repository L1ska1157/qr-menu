import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { createSession } from '../../src/db/queries/sessions.js';
import { upsertCartItem } from '../../src/db/queries/cart.js';

let sessionId, menuItemId;

beforeAll(async () => {
  const { rows: tables } = await pool.query('SELECT id FROM tables LIMIT 1');
  const session = await createSession(tables[0].id);
  sessionId = session.id;
  const { rows: items } = await pool.query('SELECT id FROM menu_items WHERE is_available = true LIMIT 1');
  menuItemId = items[0].id;
  await upsertCartItem(sessionId, menuItemId, 2);
});

afterAll(async () => {
  await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE session_id = $1)', [sessionId]);
  await pool.query('DELETE FROM orders WHERE session_id = $1', [sessionId]);
  await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
  await pool.query('DELETE FROM table_sessions WHERE id = $1', [sessionId]);
  await pool.end();
});

describe('Orders API', () => {
  it('POST /api/orders rejects empty items', async () => {
    const res = await request(app).post(`/api/orders?session_id=${sessionId}`).send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EMPTY_ORDER');
  });

  it('POST /api/orders creates order and clears cart', async () => {
    const res = await request(app)
      .post(`/api/orders?session_id=${sessionId}`)
      .send({ items: [{ menu_item_id: menuItemId, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.order_id).toBeDefined();
    expect(res.body.total_cents).toBeGreaterThan(0);

    const cart = await request(app).get(`/api/cart?session_id=${sessionId}`);
    expect(cart.body.items).toHaveLength(0);
  });

  it('GET /api/orders returns placed order', async () => {
    const res = await request(app).get(`/api/orders?session_id=${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].is_paid).toBe(false);
    expect(res.body.unpaid_total_cents).toBeGreaterThan(0);
  });
});

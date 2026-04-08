import { pool } from '../../config/db.js';

export async function createOrder(sessionId, tableId, items, totalCents) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(`
      INSERT INTO orders (session_id, table_id, total_cents)
      VALUES ($1, $2, $3)
      RETURNING id, session_id, table_id, total_cents, placed_at
    `, [sessionId, tableId, totalCents]);

    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price_cents)
        VALUES ($1, $2, $3, $4)
      `, [order.id, item.menuItemId, item.quantity, item.unitPrice]);
    }

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrders(sessionId) {
  const { rows } = await pool.query(`
    SELECT
      o.id          AS order_id,
      o.placed_at,
      o.total_cents,
      o.is_paid,
      oi.menu_item_id,
      mi.name       AS item_name,
      oi.quantity,
      oi.unit_price_cents,
      oi.line_total_cents
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items  mi ON mi.id = oi.menu_item_id
    WHERE o.session_id = $1
    ORDER BY o.placed_at ASC, oi.menu_item_id
  `, [sessionId]);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.order_id)) {
      map.set(row.order_id, {
        order_id: row.order_id,
        placed_at: row.placed_at,
        total_cents: row.total_cents,
        is_paid: row.is_paid,
        items: [],
      });
    }
    map.get(row.order_id).items.push({
      menu_item_id: row.menu_item_id,
      name: row.item_name,
      quantity: row.quantity,
      unit_price_cents: row.unit_price_cents,
      line_total_cents: row.line_total_cents,
    });
  }
  return Array.from(map.values());
}

export async function markOrdersPaid(orderIds, paymentId) {
  await pool.query(`
    UPDATE orders
       SET is_paid = true, payment_id = $1
     WHERE id = ANY($2::uuid[])
  `, [paymentId, orderIds]);
}

import { Router } from 'express';
import { pool } from '../config/db.js';
import validateSession from '../middleware/validateSession.js';
import { ar } from '../middleware/asyncRoute.js';
import { createOrder, getOrders } from '../db/queries/orders.js';
import { clearCart } from '../db/queries/cart.js';
import { publish } from '../services/cartEventBus.js';

const router = Router();

router.post('/api/orders', validateSession, ar(async (req, res, next) => {
  const { items } = req.body;

  if (!items || !items.length) {
    return next({ code: 'EMPTY_ORDER', message: 'Order must contain at least one item' });
  }

  for (const item of items) {
    if (!item.menu_item_id || item.quantity < 1) {
      return next({ code: 'INVALID_QUANTITY', message: 'Each item needs menu_item_id and quantity >= 1' });
    }
  }

  // Fetch current prices — only available items are returned
  const ids = items.map(i => i.menu_item_id);
  const { rows: priceRows } = await pool.query(
    `SELECT id, price_cents FROM menu_items WHERE id = ANY($1::uuid[]) AND is_available = true`,
    [ids]
  );
  const priceMap = Object.fromEntries(priceRows.map(r => [r.id, r.price_cents]));

  const unavailableIds = ids.filter(id => !priceMap[id]);
  if (unavailableIds.length) {
    return next({ code: 'ITEM_UNAVAILABLE', message: 'Some items are no longer available' });
  }

  const enriched = items.map(item => ({
    menuItemId: item.menu_item_id,
    quantity: item.quantity,
    unitPrice: priceMap[item.menu_item_id],
  }));

  const totalCents = enriched.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const order = await createOrder(req.session.id, req.session.table_id, enriched, totalCents);
  await clearCart(req.session.id);
  publish(req.session.id, 'cart_updated', { items: [] });

  // Return full order detail
  const orders = await getOrders(req.session.id);
  const created = orders.find(o => o.order_id === order.id);

  res.status(201).json({
    order_id: order.id,
    session_id: order.session_id,
    total_cents: order.total_cents,
    placed_at: order.placed_at,
    items: created?.items ?? [],
  });
}));

router.get('/api/orders', validateSession, ar(async (req, res) => {
  const orders = await getOrders(req.session.id);
  const unpaid_total_cents = orders.filter(o => !o.is_paid).reduce((s, o) => s + o.total_cents, 0);
  res.json({ session_id: req.session.id, orders, unpaid_total_cents });
}));

export default router;

import { Router } from 'express';
import validateSession from '../middleware/validateSession.js';
import { getCart, upsertCartItem, removeCartItem } from '../db/queries/cart.js';
import { subscribe, unsubscribe, publish } from '../services/cartEventBus.js';

const router = Router();

router.get('/api/cart', validateSession, async (req, res) => {
  const items = await getCart(req.session.id);
  res.json({ items });
});

// SSE stream — pushes cart_updated whenever the cart for this session changes
router.get('/api/cart/events', validateSession, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  subscribe(req.session.id, res);

  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 30000);

  res.on('close', () => {
    clearInterval(keepalive);
    unsubscribe(req.session.id, res);
  });
});

router.post('/api/cart/items', validateSession, async (req, res, next) => {
  const { menu_item_id, quantity } = req.body;
  if (!menu_item_id || quantity < 1) {
    return next({ code: 'INVALID_QUANTITY', message: 'menu_item_id and quantity >= 1 required' });
  }
  await upsertCartItem(req.session.id, menu_item_id, quantity);
  const items = await getCart(req.session.id);
  publish(req.session.id, 'cart_updated', { items });
  res.status(201).end();
});

router.patch('/api/cart/items/:menuItemId', validateSession, async (req, res, next) => {
  const { quantity } = req.body;
  const { menuItemId } = req.params;
  if (!quantity || quantity < 1) {
    return next({ code: 'INVALID_QUANTITY', message: 'quantity >= 1 required' });
  }
  await upsertCartItem(req.session.id, menuItemId, quantity);
  const items = await getCart(req.session.id);
  publish(req.session.id, 'cart_updated', { items });
  res.status(200).end();
});

router.delete('/api/cart/items/:menuItemId', validateSession, async (req, res) => {
  await removeCartItem(req.session.id, req.params.menuItemId);
  const items = await getCart(req.session.id);
  publish(req.session.id, 'cart_updated', { items });
  res.status(204).end();
});

export default router;

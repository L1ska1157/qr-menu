import { Router } from 'express';
import validateSession from '../middleware/validateSession.js';
import { getCart, upsertCartItem, removeCartItem } from '../db/queries/cart.js';

const router = Router();

router.get('/api/cart', validateSession, async (req, res) => {
  const items = await getCart(req.session.id);
  res.json({ items });
});

router.post('/api/cart/items', validateSession, async (req, res, next) => {
  const { menu_item_id, quantity } = req.body;
  if (!menu_item_id || quantity < 1) {
    return next({ code: 'INVALID_QUANTITY', message: 'menu_item_id and quantity >= 1 required' });
  }
  await upsertCartItem(req.session.id, menu_item_id, quantity);
  res.status(201).end();
});

router.patch('/api/cart/items/:menuItemId', validateSession, async (req, res, next) => {
  const { quantity } = req.body;
  const { menuItemId } = req.params;
  if (!quantity || quantity < 1) {
    return next({ code: 'INVALID_QUANTITY', message: 'quantity >= 1 required' });
  }
  await upsertCartItem(req.session.id, menuItemId, quantity);
  res.status(200).end();
});

router.delete('/api/cart/items/:menuItemId', validateSession, async (req, res) => {
  await removeCartItem(req.session.id, req.params.menuItemId);
  res.status(204).end();
});

export default router;

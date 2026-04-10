import { Router } from 'express';
import validateSession from '../middleware/validateSession.js';
import { ar } from '../middleware/asyncRoute.js';
import { getMenu } from '../db/queries/menu.js';

const router = Router();

router.get('/api/menu', validateSession, ar(async (req, res) => {
  const categories = await getMenu();
  const visible = categories.filter(c => c.items.some(i => i.is_available));
  res.json({ categories: visible });
}));

export default router;

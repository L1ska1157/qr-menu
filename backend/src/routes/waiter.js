import { Router } from 'express';
import validateSession from '../middleware/validateSession.js';
import { createWaiterRequest } from '../db/queries/waiter.js';
import { getCooldownStatus } from '../services/waiterService.js';
import { getTableById } from '../db/queries/tables.js';

const router = Router();

router.post('/api/waiter/call', validateSession, async (req, res, next) => {
  const status = await getCooldownStatus(req.session.id);
  if (status.cooldown_active) {
    return next({
      code: 'COOLDOWN_ACTIVE',
      message: `Please wait ${status.cooldown_remaining_seconds} more seconds before calling again`,
      cooldown_remaining_seconds: status.cooldown_remaining_seconds,
    });
  }

  const table = await getTableById(req.session.table_id);
  const request = await createWaiterRequest(req.session.id, req.session.table_id);
  const cooldownUntil = new Date(new Date(request.requested_at).getTime() + 120_000);

  res.status(201).json({
    request_id: request.id,
    session_id: request.session_id,
    table_number: table?.table_number,
    requested_at: request.requested_at,
    cooldown_until: cooldownUntil,
  });
});

router.get('/api/waiter/status', validateSession, async (req, res) => {
  const status = await getCooldownStatus(req.session.id);
  res.json({ session_id: req.session.id, ...status });
});

export default router;

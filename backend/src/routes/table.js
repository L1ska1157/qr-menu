import { Router } from 'express';
import { RESTAURANT_NAME } from '../config/env.js';
import { ar } from '../middleware/asyncRoute.js';
import { getTableById } from '../db/queries/tables.js';
import { getActiveSession, createSession } from '../db/queries/sessions.js';
import { requireUuidParam } from '../middleware/validateUuid.js';

const router = Router();

router.get('/api/table/:tableId/status', requireUuidParam('tableId', 'INVALID_TABLE_ID'), ar(async (req, res, next) => {
  const table = await getTableById(req.params.tableId);
  if (!table) return next({ code: 'TABLE_NOT_FOUND', message: 'Table not found' });

  const session = await getActiveSession(table.id);
  res.json({
    status: session ? 'taken' : 'free',
    session_id: session?.id ?? null,
    table_number: table.table_number,
    restaurant_name: RESTAURANT_NAME,
  });
}));

router.post('/api/table/:tableId/session', requireUuidParam('tableId', 'INVALID_TABLE_ID'), ar(async (req, res, next) => {
  const table = await getTableById(req.params.tableId);
  if (!table) return next({ code: 'TABLE_NOT_FOUND', message: 'Table not found' });

  const existing = await getActiveSession(table.id);
  if (existing) {
    return next({ code: 'SESSION_ALREADY_ACTIVE', message: 'A session is already active for this table', session_id: existing.id });
  }

  const session = await createSession(table.id);
  res.status(201).json({
    session_id: session.id,
    table_id: table.id,
    table_number: table.table_number,
  });
}));

export default router;

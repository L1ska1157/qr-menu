const STATUS_MAP = {
  INVALID_SESSION_ID:      400,
  INVALID_TABLE_ID:        400,
  EMPTY_ORDER:             400,
  ITEM_UNAVAILABLE:        400,
  INVALID_QUANTITY:        400,
  INVALID_ORDER_IDS:       400,
  NO_UNPAID_ORDERS:        400,
  SESSION_NOT_FOUND:       404,
  TABLE_NOT_FOUND:         404,
  PAYMENT_NOT_FOUND:       404,
  SESSION_CLOSED:          409,
  SESSION_ALREADY_ACTIVE:  409,
  PAYMENT_IN_PROGRESS:     409,
  COOLDOWN_ACTIVE:         429,
};

export default function errorHandler(err, req, res, next) {
  console.error(err);
  const status = STATUS_MAP[err.code] ?? 500;
  res.status(status).json({ error: err.code ?? 'INTERNAL_ERROR', message: err.message ?? 'An unexpected error occurred' });
}

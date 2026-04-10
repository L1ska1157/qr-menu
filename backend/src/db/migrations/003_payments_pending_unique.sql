-- Prevent duplicate pending payments for the same session at the DB level.
-- This makes the race condition in payment initiation impossible:
-- two concurrent requests both passing the application-level check
-- will still get a unique violation on INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS payments_session_pending_unique
  ON payments(session_id)
  WHERE status = 'pending';

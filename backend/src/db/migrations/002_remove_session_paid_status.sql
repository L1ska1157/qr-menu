-- Remove 'paid' from table_sessions.status

-- Recreate partial index without 'paid'
DROP INDEX IF EXISTS idx_table_sessions_table_id;
CREATE INDEX idx_table_sessions_table_id
  ON table_sessions(table_id) WHERE status = 'active';

-- Replace CHECK constraint
ALTER TABLE table_sessions DROP CONSTRAINT IF EXISTS table_sessions_status_check;
ALTER TABLE table_sessions ADD CONSTRAINT table_sessions_status_check
  CHECK (status IN ('active', 'closed'));

-- Reset any existing 'paid' sessions to 'active'
UPDATE table_sessions SET status = 'active' WHERE status = 'paid';

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number smallint    NOT NULL UNIQUE
);

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id            uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text     NOT NULL,
  display_order smallint NOT NULL
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id               uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid     NOT NULL REFERENCES menu_categories(id),
  name             text     NOT NULL,
  description      text     NOT NULL,
  ingredients      text[]   NOT NULL,
  prep_time_minutes smallint NOT NULL CHECK (prep_time_minutes > 0),
  price_cents      integer  NOT NULL CHECK (price_cents > 0),
  is_available     boolean  NOT NULL DEFAULT true,
  display_order    smallint NOT NULL
);

-- Table sessions
CREATE TABLE IF NOT EXISTS table_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id   uuid        NOT NULL REFERENCES tables(id),
  opened_at  timestamptz NOT NULL DEFAULT now(),
  closed_at  timestamptz,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'closed'))
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES table_sessions(id),
  menu_item_id uuid        NOT NULL REFERENCES menu_items(id),
  quantity     smallint    NOT NULL CHECK (quantity > 0),
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, menu_item_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES table_sessions(id),
  table_id    uuid        NOT NULL REFERENCES tables(id),
  status      text        NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'acknowledged')),
  is_paid     boolean     NOT NULL DEFAULT false,
  payment_id  uuid,
  total_cents integer     NOT NULL CHECK (total_cents >= 0),
  placed_at   timestamptz NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id               uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid     NOT NULL REFERENCES orders(id),
  menu_item_id     uuid     NOT NULL REFERENCES menu_items(id),
  quantity         smallint NOT NULL CHECK (quantity > 0),
  unit_price_cents integer  NOT NULL CHECK (unit_price_cents > 0),
  line_total_cents integer  GENERATED ALWAYS AS (quantity * unit_price_cents) STORED
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid        NOT NULL REFERENCES table_sessions(id),
  amount_cents       integer     NOT NULL CHECK (amount_cents > 0),
  provider_reference text,
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  initiated_at       timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

-- Add FK from orders to payments after payments table exists
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payments(id)
  NOT VALID;

-- Waiter requests
CREATE TABLE IF NOT EXISTS waiter_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES table_sessions(id),
  table_id     uuid        NOT NULL REFERENCES tables(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id
  ON table_sessions(table_id) WHERE status IN ('active', 'paid');

CREATE INDEX IF NOT EXISTS idx_orders_session_id
  ON orders(session_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON menu_items(category_id, display_order);

CREATE INDEX IF NOT EXISTS idx_waiter_requests_session_recent
  ON waiter_requests(session_id, requested_at DESC);

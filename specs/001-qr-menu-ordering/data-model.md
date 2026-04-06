# Data Model: QR Code Restaurant Menu & Ordering System

**Feature**: 001-qr-menu-ordering
**Date**: 2026-04-06
**Storage**: PostgreSQL 15

---

## Entities & Schema

### `tables`

Represents a physical restaurant table. Permanent record — one row per table. The QR code encodes the table `id` directly; no token is needed.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | Permanent table identifier; encoded in the QR code URL |
| `table_number` | `smallint` | NOT NULL, UNIQUE | Human-readable label (e.g., 5) |

---

### `menu_categories`

Top-level groupings displayed in the category navigation bar.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `name` | `text` | NOT NULL | e.g., "Starters", "Mains", "Desserts" |
| `display_order` | `smallint` | NOT NULL | Controls order in navigation bar |

---

### `menu_items`

Individual dishes or drinks available for ordering.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `category_id` | `uuid` | FK → menu_categories.id, NOT NULL | |
| `name` | `text` | NOT NULL | |
| `description` | `text` | NOT NULL | |
| `ingredients` | `text[]` | NOT NULL | Array of ingredient strings |
| `prep_time_minutes` | `smallint` | NOT NULL, CHECK > 0 | Estimated preparation time |
| `price_cents` | `integer` | NOT NULL, CHECK > 0 | Price in smallest currency unit (avoids float errors) |
| `is_available` | `boolean` | NOT NULL, DEFAULT true | Unavailable items remain visible but cannot be added to cart |
| `display_order` | `smallint` | NOT NULL | Order within category |

---

### `table_sessions`

Tracks an active dining session for a table. Created when a diner confirms entry on the scan landing page. Closed by the waiter after cleaning the table. Only one non-closed session per table is allowed at a time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | Session identifier |
| `table_id` | `uuid` | FK → tables.id, NOT NULL | |
| `opened_at` | `timestamptz` | NOT NULL, DEFAULT now() | When the session was created |
| `closed_at` | `timestamptz` | NULLABLE | NULL = session active or paid; set by waiter when cleaning the table |
| `status` | `text` | NOT NULL, DEFAULT 'active' | `active` \| `paid` \| `closed` |

**State transitions**: `active` → `paid` (after all orders fully paid) → `closed` (waiter closes after cleaning). A new session for a table can only be created once the previous one is `closed`.

**Constraint**: Only one session per table with `status IN ('active', 'paid')` at any time — enforced at application level before insert.

---

### `cart_items`

Server-side cart shared by all devices at the same table. One active cart per session — cleared automatically when an order is submitted. Because the cart is server-side, any diner at the table sees the same items, and reloading or rescanning the QR code restores the current cart.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `session_id` | `uuid` | FK → table_sessions.id, NOT NULL | |
| `menu_item_id` | `uuid` | FK → menu_items.id, NOT NULL | |
| `quantity` | `smallint` | NOT NULL, CHECK > 0 | Minimum 1; rows are deleted (not set to 0) when quantity reaches zero |
| `added_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Constraint**: `UNIQUE (session_id, menu_item_id)` — one row per item per session; quantity is updated in place.
**On order submit**: all `cart_items` rows for the session are deleted after order is created.
**Availability display**: on every page load the frontend joins `cart_items` with `menu_items.is_available`; items where `is_available = false` are rendered grey in the cart and blocked from submission.

---

### `orders`

One order per cart submission. A session may have multiple orders (multi-round). Each order is independently recorded.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `session_id` | `uuid` | FK → table_sessions.id, NOT NULL | Links to the active session |
| `table_id` | `uuid` | FK → tables.id, NOT NULL | Denormalised for fast lookup |
| `status` | `text` | NOT NULL, DEFAULT 'placed' | `placed` \| `acknowledged` (for future staff interface) |
| `is_paid` | `boolean` | NOT NULL, DEFAULT false | Set to `true` when a completed payment covers this order; used to filter the cart view |
| `payment_id` | `uuid` | FK → payments.id, NULLABLE | Set when the order is paid; links the order to the payment that covered it |
| `total_cents` | `integer` | NOT NULL, CHECK ≥ 0 | Sum of all order line totals |
| `placed_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

---

### `order_items`

Line items within an order. Prices are captured at order time (not live menu price) to prevent post-order price changes affecting historical records.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `order_id` | `uuid` | FK → orders.id, NOT NULL | |
| `menu_item_id` | `uuid` | FK → menu_items.id, NOT NULL | |
| `quantity` | `smallint` | NOT NULL, CHECK > 0 | |
| `unit_price_cents` | `integer` | NOT NULL, CHECK > 0 | Price at time of order (snapshot) |
| `line_total_cents` | `integer` | GENERATED ALWAYS AS (quantity * unit_price_cents) | |

---

### `payments`

Records payment attempts against a session. Supports both immediate (per-order) and deferred (end-of-session) modes.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `session_id` | `uuid` | FK → table_sessions.id, NOT NULL | |
| `amount_cents` | `integer` | NOT NULL, CHECK > 0 | Amount submitted to provider (sum of covered orders) |
| `provider_reference` | `text` | NULLABLE | External provider's transaction/checkout ID |
| `status` | `text` | NOT NULL, DEFAULT 'pending' | `pending` \| `completed` \| `failed` \| `cancelled` |
| `initiated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `completed_at` | `timestamptz` | NULLABLE | Set on provider callback |

**Note**: Multiple `payments` rows per session are valid (partial payments in immediate mode, retries on failure).

---

### `waiter_requests`

Tracks "Call Waiter" submissions. Cooldown is enforced at application level by checking the most recent request per session.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `session_id` | `uuid` | FK → table_sessions.id, NOT NULL | |
| `table_id` | `uuid` | FK → tables.id, NOT NULL | Denormalised for fast lookup |
| `requested_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `status` | `text` | NOT NULL, DEFAULT 'pending' | `pending` \| `acknowledged` (for future staff interface) |

**Cooldown rule**: Application rejects new requests if `requested_at` of most recent row for `session_id` is within the last 120 seconds.

---

## Key Relationships

```text
tables
  └─< table_sessions          (one table, many sessions over time)
        ├─< cart_items        (one active cart per session, shared across all devices at the table)
        ├─< orders            (one session, many order rounds)
        │     ├─< order_items (one order, many line items)
        │     └─> payments    (order links to the payment that covered it, once paid)
        ├─< payments          (one session, one or more payments)
        └─< waiter_requests   (one session, zero or more requests)

menu_categories
  └─< menu_items              (one category, many items)

order_items >─ menu_items     (snapshot price at order time)
```

---

## Validation Rules

- A cart submission is rejected if any `menu_item_id` in the payload has `is_available = false`
- `order_items.unit_price_cents` must match `menu_items.price_cents` at submission time (server-validated)
- `payments.amount_cents` for a deferred payment must equal the sum of all unpaid `orders.total_cents` for the session
- A new `waiter_requests` row is rejected if a row for the same `session_id` exists with `requested_at > now() - interval '2 minutes'`
- A new `orders` row is rejected if `table_sessions.status = 'closed'`

---

## Indexes (Performance)

```sql
-- Fast session lookup by table (most common query path)
CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id) WHERE status IN ('active', 'paid');

-- Fast order history for bill display
CREATE INDEX idx_orders_session_id ON orders(session_id);

-- Fast menu render (category + display order, all items)
CREATE INDEX idx_menu_items_category ON menu_items(category_id, display_order);

-- Cooldown check
CREATE INDEX idx_waiter_requests_session_recent ON waiter_requests(session_id, requested_at DESC);
```

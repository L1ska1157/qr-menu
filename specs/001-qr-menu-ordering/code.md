# Code Architecture: QR Code Restaurant Menu & Ordering System

**Feature**: 001-qr-menu-ordering
**Date**: 2026-04-07
**Principles**: Lean dependencies, raw SQL (no ORM), Alpine.js (no build), server-side state — minimize code length by eliminating abstractions, avoiding patterns for hypothetical needs, and leveraging framework defaults

---

## Project Code Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.js               # Load & validate environment vars
│   │   └── db.js                # PostgreSQL pool singleton
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 001_initial.sql  # All 9 tables + indexes
│   │   ├── seed.sql             # Sample data (10 tables, 4 categories, 12 items)
│   │   ├── migrate.js           # Run .sql files in order
│   │   └── queries/
│   │       ├── tables.js        # getTableById
│   │       ├── sessions.js      # CRUD + active/paid session lookups
│   │       ├── menu.js          # Full menu tree with categories & items
│   │       ├── cart.js          # Cart item CRUD + clear
│   │       ├── orders.js        # Order + order_items creation, queries
│   │       ├── payments.js      # Payment creation, status updates
│   │       └── waiter.js        # Request creation, last request lookup
│   ├── middleware/
│   │   ├── validateSession.js   # Extract session_id param, validate, attach req.session
│   │   └── errorHandler.js      # JSON error responses with codes + status mapping
│   ├── services/
│   │   ├── availabilityService.js   # Check unavailable items in cart
│   │   ├── paymentService.js        # External provider checkout, HMAC verify
│   │   └── waiterService.js         # Cooldown calculation (120s rule)
│   ├── routes/
│   │   ├── menu.js              # GET /api/menu (all items, filtered categories)
│   │   ├── cart.js              # GET/POST/PATCH/DELETE cart endpoints
│   │   ├── orders.js            # POST/GET orders (with availability check, total calc)
│   │   ├── payments.js          # POST initiate, POST webhook, GET status
│   │   ├── waiter.js            # POST call, GET status (cooldown)
│   │   └── table.js             # GET status, POST session (session init)
│   ├── app.js                   # Express setup, middleware stack, route mounts
│   └── server.js                # PORT listener
├── tests/
│   ├── integration/
│   │   ├── menu.test.js
│   │   ├── cart.test.js
│   │   ├── orders.test.js
│   │   ├── payments.test.js
│   │   ├── waiter.test.js
│   │   └── table.test.js
│   └── unit/
│       ├── availabilityService.test.js
│       ├── paymentService.test.js
│       └── waiterService.test.js
└── package.json

frontend/
├── public/
│   ├── index.html               # Scan landing page (table taken/free)
│   ├── menu.html                # Full menu + cart badge + waiter button
│   ├── cart.html                # Cart review + order submit
│   ├── orders.html              # All orders (paid + unpaid) + payment UI
│   └── error.html               # Static error page (unknown table)
├── js/
│   ├── landing.js               # Table status check, session init, sessionStorage
│   ├── menu.js                  # Menu fetch, item add/category scroll
│   ├── cart.js                  # Cart fetch, item quantity +/-, order submit
│   ├── orders.js                # Orders fetch, pay button logic, polling
│   └── waiter.js                # Call waiter, countdown timer, SVG animation
└── css/
    └── styles.css               # Mobile-first: grid, flexbox, SVG keyframes
```

---

## Backend Module Reference

### Configuration & Database

#### `config/env.js`

**Purpose**: Load and validate environment variables on startup.

**Exports**:
- `PORT` (number): Server listen port
- `DATABASE_URL` (string): PostgreSQL connection string
- `RESTAURANT_NAME` (string): Restaurant name for landing page
- `APP_BASE_URL` (string): Base URL for payment redirect URLs
- `PAYMENT_PROVIDER_URL` (string): External payment provider checkout endpoint
- `PAYMENT_PROVIDER_WEBHOOK_SECRET` (string): HMAC secret for webhook signature verification

**Behavior**: Reads from process.env; throws error if any required variable is missing. Process exits before server starts on validation failure.

#### `config/db.js`

**Exports**: `pool` — PostgreSQL connection pool singleton

**Behavior**: Creates and exports a `pg.Pool` instance configured with `DATABASE_URL`. All query modules use `pool.query(sql, params)` with parameterized placeholders ($1, $2, etc.).

#### `db/migrations/001_initial.sql`

**Purpose**: Schema initialization

**Contains**: 
- 9 `CREATE TABLE` statements (tables, menu_categories, menu_items, table_sessions, cart_items, orders, order_items, payments, waiter_requests)
- 4 indexes for common lookups
- All constraints: PK, FK, NOT NULL, CHECK, UNIQUE, DEFAULT, GENERATED ALWAYS columns
- No timestamps except for business logic (opened_at, placed_at, requested_at, etc.)

#### `db/seed.sql`

**Purpose**: Sample data for testing

**Contains**:
- 10 tables (table_number 1–10)
- 4 menu_categories (Starters, Mains, Desserts, Drinks)
- 12 menu_items spread across categories with realistic names, descriptions, ingredients arrays, prep times, prices

---

### Query Modules

#### `db/queries/tables.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `getTableById` | `id` (uuid) | Queries tables by id | Table row {id, table_number} or null if not found |

#### `db/queries/sessions.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `getActiveSession` | `tableId` (uuid) | Finds active or paid session for table (only one allowed per rule) | Session row {id, table_id, status} or null |
| `createSession` | `tableId` (uuid) | Inserts new session with opened_at=now(), status='active' | New session row {id, table_id, opened_at, status} |
| `closeSession` | `sessionId` (uuid) | Updates status='closed', closed_at=now() for waiter cleanup | void (row count) |

#### `db/queries/menu.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `getMenu` | none | Queries all categories with all items (both available and unavailable) | Array of categories [{id, name, display_order, items: [{id, name, description, ingredients[], prep_time_minutes, price_cents, is_available}]}] ordered by display_order |

#### `db/queries/cart.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `getCart` | `sessionId` (uuid) | Queries cart_items for session, joined with menu_items for availability flag | Array of cart items [{menu_item_id, quantity, name, price_cents, is_available}] |
| `upsertCartItem` | `sessionId` (uuid), `menuItemId` (uuid), `quantity` (int) | INSERT or UPDATE on CONFLICT (session_id, menu_item_id); quantity is upserted in place | void |
| `removeCartItem` | `sessionId` (uuid), `menuItemId` (uuid) | DELETE cart_items row for this session + item | void |
| `clearCart` | `sessionId` (uuid) | DELETE all cart_items rows for session (called after order submit) | void |

#### `db/queries/orders.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `createOrder` | `sessionId` (uuid), `tableId` (uuid), `items` (array of {menuItemId, unitPrice, quantity}), `totalCents` (int) | Creates a new order: (1) inserts order header with status='placed' and timestamp, (2) inserts all line items with prices captured at order time. Returns the new order ID so it can be referenced by payment or UI. | Order row {id, session_id, table_id, total_cents, placed_at} |
| `getOrders` | `sessionId` (uuid) | Fetches all orders for the session (both paid and unpaid), with their line items and item names. Orders are sorted by placement time (oldest first). Each order includes an is_paid flag to distinguish paid from unpaid. | Array of orders [{id, session_id, placed_at, total_cents, is_paid, items: [{menu_item_id, name, quantity, unit_price_cents, line_total_cents}]}] |
| `markOrdersPaid` | `orderIds` (array of uuids), `paymentId` (uuid) | Takes a list of order IDs and marks all of them as paid. Also links each order to the payment that covered it (stores paymentId in each order) | void |

#### `db/queries/payments.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `createPayment` | `sessionId` (uuid), `amountCents` (int) | Inserts payment row with status='pending', initiated_at=now() | Payment row {id, session_id, amount_cents, status, initiated_at} |
| `updatePaymentStatus` | `paymentId` (uuid), `status` (string: pending\|completed\|failed\|cancelled), `providerRef` (string, nullable), `completedAt` (timestamp, nullable) | Updates payment row: status, provider_reference, completed_at | void |
| `getSessionPayments` | `sessionId` (uuid) | Fetches all completed payments for the session, each with the list of order IDs they cover | Array of `{payment_id, provider_reference, amount_cents, status, completed_at, paid_order_ids[]}` |

#### `db/queries/waiter.js`

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `createWaiterRequest` | `sessionId` (uuid), `tableId` (uuid) | Inserts waiter_requests row with requested_at=now(), status='pending' | Request row {id, session_id, table_id, requested_at, status} |
| `getLastWaiterRequest` | `sessionId` (uuid) | Queries most recent waiter_requests row (by requested_at DESC) for session; used to calculate remaining cooldown | Request row {requested_at} or null |

---

### Middleware

#### `middleware/validateSession.js`

**Purpose**: Extract and validate session_id query param; used by routes that require a valid session.

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `validateSession` | `req` (Express request), `res` (Express response), `next` (Express next function) | Reads the `session_id` UUID from the request query string; rejects with 400 if it is missing or not a valid UUID; looks up the session in the database and rejects with 404 if it does not exist; rejects with 409 if the session is closed; on success, attaches the session object to the request so downstream route handlers can use it without re-querying | Calls `next()` with no argument on success (passing control to the route handler with `req.session` populated); calls `next(err)` with a structured error object on any validation or lookup failure |

#### `middleware/errorHandler.js`

**Purpose**: Centralized Express error handler for consistent JSON error responses.

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `errorHandler` | `err` (error object with code and message), `req` (Express request), `res` (Express response), `next` (Express next function) | Logs the error to the console for debugging; maps the error's code string to the appropriate HTTP status number (for example INVALID_SESSION_ID becomes 400, SESSION_NOT_FOUND becomes 404); sends a JSON body with the error code and a human-readable message | HTTP response with the mapped status code and JSON body `{error: code, message: description}` |

---

### Services (Business Logic)

#### `services/availabilityService.js`

**Purpose**: Check cart items for availability before order submission.

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `findUnavailableItems` | `sessionId` (uuid) | Fetches cart items joined with menu_items; filters for is_available=false | Array of unavailable menu_item_ids (empty if all available) |


#### `services/paymentService.js`

**Purpose**: External payment provider integration and webhook verification.

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `initiateCheckout` | `paymentId` (uuid), `orderIds` (array), `amountCents` (int), `sessionId` (uuid) | POSTs to PAYMENT_PROVIDER_URL with amount, metadata (paymentId), success_url (orders.html?payment=success), cancel_url (orders.html?payment=failed); parses response for checkout URL | Redirect URL (string) to provider checkout page |
| `verifyWebhookSignature` | `rawBody` (raw request body buffer), `sigHeader` (string from x-provider-signature) | Computes HMAC-SHA256 of rawBody using PAYMENT_PROVIDER_WEBHOOK_SECRET; compares with sigHeader | Boolean: true if signature valid, false otherwise |

#### `services/waiterService.js`

**Purpose**: Cooldown state calculation for "Call Waiter" button.

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `getCooldownStatus` | `sessionId` (uuid) | Fetches last waiter_requests.requested_at for session; calculates elapsed seconds; returns cooldown_active = (remaining > 0) and remaining_seconds | {cooldown_active: boolean, cooldown_remaining_seconds: int (0–120), last_request_at: timestamp or null} |

---

### Route Modules (Implementation Details)

**For API contracts, see `contracts/` directory** — routes/ implement the endpoints defined there.

#### `routes/menu.js`

**Exports**: Router mounting GET /api/menu

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `GET /api/menu handler` | `session_id` (uuid, from validated session via middleware) | Fetches the full menu then removes any categories where every item is unavailable, so guests never see an empty section | JSON: `[{id, name, display_order, items: [{id, name, description, ingredients[], prep_time_minutes, price_cents, is_available}]}]` |

#### `routes/cart.js`

**Exports**: Router mounting GET/POST/PATCH/DELETE /api/cart and /api/cart/items

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `GET /api/cart handler` | `session_id` (uuid, from validated session) | Fetches all items currently in the cart for this session, joined with their current availability status from the menu | JSON: `{items: [{menu_item_id, quantity, name, price_cents, is_available}]}` |
| `POST /api/cart/items handler` | `session_id` (uuid, from validated session), `menu_item_id` (uuid, request body), `quantity` (int, request body) | Adds a new item to the cart; if the item is already there, replaces its quantity with the new value — repeated calls are safe | HTTP 201, no body |
| `PATCH /api/cart/items/:menuItemId handler` | `session_id` (uuid, from validated session), `menuItemId` (uuid, URL path param), `quantity` (int, request body) | Replaces the stored quantity of a specific cart item with the new value provided | HTTP 200, no body |
| `DELETE /api/cart/items/:menuItemId handler` | `session_id` (uuid, from validated session), `menuItemId` (uuid, URL path param) | Removes a specific item from the cart entirely, regardless of its current quantity | HTTP 204, no body |

#### `routes/orders.js`

**Exports**: Router mounting POST/GET /api/orders

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `POST /api/orders handler` | `session_id` (uuid, from validated session), `items` (array of `{menu_item_id, quantity}`, request body) | Checks that every cart item is still available; if any are not, rejects with a list of the unavailable item IDs. If all clear, fetches current prices from the server, calculates the order total, creates the order, then clears the cart | JSON: `{order_id, total_cents}` on success; `{error: 'ITEM_UNAVAILABLE', unavailable_item_ids: [...]}` on failure |
| `GET /api/orders handler` | `session_id` (uuid, from validated session) | Fetches every order placed in this session (both paid and unpaid) with their line items, then sums the total still owed across unpaid orders | JSON: `{orders: [{id, placed_at, total_cents, is_paid, items: [{menu_item_id, name, quantity, unit_price_cents}]}], unpaid_total_cents}` |

#### `routes/payments.js`

**Exports**: Router mounting POST /api/payments/initiate, POST /webhooks/payment, GET /api/payments/status

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `POST /api/payments/initiate handler` | `session_id` (uuid, from validated session), `order_ids` (array of uuids, request body) | Validates that order IDs are non-empty; creates a payment record; contacts the external payment provider to open a checkout session; returns the URL the guest should be redirected to | JSON: `{redirect_url}` pointing to the provider's payment page |
| `POST /webhooks/payment handler` | `x-provider-signature` (string, request header), raw request body | Verifies the HMAC signature to confirm the request is from the payment provider; if invalid, rejects; if valid, updates the payment status, marks covered orders as paid, and closes the session if all orders are now settled | HTTP 200 if accepted; HTTP 401 if signature check fails |
| `GET /api/payments/status handler` | `session_id` (uuid, from validated session) | Checks the is_paid flag across all session orders to determine whether the full session balance has been paid off | JSON: `{status: 'completed' \| 'pending'}` |

#### `routes/waiter.js`

**Exports**: Router mounting POST /api/waiter/call and GET /api/waiter/status

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `POST /api/waiter/call handler` | `session_id` (uuid, from validated session) | Checks whether the 120-second cooldown is still active; if it is, rejects and returns the remaining seconds; otherwise records a new waiter request and starts the cooldown | HTTP 201 with `{requested_at}` on success; HTTP 429 with `{cooldown_remaining_seconds}` if on cooldown |
| `GET /api/waiter/status handler` | `session_id` (uuid, from validated session) | Looks up when the last waiter request was made and calculates how many cooldown seconds remain (zero if the button is ready) | JSON: `{cooldown_active, cooldown_remaining_seconds, last_request_at}` |

#### `routes/table.js`

**Exports**: Router mounting GET /api/table/:tableId/status and POST /api/table/:tableId/session

| Function | Arguments | Behavior | Returns |
|----------|-----------|----------|---------|
| `GET /api/table/:tableId/status handler` | `tableId` (uuid, URL path param) | Looks up the table by its ID; if not found returns 404; otherwise checks whether there is an active or paid session currently assigned to it | JSON: `{status: 'taken' \| 'free', session_id: uuid \| null, table_number: int, restaurant_name: string}` |
| `POST /api/table/:tableId/session handler` | `tableId` (uuid, URL path param) | Checks whether a session already exists for this table; if one does, rejects with 409 so the guest can choose to join; if the table is free, creates a new session and returns its ID | JSON: `{session_id}` on success; HTTP 409 if a session already exists |

### App Setup

#### `app.js`

**Purpose**: Express application initialization and middleware/route assembly.

**Responsibilities**:
- Apply `express.json()` middleware for request body parsing
- Serve static frontend files from `frontend/public` directory
- Mount all route routers (menu, cart, orders, payments, waiter, table)
- Mount errorHandler middleware last (catches all route errors)

#### `server.js`

**Purpose**: Start the Express server.

**Responsibilities**:
- Require `app.js`
- Listen on PORT from env config
- Log startup message

---

## Frontend Module Reference

### Pages

#### `index.html` (Landing Page)

**Purpose**: Table identification and session initialization on QR scan.

**States**:
- Loading: Show spinner while fetching table status
- Error: Unknown table_id (show "Old page" message)
- Taken: Table has active/paid session (show "Would you like to append?" + Yes button)
- Free: No session on table (show "Welcome to {restaurant}" + To menu button)

**On Mount**: Fetch `/api/table/:tableId/status` — response includes restaurant_name

#### `menu.html` (Menu Browsing)

**Purpose**: Display full menu with category navigation, add-to-cart, cart badge, and call-waiter button.

**Components**:
- Sticky category navigation bar (horizontal scroll)
- Menu items grid (category sections, item cards with sold-out grey treatment)
- Cart item count badge in nav (total number of items across all cart entries; hidden when cart is empty)
- Call Waiter button (fixed bottom-right, grey during cooldown with circular countdown ring)

**On Mount**: Fetch `/api/menu?session_id`; render categories and items; fetch `/api/cart?session_id` to compute cart item count for badge

#### `cart.html` (Cart Review & Order Placement)

**Purpose**: Review cart items, adjust quantities, submit order.

**Components**:
- "Orders (N)" button at top — N is count of unpaid orders; tapping navigates to orders.html (hidden when N is 0)
- Cart items list (name, quantity +/− controls, subtotal per item)
- Cart total sum
- Sticky "Place Order" button at bottom — places the order, does not initiate payment

**On Mount**: Fetch `/api/cart?session_id`; fetch `/api/orders?session_id` to get unpaid order count for the Orders button

#### `orders.html` (Orders & Payments)

**Purpose**: View all session orders grouped by payment status; initiate payments; poll for confirmation.

**Components**:
- Payment result banner (success/failed/verifying, based on ?payment= query param)
- "Return to cart" button
- Unpaid orders section: each order shows its sequential number, time of placement, total sum for that order, and a "Pay" button that initiates payment for that single order
- "Paid" section header divider
- Paid orders section: each order shows sequential number, date of placement, and total sum (no action buttons)
- Sticky bar above "Pay all" button: "Total: [sum of all unpaid orders]"
- "Pay all" button — initiates payment for all unpaid orders at once

**On Mount**: Detect `?payment=success|failed` query param; fetch `/api/orders?session_id`; if success, poll `/api/payments/status/:session_id` every 3s up to 60s

#### `error.html` (Static Error Page)

**Purpose**: Show friendly error when table_id is invalid.

**Content**: Static "Old page" heading and administration call instruction; no JavaScript.

---

### JavaScript Components (Alpine.js)

#### `js/landing.js` — `landingApp()`

**State**:
- `loading` (boolean): Show spinner
- `error` (boolean): Show error message
- `status` (string): 'taken' | 'free' | null
- `restaurant` (string): Restaurant name from table status response
- `sessionId` (string): Current session (from URL param table_id)

**On Init**:
- Read `table_id` from URL query param
- Fetch `/api/table/:tableId/status` → set status, session_id, and restaurant_name

**Methods**:
- `createSession()`: POST `/api/table/:tableId/session` → store session_id in sessionStorage → navigate to menu.html
- `joinSession()`: Store session_id (from status API) in sessionStorage → navigate to menu.html

**Side Effects**: Write session_id to sessionStorage; navigate to menu.html on button click

---

#### `js/menu.js` — `menuApp()`

**State**:
- `categories` (array): Full menu tree {id, name, display_order, items: []}
- `cartItemCount` (number): Total number of items in the cart (sum of all quantities); badge hidden when 0
- `sessionId` (string): From sessionStorage

**On Init**:
- Fetch `/api/menu?session_id`
- Render categories + items (Alpine.js x-for loops)
- Fetch `/api/cart?session_id` → sum all item quantities for cartItemCount badge

**Methods**:
- `addToCart(itemId)`: POST `/api/cart/items?session_id` with {menu_item_id, quantity: 1}; increment cartItemCount by 1
- `scrollToCategory(id)`: Smooth-scroll to section element by id
- `fetchCartCount()`: Refetch `/api/cart?session_id` → recalculate cartItemCount (sum of quantities)

**On Page Focus**: Refetch menu availability and cart count (availability changes can occur outside this page)

---

#### `js/cart.js` — `cartApp()`

**State**:
- `items` (array): Current cart items {menu_item_id, quantity, name, price_cents, is_available}
- `unpaidOrderCount` (number): Number of unpaid orders (for the Orders button at top; button hidden when 0)
- `sessionId` (string): From sessionStorage

**On Init**:
- Fetch `/api/cart?session_id`
- Fetch `/api/orders?session_id` → count orders where is_paid=false → set unpaidOrderCount

**Methods**:
- `increment(itemId)`: Increment quantity in local state; PATCH `/api/cart/items/:itemId?session_id` with new quantity
- `decrement(itemId)`: Decrement quantity; if reaches 0, DELETE `/api/cart/items/:itemId?session_id` and remove from local items array
- `submitOrder()`: POST `/api/orders?session_id` with {items: [{menu_item_id, quantity}]}; on success clear items array and navigate to orders.html; on 400 ITEM_UNAVAILABLE, filter out unavailable items and show alert

**Computed**:
- `total` (number): Sum of (price_cents × quantity) / 100 for all items

---

#### `js/orders.js` — `ordersApp()`

**State**:
- `orders` (array): All session orders {id, total_cents, is_paid, placed_at, items: [...]}
- `paymentBanner` (string): 'success' | 'failed' | 'verifying' | null (shown based on ?payment= param)
- `sessionId` (string): From sessionStorage

**On Init**:
- Check for `?payment=success|failed` query param → set paymentBanner
- If success, call pollPaymentStatus() → polling loop
- Fetch `/api/orders?session_id`

**Methods**:
- `fetchOrders()`: Fetch `/api/orders?session_id` → populate orders array
- `pollPaymentStatus()`: Loop (up to 20 times, ~60s at 3s intervals) fetching `/api/payments/status/:session_id`; if status=completed, refetch orders and return; after timeout, set paymentBanner='verifying'
- `payOrder(orderId)`: POST `/api/payments/initiate?session_id` with {order_ids: [orderId]}; redirect browser to redirect_url
- `payAll()`: POST `/api/payments/initiate?session_id` with {order_ids: [ids of all unpaid orders]}; redirect browser to redirect_url

**Computed**:
- `unpaidOrders` (array): Subset of orders where is_paid=false, in placement order
- `paidOrders` (array): Subset of orders where is_paid=true, in placement order
- `unpaidTotal` (number): Sum of total_cents across unpaidOrders

---

#### `js/waiter.js` — `waiterApp()`

**State**:
- `cooldownActive` (boolean): Is button currently in cooldown
- `cooldownRemaining` (number): Seconds remaining (0–120)
- `dashOffset` (number): SVG stroke-dashoffset for circular countdown animation
- `sessionId` (string): From sessionStorage

**On Init**:
- Fetch `/api/waiter/status?session_id`
- If cooldownActive, call startCountdown()

**Methods**:
- `callWaiter()`: POST `/api/waiter/call?session_id`; on 201, set cooldownActive=true, cooldownRemaining=120, call startCountdown(); on 429, extract cooldown_remaining_seconds from response
- `fetchStatus()`: Fetch `/api/waiter/status?session_id` → update cooldownActive + cooldownRemaining → updateDashOffset()
- `startCountdown()`: setInterval (1s tick) decrementing cooldownRemaining; updateDashOffset() each tick; clear interval when remaining ≤ 0
- `updateDashOffset()`: Calculate SVG circle stroke-dashoffset based on progress (120 - remaining) / 120; drives visual ring animation

**Side Effects**: startCountdown() sets an interval (must be cleared or will run in background)

---

### CSS

#### `css/styles.css`

**Purpose**: Mobile-first responsive styling for all pages.

**Sections**:
- Root variables (colors, spacing)
- Base element styles (body, typography)
- Layout (sticky nav, grid for items, flexbox for controls)
- Component styles (item cards, buttons, badges, countdown ring)
- Animations (SVG circle stroke-dashoffset interpolation, keyframes)
- Responsive breakpoints (@media queries)

**Key Patterns**:
- CSS Grid for menu items (responsive columns)
- Flexbox for nav/controls
- SVG circle with stroke-dasharray/stroke-dashoffset for countdown animation
- Sold-out grey treatment (opacity, color adjustment)
- Mobile-first (single column by default, multi-column on larger screens)

**No dependencies**: Plain CSS, no Tailwind, no Bootstrap; ~300 lines

---

## Code Length Minimization Principles

### 1. No ORM
**What it saves**: No mapping layer, no query builder classes, no lazy-loading overhead
- Query modules write SQL once; routes call them directly
- Batch operations (bulk INSERT, UPDATE) use native SQL

### 2. No Token Auth
**What it saves**: No JWT middleware, token refresh logic, token validation on every route
- Session identified by table UUID (permanent, immutable)
- Waiter-managed lifecycle (no expiry logic)
- No revocation checks

### 3. No Build Toolchain
**What it saves**: No webpack/vite config, no transpilation, no asset bundling
- Alpine.js loaded from CDN (~14KB)
- HTML + raw JS files served as-is
- CSS in single file

### 4. No Data Layer Abstraction
**What it saves**: No repository pattern, no active record classes, no query builder objects
- Query modules are thin functions: 1–3 queries each
- No class boilerplate

### 5. No Validation Library
**What it saves**: No schema validators, no zod/joi integration
- Inline checks: UUID format validation, non-empty arrays
- DB constraints enforce rules (PK, FK, NOT NULL, UNIQUE, CHECK)

### 6. No Async/Await Wrappers
**What it saves**: No custom promise utilities, no try-catch wrapping library
- Express native async/await support works fine
- Error middleware catches all thrown errors

### 7. No Error Logging Framework
**What it saves**: No Winston/Pino setup, no structured logging config
- `console.error()` for debugging
- Error handler middleware returns JSON to client

### 8. No Testing Framework Complexity
**What it saves**: No test factory builders, no mocking libraries beyond Jest mocks
- Jest + supertest for integration tests
- Plain assertions

---

## Function Summary by Module

| Module | Count | Typical Complexity |
|--------|-------|-------------------|
| Query modules (7 files) | ~20 functions | 1–3 queries per function; parameterized SQL |
| Route handlers (6 files) | ~12 endpoints | Validate → query → compute → respond |
| Services (3 files) | 5 functions | Pure business logic; no DB access except paymentService.initiateCheckout |
| Middleware (2 files) | 2 functions | validateSession does lookup + attachment; errorHandler does code→status mapping |
| Alpine.js components (5 files) | ~70 methods | init, fetch, event handlers, computed properties; no frameworks |
| CSS (1 file) | ~300 lines | Mobile-first grid + flexbox + SVG animation |

**Total Code Estimate**:
- Backend: ~2,500 lines (config, DB, middleware, services, routes, tests)
- Frontend: ~1,500 lines (HTML, JS, CSS)
- SQL: ~300 lines (migrations + seed)
- **Total: ~4,300 lines**

---

## Architecture Decisions

### Why Raw SQL (No ORM)
- Simplicity: Query modules are functions, not class hierarchies
- Visibility: SQL is explicit; no hidden query generation
- Performance: No N+1 queries (use JOINs explicitly), no lazy-loading surprises
- Batch operations: Native SQL BULK INSERT/UPDATE

### Why Alpine.js (No React/Vue)
- Size: 14KB CDN vs 50KB+ bundled frameworks
- No build step: HTML + JS served as-is
- Adequate for cart state (no complex component tree)
- Declarative bindings (x-data, x-for, x-if) reduce imperative DOM code

### Why Server-Side Cart
- Persistence: Cart survives page reload, browser close, device switch
- Shared state: All diners at same table see same cart
- Availability checks: Server knows current availability; frontend joins on display

### Why Waiter-Managed Sessions
- No token lifecycle: Table UUID is permanent; no expiry logic
- Simplicity: Session tied to physical table, not time
- Clarity: Diner sees "table taken" (has active session) or "table free" (no session)

### Why Query Modules Over ORMs
- Coupling: Route directly calls query module; no intermediary
- SQL visibility: Easier to optimize, index, or rewrite
- Testing: Unit test services; integration test routes + queries together

---

## Next Steps (from tasks.md)

Implementation follows tasks.md Phase 1–7 order. Each query module, route, and Alpine component is independent; developers can work in parallel once T005–T006 (config + db pool) are ready.

Read this document before starting implementation to understand:
- Function signatures (arguments, return types)
- Data flow (routes → services → queries → DB)
- State management (sessionStorage, Alpine.js reactivity)
- Error handling (middleware, JSON responses)

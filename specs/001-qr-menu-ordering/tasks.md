# Tasks: QR Code Restaurant Menu & Ordering System

**Branch**: `001-qr-menu-ordering`
**Input**: plan.md, spec.md, data-model.md, contracts/
**Stack**: Node.js 20 LTS + Express 4 + pg + dotenv (backend) · Alpine.js 3 CDN (frontend) · PostgreSQL 15

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Parallelizable — different files, no unmet dependencies
- **[USn]**: User story (US1=Browse+Order, US2=Pay, US3=Waiter, US4=Landing)

---

## Phase 1: Setup

**Purpose**: Create skeleton — directories, package manifests, base config

- [ ] T001 Create directory tree: `backend/src/{config,db,routes,middleware,services}`, `backend/tests/{integration,unit}`, `frontend/{public,js,css}`
- [ ] T002 Create `backend/package.json` — Node.js 20 project; scripts: `start`, `dev` (nodemon), `db:migrate`, `db:seed`, `qr:generate`; dependencies: express@4, pg, dotenv
- [ ] T003 [P] Create `backend/.env.example` — DATABASE_URL, PORT, RESTAURANT_NAME, APP_BASE_URL, PAYMENT_PROVIDER_URL, PAYMENT_PROVIDER_SECRET, PAYMENT_PROVIDER_WEBHOOK_SECRET
- [ ] T004 [P] Create `frontend/css/styles.css` — mobile-first base: viewport reset, CSS variables (colors, spacing), button/card/badge base classes, sold-out grey treatment, circular countdown animation keyframes

---

## Phase 2: Foundational

**Purpose**: DB schema + Express app + session middleware — blocks all user stories

⚠️ **CRITICAL**: No user story work begins until this phase is complete

- [ ] T005 Create `backend/src/config/env.js` — load dotenv, export validated env vars (throw on missing required vars)
- [ ] T006 Create `backend/src/config/db.js` — export `pg.Pool` instance using DATABASE_URL from env
- [ ] T007 Create `backend/src/db/migrations/001_initial.sql` — CREATE TABLE for all 9 tables per data-model.md: `tables` (id uuid PK, table_number smallint UNIQUE), `menu_categories` (id, name, display_order), `menu_items` (id, category_id FK, name, description, ingredients text[], prep_time_minutes, price_cents, is_available, display_order), `table_sessions` (id, table_id FK, opened_at, closed_at, status), `cart_items` (id, session_id FK, menu_item_id FK, quantity, added_at; UNIQUE session_id+menu_item_id), `orders` (id, session_id FK, table_id FK, status, is_paid, payment_id FK nullable, total_cents, placed_at), `order_items` (id, order_id FK, menu_item_id FK, quantity, unit_price_cents, line_total_cents generated), `payments` (id, session_id FK, amount_cents, provider_reference, status, initiated_at, completed_at), `waiter_requests` (id, session_id FK, table_id FK, requested_at, status); plus all indexes from data-model.md
- [ ] T008 [P] Create `backend/src/db/migrate.js` — reads and executes all .sql files in migrations/ in filename order using the db pool
- [ ] T009 [P] Create `backend/src/db/seed.sql` — INSERT 10 tables (table_number 1–10); 4 menu_categories (Starters, Mains, Desserts, Drinks); 12 menu_items spread across categories with realistic names, descriptions, ingredients, prep times, prices
- [ ] T010 Create `backend/src/middleware/errorHandler.js` — Express error middleware: logs error, returns `{ error: code, message }` JSON with appropriate status code
- [ ] T011 Create `backend/src/middleware/validateSession.js` — reads `session_id` query param; queries `table_sessions`; returns 400 INVALID_SESSION_ID if missing/invalid UUID, 404 SESSION_NOT_FOUND if not found, 409 SESSION_CLOSED if status=closed; attaches session object to `req.session`
- [ ] T012 [P] Create `backend/src/db/queries/tables.js` — `getTableById(id)`: SELECT from tables by id
- [ ] T013 [P] Create `backend/src/db/queries/sessions.js` — `getActiveSession(tableId)`: find session where status IN ('active','paid') for tableId; `createSession(tableId)`: INSERT new active session; `closeSession(sessionId)`: UPDATE status='closed', closed_at=now()
- [ ] T014 [P] Create `backend/src/db/queries/menu.js` — `getMenu()`: SELECT all categories with their items joined, ordered by category.display_order then item.display_order
- [ ] T015 [P] Create `backend/src/db/queries/cart.js` — `getCart(sessionId)`: cart_items joined with menu_items (including is_available); `upsertCartItem(sessionId, menuItemId, quantity)`: INSERT or UPDATE quantity; `removeCartItem(sessionId, menuItemId)`; `clearCart(sessionId)`: DELETE all cart_items for session
- [ ] T016 [P] Create `backend/src/db/queries/orders.js` — `createOrder(sessionId, tableId, items, totalCents)`: INSERT order + order_items (price snapshot from menu_items); `getOrders(sessionId)`: SELECT all orders for session JOIN order_items JOIN menu_items (for name), ordered by placed_at ASC; `markOrdersPaid(orderIds, paymentId)`: UPDATE orders SET is_paid=true, payment_id
- [ ] T017 [P] Create `backend/src/db/queries/payments.js` — `createPayment(sessionId, amountCents)`: INSERT payment with status=pending; `updatePaymentStatus(paymentId, status, providerRef, completedAt)`: UPDATE payment; `getSessionPayments(sessionId)`: SELECT completed payments with their paid order IDs
- [ ] T018 [P] Create `backend/src/db/queries/waiter.js` — `createWaiterRequest(sessionId, tableId)`: INSERT; `getLastWaiterRequest(sessionId)`: SELECT most recent request_at for session
- [ ] T019 Create `backend/src/app.js` — Express app: JSON middleware; serve `frontend/public` as static; mount routes (table, menu, cart, orders, payments, waiter); mount errorHandler last; export app; create `backend/src/server.js` to listen on PORT

**Checkpoint**: Run `npm run db:migrate && npm run db:seed && npm start` — server responds on PORT

---

## Phase 3: User Story 1 — Browse Menu & Place Order (P1) 🎯 MVP

**Goal**: Diner can browse menu categories and items, manage a shared server-side cart, and submit an order

**Independent Test**: POST /api/orders with valid session_id returns 201; order row exists in DB with correct session_id, items, and total

- [ ] T020 [P] [US1] Create `backend/src/services/availabilityService.js` — `validateCartItems(sessionId)`: fetch cart items joined with menu_items, return list of unavailable item IDs (is_available=false)
- [ ] T021 [US1] Create `backend/src/routes/menu.js` — `GET /api/menu?session_id=`: use validateSession middleware; call getMenu(); filter out categories where ALL items are unavailable; return categories array with items including is_available flag
- [ ] T022 [US1] Create `backend/src/routes/cart.js` — mount validateSession on all; `GET /api/cart?session_id=`: getCart, return items with is_available; `POST /api/cart/items`: upsertCartItem; `PATCH /api/cart/items/:menuItemId`: update quantity (call removeCartItem if qty reaches 0); `DELETE /api/cart/items/:menuItemId`: removeCartItem
- [ ] T023 [US1] Create `backend/src/routes/orders.js` — `POST /api/orders?session_id=`: validateSession; run availabilityService; if unavailable items → 400 ITEM_UNAVAILABLE with unavailable_item_ids; compute total from menu_items.price_cents (server-side, never trust client prices); createOrder; clearCart; return 201 with order detail. `GET /api/orders?session_id=`: validateSession; getOrders (all orders, paid and unpaid, with item detail); compute unpaid_total_cents; return {session_id, orders (each with is_paid flag + items array), unpaid_total_cents}
- [ ] T024 [US1] Mount cart, menu, orders routes in `backend/src/app.js`
- [ ] T025 [P] [US1] Create `frontend/public/menu.html` — full-page layout: sticky category nav bar at top (links scroll to sections); menu sections with item cards (name, description, ingredients, prep time, price); sold-out items rendered with `sold-out` CSS class and "SOLD OUT" badge replacing price; cart item counter badge in nav; Alpine.js x-data="menuApp()"
- [ ] T026 [US1] Create `frontend/js/menu.js` — Alpine.js `menuApp()`: on init fetch `GET /api/menu?session_id` (session_id from sessionStorage); build category/item structure; `addToCart(itemId)` calls `POST /api/cart/items`; `scrollToCategory(id)` smooth-scrolls; updates cart badge count; re-fetches availability on each page focus event
- [ ] T027 [P] [US1] Create `frontend/public/cart.html` — cart page: list of current cart items with quantity +/- controls and item name/price; total; "Place Order" button; post-submit confirmation section (hidden until submitted) with message and "Back to Menu" button; unavailable items shown grey with remove button
- [ ] T028 [US1] Create `frontend/js/cart.js` — Alpine.js `cartApp()`: fetch `GET /api/cart?session_id`; render items; `increment(id)` / `decrement(id)` call PATCH (decrement to 0 = remove); `submitOrder()` calls `POST /api/orders`; on 400 ITEM_UNAVAILABLE highlight unavailable items; on 201 show confirmation section, clear cart display

**Checkpoint**: Scan test QR (with valid session_id), browse menu, add items, view cart, place order — order appears in `orders` table

---

## Phase 4: User Story 2 — Pay Bill Online (P2)

**Goal**: Diner can view unpaid orders, tap Pay or Pay all, complete payment at external provider, return to menu with confirmation

**Independent Test**: POST /api/payments/initiate with valid session_id + order_ids returns redirect_url; POST /webhooks/payment marks orders is_paid=true and payment completed

- [ ] T029 [P] [US2] Create `backend/src/services/paymentService.js` — `initiateCheckout(paymentId, orderIds, amountCents, sessionId)`: POST to PAYMENT_PROVIDER_URL with amount, metadata (paymentId), success_url (`APP_BASE_URL/orders.html?payment=success&session_id=`), cancel_url (`APP_BASE_URL/orders.html?payment=failed&session_id=`); return provider checkout URL. `verifyWebhookSignature(rawBody, sigHeader)`: HMAC-SHA256 verify using PAYMENT_PROVIDER_WEBHOOK_SECRET
- [ ] T030 [US2] Create `backend/src/routes/payments.js` — `POST /api/payments/initiate?session_id=`: validateSession; verify order_ids belong to session and are unpaid; sum total_cents; createPayment; call paymentService.initiateCheckout; return {payment_id, redirect_url, amount_cents}. `POST /webhooks/payment`: verify HMAC signature (reject 400 if invalid); find payment by provider_reference or metadata paymentId; if already completed return 200 (idempotent); updatePaymentStatus(completed, providerRef, completedAt); markOrdersPaid(orderIds, paymentId); if all session orders paid update session status to 'paid'. `GET /api/payments/status/:session_id`: validateSession; getSessionPayments; return {session_id, payments:[{payment_id, provider_reference, amount_cents, status, completed_at, paid_order_ids}]}
- [ ] T031 [US2] Mount payments routes in `backend/src/app.js`
- [ ] T032 [P] [US2] Create `frontend/public/orders.html` — orders page: all session orders list; paid orders shown with "PAID" badge; unpaid orders each have a "Pay" button and their item breakdown; total unpaid sum displayed prominently; "Pay all" section at bottom with checkbox and "Pay all" button; payment result banner (success/failed, shown based on `?payment=success|failed` query param on return from provider)
- [ ] T033 [US2] Create `frontend/js/orders.js` — Alpine.js `ordersApp()`: fetch `GET /api/orders?session_id`; render all orders — paid ones with "PAID" badge, unpaid ones with Pay button and item list; `payOrder(orderId)` calls POST /api/payments/initiate with single order_id then redirects browser to redirect_url; `payAll()` calls POST with all unpaid order_ids; on page load detect `?payment=success|failed` and show result banner; if success, poll `GET /api/payments/status/:session_id` every 3s for up to 60s until status=completed; after 60s show "Taking longer than expected — your payment is being verified" with manual refresh option
- [ ] T034 [US2] Add link to orders.html from `frontend/public/menu.html` — cart/orders icon in nav bar showing unpaid order count badge; fetch count from GET /api/orders on menu page load

**Checkpoint**: From cart, tap Pay, complete mock payment at provider URL, return to menu — orders no longer appear in unpaid list, payment row shows completed

---

## Phase 5: User Story 3 — Request Waiter Assistance (P3)

**Goal**: Diner can tap "Call Waiter"; button goes grey with countdown; request stored in DB; cooldown prevents duplicates

**Independent Test**: POST /api/waiter/call returns 201; second call within 120s returns 429 with cooldown_remaining_seconds

- [ ] T035 [P] [US3] Create `backend/src/services/waiterService.js` — `getCooldownStatus(sessionId)`: getLastWaiterRequest; compute remaining seconds (120 - elapsed); return {cooldown_active, cooldown_remaining_seconds, last_request_at}
- [ ] T036 [US3] Create `backend/src/routes/waiter.js` — `POST /api/waiter/call?session_id=`: validateSession; getCooldownStatus; if cooldown_active return 429 COOLDOWN_ACTIVE with cooldown_remaining_seconds; createWaiterRequest; return 201 {request_id, session_id, table_number, requested_at, cooldown_until}. `GET /api/waiter/status?session_id=`: validateSession; getCooldownStatus; return status object
- [ ] T037 [US3] Mount waiter routes in `backend/src/app.js`
- [ ] T038 [P] [US3] Create `frontend/js/waiter.js` — Alpine.js `waiterApp()`: on init fetch `GET /api/waiter/status`; if cooldown_active start countdown timer from remaining seconds; `callWaiter()`: POST /api/waiter/call; on 201 start 120s countdown; on 429 sync remaining from response; button disabled + grey during countdown; circular SVG stroke-dashoffset animation driven by countdown progress
- [ ] T039 [US3] Integrate waiter button into `frontend/public/menu.html` — fixed bottom-right floating button using waiter.js component; shows "Call Waiter" when available, grey ring countdown when cooling down

**Checkpoint**: Tap Call Waiter → button goes grey with ring countdown → waiter_requests row in DB → button re-enables after 2 minutes

---

## Phase 6: User Story 4 — Scan Landing Page (P4)

**Goal**: QR scan shows "table taken" or "welcome" landing; creates/joins session; stores session_id for all subsequent pages

**Independent Test**: GET /api/table/:id/status returns {status:'free'} for table with no active session and {status:'taken', session_id} for table with active session; navigating to index.html?table_id= shows correct message

- [ ] T040 [P] [US4] Create `backend/src/routes/table.js` — `GET /api/table/:tableId/status`: getTableById; if not found return 404 TABLE_NOT_FOUND; getActiveSession(tableId); return {status:'free'|'taken', session_id: existing session_id or null, table_number}. `POST /api/table/:tableId/session`: getTableById (404 if not found); getActiveSession; if exists return 409 SESSION_ALREADY_ACTIVE with session_id; createSession(tableId); return 201 {session_id, table_id, table_number}
- [ ] T041 [US4] Mount table routes in `backend/src/app.js`; add `GET /api/config` route returning `{restaurant_name: process.env.RESTAURANT_NAME}`
- [ ] T042 [P] [US4] Create `frontend/public/index.html` — scan landing page: reads `table_id` from URL query param; fetches table status; shows one of two states: (a) taken — "This table is taken. Would you like to append?" + "Yes" button; (b) free — "Welcome to {restaurant_name}" + "To menu" button; Alpine.js x-data="landingApp()"
- [ ] T043 [US4] Create `frontend/js/landing.js` — Alpine.js `landingApp()`: parse table_id from URL (if missing show error); fetch `GET /api/config` for restaurant_name; fetch `GET /api/table/:tableId/status`; if 404 redirect to error.html; if taken store session_id in sessionStorage and show taken message; if free show welcome message; "Yes"/"To menu" buttons: if free call POST /api/table/:id/session first to get session_id; store session_id in sessionStorage; navigate to menu.html
- [ ] T044 [P] [US4] Create `frontend/public/error.html` — static error page displaying "Old page" as heading and "If you just scanned a QR code and see this page, call the administration" as subtext; no JS required
- [ ] T045 [US4] Create `backend/src/db/queries/qr.js` and `backend/src/scripts/qr-generate.js` — CLI script: accepts `--table <number>` arg; looks up table by table_number; prints QR code URL: `APP_BASE_URL/?table_id=<uuid>`

**Checkpoint**: `npm run qr:generate -- --table 3` prints URL; open URL in browser → landing page shows table status → clicking button → menu.html loads with session_id in sessionStorage

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error resilience, consistency, final wiring

- [ ] T046 [P] Add input validation to all routes in `backend/src/middleware/` — UUID format check for session_id and table_id params before DB queries; 400 INVALID_SESSION_ID / INVALID_TABLE_ID responses
- [ ] T047 [P] Add network error handling to all Alpine.js components in `frontend/js/` — catch fetch errors, display user-friendly "Something went wrong, please reload" inline messages
- [ ] T048 Verify session_id propagation consistency across all frontend pages in `frontend/js/` — confirm all pages read session_id from sessionStorage and pass as `?session_id=` query param; confirm nav links between menu ↔ orders ↔ cart preserve session_id
- [ ] T049 [P] Verify SC-001 and SC-005 performance targets: use curl/wrk to confirm `GET /api/menu` P95 response ≤ 500ms locally (supporting SC-001 ≤ 3s end-to-end on mobile); confirm `POST /api/waiter/call` round-trip ≤ 200ms locally (supporting SC-005 ≤ 2s perceived response)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — first story to implement (MVP)
- **Phase 4 (US2)**: Depends on Phase 2 + Phase 3 (needs orders to exist)
- **Phase 5 (US3)**: Depends on Phase 2 — independent of US1/US2
- **Phase 6 (US4)**: Depends on Phase 2 — independent of US1/US2/US3 (landing page only needs session creation)
- **Phase 7 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Only needs Foundational — implement first
- **US2 (P2)**: Needs US1 (orders must exist to pay)
- **US3 (P3)**: Only needs Foundational — can develop in parallel with US1
- **US4 (P4)**: Only needs Foundational — can develop in parallel with US1/US3

### Within Each Story

- Query modules before services
- Services before routes
- Routes before frontend pages
- Backend endpoint before frontend JS that calls it

---

## Parallel Opportunities

```text
Phase 2 — run together:
  T008 (migrate script) · T009 (seed) · T010 (errorHandler)
  T012-T018 (all query modules — separate files)

Phase 3 — run together after T021-T024:
  T025 (menu.html) · T027 (cart.html)

Phase 4 — run together after T029-T030:
  T032 (orders.html) · T029 (paymentService)

Phase 5 — run together:
  T035 (waiterService) · T038 (waiter.js frontend)

Phase 6 — run together:
  T040 (table routes) · T042 (index.html) · T044 (error.html)
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Phase 1: Setup project
2. Phase 2: DB + Express + session infrastructure
3. Phase 3: Menu browse + cart + order placement
4. **STOP and validate**: diner can scan → browse → order → order in DB
5. Ship MVP

### Incremental Delivery

- MVP → add Phase 4 (payment) → working end-to-end commerce
- Add Phase 5 (call waiter) → full service experience
- Add Phase 6 (landing page) → proper QR scan entry flow
- Phase 7 (polish) → production-ready

### Parallel Team Strategy (2 developers)

- Dev A: Phase 3 (US1 full stack)
- Dev B: Phase 5 (US3 full stack) — only needs Foundational
- Both merge → Dev A: Phase 4 (US2) · Dev B: Phase 6 (US4)

---

## Notes

- `[P]` = different files, no unmet dependencies within the phase
- session_id is stored in `sessionStorage` on the frontend after landing page creates/joins session
- All API calls from frontend pass `?session_id=` as query param
- No JWT, no auth headers — session identified by UUID in DB
- Cart is server-side shared — all devices at same table see same cart
- Payment webhook is the authoritative payment confirmation — browser redirect alone never marks payment complete

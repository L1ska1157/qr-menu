# Feature Specification: Live Cart Sync

**Feature Branch**: `002-cart-live-update`
**Created**: 2026-04-09
**Status**: Draft
**Input**: Cart is already shared server-side across all devices at the same table (FR-020). Currently each device fetches cart state once on page load — changes made on one device are invisible to others until they manually reload. This feature makes those changes appear instantly.

## Clarifications

- Q: Which pages receive live updates? → Cart page (`cart.html`) is primary. The menu page (`menu.html`) shows a cart item count badge — it should also update live.
- Q: How should conflicts be handled when two devices edit the same item simultaneously? → Last-write-wins. The server is the source of truth; the full cart snapshot from the server overwrites local state on every push.
- Q: Should a device receive its own mutations back as an SSE event? → Yes — simplifies the model; the initiating device replaces its optimistic state with the confirmed server snapshot.

## User Scenarios & Testing

### User Story 1 — Second device sees cart changes instantly (Priority: P1)

Two diners at the same table both have `cart.html` open. Diner A adds an item or changes a quantity. Diner B's screen updates automatically within 1 second — no refresh needed.

**Why this priority**: The cart is already described as shared (FR-020). Without live sync, the shared-cart promise is invisible unless both diners happen to reload at the same moment.

**Independent Test**: Open `cart.html` in two browser tabs with the same `session_id`. In Tab A, add an item via the API. Within 1 second, Tab B shows the new item without any user interaction.

**Acceptance Scenarios**:

1. **Given** two devices share the same session, **When** Device A adds an item to the cart, **Then** Device B's cart page shows that item within 1 second without a page reload
2. **Given** Device A changes an item quantity, **When** the change is saved to the server, **Then** Device B sees the updated quantity within 1 second
3. **Given** Device A removes all items, **When** the cart becomes empty, **Then** Device B's cart page transitions to the empty-cart state without reloading
4. **Given** the SSE connection drops (network blip), **When** it reconnects, **Then** the client immediately re-fetches the latest cart to close any gap

---

### User Story 2 — Menu page cart badge stays current (Priority: P2)

A diner is browsing the menu while their tablemate edits the cart. The item-count badge on the menu page updates live.

**Acceptance Scenarios**:

1. **Given** a diner is on `menu.html`, **When** any device on the same session changes the cart, **Then** the cart badge count updates within 1 second
2. **Given** the diner has no session (scanned a free table but not yet opened the menu), **When** there is no `session_id` in `sessionStorage`, **Then** no SSE connection is attempted

---

### Edge Cases

- What happens when the SSE stream is open but the session is closed (table cleared by waiter)? → Server closes the SSE connection; client redirects to `/` on receiving a `session_closed` event.
- What happens when `cart.html` is in a background tab? → `EventSource` keeps the connection alive; the tab catches up when brought to foreground.
- What happens during an active order submission when an SSE update arrives mid-submit? → Incoming SSE updates are ignored while `submitting === true`; the post-submit navigation to `orders.html` means the stale state never persists.

## Requirements

### Functional Requirements

- **FR-L01**: Server MUST expose `GET /api/cart/events?session_id=<uuid>` as an SSE endpoint (Content-Type: `text/event-stream`); it MUST validate the session and return `400` for an invalid/missing UUID, `404` for an unknown session, and `409` for a closed session before upgrading to a stream
- **FR-L02**: Whenever any cart mutation occurs (`POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`) the server MUST push the full updated cart payload to **all** open SSE connections for that `session_id`; the event name MUST be `cart_updated` and the data MUST be the same JSON shape as `GET /api/cart` response
- **FR-L03**: On receiving a `cart_updated` event the cart page (`cart.html`) MUST replace its `items` array with the payload's `items`, unless `submitting === true` in which case the event MUST be discarded
- **FR-L04**: The `EventSource` connection MUST be closed when the page unloads (`beforeunload`); the server MUST remove the connection from the active set on close/error to prevent memory leaks
- **FR-L05**: The menu page (`menu.html`) MUST subscribe to `GET /api/cart/events` and update its cart item-count badge on each `cart_updated` event; total item count is `items.reduce((s, i) => s + i.quantity, 0)`
- **FR-L06**: If the server pushes a `session_closed` event on the SSE stream, the client MUST redirect to `/` immediately
- **FR-L07**: The SSE endpoint MUST send a `comment` keepalive line (`: keepalive`) every 30 seconds to prevent proxy/load-balancer timeouts

### Out of Scope

- Operational transforms or last-writer conflict UI
- Live sync for orders or payments pages
- Push notifications to devices that do not have the page open

## Technical Notes

- **Transport**: Server-Sent Events over HTTP/1.1. No new dependencies — Node.js `res.write` with the `text/event-stream` protocol. Alpine.js handles the reactive update on the frontend.
- **In-memory registry**: A `Map<sessionId, Set<res>>` in a module-level singleton in `src/services/cartEventBus.js`; acceptable for a single-process deployment. No Redis/pub-sub required at this scale.
- **Affected files**:
  - `backend/src/services/cartEventBus.js` — new, in-memory bus
  - `backend/src/routes/cart.js` — add SSE endpoint; emit on each mutation
  - `frontend/js/cart.js` — subscribe to SSE, replace `items` on event
  - `frontend/js/menu.js` — subscribe to SSE, update cart count badge

## Success Criteria

- **SC-L01**: Cart change on one device appears on a second device in the same session within 1 second on a local network
- **SC-L02**: Closing the tab removes the SSE connection from server memory within 5 seconds (confirmed by no memory growth after 100 open/close cycles)
- **SC-L03**: A 30-second network interruption followed by reconnect leaves the cart in the correct server-authoritative state

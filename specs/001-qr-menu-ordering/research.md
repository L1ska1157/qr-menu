# Research: QR Code Restaurant Menu & Ordering System

**Feature**: 001-qr-menu-ordering
**Date**: 2026-04-06
**Phase**: 0 — Technical decisions resolved before design

---

## Frontend Framework

- **Decision**: Alpine.js 3 (loaded from CDN)
- **Rationale**: Alpine.js is 14KB minified, requires no build toolchain, and runs directly from a CDN `<script>` tag — perfect for a mobile-first menu that must load fast with zero installation friction. It provides just enough reactivity (cart state, conditional display, button cooldowns) without the overhead of React/Vue/Svelte, which all require a build step or complex CDN module setup. HTMX was considered but pushes more logic to the server-side template layer, increasing backend coupling.
- **Alternatives considered**:
  - *Vanilla JS*: Zero dependency, but writing reactive cart state management and DOM diffing by hand is verbose and error-prone. Alpine.js is essentially Vanilla JS with a declarative reactive layer — the right abstraction for this scale.
  - *Preact*: Excellent size (~4KB), but requires JSX compilation or a complex import-map CDN setup. Adds build complexity.
  - *HTMX*: Well-suited for server-rendered partial updates, but would require the backend to render HTML fragments, coupling UI structure to the server. Overkill given the relatively simple client-side state.

---

## QR Code & Session Identification

- **Decision**: QR code encodes the permanent table ID only — no token. Session lifecycle is managed server-side by the waiter.
- **Rationale**: The QR code is a permanent physical label that never needs reprinting. Session boundaries are controlled by the waiter closing the session after cleaning the table, not by token expiry. When a diner scans, the system looks up whether the table has an active session and shows a landing page ("table taken — append?" or "welcome — start new session?"). This is simpler operationally and removes the need for any token generation, rotation, or distribution.
- **Alternatives considered**:
  - *Opaque random token in URL*: Requires generating and distributing new tokens per shift, reprinting QR codes, and managing token expiry. Operational overhead with no meaningful security gain in a restaurant setting where physical access to the table already implies authorization.
  - *JWT in URL*: Same operational overhead as opaque token, plus irrevocable before expiry without a denylist. Rejected.
  - *No session management at all (stateless)*: Would lose multi-round ordering, shared cart, and payment state. Rejected.

---

## PostgreSQL Access Pattern

- **Decision**: `pg` (node-postgres) with raw SQL
- **Rationale**: The data model has ~8 tables with well-understood query patterns (menu fetch, order insert, payment status join). Raw SQL with the `pg` driver is the leanest option — no ORM magic, no query builder abstraction, full control over indexes and query shape. Parameterised queries via `pg` prevent SQL injection natively. For a project this size, an ORM adds more configuration overhead than it saves.
- **Alternatives considered**:
  - *Kysely*: A lightweight type-safe query builder (~80KB). Would add type safety to queries but introduces a dependency and a learning curve. Overkill for 8 tables with stable schemas.
  - *Drizzle ORM*: Modern, lightweight ORM with good PostgreSQL support. Rejected because it requires a build step for TypeScript inference and adds abstraction that "keep dependencies lean" explicitly discourages.
  - *Sequelize / Prisma*: Full ORMs. Too heavyweight, too many dependencies, generate too much implicit SQL. Rejected outright.

---

## External Payment Redirect Pattern

- **Decision**: Server-side checkout session creation → client redirect → provider callback to backend
- **Rationale**: The backend creates a checkout session with the payment provider (passing amount, reference, return URLs), receives a provider-hosted payment URL, and returns it to the frontend. The frontend redirects the diner's browser to that URL. After payment, the provider redirects back to `/payment/success` or `/payment/failure` on the app. The backend also registers a webhook endpoint with the provider for server-to-server payment confirmation (more reliable than relying solely on browser redirects, which can be interrupted). This pattern works with all major providers (Stripe Checkout, Adyen, Mollie, PayPal) and keeps payment credentials entirely server-side.
- **Alternatives considered**:
  - *Client-side payment SDK (e.g., Stripe.js)*: Embeds the payment form in the app. More seamless UX but requires PCI SAQ-A-EP compliance instead of the simpler SAQ-A. Rejected — redirecting to a hosted page is sufficient and reduces PCI scope.
  - *iFrame embed*: Some providers offer embeddable payment forms. Introduces cross-origin complexity and requires careful CSP configuration. Not worth the added complexity.
- **Critical rule**: The `success_url` redirect alone must **never** be trusted to mark a payment complete — redirects can be missed (browser closed mid-redirect) or spoofed. Authoritative confirmation must come via a server-to-server webhook (`POST /webhooks/payment`) that the provider calls independently. The `success_url` page shows "pending confirmation" state and polls `GET /api/payments/status/:session_id` until the webhook fires and updates the DB.
- **Provider abstraction**: A thin `PaymentService` module in `backend/src/services/` wraps the provider-specific HTTP calls. The `order_id` is passed as metadata in the checkout session creation request so the provider echoes it back on the webhook — this is the universal cross-provider linking pattern (works with Stripe, PayPal, Square, Adyen, Mollie).

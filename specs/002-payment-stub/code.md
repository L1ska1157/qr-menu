# Code Architecture: Development Payment Provider Stub

**Feature**: 002-payment-stub
**Date**: 2026-04-09
**Principles**: Zero changes to existing route/service/query modules. Self-contained in one new file. Fits as a drop-in replacement for a real payment provider by matching the exact API contract that `services/paymentService.js` already expects.

---

## Project Code Structure

```text
backend/
├── src/
│   ├── stubs/
│   │   └── paymentProvider.js   # Dev stub — Express router simulating external provider
│   └── app.js                   # +2 lines: import stub + conditional mount
```

**All other files are untouched.**

---

## Integration with Existing Code

### How the real payment flow works (existing, unchanged)

```
orders.html (browser)
  └─ POST /api/payments/initiate?session_id=...  ← routes/payments.js
        └─ initiateCheckout(paymentId, orderIds, amountCents, sessionId)  ← services/paymentService.js
              └─ POST PAYMENT_PROVIDER_URL  (fetch to external provider)
                    └─ response: { checkout_url | redirect_url | url }
        └─ returns redirect URL to route handler
  ← { payment_id, redirect_url, amount_cents }
  └─ location.href = redirect_url  (browser navigates to provider page)

... user completes payment on provider page ...

provider page
  └─ POST APP_BASE_URL/webhooks/payment  (with HMAC signature)  ← routes/payments.js
        └─ verifyWebhookSignature(req.body Buffer, sig header)  ← services/paymentService.js
        └─ updatePaymentStatus, markOrdersPaid
  └─ redirect browser to success_url OR failure_url

browser lands on:
  success_url = APP_BASE_URL/orders.html?payment=success&session_id=...
  failure_url = APP_BASE_URL/orders.html?payment=failed&session_id=...
```

### What the stub replaces

Only the external provider. The stub:
1. Listens on `POST /stub/payment/checkout` — the URL set in `PAYMENT_PROVIDER_URL`
2. Returns `{ checkout_url }` pointing to the stub's own UI page — received by `initiateCheckout`
3. Serves a UI page where the developer chooses the payment outcome
4. On outcome, fires `POST /webhooks/payment` to its own server then redirects the browser — exactly what a real provider would do

### Changes to `app.js` (2 lines only)

```js
// add import at top with other imports:
import paymentStubRouter from './stubs/paymentProvider.js';

// add mount before errorHandler, after existing routes:
if (process.env.NODE_ENV !== 'production') app.use(paymentStubRouter);
```

### Changes to `.env`

```
PAYMENT_PROVIDER_URL=http://localhost:3000/stub/payment/checkout
PAYMENT_PROVIDER_SECRET=stub
PAYMENT_PROVIDER_WEBHOOK_SECRET=dev-webhook-secret
```

Both `PAYMENT_PROVIDER_WEBHOOK_SECRET` values must match — the stub signs the webhook with the same secret that `verifyWebhookSignature` uses to verify it.

---

## Module Reference

### `stubs/paymentProvider.js`

**Purpose**: Simulate an external payment provider within the same Express process. Exposes three routes. Stores pending checkout sessions in memory. On developer choice, fires a signed webhook to the local server and redirects the browser.

**Exports**: Express `Router`

**In-memory state**:

```js
const pending = new Map();
// key:   ref (uuid string)  — random, generated per checkout
// value: { amountCents, metadata, successUrl, failureUrl }
```

Entry is deleted after the simulate endpoint is called (idempotent — second call returns 410).

**Router-level middleware**:

```js
router.use(express.urlencoded({ extended: false }));
```

Required for the simulate form POST. Registered on the stub router only — does not affect global middleware stack. `express.json()` (global) ignores `application/x-www-form-urlencoded` content type so there is no conflict.

---

#### `POST /stub/payment/checkout`

**Called by**: `services/paymentService.js#initiateCheckout`

**Request** (parsed by global `express.json()`):

```json
{
  "amount": 1490,
  "metadata": { "payment_id": "<uuid>", "order_ids": ["<uuid>"] },
  "success_url": "http://localhost:3000/orders.html?payment=success&session_id=<uuid>",
  "cancel_url":  "http://localhost:3000/orders.html?payment=failed&session_id=<uuid>"
}
```

`cancel_url` is stored internally as `failureUrl` — the provider field name is kept as-is from the existing `paymentService.js` contract, but the stub treats it uniformly as the failure redirect.

**Behavior**:
1. Generate `ref = crypto.randomUUID()`
2. Store `{ amountCents: body.amount, metadata: body.metadata, successUrl: body.success_url, failureUrl: body.cancel_url }` in `pending` under `ref`
3. Return `{ checkout_url: \`${APP_BASE_URL}/stub/payment/ui?ref=${ref}\` }`

**Why `checkout_url` (not `redirect_url` or `url`)**: `initiateCheckout` reads `data.checkout_url ?? data.redirect_url ?? data.url`. Any of these works; `checkout_url` is explicit.

**Response**:

```json
{ "checkout_url": "http://localhost:3000/stub/payment/ui?ref=<uuid>" }
```

---

#### `GET /stub/payment/ui?ref=<uuid>`

**Called by**: browser, after `location.href = data.redirect_url` in `orders.js`

**Behavior**:
1. Look up `ref` in `pending`; if missing, respond 404 with plain text message
2. Render a full HTML page (inline in the route handler) showing:
   - Amount formatted as currency (e.g. `€14.90`)
   - A "DEV STUB" badge so it is visually distinct from production
   - Two HTML forms, each with `method="POST"` and `action="/stub/payment/simulate"`:
     - Hidden `<input name="ref">` with current `ref`
     - Hidden `<input name="outcome">` with value `success` / `failure`
     - Submit button styled green / red respectively

**Why HTML forms (POST, not GET links)**: State-changing action (fires webhook, deletes pending entry). POST prevents browser back-button re-submission issues and avoids outcome leaking into browser history.

---

#### `POST /stub/payment/simulate`

**Called by**: form submission from the UI page

**Request body** (parsed by router-level `express.urlencoded`):

```
ref=<uuid>&outcome=success|failure
```

**Behavior**:

| `outcome` | Action |
|-----------|--------|
| `success` | Call `fireWebhook(ref, metadata)` → on webhook resolve, delete from `pending`, redirect to `successUrl` |
| `failure` | Delete from `pending`, redirect to `failureUrl` (no webhook) |

If `ref` not in `pending`: respond 410 Gone (already processed).

The redirect lands the browser on:
- `orders.html?payment=success&session_id=...` — triggers `pollPaymentStatus()` in `orders.js`
- `orders.html?payment=failed&session_id=...` — shows failure banner in `orders.js`

This matches exactly what `orders.js#init()` already handles via the `?payment=` query param.

---

#### `fireWebhook(providerRef, metadata)` — internal async function

**Purpose**: POST to `APP_BASE_URL/webhooks/payment` exactly as a real provider would, so the existing webhook handler processes the payment without any modification.

**Payload**:

```js
const body = JSON.stringify({ reference: providerRef, metadata });
```

`reference` is read by the webhook handler as `payload.reference ?? payload.transaction_id ?? payload.id`. `metadata.payment_id` and `metadata.order_ids` are used to update payment status and mark orders paid.

**HMAC signature**:

```js
const sig = crypto
  .createHmac('sha256', PAYMENT_PROVIDER_WEBHOOK_SECRET)
  .update(body)   // body is a string; HMAC is computed over its UTF-8 bytes
  .digest('hex');
```

**HTTP call**:

```js
await fetch(`${APP_BASE_URL}/webhooks/payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',          // ← CRITICAL — see constraint below
    'x-provider-signature': sig,
  },
  body,
});
```

**Critical constraint — why `Content-Type: text/plain`**:

`app.js` registers `express.json()` as global middleware. `routes/payments.js` registers `express.raw({ type: '*/*' })` as route-level middleware on `POST /webhooks/payment`.

Express body-parser middleware (both `json` and `raw`) sets `req._body = true` after parsing and checks this flag before re-parsing. Execution order on the webhook route:

```
1. express.json()  [global]   — runs first on every request
2. express.raw()   [route]    — runs second, only on this route
```

If `Content-Type: application/json`:
- Step 1: `express.json()` matches → parses body → `req.body = { reference, metadata }` (JS object) → sets `req._body = true`
- Step 2: `express.raw()` sees `req._body === true` → skips → `req.body` remains a JS object
- `verifyWebhookSignature(jsObject, sig)` calls `crypto.createHmac(...).update(jsObject)` → Node converts object to string `"[object Object]"` → HMAC mismatch → signature verification fails → **400 INVALID_SIGNATURE**

If `Content-Type: text/plain`:
- Step 1: `express.json()` does not match `text/plain` → skips → `req.body` unchanged
- Step 2: `express.raw({ type: '*/*' })` matches `text/plain` → parses body → `req.body = Buffer<...>` (raw bytes)
- `verifyWebhookSignature(buffer, sig)` calls `crypto.createHmac(...).update(buffer)` → same bytes as the string used to compute `sig` → **HMAC matches → 200 OK**

The HMAC bytes are identical in both cases because `Buffer.from(jsonString, 'utf8')` and `String` use the same UTF-8 encoding. The only difference is which middleware gets to parse the body.

---

## Full Data Flow (with stub)

```
[browser] POST /api/payments/initiate?session_id=...
  → routes/payments.js validates session, checks orders, creates payment record
  → services/paymentService.js#initiateCheckout POSTs to PAYMENT_PROVIDER_URL
       = POST /stub/payment/checkout  ← stub receives this
       → stores { amountCents, metadata, successUrl, failureUrl } under ref
       ← { checkout_url: "http://localhost:3000/stub/payment/ui?ref=<uuid>" }
  ← { payment_id, redirect_url: "http://localhost:3000/stub/payment/ui?ref=<uuid>", amount_cents }
[browser] location.href = redirect_url
  → GET /stub/payment/ui?ref=<uuid>  ← stub serves HTML page with two buttons
[developer] clicks "Pay — simulate success"
  → POST /stub/payment/simulate  body: ref=<uuid>&outcome=success
  → stub calls fireWebhook(ref, metadata)
       → POST /webhooks/payment  Content-Type: text/plain  x-provider-signature: <hmac>
       → routes/payments.js verifies HMAC ✓
       → updatePaymentStatus('completed'), markOrdersPaid
  → stub redirects browser to successUrl
[browser] lands on /orders.html?payment=success&session_id=...
  → orders.js detects ?payment=success → shows banner → pollPaymentStatus()
  → polls GET /api/payments/status/:sessionId
  → finds completed payment → fetches orders → banner disappears → orders show as paid

[developer] clicks "Simulate failure" instead
  → POST /stub/payment/simulate  body: ref=<uuid>&outcome=failure
  → stub redirects browser to failureUrl (no webhook fired)
[browser] lands on /orders.html?payment=failed&session_id=...
  → orders.js detects ?payment=failed → shows failure banner → orders remain unpaid
```

---

## Error States

| Condition | Stub response |
|-----------|---------------|
| `GET /stub/payment/ui` with unknown `ref` | 404, plain text message |
| `POST /stub/payment/simulate` with unknown `ref` | 410, plain text message (already processed) |
| `fireWebhook` fetch fails (server not yet ready) | Error propagates to simulate handler → 500; browser does not redirect |

---

## Environment Variables Used

| Variable | Usage in stub |
|----------|---------------|
| `APP_BASE_URL` | Build `checkout_url` returned from checkout endpoint; build webhook URL in `fireWebhook` |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | Sign the webhook HMAC in `fireWebhook` — must match the value used by `verifyWebhookSignature` |

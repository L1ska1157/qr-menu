# API Contract: Payments

**Base path**: `/api/payments`
**Session**: All endpoints require a `session_id` query param.

---

## POST /api/payments/initiate

Initiates a payment for the session. Creates a `payments` row with status `pending` and returns a redirect URL to the external payment provider.

### Request Body

```json
{
  "order_ids": ["uuid"]
}
```

Pass one or more unpaid order IDs from the session. To pay all at once, include all unpaid order IDs.

### Response `200 OK`

```json
{
  "payment_id": "uuid",
  "redirect_url": "https://payment-provider.example.com/checkout/abc123",
  "amount_cents": 3850,
  "expires_at": "2026-04-06T19:52:00Z"
}
```

The frontend redirects the diner's browser to `redirect_url`. The provider is configured with:
- **Success URL**: `APP_BASE_URL/orders.html?payment=success&session_id=<uuid>`
- **Cancel/failure URL**: `APP_BASE_URL/orders.html?payment=failed&session_id=<uuid>`

On return, `orders.html` detects the `?payment=` query param and displays a success or failure banner. The page then polls `GET /api/payments/status/:session_id` every 3 seconds, up to 60 seconds, until the payment status is `completed`. If no confirmation arrives within 60 seconds, the page shows a "Taking longer than expected — your payment is being verified" message and provides a manual refresh option.

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `NO_UNPAID_ORDERS` | All orders in session already paid |
| `400` | `INVALID_ORDER_IDS` | One or more order IDs not found or belong to a different session |
| `409` | `PAYMENT_IN_PROGRESS` | A `pending` payment already exists for this session |
| `404` | `SESSION_NOT_FOUND` | `session_id` does not exist |

---

## POST /webhooks/payment

Server-to-server callback from the external payment provider. This is the **authoritative** confirmation of payment completion — it is the only mechanism that transitions a payment to `completed` status in the database. The success URL redirect alone is never trusted.

### Security

The endpoint MUST verify the request signature using the provider's HMAC mechanism before processing. Requests with missing or invalid signatures MUST be rejected with `400`. The signature secret is configured via `PAYMENT_PROVIDER_WEBHOOK_SECRET` environment variable.

### Request Body

Provider-specific payload. The `order_id` or `payment_id` passed as metadata during checkout session creation MUST be present in the payload to link the provider event to the internal payment record.

### Processing Rules

1. Verify signature — reject if invalid
2. Look up `payments` row by `provider_reference` or metadata `payment_id`
3. If payment status is already `completed`, return `200` immediately (idempotent — duplicate webhooks are ignored)
4. Mark payment `completed`, set `completed_at = now()`, store `provider_reference`
5. Mark covered orders `is_paid = true`, set `payment_id` FK on each order

### Response `200 OK`

Empty body. The provider expects a `200` to stop retrying.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Signature verification failed |
| `404` | Payment record not found for the provided reference |

---

## GET /api/payments/status/:session_id

Returns all completed payments for the session, each with the order IDs it covered. Used by the orders page to confirm which orders were paid after returning from the provider.

### Response `200 OK`

```json
{
  "session_id": "uuid",
  "payments": [
    {
      "payment_id": "uuid",
      "provider_reference": "string",
      "amount_cents": 1950,
      "status": "completed",
      "completed_at": "2026-04-06T19:45:00Z",
      "paid_order_ids": ["uuid", "uuid"]
    }
  ]
}
```

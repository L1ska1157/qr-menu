# API Contract: Orders

**Base path**: `/api/orders`
**Session**: All endpoints require a `session_id` query param.

---

## POST /api/orders

Submits a new order for the active session. Creates an `orders` row and one `order_items` row per line item. Clears all `cart_items` rows for the session after the order is created.

### Request Body

```json
{
  "items": [
    { "menu_item_id": "uuid", "quantity": 2 },
    { "menu_item_id": "uuid", "quantity": 1 }
  ]
}
```

### Response `201 Created`

```json
{
  "order_id": "uuid",
  "session_id": "uuid",
  "total_cents": 1950,
  "placed_at": "2026-04-06T19:32:00Z",
  "items": [
    {
      "menu_item_id": "uuid",
      "name": "Bruschetta",
      "quantity": 2,
      "unit_price_cents": 650,
      "line_total_cents": 1300
    }
  ]
}
```

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `EMPTY_ORDER` | `items` array is empty |
| `400` | `ITEM_UNAVAILABLE` | One or more items have `is_available = false`; response includes `unavailable_item_ids` array |
| `400` | `INVALID_QUANTITY` | Quantity < 1 for any item |
| `404` | `SESSION_NOT_FOUND` | `session_id` does not exist |
| `409` | `SESSION_CLOSED` | Session status is `closed` |

---

## GET /api/orders

Returns all orders for the session (paid and unpaid), ordered by `placed_at` ascending. Used to populate the orders page. `unpaid_total_cents` is the sum of `total_cents` for orders where `is_paid = false`.

### Response `200 OK`

```json
{
  "session_id": "uuid",
  "orders": [
    {
      "order_id": "uuid",
      "placed_at": "2026-04-06T19:32:00Z",
      "total_cents": 1950,
      "is_paid": false,
      "items": [ { "name": "Bruschetta", "quantity": 2, "line_total_cents": 1300 } ]
    }
  ],
  "unpaid_total_cents": 3850
}
```

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `INVALID_SESSION_ID` | `session_id` is missing or not a valid UUID |
| `404` | `SESSION_NOT_FOUND` | `session_id` does not exist |
| `409` | `SESSION_CLOSED` | Session has been closed by the waiter |

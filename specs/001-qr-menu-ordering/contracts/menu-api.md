# API Contract: Menu

**Base path**: `/api/menu`
**Session**: All endpoints require a `session_id` query param identifying the active table session.

---

## GET /api/menu?session_id=<uuid>

Returns the full menu grouped by category, in display order. All items are included regardless of availability — the frontend uses `is_available` to render unavailable items in grey with a "SOLD OUT" label. Categories with no items at all are excluded; categories where all items are unavailable are also excluded.

### Response `200 OK`

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Starters",
      "display_order": 1,
      "items": [
        {
          "id": "uuid",
          "name": "Bruschetta",
          "description": "Toasted bread with tomato and basil",
          "ingredients": ["bread", "tomato", "basil", "olive oil"],
          "prep_time_minutes": 8,
          "price_cents": 650,
          "is_available": true
        }
      ]
    }
  ]
}
```

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| `404` | `SESSION_NOT_FOUND` | `session_id` does not exist |
| `409` | `SESSION_CLOSED` | Session has been closed by the waiter |

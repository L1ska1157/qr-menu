# API Contract: Waiter Requests

**Base path**: `/api/waiter`
**Session**: All endpoints require a `session_id` query param.

---

## POST /api/waiter/call

Submits a "Call Waiter" request for the active session. Enforces a 2-minute cooldown per session.

### Request Body

_Empty body — no payload required._

### Response `201 Created`

```json
{
  "request_id": "uuid",
  "session_id": "uuid",
  "table_number": 5,
  "requested_at": "2026-04-06T19:38:00Z",
  "cooldown_until": "2026-04-06T19:40:00Z"
}
```

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| `429` | `COOLDOWN_ACTIVE` | A request was submitted within the last 120 seconds; response includes `cooldown_remaining_seconds` |
| `404` | `SESSION_NOT_FOUND` | `session_id` does not exist |

---

## GET /api/waiter/status

Returns the current cooldown state for the session. Used by the frontend to initialise the button state on page load.

### Response `200 OK`

```json
{
  "session_id": "uuid",
  "cooldown_active": true,
  "cooldown_remaining_seconds": 87,
  "last_request_at": "2026-04-06T19:38:00Z"
}
```

If no request has been made this session:

```json
{
  "session_id": "uuid",
  "cooldown_active": false,
  "cooldown_remaining_seconds": 0,
  "last_request_at": null
}
```

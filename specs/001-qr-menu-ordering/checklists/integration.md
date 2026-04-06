# Integration Requirements Quality Checklist: QR Code Restaurant Menu & Ordering System

**Purpose**: Lightweight pre-tasks sanity check — validates that integration and external dependency requirements are complete, clear, and internally consistent before task breakdown
**Created**: 2026-04-06
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [contracts/payment-api.md](../contracts/payment-api.md) · [research.md](../research.md)
**Audience**: Author self-review
**Focus**: Integration & external dependencies

## Payment Provider Contract Completeness

- [x] CHK024 - Is a webhook endpoint (`POST /webhooks/payment`) documented in the API contracts? The research.md mandates it as the authoritative payment confirmation mechanism, but it is absent from `contracts/payment-api.md`. [Gap, Conflict — research.md vs contracts/payment-api.md] ✓ Added to payment-api.md
- [ ] CHK025 - Are requirements specified for how the webhook endpoint authenticates incoming provider callbacks (e.g., HMAC signature verification, shared secret)? [Gap, Spec §FR-009]
- [ ] CHK026 - Is the `order_id`/`payment_id` metadata that must be passed to the provider on checkout session creation documented in the contract as a required field? [Completeness, contracts/payment-api.md §POST /api/payments/initiate]
- [ ] CHK027 - Are requirements defined for what the server does when the external payment provider returns an error during checkout session creation (e.g., provider 5xx, network timeout)? [Gap, Edge Case]
- [ ] CHK028 - Is the checkout session expiry (`expires_at` in the `POST /api/payments/initiate` response) defined — what happens if the diner does not complete payment before the provider session expires? [Clarity, contracts/payment-api.md]
- [ ] CHK029 - Are requirements defined for the `PAYMENT_IN_PROGRESS` conflict resolution — can a pending payment be cancelled or superseded, and if so, how? [Clarity, Spec §FR-009, contracts/payment-api.md]

## Webhook & Polling Requirements

- [x] CHK030 - Is the polling behaviour on the success return page specified — what interval, what timeout, and what the diner sees if the webhook never arrives? [Gap, research.md §Payment Pattern] ✓ Defined in payment-api.md: poll every 3s, 60s timeout, fallback message
- [x] CHK031 - Are requirements defined for handling a delayed or missing webhook (e.g., provider outage) — does the diner get stuck on "pending confirmation" indefinitely? [Gap, Edge Case] ✓ Defined: 60s timeout shows "Taking longer than expected" + manual refresh
- [ ] CHK032 - Is the duplicate webhook delivery scenario addressed — if the provider fires the webhook more than once for the same payment, are requirements specified to prevent the payment from being marked completed multiple times? [Gap, Edge Case]

## Session Token Lifecycle Requirements

- [ ] CHK033 - Are requirements defined for who generates session tokens and how they are delivered into the `table_sessions` table (e.g., a staff-facing admin tool, a script, manual DB entry)? [Gap, Spec §FR-013, data-model.md]
- [ ] CHK034 - Is the QR code printing/regeneration process specified — when tokens are rotated, are requirements stated for how updated QR codes reach physical tables? [Gap, Spec §FR-013]
- [ ] CHK035 - Are requirements defined for the token expiry window — is `SESSION_TOKEN_EXPIRY_HOURS` documented in the spec or just in `quickstart.md` (an operational file)? [Completeness, Spec §FR-018]
- [ ] CHK036 - Is it specified whether a table can have more than one active (non-expired) session token simultaneously (e.g., during a token rotation overlap)? [Clarity, data-model.md §table_sessions]

## External Dependency Failure Modes

- [ ] CHK037 - Are requirements defined for the diner's experience when the PostgreSQL database is unreachable during a session token lookup (menu page load failure scenario)? [Gap, Edge Case]
- [ ] CHK038 - Are requirements specified for the case where the Alpine.js CDN is unavailable — does the frontend degrade gracefully, and is this addressed in requirements? [Gap, Assumption — research.md §Frontend Framework]
- [ ] CHK039 - Are timeout requirements defined for outbound calls from the backend to the external payment provider? [Gap, Completeness]

## Contract Consistency

- [x] CHK040 - Is the `GET /payment/success` return URL contract consistent with the research decision that the success redirect alone must never confirm payment — does the contract specify "pending confirmation" state rather than immediate success? [Consistency — research.md vs contracts/payment-api.md §GET /payment/success] ✓ Updated to "pending confirmation" with polling specs
- [ ] CHK041 - Are the required environment variables (`PAYMENT_PROVIDER_URL`, `PAYMENT_PROVIDER_SECRET`, `SESSION_TOKEN_EXPIRY_HOURS`) documented as explicit requirements in the spec or plan, rather than only appearing in `quickstart.md`? [Completeness, plan.md §Technical Context]
- [ ] CHK042 - Is the `PaymentService` provider abstraction layer requirement documented anywhere beyond research.md — should it appear as an explicit requirement in plan.md so it survives into task breakdown? [Completeness, research.md §Payment Pattern]

## Notes

- Check items off as completed: `[x]`
- Add findings or update notes inline after each item
- **CHK024** is a confirmed gap — `POST /webhooks/payment` must be added to `contracts/payment-api.md` before running `/speckit-tasks`
- **CHK030–CHK032** (webhook/polling) are the highest-risk unresolved area: financial correctness depends on getting this right
- Items marked `[Gap]` indicate requirements not yet present — add to spec/contracts before task breakdown
- Items marked `[Conflict]` indicate an inconsistency between two documents that must be resolved

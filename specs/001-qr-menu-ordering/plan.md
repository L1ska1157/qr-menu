# Implementation Plan: QR Code Restaurant Menu & Ordering System

**Branch**: `001-qr-menu-ordering` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-qr-menu-ordering/spec.md`

## Summary

A web-based restaurant ordering system where diners scan a per-table QR code to access a mobile-optimised menu, build a cart across multiple rounds, pay via external provider redirect, and call for waiter assistance. Built with Node.js + Express backend, Alpine.js frontend, and PostgreSQL for all persistent state. No app installation required; session identity is derived from a time-limited signed token embedded in the QR code URL.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), ES2022 (frontend, no build step)
**Primary Dependencies**: Express 4, pg (node-postgres), Alpine.js 3 (CDN), dotenv
**Storage**: PostgreSQL 15 — relational schema for tables, menu, orders, payments, waiter requests
**Testing**: Jest + supertest (backend integration); no frontend test framework (plain DOM assertions)
**Target Platform**: Web — Node.js server (Linux), mobile browser clients (iOS Safari, Android Chrome)
**Project Type**: Web application (backend API + server-rendered/CDN-enhanced frontend)
**Performance Goals**: Menu page load ≤ 3s on mobile (SC-001); order submission ≤ 3 min end-to-end (SC-002); waiter request ack ≤ 2s (SC-005)
**Constraints**: Mobile-first responsive layout; no app install; lean dependencies (no ORM, no full SPA framework); single currency; single language
**Scale/Scope**: Single restaurant; tens of tables; hundreds of concurrent diners at peak service; menu up to ~100 items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is currently a blank template with no project-specific rules defined. No gates to evaluate. **Status: Pass (no constraints to violate).**

Post-Phase 1 re-check: No constitution violations identified in the design. The lean-dependency and direct-SQL approach aligns with YAGNI principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-qr-menu-ordering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── menu-api.md
│   ├── order-api.md
│   ├── payment-api.md
│   └── waiter-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/          # env, db pool, jwt config
│   ├── db/              # SQL migrations, seed data, query helpers
│   ├── routes/          # Express route handlers (menu, order, payment, waiter, session)
│   ├── middleware/       # session token validation, error handler
│   └── services/        # business logic (cart validation, payment initiation, cooldown)
├── tests/
│   ├── integration/     # supertest API tests per route
│   └── unit/            # service logic unit tests
└── package.json

frontend/
├── public/
│   ├── index.html       # menu page (Alpine.js, loaded via QR code URL)
│   ├── cart.html        # cart review + order submission
│   ├── bill.html        # itemized bill + payment initiation
│   ├── confirmation.html # payment success/failure return page
│   └── error.html       # invalid/expired session error page
├── js/
│   ├── menu.js          # menu browsing, category nav, add-to-cart logic
│   ├── cart.js          # cart state, quantity management, order submit
│   ├── bill.js          # bill fetch, payment redirect initiation
│   └── waiter.js        # call waiter button + cooldown state
└── css/
    └── styles.css       # mobile-first responsive styles
```

**Structure Decision**: Web application (Option 2). Backend is an Express API serving JSON. Frontend is static HTML files enhanced with Alpine.js loaded from CDN — no build toolchain required, keeping dependencies lean and deployment simple.

## Complexity Tracking

> No constitution violations to justify. Section left empty per template guidance.

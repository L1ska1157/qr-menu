# Quickstart: QR Code Restaurant Menu & Ordering System

**Branch**: `001-qr-menu-ordering`

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15
- npm

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd qr-menu

# Install backend dependencies
cd backend && npm install && cd ..
```

---

## 2. Configure Environment

Copy the example env file and fill in values:

```bash
cp backend/.env.example backend/.env
```

```dotenv
# backend/.env
DATABASE_URL=postgresql://localhost:5432/qrmenu
RESTAURANT_NAME=My Restaurant   # shown on the scan landing page welcome message
PORT=3000

# Payment provider (configure for your provider)
PAYMENT_PROVIDER_URL=https://your-payment-provider.example.com/checkout
PAYMENT_PROVIDER_SECRET=your-provider-api-key
APP_BASE_URL=https://your-app-domain.example.com
```

---

## 3. Database Setup

```bash
# Create database
createdb qrmenu

# Run migrations
cd backend && npm run db:migrate

# (Optional) Seed with sample menu data
npm run db:seed
```

---

## 4. Run Development Server

```bash
# From backend/
npm run dev
```

Backend runs at `http://localhost:3000`. Frontend static files are served from `frontend/public/`.

---

## 5. Generate a Test QR Code

```bash
# Get the QR code URL for table number 5 (for testing)
npm run qr:generate -- --table 5
```

Output: a URL like `http://localhost:3000/?table=<uuid>` (permanent, never changes)

Open this URL in a mobile browser (or use browser DevTools mobile emulation) to test the diner flow.

---

## 6. Run Tests

```bash
# From backend/
npm test                 # all tests
npm run test:unit        # unit tests only
npm run test:integration # integration tests (requires running DB)
```

---

## Key URLs

| Path | Purpose |
|------|---------|
| `/?token=<jwt>` | Diner entry point (QR code destination) |
| `/menu` | Menu browsing page |
| `/cart` | Cart review + order submission |
| `/bill` | Itemized bill + payment initiation |
| `/payment/success` | Payment return (success) |
| `/payment/failure` | Payment return (failure/cancel) |
| `/error` | Invalid or expired session error page |
| `/api/menu` | Menu API |
| `/api/orders` | Orders API |
| `/api/payments/*` | Payments API |
| `/api/waiter/*` | Waiter request API |

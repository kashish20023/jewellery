# AGENTS.md — Development Guidelines & Workspace Invariants

## Repository Overview
- **Project**: Premium Jewellery Domestic Indian Storefront (English / INR)
- **Status**: Phase 0 — Discovery and Implementation Contract Complete
- **Root Directory**: `/Users/ideaind/.gemini/antigravity/scratch/premium-jewellery`
- **Target Stack**: TypeScript, Next.js (App Router), React, Tailwind CSS, PostgreSQL (Prisma ORM), Vitest, Playwright.

## Core Directives & Boundaries
1. **Scope Authority**:
   - Scope is governed by the approved PRD and `docs/DECISIONS.md`.
   - Supported: Domestic Indian storefront (INR), responsive mobile-first catalogue, guest wishlist (local storage), guest checkout, one hosted payment gateway (Razorpay sandbox), admin portal with RBAC, WhatsApp consultation builder, callback requests, appointment requests.
   - Excluded: Customer accounts, AR virtual try-on, AI styling, live metal rates/scrapers, ERP sync, international commerce/currencies, automated WhatsApp bots/chatbots.

2. **Commerce & Data Invariants**:
   - **Monetary Values**: All money stored strictly as integer minor units (`paise` in INR, 1 INR = 100 paise).
   - **Threshold Logic**: `pricePaise >= highValueThresholdPaise`.
   - **Policy Engine**: Centralized server-side `evaluateProductPolicy()` function. `enquiryOnly` or `ON_REQUEST` disables purchase irrespective of frontend buttons.
   - **No Hidden Price Leaks**: Public responses, HTML, JSON-LD, and analytics must never expose `ON_REQUEST` or internal cost prices.
   - **Stock & Reservation**: Atomic reservations with expiration timestamps (15 mins) during checkout. No overselling. Handling late payments via reconciliation state.
   - **Order Security**: Guest order tracking uses opaque capability tokens (`uuidv4`), never sequential numeric IDs.
   - **Payment Verification**: Webhook raw body HMAC signature verification is mandatory; redirect success alone does not prove payment.

3. **Phase-by-Phase Discipline**:
   - Follow the 8-phase contract (Phase 0 to Phase 7).
   - Never implement ahead of the current phase prompt.
   - Maintain `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/TEST_REPORT.md`, and `docs/IMPLEMENTATION_PLAN.md`.
   - Do not claim a test or integration works without real test execution and evidence. Mark missing credentials or services as `BLOCKED`.

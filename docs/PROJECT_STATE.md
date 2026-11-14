# PROJECT_STATE.md — Current Project Status & Baseline Report

**Last Updated**: 2026-11-14T14:40:00+05:30  
**Current Phase**: Phase 0 — Discovery and Implementation Contract  
**Active Worktree**: `/Users/ideaind/Desktop/premium-jewellery` (branch: `main`)  
**Git Head**: Initialized repository

---

## 1. Environment & Runtime Baseline

| Tool / Runtime | Discovered Version | Status |
| :--- | :--- | :--- |
| **Node.js** | `v26.3.0` | Verified available |
| **pnpm** | `11.7.0` | Verified available (Preferred package manager) |
| **npm** | `11.16.0` | Verified available |
| **Git** | `2.54.0` | Initialized at repository root |
| **Operating System** | macOS (Darwin 24.x) | Verified |
| **PostgreSQL** | Local daemon / Docker | To be provisioned in Phase 1 for disposable test DB |

---

## 2. Baseline Commands & Verification Results

| Command | Exit Code | Status | Notes / Output |
| :--- | :--- | :--- | :--- |
| `node -v` | 0 | **PASS** | `v26.3.0` |
| `pnpm -v` | 0 | **PASS** | `11.7.0` |
| `git status` | 0 | **PASS** | Clean initial repository on branch `main` |
| `pnpm run lint` | 1 | **NOT CONFIGURED** | No `package.json` yet (Phase 0 scope restriction preserved) |
| `pnpm run typecheck` | 1 | **NOT CONFIGURED** | No `tsconfig.json` yet (Phase 0 scope restriction preserved) |
| `pnpm run test` | 1 | **NOT CONFIGURED** | No test runner yet (Phase 0 scope restriction preserved) |
| `pnpm run build` | 1 | **NOT CONFIGURED** | No build script yet (Phase 0 scope restriction preserved) |

*Note: Per Phase 0 constraints, no application code or build dependencies were prematurely installed. Missing scripts are formally logged as setup tasks for Phase 1.*

---

## 3. Architecture & Route Status

### Target Framework & Stack
- **Framework**: Next.js 15+ (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom design tokens (Warm Ivory, Charcoal, Restrained Antique Gold)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Testing**: Vitest (Unit/Integration), Playwright (E2E / Browser Smoke Matrix S01–S30)
- **Payment Gateway**: Single hosted payment gateway adapter (Razorpay Sandbox; Cashfree as alternative)
- **State & Data Store**: Local storage for guest wishlist; server-authoritative guest carts & orders

### Planned Routes
| Route | Type | Description | Current Status |
| :--- | :--- | :--- | :--- |
| `/` | Storefront | Editorial homepage, collections, featured jewellery | Planned (Phase 2) |
| `/collections` | Storefront | Collection index | Planned (Phase 2) |
| `/collections/[slug]` | Storefront | Collection listing with URL-preserved filters | Planned (Phase 3) |
| `/products/[slug]` | Storefront | PDP with gallery, variant selector, policy CTA | Planned (Phase 2/3) |
| `/wishlist` | Storefront | Guest wishlist backed by localStorage | Planned (Phase 3) |
| `/cart` | Storefront | Persistent guest cart drawer / page | Planned (Phase 5) |
| `/checkout` | Storefront | Server-validated guest checkout & gateway handoff | Planned (Phase 5) |
| `/order/[token]` | Storefront | Guest order confirmation with capability token | Planned (Phase 5) |
| `/consultation` | Storefront | Callback & appointment booking form | Planned (Phase 4) |
| `/api/policy/evaluate` | API | Server-authoritative product policy evaluator | Planned (Phase 3) |
| `/api/checkout/session`| API | Idempotent checkout session & inventory reserve | Planned (Phase 5) |
| `/api/webhooks/payment`| API | Raw-body HMAC verified payment webhook | Planned (Phase 5) |
| `/api/enquiries` | API | Rate-limited callback/appointment lead endpoint | Planned (Phase 4) |
| `/admin/*` | Admin | Secure RBAC portal for products, orders, leads | Planned (Phase 4) |
| `/api/health` | API | Unauthenticated liveness/readiness health check | Planned (Phase 1) |

---

## 4. Smoke Test Matrix Tracking (S01 – S30)

| ID | Scenario | Expected Outcome | Layer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | Home & navigation at 390/1440 px | Useful content, working links, no overflow | Browser | Planned (Phase 2) |
| **S02** | Search/filter/sort & refresh/back | URL state retained accurately | Browser/API | Planned (Phase 3) |
| **S03** | No results, unknown slug, image failure | Semantic empty/404/fallback states | Browser | Planned (Phase 2) |
| **S04** | Variant change | Dynamic SKU, price, stock, WhatsApp message | Browser/Unit | Planned (Phase 3) |
| **S05** | Zoom dialog keyboard/touch & Escape | Modal gallery with restored focus | Browser/Manual | Planned (Phase 2) |
| **S06** | Price below/equal/above threshold | WhatsApp appears at `>=` threshold; buy intact | Unit/Browser | Planned (Phase 3) |
| **S07** | `enquiryOnly` at low price | CTA and server both block purchase | API/Browser | Planned (Phase 3) |
| **S08** | Price on request | No zero price; no price leak in HTML/JSON-LD | API/Browser | Planned (Phase 3) |
| **S09** | WhatsApp special characters | Valid `wa.me` format; URL-encoded payload | Unit/Browser | Planned (Phase 4) |
| **S10** | WhatsApp tracking fails | Link functions; no fake lead created | Browser | Planned (Phase 4) |
| **S11** | Callback success & DB failure | Persisted lead; honest retry on failure | Integration | Planned (Phase 4) |
| **S12** | Appointment request | Persisted request (never confirmed slot) | Integration | Planned (Phase 4) |
| **S13** | Admin auth & RBAC permissions | 401/403 or secure redirect; no data leak | API | Planned (Phase 4) |
| **S14** | Admin updates price/stock/policy | Saved value, audit record, cache invalidation | Integration | Planned (Phase 4) |
| **S15** | Invalid upload & CSV rows | Rejected safely with line-level errors | API/Integration | Planned (Phase 4) |
| **S16** | Cart quantity & price tampering | Server totals recalculation; tamper rejected | API | Planned (Phase 5) |
| **S17** | Two buyers for final unit | Concurrent race test: atomic lock, no oversell | Integration | Planned (Phase 5) |
| **S18** | Payment sandbox success | Exactly one paid order and stock decrement | Integration | Planned (Phase 5) |
| **S19** | Payment fail/cancel/pending | Accurate UI, reservations released | Integration | Planned (Phase 5) |
| **S20** | Forged/duplicate/out-of-order webhook| Rejected invalid sig; duplicate idempotent | API/Integration | Planned (Phase 5) |
| **S21** | Refresh or redirect before callback | Eventual consistency; no fake success | Browser/API | Planned (Phase 5) |
| **S22** | Reservation expires then paid | Safe allocation or flagged reconciliation state | Integration | Planned (Phase 5) |
| **S23** | Receipt email outage | Order remains paid; failure logged for retry | Integration | Planned (Phase 5) |
| **S24** | Guest order identifier guessed | Opaque capability token prevents enumerations | API | Planned (Phase 5) |
| **S25** | Wishlist refresh & removal | localStorage persistence without duplication | Browser | Planned (Phase 3) |
| **S26** | Keyboard/reduced motion/sticky CTA | Visible focus, WCAG contrast, unblocked CTA | Browser/Manual | Planned (Phase 2) |
| **S27** | SEO & purchase analytics | Truthful Schema.org metadata; deduplicated buy | Integration | Planned (Phase 6) |
| **S28** | Production build & start | Clean Next.js standalone build & healthy runtime| CI/Runtime | Planned (Phase 6) |
| **S29** | Backup restore & rollback rehearsal | Disposable DB restore verification | Operations | Planned (Phase 7) |
| **S30** | Live authorised release check | Production checklist verification | Production | Planned (Phase 7) |

---

## 5. Next Steps
- Await client review of Phase 0 discovery documents.
- Execute **PHASE 1**: Application foundation, TypeScript/Next.js/Tailwind setup, PostgreSQL Prisma schema, deterministic test fixtures with boundary prices (9,999,900; 10,000,000; 10,000,100 paise), safe DTOs, health checks, and unit test runner.


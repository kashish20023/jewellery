# PROJECT_STATE.md — Current Project Status & Baseline Report

**Last Updated**: 2026-11-21T13:30:00+05:30  
**Current Phase**: Phase 6 (COMPLETE) + Brand Re-skin to Chudiwalas guidelines (2026-11-19, COMPLETE) + Homepage v2 editorial redesign + Poppins-only typography + Admin portal re-theme + Polki-Stories feature parity (variants by colour/purity, offers, price breakup, /shop) + master-prompt pass (variant URL, per-variant filters, mobile filter sheet, admin queues, order detail, photography/collections editor, test isolation) + photography upload (object storage or local fallback) + Add product form with variant/product archive + Palmonas-style redesign steps 1-4 complete, plus About page, checkout step indicator and light-background product photography across all fixtures (white canvas throughout; 201/201 tests) (2026-11-20, COMPLETE, uncommitted)  
**Active Worktree**: `/Users/ideaind/Desktop/premium-jewellery` (branch: `main`)  
**Git Head**: Uncommitted working tree (brand re-skin pending commit)  

---

## 1. Environment & Runtime Baseline

| Tool / Runtime | Discovered Version | Status |
| :--- | :--- | :--- |
| **Node.js** | `v26.3.0` | Verified available |
| **pnpm** | `11.7.0` | Verified active package manager |
| **npm** | `11.16.0` | Verified available |
| **Next.js** | `15.5.29` | Verified (`next build` compiling all 38 routes in 3.0s) |
| **React** | `19.3.1` | Installed & verified |
| **TypeScript** | `5.9.3` | Configured with strict mode (`tsc --noEmit` passing with 0 errors) |
| **Tailwind CSS** | `3.4.19` | Chudiwalas brand tokens: Olive (`#556B2F`), Burnt Orange (`#CC5500`), Ivory (`#F6F0E2`), Charcoal (`#1A1A1A`); font Poppins only; legacy `gold`/`plum`/`rose` scales aliased to brand |
| **Prisma ORM** | `6.19.3` | Synchronized with PostgreSQL 16 on port 5432 |
| **Vitest** | `3.2.7` | Passing (27 test suites, 181 tests passing in 3.05s) |
| **Git** | `2.54.0` | Clean repository tracking Phase 6 features |

---

## 2. Baseline Commands & Verification Results

| Command | Exit Code | Status | Notes / Output |
| :--- | :--- | :--- | :--- |
| `node -v` | 0 | **PASS** | `v26.3.0` |
| `pnpm -v` | 0 | **PASS** | `11.7.0` |
| `git status` | 0 | **PASS** | Clean working tree |
| `pnpm run lint` | 0 | **PASS** | ESLint verified: 0 warnings, 0 errors |
| `pnpm run typecheck` | 0 | **PASS** | `tsc --noEmit` completed with 0 errors |
| `pnpm run test` | 0 | **PASS** | 27 suites, 181 tests passing in 3.05s (unit + integration) |
| `pnpm run build` | 0 | **PASS** | `next build` compiled 38 routes cleanly in 3.0s |
| `pnpm run db:seed` | 0 | **PASS** | Seeded store settings and all deterministic fixtures |

---

## 3. Architecture & Route Status

### Route Status
| Route | Type | Description | Current Status |
| :--- | :--- | :--- | :--- |
| `/` | Storefront | Editorial homepage with Organization Schema.org JSON-LD | **LIVE & VERIFIED** |
| `/collections` | Storefront | Curated collection suites index with piece counts and metadata | **LIVE & VERIFIED** |
| `/collections/[slug]` | Storefront | Collection detail with URL filters (S02) & CollectionPage JSON-LD | **LIVE & VERIFIED** |
| `/products/[slug]` | Storefront | PDP with gallery, modal zoom (S05), variant switching (S04), Product JSON-LD | **LIVE & VERIFIED** |
| `/_not-found` | Storefront | Bespoke 404 page ("Piece Not Found") with recovery links | **LIVE & VERIFIED** |
| `/wishlist` | Storefront | Guest wishlist backed by localStorage with instant removal (S25) | **LIVE & VERIFIED** |
| `/cart` | Storefront | Full shopping bag page with line items, 3% GST breakdown, and checkout CTA | **LIVE & VERIFIED** |
| `/checkout` | Storefront | Server-validated guest checkout with `noindex` robots directive | **LIVE & VERIFIED** |
| `/order/[token]` | Storefront | Guest order confirmation with deduplicated zero-PII analytics (S27) | **LIVE & VERIFIED** |
| `/consultation` | Storefront | Concierge consultation page with Callback & Appointment booking | **LIVE & VERIFIED** |
| `/robots.txt` | Metadata | Dynamic robots.txt disallowing private/admin paths | **LIVE & VERIFIED** |
| `/sitemap.xml` | Metadata | Dynamic sitemap indexing all public storefront and collection routes | **LIVE & VERIFIED** |
| `/admin` | Admin Portal | Executive Salon Dashboard with metrics and quick actions | **LIVE & VERIFIED** |
| `/admin/login` | Admin Portal | Secure authentication form with test fixture quick-fill | **LIVE & VERIFIED** |
| `/admin/orders` | Admin Portal | Salon orders management, payment review & courier tracking | **LIVE & VERIFIED** |
| `/admin/products` | Admin Portal | Product & variant inventory, pricing editor, and audit logging | **LIVE & VERIFIED** |
| `/admin/products/import` | Admin Portal | Catalogue CSV bulk importer with line-level error reporting (S15) | **LIVE & VERIFIED** |
| `/admin/leads` | Admin Portal | Concierge callback and appointment status management (S11/S12) | **LIVE & VERIFIED** |
| `/admin/settings` | Admin Portal | OWNER-restricted store settings, threshold, and GST manager (S13) | **LIVE & VERIFIED** |
| `/api/checkout/initialize`| API | Server price recalculation & 15-min atomic reservation (S16, S17) | **LIVE & VERIFIED** |
| `/api/checkout/verify` | API | Client redirect HMAC payment verification & stock commit (S18) | **LIVE & VERIFIED** |
| `/api/webhooks/payment`| API | Raw-body HMAC verified payment webhook with idempotency (S20, S22) | **LIVE & VERIFIED** |
| `/api/orders/[token]` | API | Opaque capability token guest order lookup (S24) | **LIVE & VERIFIED** |
| `/api/admin/orders` | API | Admin orders query with status filtering | **LIVE & VERIFIED** |
| `/api/admin/orders/[id]`| API | Admin order fulfilment status & tracking updater | **LIVE & VERIFIED** |
| `/api/admin/auth/login` | API | Admin authentication & HTTP-only HMAC session issuer | **LIVE & VERIFIED** |
| `/api/admin/auth/logout`| API | Session terminator & cookie invalidator | **LIVE & VERIFIED** |
| `/api/admin/auth/me` | API | Session validator & identity resolver | **LIVE & VERIFIED** |
| `/api/admin/products` | API | List & create products (MANAGER/OWNER) | **LIVE & VERIFIED** |
| `/api/admin/products/[id]` | API | Variant price/stock/policy update with audit log (S14) | **LIVE & VERIFIED** |
| `/api/admin/products/import` | API | CSV validation & batch upsert endpoint (S15) | **LIVE & VERIFIED** |
| `/api/admin/settings` | API | OWNER-restricted store policy & threshold endpoint (S13) | **LIVE & VERIFIED** |
| `/api/admin/leads` | API | Concierge leads list and status transition updater | **LIVE & VERIFIED** |
| `/api/enquiries/callback` | API | Rate-limited callback request endpoint (S11) | **LIVE & VERIFIED** |
| `/api/enquiries/appointment` | API | Viewing appointment request endpoint (S12) | **LIVE & VERIFIED** |
| `/api/enquiries/whatsapp-intent` | API | Non-blocking WhatsApp intent click logger (S10) | **LIVE & VERIFIED** |
| `/api/policy/evaluate` | API | Server-authoritative product policy evaluator (S06, S07, S08) | **LIVE & VERIFIED** |
| `/api/health` | API | Unauthenticated liveness/readiness health check | **LIVE & VERIFIED** |

---

## 4. Smoke Test Matrix Tracking (S01 – S30)

| ID | Scenario | Expected Outcome | Layer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | Home & navigation at 390/1440 px | Useful content, working links, no overflow | Browser | **PASS** |
| **S02** | Search/filter/sort & refresh/back | URL state retained accurately | Browser/API | **PASS** |
| **S03** | No results, unknown slug, image failure | Semantic empty/404/fallback states | Browser | **PASS** |
| **S04** | Variant change | Dynamic SKU, price, stock, WhatsApp message | Browser/Unit | **PASS** |
| **S05** | Zoom dialog keyboard/touch & Escape | Modal gallery with restored focus | Browser/Manual | **PASS** |
| **S06** | Price below/equal/above threshold | WhatsApp appears at `>=` threshold; buy intact | Unit/Browser | **PASS** |
| **S07** | `enquiryOnly` at low price | CTA and server both block purchase | API/Browser | **PASS** |
| **S08** | Price on request | No zero price; no price leak in HTML/JSON-LD | API/Browser | **PASS** |
| **S09** | WhatsApp special characters | Valid `wa.me` format; URL-encoded payload | Unit/Browser | **PASS** |
| **S10** | WhatsApp tracking fails | Link functions; no fake lead created | Browser/Unit | **PASS** |
| **S11** | Callback success & DB failure | Persisted lead; honest retry on failure | Integration | **PASS** |
| **S12** | Appointment request | Persisted request (never confirmed slot) | Integration | **PASS** |
| **S13** | Admin auth & RBAC permissions | 401/403 or secure redirect; no data leak | API/Integration| **PASS** |
| **S14** | Admin updates price/stock/policy | Saved value, audit record, cache invalidation | Integration | **PASS** |
| **S15** | Invalid upload & CSV rows | Rejected safely with line-level errors | API/Integration| **PASS** |
| **S16** | Cart quantity & price tampering | Server totals recalculation; tamper rejected | API/Integration| **PASS** |
| **S17** | Two buyers for final unit | Concurrent race test: atomic lock, no oversell | Integration | **PASS** |
| **S18** | Payment sandbox success | Exactly one paid order and stock decrement | Integration | **PASS** |
| **S19** | Payment fail/cancel/pending | Accurate UI, reservations released | Integration | **PASS** |
| **S20** | Forged/duplicate/out-of-order webhook| Rejected invalid sig; duplicate idempotent | API/Integration| **PASS** |
| **S21** | Refresh or redirect before callback | Eventual consistency; no fake success | Browser/API | **PASS** |
| **S22** | Reservation expires then paid | Safe allocation or flagged reconciliation state | Integration | **PASS** |
| **S23** | Receipt email outage | Order remains paid; failure logged for retry | Integration | **PASS** |
| **S24** | Guest order identifier guessed | Opaque capability token prevents enumerations | API/Integration| **PASS** |
| **S25** | Wishlist refresh & removal | localStorage persistence without duplication | Browser | **PASS** |
| **S26** | Keyboard/reduced motion/sticky CTA | Visible focus, WCAG contrast, unblocked CTA | Browser/Manual | **PASS** |
| **S27** | SEO & purchase analytics | Truthful Schema.org metadata; deduplicated buy | Integration/Unit | **PASS** |
| **S28** | Production build & start | Clean Next.js standalone build & healthy runtime| CI/Runtime | **PASS** |
| **S29** | Backup restore & rollback rehearsal | Disposable DB restore verification | Operations | Planned (Phase 7) |
| **S30** | Live authorised release check | Production checklist verification | Production | Planned (Phase 7) |

---

## 5. Ultra-Smooth Website Optimization Audit & Enhancements

Per the Ultra-Smooth Website Optimization contract, all animations, scrolling, micro-interactions, and rendering lifecycles were audited and enhanced with zero visual redesign:

1. **Context Stability & Re-render Prevention**:
   - `CartContext.tsx` & `WishlistContext.tsx`: All mutation methods stabilized with `useCallback`; provider `value` memoized with `useMemo` to eliminate cascading tree re-renders across consumers.
   - `ProductCard.tsx`: Replaced JavaScript `isHovered` React state updates with pure CSS GPU-accelerated opacity/scale transitions, wrapped component with `React.memo`.

2. **Ultra-Smooth Scrolling & Event Handling**:
   - `Header.tsx`: Replaced unthrottled scroll listeners with a `requestAnimationFrame` + `{ passive: true }` listener paired with state-diffing, eliminating continuous React re-renders on scroll.
   - Global HTML: Added `scroll-behavior: smooth;` with `@media (prefers-reduced-motion: reduce)` fallbacks.

3. **60FPS GPU-Accelerated Micro-Interactions & Transitions**:
   - `CartDrawer.tsx` & `CollectionFilters.tsx`: Converted mobile filter drawer and cart drawer from abrupt conditional unmounting to luxury GPU-accelerated slide-in transitions with `ease-[cubic-bezier(0.16,1,0.3,1)]` and `[will-change:transform]`.
   - `ProductDetails.tsx`: Upgraded craftsmanship, specification, and shipping accordions to 60fps CSS grid-rows transitions (`grid-rows-[1fr]` vs `grid-rows-[0fr]`), eliminating sudden layout jumps.
   - `ZoomModal.tsx`: Promoted the high-resolution image zoom stage to a hardware-accelerated compositor layer (`translateZ(0)` and `will-change: transform`).
   - Buttons: Enhanced `.btn-gold`, `.btn-charcoal`, and `.btn-outline-gold` with tactile micro-press feedback (`active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`).

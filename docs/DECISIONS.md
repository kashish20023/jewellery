# DECISIONS.md — Architectural Decisions, Confirmed Facts & Launch Blockers

**Project**: Premium Domestic Indian Jewellery Website  
**Date**: 2026-11-14  
**Status**: Phase 1 Foundation Verified  

---

## 1. Confirmed Scope & Business Facts

These decisions are derived directly from the Master Prompt and approved PRD:

| Area | Confirmed Fact / Constraint | Source / Authority |
| :--- | :--- | :--- |
| **Market & Currency** | Domestic Indian market only; English language; Indian Rupee (`INR`) only. | PRD & Master Prompt |
| **Store Count** | Single store, single brand. | PRD & Master Prompt |
| **Monetary Representation** | All currency stored strictly in 64-bit integer minor units (`paise`). 1 INR = 100 paise. Floating point numbers prohibited for money calculations. | Master Prompt |
| **Catalog Limits** | Scaled for up to 100 parent products, up to 5 variants per product, up to 6 images per product. | PRD & Master Prompt |
| **Guest Flow** | Guest wishlist (stored in client `localStorage`) and Guest Checkout (no forced user account registration). | PRD & Master Prompt |
| **Threshold Logic** | Comparison is strictly `pricePaise >= highValueThresholdPaise` (greater than or equal). At or above threshold, WhatsApp consultation is displayed alongside the Buy action. High price alone does **not** disable purchase. | Master Prompt |
| **Enquiry Enforcements** | `enquiryOnly = true` or `priceVisibility = ON_REQUEST` strictly disables purchase on both UI and server verification. | Master Prompt |
| **Zero Price Invariant** | Missing or invalid price must **never** default to 0 or permit a free order. | Master Prompt |
| **Data Leak Prevention** | Public API, HTML, JSON-LD, and analytics must never expose `ON_REQUEST` prices or internal cost margins. | Master Prompt |
| **Payment Flow** | Single hosted payment gateway with sandbox integration (no customer card data stored locally). | Master Prompt |
| **Guest Order Access** | Guest orders accessible strictly via cryptographic opaque capability token (`uuidv4`); sequential IDs are forbidden in public endpoints. | Master Prompt |
| **WhatsApp Integration** | Server-constructed `https://wa.me/{digitsOnly}?text={encoded}` deep-link to human salon concierge. No automated messaging in this release. | Master Prompt |
| **Appointment Requests** | Handled as customer appointment *requests*, not confirmed calendar slots; staff confirms manually. | Master Prompt |

---

## 2. Technical & Engineering Implementations (Phases 1, 2, 3, 4, & 5)

| Component | Implemented Technology | Verification / Outcome |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.5.29 (App Router) | Static & dynamic compilation verified (`next build` 36 routes in 3.3s) |
| **Language** | TypeScript 5.9.3 (Strict Mode) | `tsc --noEmit` verified with 0 errors |
| **Styling & Tokens** | Tailwind CSS 3.4.19 | Custom design tokens: Warm Ivory (`#FDFBF7`), Charcoal Noir (`#1A1A1A`), Antique Gold (`#C5A869`), Muted Cream (`#F5EFE6`) |
| **Database & ORM** | PostgreSQL 16.x + Prisma 6.19.3 | Database `jewellery_db` provisioned, schema pushed, connection validated |
| **Unit / Integration Testing**| Vitest 3.2.7 | 23 test suites, 132 tests passing in 2.81s |
| **Package Management** | pnpm 11.7.0 | Builds approved in `pnpm-workspace.yaml`, fast reproducible lockfile |
| **PDP Zoom Gallery (S05)** | Accessible Modal with Ref Focus Restoration | Keyboard navigation (ArrowLeft/Right, Escape) and focus restoration to the triggering button on close |
| **Image Resilience (S03)** | `ImageWithFallback` with Atelier Placeholder | Graceful replacement on asset load error with atelier placeholder icon and "Image In Atelier Archive" |
| **Mobile Ergonomics (S26)** | Fixed Sticky CTA on `< 768px` Viewports | Backdropped floating purchase bar with safe-area inset padding preventing content obstruction |
| **Catalogue Service (PRD-F02)** | Resilient Database / Fixture Fallback Layer | Multi-axis filtering by metal, in-stock availability, price range, keyword search, and sorting |
| **URL State Filter (S02)** | URL Search Parameters (`useSearchParams`) | Preserves `metal`, `sort`, `inStock`, `q` across browser refresh and back/forward navigation |
| **Variant Switching (S04)** | Dynamic Spec Sheet & Contextual WhatsApp | Real-time update of SKU code (`AUR-SOL-002-YG` $\to$ `RG`), stock, and URL-encoded WhatsApp deep link |
| **Policy Endpoint (PRD-F04)** | `/api/policy/evaluate` API Route | Server-authoritative validation preventing client-side price tampering or `enquiryOnly`/`ON_REQUEST` checkout bypass |
| **Guest Wishlist (PRD-F05/S25)** | Browser `localStorage` + React Context | Deduplicated local storage under key `aurum_guest_wishlist`, live badge sync, instant removal, zero PII |
| **WhatsApp Deep Links (PRD-F06/S09)** | `wa.me/{digits}?text={encoded}` Builder | Strict phone sanitization, safe URL encoding of newlines, ampersands, hashes, and Unicode characters |
| **Resilient Tracking (S10)** | Fire-and-forget Intent Wrapper | WhatsApp link navigates immediately without blocking; network error logged safely without corrupting UI |
| **Inquiries & Rate Limiting (S11)** | Sliding-Window IP Rate Limiter | Honest error reporting on DB failure; IP-based anti-spam rate limiting (5 req / 10 min) with 429 response |
| **Appointment Requests (S12)** | Viewing Consultation Engine | Persisted as `REQUESTED_UNCONFIRMED`, never automatic confirmed slot; staff manually confirms via phone/WhatsApp |
| **RBAC Authentication (S13)** | HMAC-SHA256 Stateless Session | Strict hierarchy (`OWNER > MANAGER > STAFF`); STAFF blocked from modifying store settings (403 Forbidden) |
| **Catalogue Admin & Audit (S14)** | Inline Editor & Audit Logger | Saves prices, stock, and policies with structured `AuditLog` records and Next.js cache revalidation |
| **Catalogue CSV Importer (S15)** | Line-by-Line Tokenizer & Validator | Line-level error reporting (row numbers, field names); rejects negative prices/stock and duplicate SKUs |
| **Guest Cart & Drawer (PRD-F10)** | Browser `localStorage` + React Context | Persistent guest bag under key `aurum_guest_cart`, animated slide-over drawer, optimistic GST calculation |
| **Server Cart Pricing (S16)** | Server-Authoritative Price Recalculator | Rejects client price overrides, recalculates 64-bit integer paise totals, blocks `enquiryOnly`/`ON_REQUEST` |
| **Atomic Inventory Lock (S17/PRD-F12)**| 15-Minute TTL Concurrency Engine | Zero overselling: concurrent buyers race for final unit; exactly one gets reservation, second rejected |
| **Payment Verification (S18/S19/S21)**| Razorpay Sandbox HMAC Adapter | Validates HMAC-SHA256 redirect signature; transitions order to PAID; releases stock on payment failure |
| **Webhook Security & Idempotency (S20)**| Raw Body HMAC SHA256 Validator | Rejects forged signatures with 400; idempotent replay returns 200 without duplicate inventory adjustments |
| **Late Payment Reallocation (S22)**| Stock Reallocation & Reconciliation State | Safely allocates stock if available after 15m hold expires; flags `RECONCILIATION_REQUIRED` if stock depleted |
| **Capability Token Lookup (S24)** | Cryptographic UUIDv4 Order Routing | Access restricted strictly to opaque capability token; sequential ID guesses rejected with 404 |
| **SEO & OpenGraph Engine (PRD-F16)** | Next.js Metadata API Helper | Canonical URL construction, `en_IN` OpenGraph, and `noindex` directives on private routes |
| **Schema.org Zero Leak (S08/S27)** | `constructProductJsonLd` / `JsonLd` | Strictly emits `"Upon Request"` / `"PreOrder"` for `ON_REQUEST` pieces; zero internal cost leaks |
| **Sitemap & Robots (PRD-F16)** | `sitemap.ts` & `robots.ts` | Dynamically indexes public collections/products; disallows `/admin`, `/api/*`, `/checkout`, `/order/*` |
| **Privacy-First Analytics (PRD-F17/S27)** | `analytics.ts` Event Dispatcher | Strictly excludes customer PII; deduplicates purchase tracking across reloads |
| **Accessibility AA & Ergonomics (S26)** | Skip Link, ARIA Dialogs, Reduced Motion | Skip to content, `role="dialog"` focus trap, contrast compliance, and unblocked mobile CTA bar |
| **Typography System** | Poppins only, project-wide (storefront and admin), loaded via `next/font` as `--font-poppins`; weights 300–700 plus italic. Headings 600 with -0.01em tracking, labels/buttons 500 uppercase. Tailwind `serif` and `mono` families alias to Poppins so legacy class names resolve. Supersedes the Cormorant Garamond + Jost pairing from the brand guidelines (owner decision, 2026-11-19). | Owner instruction 2026-11-19 |
| **Brand Palette (2026-11-19)** | Olive `#556B2F` primary, Burnt Orange `#CC5500` accent, Ivory `#F6F0E2` background, Charcoal `#1A1A1A` text | Chudiwalas Brand Guidelines p.6. Legacy Tailwind scales (`gold`, `plum`, `rose`, `emerald`) are aliased to the brand scales so existing classes resolve without a rewrite. Damask wallpaper and plum tint layers removed (guidelines: clean layouts, generous white space) |
| **Brand Assets** | `public/brand/*` (crest SVG, wordmark + lockup PNG), `src/app/{favicon.ico,icon.png,apple-icon.png,opengraph-image.png}` | From `Chudiwalas_Complete_Brand_Kit.zip`. Header: black wordmark on ivory; footer: ivory lockup on olive (guidelines p.8) |
| **Homepage Direction (2026-11-19)** | Editorial, content-dense homepage after reviewing Sutra, Polki Stories, Proffini and Royal Rising: full-bleed hero with olive veil, ticker, category rail, collection bento, budget tiles, making-of steps, showroom-vs-direct comparison, atelier visit, FAQ preview. Deliberately different from competitors: no beige-satin product hero, no celebrity row, no press logos; differentiator is the export-house/direct story. Arch motif retained only as hairline inset frames. | Owner feedback on first re-skin + competitor review |
| **Admin Portal Theme (2026-11-19)** | Admin uses the same olive/orange/ivory palette and Poppins. Olive sidebar shell (`AdminShell`), ivory content, orange primary actions, olive secondary. Storefront header/footer are suppressed under `/admin` via `ChromeGate`. Dashboard shows revenue, orders, enquiries, catalogue KPIs, a "needs attention" queue, recent orders/enquiries and a store snapshot, all from existing admin APIs. | Owner instruction 2026-11-19 |
| **Variant Options & Offers (2026-11-19)** | Variants carry `metalColour` and `purity`; the product page exposes colour swatches, purity pills and size pills that resolve to a variant and its price (reference: Polki Stories "Metal Quality" selector). Discounts are display-only: `pricePaise` is the selling price, `compareAtPricePaise` the struck-through regular price, `offerLabel` the reason. Price breakup (gold / stone / making with discount %) is indicative and stored per variant in paise. Compare-at, offer label and breakup are redacted with the price for ON_REQUEST. `Offer` rows are a site-wide display strip; coupon redemption at checkout is out of scope for now. Every product card carries a WhatsApp "Connect" button (owner requirement). | Owner instruction 2026-11-19 + competitor reference |
| **Variant URL & Listing Rules (2026-11-20)** | A configured piece is shareable as `/products/<slug>?variant=<SKU>` (also under the collection-scoped route); stale or archived SKUs fall back to the default and the URL is rewritten. `ProductStage` owns the selected variant for gallery and purchase controls; media rows may carry `variantId` to swap the photo set (180 ms crossfade, disabled under reduced motion). Listing filters are per-variant: every variant-level filter must be satisfied by the same eligible variant, the card prices from those matches, "From ₹…" appears only when eligible public prices differ, ON_REQUEST pieces never match a price band. WhatsApp message: "Hello Chudiwalas, I'm interested in [piece], [colour], [purity], [size], SKU [sku]." + price only when public + variant URL; a tap records a WHATSAPP_INTENT, never a message. | Master prompt 2026-11-20 |
| **Test Isolation (2026-11-20)** | Vitest never touches the developer database: `tests/setup.ts` points Prisma at a closed port (or `TEST_DATABASE_URL`), so the in-memory ledgers are exercised deterministically. Audit writes use `writeAudit()` which tolerates a missing AdminUser row (sandbox sessions) by keeping the row with `userId: null` and `details.actorId`. | Master prompt 2026-11-20 |
| **Photography Storage (2026-11-20)** | Uploads go through `/api/admin/media/upload` (MANAGER+, type sniffed, ≤8 MB, audited). With `STORAGE_*` set they land in S3-compatible object storage and are served from `STORAGE_PUBLIC_URL`; without it they are written to `./uploads` (outside `public/`, so no rebuild is needed) and served by `/uploads/[...path]`, which the admin flags as non-durable. Media rows stay URL-based, so existing Unsplash/CDN URLs keep working alongside uploads. Direct browser-to-bucket uploads (presigned URLs) can replace the server hop later without changing the media model. | Owner request 2026-11-20 |
| **Product Creation & Archive (2026-11-20)** | Products are created from the admin drawer (Basics → Variants → Photography → Collections → Policy) through `POST /api/admin/products`, which enforces slug format, unique SKUs and 409 on slug / SKU-group / SKU clashes. Nothing is ever deleted: variants and products are archived (`isArchived`), the storefront filters them out, and order snapshots, leads and audit rows stay intact. CSV import remains the bulk path. | Owner request 2026-11-20 |
| **Visual Direction v2: Palmonas-style (2026-11-20, steps 1-4 done)** | Owner found the olive-heavy 11-section design messy. New direction: white canvas, jewellery on an off-white tile (`#F7F4EE`), olive/orange as accents only (~5%), one calm product card with two actions (quick-add + WhatsApp), a 6-section homepage, and a 2-column desktop product gallery. Content-dense competitor-style sections (comparison table, making-of band, jewellery box, FAQ preview) removed from home; the brand story moves to a calm light band and future About page. Supersedes the 2026-11-19 editorial direction. | Owner instruction 2026-11-20 |
| **Image Storage: Cloudinary (2026-11-21)** | Hosted media default is Cloudinary, because Vercel's filesystem is read-only and ephemeral. `storageStatus()` picks the backend in order: `CLOUDINARY_*` → `STORAGE_*` (S3/R2) → local `./uploads`. Uploads are signed server-side (SHA-1 over sorted params + API secret, `file`/`api_key` unsigned) and posted to `api.cloudinary.com`; no new dependency was added and the `cloudinary` SDK is deliberately not used. Public IDs are `<folder>/products/<slug>/<yyyymmdd>-<rand>` with no extension — Cloudinary derives the format. `next/image` and the CSP allow `res.cloudinary.com` scoped to `/<cloud_name>/**` only when `CLOUDINARY_CLOUD_NAME` is set at build time. `scripts/upload-media-to-cloudinary.ts` is the one-time migration: it uploads every `public/` image plus every remote catalogue URL (Cloudinary fetches those itself) and, with `--rewrite`, repoints product/catalogue references. Brand marks and the damask tile are copied to Cloudinary but keep local references, so the page shell never depends on an external host or a free-tier quota. | Owner request 2026-11-21 |

---

## 3. Explicitly Excluded Scope

The following features are **strictly out of scope** for this release unless authorized via formal change request:
- Customer account registration and password-protected buyer profiles.
- Augmented Reality (AR) or 3D virtual try-on.
- Automated algorithmic styling or automated chat widgets.
- Live scrapers for gold/silver/platinum spot commodity market prices.
- Two-way ERP / inventory synchronization (SAP, Tally, Zoho Inventory).
- International multi-currency commerce, customs duty, or international shipping.
- Automated WhatsApp Business messaging engines (all WhatsApp CTAs are client-side deep links to human staff concierge).

---

## 4. Missing Client Inputs & Launch Blockers

The following items are required from the client. Development will proceed through Phases 1–5 using clearly labelled synthetic fixtures; however, **these items represent hard blockers for Phase 7 (Production Launch)**:

### 4.1 Brand Assets
- [x] **Brand Name**: **Chudiwalas** (Chudiwalas Fine Jewellery, a Jaipur Emporium International house). Confirmed 2026-11-19.
- [x] **Brand Logo**: Crest SVG (black/ivory/white) plus wordmark and lockup PNGs in `public/brand/`. Wordmark is raster only; never scale above 700px wide.
- [x] **Favicon & Web App Icons**: `favicon.ico`, 192px `icon.png`, 180px `apple-icon.png`, 1200x630 `opengraph-image.png` in `src/app/`.
- [x] **Brand Font**: **Cormorant Garamond** (headings) + **Jost** (body, buttons, labels) per brand guidelines p.7. Replaces the earlier Poppins choice.

### 4.2 Product Media & Catalogue Data
- [ ] **Product Catalogue**: CSV or spreadsheet with parent products, SKU codes, metal purities (14K/18K/22K), diamond/gemstone carats, weight in grams.
- [ ] **High-Resolution Photography**: Front view, angle view, model/scale shot, macro craftsmanship shot, certificate photo per product (up to 6 images).
- [ ] **Certification Claims**: Exact wording and documentation of BIS Hallmarking, IGI/GIA diamond certifications.

### 4.3 Business Configuration & Thresholds
- [ ] **WhatsApp Concierge Number**: Official international digits-only phone number (e.g., `919876543210`).
- [ ] **High-Value Threshold**: Official INR threshold for mandatory consultation option. Development default is ₹1,00,000 (`10,000,000` paise).
- [ ] **Store GST & Tax Rules**: Confirmed GST rate (standard for Indian precious jewellery is 3%).
- [ ] **Shipping & Logistics Policy**: Insured domestic courier partner rules (e.g., Sequel Logistics, BVC, Blue Dart Apex), shipping fee threshold (e.g., free shipping on all orders or below ₹10,000 charge ₹250).

### 4.4 Commercial & Gateway Credentials
- [ ] **Payment Gateway Production Account**: Razorpay / Cashfree Merchant ID, Live API Key, Live Key Secret, and Webhook Secret.
- [ ] **Transactional Email Credentials**: Domain-authenticated SMTP or Resend/SendGrid/Postmark API key.
- [ ] **Legal Documents**:
  - Terms and Conditions
  - Privacy Policy
  - Return & Exchange Policy
  - Shipping & Insurance Policy
  - Lifetime Buyback / Exchange Guarantee terms (if applicable)

---

## 5. Development Strategy for Blocked Items
During Phases 1 through 5, all missing client dependencies will be handled using:
1. **Mock / Sandbox Gateway**: Razorpay Test Mode with deterministic mock webhooks.
2. **Labelled Synthetic Data**: All fixtures clearly marked as `[SYNTHETIC TEST FIXTURE]`.
3. **No Real PII**: No customer names, phone numbers, or addresses from real persons.
4. **Environment Isolation**: A `.env.example` file documenting all variable placeholders without sensitive values.

# Chudiwalas — Project Brain

Single-page memory of the whole project: what it is, how it is built, what exists, what is decided, what is missing. Read this first; the detailed logs live in `docs/`.

Last updated: 2026-11-20 (master-prompt pass). Working tree is uncommitted on `main` (owner asked not to commit).

---

## 1. What this is

- **Brand:** Chudiwalas, a Jaipur fine-jewellery house (polki, jadau, certified solitaires) from Jaipur Emporium International, an export house. Story: "export-house jewellers, now direct to you". No middlemen, workshop pricing.
- **Product:** Domestic Indian D2C storefront in English and INR, plus an internal admin portal.
- **Owner:** Vatsal (Innovidea). Communicates in Hinglish. Judges design against competitor sites.
- **Reference sites:** polkistories.com (feature reference: variant pricing by colour and purity, offers, price breakup, WhatsApp on every product), sutrafinejewellery.com, proffini.com, royalrisingjewels.com (design study only).

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS 3.4, custom tokens in `tailwind.config.ts`, utilities in `src/app/globals.css` |
| Font | Poppins only (next/font, `--font-poppins`). `font-serif` and `font-mono` alias to Poppins |
| Data | PostgreSQL via Prisma 6. Schema in `prisma/schema.prisma`, seed in `prisma/seed.ts` |
| Payments | Razorpay sandbox, HMAC-verified webhook |
| Tests | Vitest (unit + integration), Testing Library, jsdom |
| Visual QA | Playwright (installed in the session scratchpad, Chrome channel) |
| Package manager | pnpm |

Scripts: `pnpm dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:generate`, `db:push`, `db:migrate`, `db:seed`.

Env keys (`.env.example`): `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `ADMIN_SESSION_TTL_HOURS`, `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `HIGH_VALUE_THRESHOLD_PAISE`, `GST_PERCENTAGE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, SMTP keys, S3/R2 storage keys.

## 3. Brand system

- **Palette (v2, 2026-11-20):** Page canvas is white `#FFFFFF`; jewellery sits on an off-white tile `#F7F4EE` (`ivory.tile`). Olive `#556B2F` and Burnt Orange `#CC5500` are accents only (~5%: announcement bar, active nav, footer, primary CTA, discount price). Charcoal `#1A1A1A` text. Tailwind scales: `olive`, `orange`, `ivory`, `charcoal`. Legacy names `gold`, `plum`, `emerald` map to olive and `rose` to orange.
- **Typography:** Poppins. Headings 600 with -0.01em tracking, body 400/300, labels and buttons 500 uppercase with wide tracking. Owner overrode the guideline pairing (Cormorant + Jost).
- **Logo assets:** `public/brand/` (crest SVG black/ivory/white, wordmark PNG black/ivory, lockup PNG black/ivory). Favicons and OG image in `src/app/` (`favicon.ico`, `icon.png`, `apple-icon.png`, `opengraph-image.png`).
- **Buttons:** `.btn-gold` (orange primary), `.btn-charcoal` (olive secondary), `.btn-outline-gold` (olive outline). Admin: `.adm-btn`, `.adm-btn-secondary`, `.adm-btn-ghost`, `.adm-input`, `.adm-card`, `.adm-table`, `.adm-chip`.
- **Motifs:** `.arch-frame` (Jaipur arch) used sparingly, `.inset-frame` hairline on photo tiles, `.ticker` promise strip, `.rail` horizontal snap scroller, `.eyebrow` label.
- Guidelines PDF: `docs/Chudiwalas_Brand_Guidelines.pdf`.

## 4. Non-negotiable invariants (from `AGENTS.md`)

1. Money is always integer paise (`BigInt`). Never floats. 1 INR = 100 paise.
2. High value: `pricePaise >= highValueThresholdPaise` (default ₹1,00,000) shows WhatsApp consult beside Buy. It never disables purchase on its own.
3. `evaluateProductPolicy()` in `src/lib/policy/evaluateProductPolicy.ts` is the single source of truth for CTA and order admission. `enquiryOnly` or `ON_REQUEST` blocks checkout server-side.
4. No price leaks: `ON_REQUEST` products never expose `pricePaise`, compare-at price, offer label or price breakup in DTOs, HTML, JSON-LD or analytics.
5. Stock reservations are atomic with a 15-minute expiry; late payments go to `RECONCILIATION_REQUIRED`.
6. Guest order lookup uses opaque uuidv4 capability tokens, never sequential ids.
7. Webhook raw-body HMAC verification is mandatory; redirect success alone never confirms payment.
8. Admin RBAC: OWNER > MANAGER > STAFF. Settings need OWNER; product, offer and import writes need MANAGER+. Every write creates an `AuditLog` row.
9. Keep `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/TEST_REPORT.md` current. Never claim a test passed without running it.

Out of scope by contract: customer accounts, AR try-on, live metal rates, ERP sync, international currencies, automated messaging engines.

## 5. Data model (`prisma/schema.prisma`)

- **Product:** slug, skuGroup, title, description, craftsmanshipNotes, materialSummary, stoneDetails, certificationData, `isEnquiryOnly`, `priceVisibility` (PUBLIC | ON_REQUEST), `forceWhatsApp`, `isArchived`. Merchandising: `category` (chokers | necklaces | earrings | rings | bracelets | bangles | mangalsutra), `isNewArrival`, `isBestSeller`, `styleId`. Product sheet: `stylingTip`, `dimensions`, `diamondWeightCts`, `diamondQuality`, `polkiWeightCts`, `polkiCount`, `otherStones`, `grossWeightGrams`.
- **Variant:** sku, metalType, `metalColour` (Yellow Gold | Rose Gold | White Gold | Platinum), `purity` ("750 / 18K"), size, `pricePaise` (selling price), `compareAtPricePaise` (regular price, struck through), `offerLabel`, breakup `goldValuePaise` / `stoneValuePaise` / `makingChargesPaise` / `makingDiscountPercent`, `goldWeightGrams`, stockQuantity, reservedQuantity, leadTimeDays, isMadeToOrder, isPurchaseEnabled, isArchived.
- **ProductMedia**, **Collection**, **ProductCollection**.
- **InventoryReservation** (ACTIVE | COMMITTED | RELEASED | EXPIRED).
- **Order** (PENDING | CONFIRMED | CANCELLED | RECONCILIATION_REQUIRED; payment and fulfilment statuses; capability token), **OrderItem** (snapshot of variant attributes), **PaymentEvent**.
- **EnquiryLead** (CALLBACK | WHATSAPP_INTENT), **AppointmentRequest** (IN_STORE | VIRTUAL), statuses NEW → CONTACTED → SCHEDULED → CLOSED_CONVERTED / CLOSED_LOST.
- **AdminUser** (role), **StoreSettings** (single row `default`: storeName, whatsappNumber, highValueThresholdPaise, gstPercentage, enablePurchases, contactEmail), **Offer** (title, description, code, isAuto, isActive, displayOrder, startsAt, endsAt), **AuditLog**.

Schema changes are applied with `pnpm db:push` (no migrations folder). The seed upserts variants by SKU because orders reference variants; it never deletes them.

## 6. Public DTO contract (`src/lib/dto/product.ts`, `src/lib/types/index.ts`)

`toPublicProductDto()` adds per variant: `purityLabel` ("14K", "18K", "22K", "Platinum"), `metalColour` (derived from metalType when unset), `isReadyToShip` (stock > 0 and not made to order), `formattedPrice`, `formattedCompareAtPrice`, `offerLabel`, `priceBreakup` (with making charges after discount, all formatted), `policy` (from the policy engine). Per product: `options.colours`, `options.purities`, `options.sizes`, `defaultVariant`, merchandising and sheet fields. Offers use `toPublicOfferDto()`.

Fixtures (`src/lib/fixtures/products.ts`, `offers.ts`, `faqs.ts`) are the fallback when the DB is unreachable and the source for the seed. Boundary fixtures: ₹99,999 (below), ₹1,00,000 (equal), ₹1,00,001 (above), one ON_REQUEST, one enquiry-only, one sold out, one made-to-order. The pendant has YG/RG × 18K/14K variants so colour and purity switching can be demonstrated.

## 7. Website: routes and features

| Route | What it does |
|---|---|
| `/` | Editorial homepage: full-bleed hero with olive veil and in-hero trust row, promise ticker, shop-by-category rail, collection bento, featured pieces, shop-by-budget, "The making" steps, showroom-vs-direct comparison, Chudiwalas box, visit the atelier, FAQ preview, bespoke close |
| `/shop` | All pieces. Filters: in stock, availability (ready to ship / made to order), category, price band, colour, purity, sort, scoped search (title / SKU / category). All synced to the URL. Per-variant matching: every variant-level filter must be met by the same eligible variant; cards price from the matching variants and link to that variant. Removable chips, clear all, mobile bottom-sheet with "Show N pieces" |
| `/collections`, `/collections/[slug]` | Collection grid and per-collection listing (same `CollectionExperience`) |
| `/products/[slug]`, `/collections/[slug]/products/[productSlug]` | Product page (see below) |
| `/cart`, `/checkout` | Guest cart (localStorage) and checkout with reservation and Razorpay sandbox |
| `/order/[token]` | Guest order tracking by capability token |
| `/wishlist` | Guest wishlist (localStorage) |
| `/consultation` | Callback and appointment request forms, WhatsApp builder |
| `/faqs` | Searchable FAQ with categories |
| `/jewellery-box` | Demo of the olive velvet box component |

Product page (`ProductStage` owns the selected variant; `?variant=SKU` is shareable, stale SKUs fall back; gallery crossfades to variant-assigned photos) with `ProductDetails`: category and availability badges, price with compare-at and offer label, "Special offers" strip, metal colour swatches (metallic gradients, name, tick on selected), purity pills, size pills, all resolving to a variant and updating price, SKU and WhatsApp message; "Customise my piece" WhatsApp line; Add to bag + Buy it now (policy engine decides; WhatsApp-only or sold-out states otherwise); Chat for purchase assistance + Video call assistance; certifications; share; wishlist; tabs Description (with styling tip) / Product details (spec table) / Price breakup; trust row; sticky mobile bar; "You may also like" (4, same category first); Recently viewed (localStorage).

Product cards (`ProductCard`, used everywhere incl. the listing): borderless photo on an off-white tile, price-first text, one availability badge, colour dots, wishlist heart, and two actions only — a black quick-add "+" and a green WhatsApp icon (`WhatsAppIconButton`). Older notes: hover image, badges (Ready to ship, Made to order, Sold out, Enquire, New), price with compare-at and offer label, metal swatches with purities, wishlist heart, full-width WhatsApp "Connect" button with the WhatsApp glyph (`WhatsAppConnectButton`).

Layout: olive top bar, ivory sticky header with the wordmark ("Shop all", Polki & Jadau, Solitaires, Bridal, Collections, Consultation), olive footer with lockup, policies, contact, newsletter, floating Concierge WhatsApp pill. `ChromeGate` hides storefront chrome under `/admin`.

SEO: `src/lib/seo.ts` builds metadata, Organization, Product (no ON_REQUEST price leak) and Breadcrumb JSON-LD, sitemap and robots.

## 8. Admin portal: routes and features

| Route | What it does |
|---|---|
| `/admin/login` | Split-panel login; demo accounts owner / manager / staff `@aurumatelier.internal`, password `AurumAdmin2026!` (sandbox only) |
| `/admin` | Date-range KPIs (confirmed revenue, orders, new enquiries incl. WhatsApp taps, catalogue), needs-attention queue with filtered deep links, upcoming appointments, recent orders/enquiries, store snapshot, setup warnings for placeholder contact details |
| `/admin/orders` | Status filters (URL), order detail drawer with item snapshots, totals, shipping address, payment events, fulfilment status + carrier + tracking + notes |
| `/admin/products` | "New product" drawer (Basics → Variants → Photography → Collections → Policy, auto slug, validation, 409 on clashes); search + category / publication / stock / archived filters (`?stock=low` deep link), preview link; editor drawer with Variants & pricing (per-row Saved / Edited / error, duplicate SKU and combination validation, compare-at > price), Photography (drag-and-drop upload with per-file status and retry, URL media, cover, order, alt, variant assignment), Collections & flags, Product sheet, Policy (incl. archive product). Variants archive/restore per row |
| `/admin/products/import` | CSV validate (dry run) and commit with line-level errors; optional columns for the new fields |
| `/admin/offers` | Create, pause, delete offers shown on product pages |
| `/admin/leads` | Callback, appointment and WhatsApp-intent tabs with permitted status transitions and status filter |
| `/admin/settings` | Store name, threshold, WhatsApp number, GST, concierge email, purchase kill switch (OWNER only) |

Shell: `src/components/admin/AdminShell.tsx` (olive sidebar, mobile drawer, user chip, sign out). Primitives: `src/components/admin/ui.tsx` (PageHeader, StatCard, Card, StatusBadge, EmptyState, Loading, Alert).

## 9. APIs

Public: `/api/policy/evaluate`, `/api/checkout/initialize`, `/api/checkout/verify`, `/api/webhooks/payment`, `/api/orders/[token]`, `/api/enquiries/callback`, `/api/enquiries/appointment`, `/api/enquiries/whatsapp-intent`, `/api/health`.

Admin (cookie session `aurum_admin_session`): `/api/admin/media/upload` (GET status, POST file), `/api/admin/auth/login|logout|me`, `/api/admin/products` (GET, POST), `/api/admin/products/[id]` (GET, PATCH with `variantUpdates` and `newVariants`), `/api/admin/products/import`, `/api/admin/orders`, `/api/admin/orders/[id]`, `/api/admin/leads` (GET, PATCH), `/api/admin/offers` (GET, POST), `/api/admin/offers/[id]` (PATCH, DELETE), `/api/admin/settings` (GET, PATCH OWNER).

## 10. Key files

- `src/lib/policy/evaluateProductPolicy.ts` policy engine
- `src/lib/money.ts` paise helpers and formatting
- `src/lib/catalogue.ts` DB queries with fixture fallback, `getActiveOffers()`
- `src/lib/whatsapp.ts` deep links and intent tracking
- `src/lib/variants.ts` variant resolution: From-price rule, option picking, stale-SKU fallback, variant media, variant URLs
- `src/lib/admin/audit.ts` FK-safe audit writer
- `src/lib/checkout/memoryOrders.ts` in-memory order ledger (DB-offline fallback)
- `src/lib/admin/storage.ts` upload storage (S3/R2 or local `./uploads`), `src/app/api/admin/media/upload/route.ts`, `src/app/uploads/[...path]/route.ts`
- `src/lib/checkout/reservation.ts`, `cartValidation.ts` stock and cart integrity
- `src/lib/payment/razorpay.ts` gateway client and signature checks
- `src/lib/admin/auth.ts` sessions, roles, fixture admins; `csv.ts` importer
- `src/components/common/MetalSwatch.tsx`, `WhatsAppButton.tsx` shared product UI
- `src/components/catalogue/CollectionExperience.tsx` listing, filters, quick view
- `src/app/layout.tsx` fonts, providers, ChromeGate

## 11. Decisions log (short)

1. Brand renamed from placeholder "Aurum Atelier" to Chudiwalas everywhere except the fixture admin emails and demo password (tests depend on them).
2. Poppins only, storefront and admin (owner decision, overrides guideline fonts).
3. First re-skin (flat ivory, arch tiles) was rejected as unattractive; homepage rebuilt in an editorial, content-dense direction inspired by competitors but deliberately different (export-house story, comparison table, no celebrity row).
4. Admin shares the storefront palette; olive sidebar.
5. Variant options are colour × purity × size; discounts are display-only (selling price + compare-at + label). Breakup is indicative. Offers are a display strip; coupon redemption at checkout is not built.
6. WhatsApp Connect on every product card is an owner requirement.
7. `/shop` added because `/collections` is only a collection grid; homepage tiles deep-link into `/shop` filters.
8. Seed upserts variants by SKU (FK from orders).

Full table: `docs/DECISIONS.md`.

## 12. Verification status (2026-11-20)

- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- `pnpm test`: 201 / 201 pass in 31 files. Tests never touch the developer DB: `tests/setup.ts` points Prisma at a closed port (set `TEST_DATABASE_URL` for a disposable Postgres). The earlier 7 failures were caused by suites mutating the live DB.
- Visual checks done with Playwright at 1440px and 390px for home, shop, product page, admin pages. No horizontal overflow, no broken images.
- Note: always stop the local `next start` before running `next build`; building while serving corrupts `.next` chunks.

Details per run: `docs/TEST_REPORT.md`.

## 13. Known gaps and launch blockers

1. Product photography: all images are still Unsplash placeholders. Upload exists; set `STORAGE_*` (S3/R2) for durable storage, otherwise files live in `./uploads` on the server.
2. Placeholders to replace: WhatsApp number `919876543210`, concierge email, Jaipur street address, social links.
3. Legal pages (terms, returns, shipping, privacy) are linked in the footer but do not exist.
4. Coupon redemption at checkout (offers are display-only).
5. Admin order detail page with tracking number entry and invoice.
6. Staff account management; remove demo accounts and the sandbox password before go-live.
7. Pincode delivery estimate, EMI, size guide, reviews, Instagram feed (nice to have).
8. Razorpay live keys, production database, email provider.
9. Commit the work (nothing committed yet).
10. Old-brand leftovers: `aurum-atelier-review.html` (root and `public/`), `public/damask_pattern_hd.webp` unused.

## 14. How to run

```bash
pnpm install
cp .env.example .env   # fill DATABASE_URL etc.
pnpm db:push && pnpm db:generate
pnpm db:seed           # fixtures, settings, offers, owner admin
pnpm dev               # http://localhost:3000
pnpm test              # vitest
```

Admin: `/admin/login` with the demo OWNER account.

## 15. Working conventions

- Do not commit unless the owner asks.
- Keep Poppins and the brand tokens; no new typefaces or colours.
- Check Polki Stories before designing any jewellery-specific feature.
- Money in paise, policy through the engine, no ON_REQUEST leaks, audit every admin write.
- Update `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/TEST_REPORT.md` with every meaningful change, and this file when the big picture moves.

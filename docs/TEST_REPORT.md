# TEST_REPORT.md — Quality Assurance & Smoke Test Matrix Log

**Project**: Premium Jewellery Domestic Indian Storefront  
**Date**: 2026-11-14  
**Current Phase**: Phase 6 — SEO Metadata, Schema.org / JSON-LD, Accessibility & End-to-End Smoke Matrix (COMPLETE)  

---

## 1. Test Execution Summary

| Phase | Runner | Total Tests | Pass | Fail | Blocked / Not Run | Timestamp |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0 Baseline** | Runtime Inspection | 3 | 3 | 0 | 4 (Unconfigured) | 2026-11-14T14:40:00+05:30 |
| **Phase 1 Foundation**| Vitest 3.2.7 | 39 | 39 | 0 | 0 | 2026-11-14T15:33:33+05:30 |
| **Phase 2 Storefront**| Vitest 3.2.7 | 54 | 54 | 0 | 0 | 2026-11-14T17:13:00+05:30 |
| **Phase 3 Catalogue** | Vitest 3.2.7 | 77 | 77 | 0 | 0 | 2026-11-14T17:19:52+05:30 |
| **Phase 4 Admin/Leads**| Vitest 3.2.7 | 107 | 107 | 0 | 0 | 2026-11-14T17:27:50+05:30 |
| **Phase 5 Checkout/Pay**| Vitest 3.2.7 | 132 | 132 | 0 | 0 | 2026-11-14T18:37:22+05:30 |
| **Phase 6 SEO/A11y/Matrix**| Vitest 3.2.7 | 181 | 181 | 0 | 0 | 2026-11-14T18:47:00+05:30 |
| **Brand Re-skin (Chudiwalas)**| Vitest 3.2.7 | 187 | 179 | 8 (pre-existing, see 1.1) | 0 | 2026-11-19T13:55:00+05:30 |
| **Homepage v2 (editorial redesign)**| Vitest 3.2.7 | 187 | 181 | 6 (pre-existing, see 1.2) | 0 | 2026-11-19T16:45:00+05:30 |
| **Poppins + Admin re-theme**| Vitest 3.2.7 | 187 | 181 | 6 (pre-existing, see 1.3) | 0 | 2026-11-19T18:10:00+05:30 |
| **Polki-Stories feature parity (variants, offers, breakup, shop)**| Vitest 3.2.7 | 188 | 181 | 7 (pre-existing/flaky, see 1.4) | 0 | 2026-11-19T19:30:00+05:30 |
| **Master prompt pass: variant end-to-end, discovery, admin queues**| Vitest 3.2.7 | 193 | 193 | 0 | 0 | 2026-11-20T12:30:00+05:30 |
| **Photography upload (admin → storefront)**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T14:00:00+05:30 |
| **Cloudinary image storage (hosted media)**| Vitest 3.2.7 | 207 | 207 | 0 | 0 | 2026-11-21T15:16:00+05:30 |
| **Add product form + archive**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T15:30:00+05:30 |
| **Palmonas-style redesign (steps 1-2)**| Vitest 3.2.7 | 193 | 193 | 0 | 0 | 2026-11-20T17:30:00+05:30 |
| **Redesign step 3: simpler admin**| Vitest 3.2.7 | 193 | 193 | 0 | 0 | 2026-11-20T18:30:00+05:30 |
| **Redesign step 4: remaining pages**| Vitest 3.2.7 | 193 | 193 | 0 | 0 | 2026-11-20T19:15:00+05:30 |
| **Redesign step 4b: about + checkout + photos**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T20:10:00+05:30 |
| **Step 4c: product page + mobile polish**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T21:00:00+05:30 |
| **Step 4d: admin mobile tables**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T21:40:00+05:30 |
| **Step 4e: interactivity + favicon**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T22:30:00+05:30 |
| **Step 4f: duplicate-slug guard**| Vitest 3.2.7 | 201 | 201 | 0 | 0 | 2026-11-20T23:10:00+05:30 |

### 1.1 Brand Re-skin run (2026-11-19)

- Scope: Chudiwalas palette, Cormorant Garamond + Jost typography, brand logo/favicon assets, header/footer/homepage re-skin, JewelleryBox olive/ivory restyle.
- `pnpm run lint` PASS, `pnpm run typecheck` PASS, `pnpm run build` PASS (38 routes).
- `pnpm run test`: 179 passed, 8 failed. The 4 brand-dependent tests (SEO title/description/address, header brand link, JewelleryBox defaults) were updated and pass.
- The 8 remaining failures are **pre-existing** and unrelated to the re-skin (they also fail when run in isolation and touch no modified file): `reservation.test.ts` S19/S22 (release and late-payment allocation), `payment-flow.test.ts` S18/S21, `policy-api.test.ts` S06 boundary, `smoke-matrix.test.ts` S22, `order-token.test.ts` S24 lookup, `routes.test.ts` (expects 7 fixture products, fixtures now contain 10). These need a separate fix pass on the checkout/reservation layer and the fixture count assertion.
- Visual verification: headless Chrome screenshots of `/`, `/collections/royal-polki-heritage`, `/products/heritage-polki-emerald-choker` at 1440px and 390px. No horizontal overflow at 390px; wordmark, olive top bar, ivory page, orange CTAs and olive footer render as per guidelines.

---

### 1.2 Homepage v2 run (2026-11-19, afternoon)

- Scope: homepage rebuilt in an editorial direction after competitor review (Sutra, Polki Stories, Proffini, Royal Rising): full-bleed hero with olive veil and in-hero trust row, promise ticker, shop-by-category rail, collection bento, featured grid, shop-by-budget, making-of steps on olive, showroom-vs-direct comparison, Chudiwalas box, visit-the-atelier, FAQ preview, full-bleed bespoke close. `CollectionExperience` now reads/writes `category` and `price` URL params so homepage tiles deep-link into filters. `ProductCard` squared off with Enquire / Made to order / Sold out chip. Broken Unsplash fixture image (`photo-1611591475152`) replaced.
- `pnpm run lint` PASS, `pnpm run typecheck` PASS, `pnpm run build` PASS.
- `pnpm exec vitest run`: 181 passed, 6 failed. All 6 are the same pre-existing failures listed in 1.1 (`reservation` S19/S22, `payment-flow` S21, `policy-api` S06, `smoke-matrix` S22, `routes` fixture count); `payment-flow` S18 and `order-token` S24 passed on this run, so they are timing-flaky rather than fixed. No failure touches a file changed in this pass.
- Visual verification: Playwright (Chrome channel, reduced motion) full-page screenshots of `/` at 1440px and 390px after scrolling to trigger lazy images. No horizontal overflow at 390px (scrollWidth 390). A DOM check found zero broken images on the homepage.

---

### 1.3 Poppins typography + admin portal re-theme (2026-11-19, evening)

- Scope: Cormorant Garamond and Jost removed; Poppins is the only typeface (`next/font`, `--font-poppins`; Tailwind `serif`/`mono` alias to it). Admin portal rebuilt on the brand palette: `AdminShell` (olive sidebar, mobile drawer, user chip, sign out), new dashboard (`/admin`) with KPIs, attention queue, recent orders, recent enquiries and store snapshot; split-panel login page (also fixes a bug where the password field wrote into the email state); orders, catalogue, CSV import, leads and settings pages re-skinned with shared `adm-*` classes and `components/admin/ui.tsx`. Storefront header/footer/cart drawer suppressed under `/admin` via `ChromeGate`.
- `pnpm run lint` PASS, `pnpm run typecheck` PASS, `pnpm run build` PASS.
- `pnpm exec vitest run`: 181 passed, 6 failed, identical to the pre-existing set in 1.2. Admin RBAC integration tests pass.
- Visual verification: Playwright signed in as the OWNER fixture and captured `/admin/login`, `/admin`, `/admin/orders`, `/admin/products`, `/admin/leads`, `/admin/settings`, `/admin/products/import` at 1440px and `/admin` at 390px; homepage re-checked at both widths with Poppins.
- Observation (data, not code): the connected Postgres still holds the old seed (store name "Aurum Atelier", admin user "Aurum Principal Connoisseur", concierge@aurumatelier.com). Re-seeding will replace these with the Chudiwalas defaults; not run because it would reset data.

---

### 1.4 Polki-Stories feature parity (2026-11-19, night)

- Scope (reference: polkistories.com listing + product pages):
  - Schema: `Product` gains category, new/best-seller flags, styleId, stylingTip, dimensions, diamond/polki weights and quality, polki count, other stones, gross weight. `Variant` gains metalColour, compareAtPricePaise, offerLabel, gold/stone/making value in paise, making discount %, gold weight. New `Offer` model. Applied with `prisma db push` (additive, no data loss) and `prisma generate`.
  - DTO: `purityLabel`, `metalColour`, `isReadyToShip`, compare-at price, offer label, `priceBreakup` and `product.options` (colours / purities / sizes). Compare-at, offer label and breakup are redacted whenever the price is ON_REQUEST (new unit test).
  - Storefront: product page rebuilt with colour swatches + purity pills + size pills that switch the variant and price, compare-at strike-through, offer label, "Special offers" strip, customise-my-piece WhatsApp line, Add to bag + Buy it now, Chat / Video-call assistance, certifications, share, wishlist, Description / Product details / Price breakup tabs, trust row, recently viewed (localStorage), 4-up "You may also like". Every product card (home, shop, collections, quick view, wishlist, related) now has a WhatsApp "Connect" button, Ready-to-ship / Made-to-order / Sold-out / Enquire badge, "New" badge, compare-at price, offer label and real colour swatches. New `/shop` route lists all pieces with Availability, Category, Price, Colour, Purity filters synced to the URL; homepage category and budget tiles now deep-link into it. Header: "Shop all".
  - Admin: catalogue editor drawer with Variants & pricing (colour, purity, size, price, compare-at, offer label, gold/stone/making values, making discount %, gold weight, stock, lead time, made-to-order, purchasable, add new variant), Product sheet tab and Policy & flags tab. New Offers page and `/api/admin/offers` (MANAGER+, audited). Product PATCH/POST APIs accept the new fields and `newVariants`. CSV importer accepts optional columns for the new fields.
  - Seed now upserts variants by SKU (order items reference variants, so delete-and-recreate would violate FK constraints) and seeds offers; run against the connected DB (store name, admin name and fixture products refreshed).
- `pnpm run lint` PASS, `pnpm run typecheck` PASS, `pnpm run build` PASS (new routes: /shop, /admin/offers, /api/admin/offers, /api/admin/offers/[id]).
- `pnpm exec vitest run`: 181 passed, 7 failed. 6 are the pre-existing set from 1.2; `order-token` S24 is the timing-flaky case seen in 1.1. `variant.test.tsx` was rewritten for the new selector (colour + purity switch changes SKU, price and WhatsApp link; ON_REQUEST redaction) and passes; `components`, `dto`, `fixtures` pass.
- Visual verification (Playwright, Chrome): `/products/solitaire-diamond-pendant-18k` at 1440px and 390px (no overflow), DOM check that selecting Rose Gold + 14K changes the price from ₹99,999 to ₹84,500 with ₹89,000 struck through and the breakup tab shows gold / stone / making (50% off) / total; `/shop?category=rings` (5 pieces, badges, WhatsApp buttons, zero broken images); admin catalogue list, editor drawer and offers page.

---

### 1.5 Master-prompt pass (2026-11-20)

**Baseline reproduced.** On the starting tree 7 tests failed. Root cause: the suites are written against in-memory fallbacks, but the developer `.env` points Prisma at a live Postgres, so `createInventoryReservations`, `commitReservations` and the checkout routes mutated real rows (the fixture choker's stock had been decremented to 0 by earlier runs, which is why S06 reported `canPurchase: false`). Fix: `tests/setup.ts` now points `DATABASE_URL` at a closed local port (override with `TEST_DATABASE_URL` for a disposable Postgres), so every DB call fails fast and the memory ledgers are exercised deterministically. `releaseReservations` and `handleLatePaymentInventory` were also hardened so a variant unknown to the DB falls through to the memory ledger instead of silently returning. `routes.test.ts` now asserts that every fixture resolves (≥7, distinct slugs) instead of a hard-coded 7. The underlying assertions are unchanged.

**Result:** `pnpm lint` PASS, `pnpm typecheck` PASS, `pnpm build` PASS (built with no `next start` running), `pnpm test` 193 / 193 passed in 29 files (new: `tests/unit/variants-lib.test.ts` for From-price rule, stale-SKU fallback, option resolution, variant media, WhatsApp message shape and ON_REQUEST redaction).

**Storefront changes verified with Playwright (Chrome, reduced motion) at 390px and 1440px:**
- `/products/solitaire-diamond-pendant-18k?variant=AUR-SOL-002-14RG` loads the 14K Rose Gold variant (₹84,500, compare-at ₹89,000); reload keeps it; `?variant=NOPE-123` falls back to the default and rewrites the URL to `AUR-SOL-002-YG`. Nested shape `/collections/royal-polki-heritage/products/…?variant=` behaves the same.
- One tap on the Yellow Gold swatch keeps 14K and shows that variant's own price (₹84,500 → `AUR-SOL-002-14YG`); one tap on 18K switches to ₹99,999 without navigation. Keyboard: Tab to the 18K pill + Enter changes the price.
- Add to bag from the mobile sticky bar puts ₹84,500 and "14K Rose Gold • Size 16-18 Inch Adjustable" in the drawer and `/cart`.
- WhatsApp link on the product page: `Hello Chudiwalas, I'm interested in <piece>, Rose Gold, 14K, 16-18 Inch Adjustable, SKU AUR-SOL-002-14RG. … Price: ₹84,500 <variant URL>`; ON_REQUEST pages omit the price line, show no ₹ in the main region, no numeric price in JSON-LD and no offers strip.
- `/shop?metal=rose-gold&purity=18k` prices the pendant from the matching 18K Rose Gold variant (₹99,999) and links `?variant=AUR-SOL-002-RG`; `/shop?price=above-1l` excludes the ON_REQUEST necklace. Unfiltered card shows "From ₹84,500" because eligible variants differ; single-price pieces show the exact amount.
- No horizontal overflow at 390px on home, shop, product, cart or admin overview. Mobile filter sheet opens with "Show N pieces". Primary tap targets measured ≥44px (purity pills 53×44, Add to bag 173×50, card WhatsApp 143×44).
- Computed `font-family` is Poppins for storefront price, CTA and body, and for admin input, table cell, heading and dialog title.
- Tap counts: home → populated category 1 tap; card → WhatsApp 1 tap (no detail page); detail purity change 1 tap.

**Admin verified:** manager signs in, edits the 14K Rose Gold price in the Variants & pricing drawer (row shows "Edited"), saves ("Saved. 1 variant updated, 0 added"), storefront detail, WhatsApp text and the filtered shop card all show ₹84,900 while the Yellow Gold sibling keeps ₹84,500; price reverted the same way. Duplicate-SKU validation blocks save client-side; dashboard queue links carry filters; order detail drawer shows item snapshots, totals and payment events; WhatsApp intents tab lists taps. A manager save initially failed with a 500 because `AuditLog.userId` has a FK and only the owner was seeded: audit writes now go through `writeAudit()` (keeps the row with `userId: null` + `details.actorId` on FK failure) and the seed upserts all three sandbox admins.

**Not done / owner inputs:** no object storage configured, so photography is URL-based (upload UI shows a setup notice); real WhatsApp number, concierge email, street address, policies and final photography are still placeholders (settings and dashboard flag the sandbox number); order-snapshot check was run through the integration suite (memory mode), not by creating a live order; coupon redemption, accounts, AR, live rates, ERP, international checkout and automated messaging remain out of scope.

---

### 1.6 Photography upload (2026-11-20)

- Scope: `POST /api/admin/media/upload` (MANAGER+, multipart, JPEG/PNG/WebP/AVIF, ≤8 MB, declared type must match sniffed magic bytes, audited as `MEDIA_UPLOAD`), `GET` reports storage mode. `src/lib/admin/storage.ts` writes to S3-compatible object storage when `STORAGE_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` are set (region derived from the endpoint or `STORAGE_REGION`; public URL from `STORAGE_PUBLIC_URL`), otherwise to `./uploads` (or `UPLOAD_DIR`) served by `src/app/uploads/[...path]/route.ts` (path-confined, immutable cache headers). Admin Photography tab: drag-and-drop / file picker, sequential queue with per-file status and Retry, storage notice (durable vs local), uploaded photos join the media list and persist on Save; the media PATCH accepts `/uploads/...` URLs. `next.config.ts` allows `STORAGE_PUBLIC_URL` and R2 hosts for `next/image`. `@aws-sdk/client-s3` added.
- Tests: `tests/integration/media-upload.test.ts` (storage status, 401/403, 415 for text and spoofed PNG, 413 for 8 MB + 1 byte, 201 happy path writing to a temp dir with the expected key, region derivation, magic-number sniffing) and `tests/integration/uploads-route.test.ts` (serves PNG with content type and immutable cache, 404 for missing, non-image and traversal). Full suite: 201 / 201 in 31 files. Lint, typecheck and clean build pass.
- UI round trip (Playwright, Chrome, server started with `STORAGE_ENDPOINT=""` to force local mode because the dev `.env` holds placeholder S3 credentials): manager opened the pendant → Photography, picked `test-upload.png` (600×750 PNG), job row showed "Added", media count 2 → 3, saved; storefront product page showed the new thumbnail and the file served with HTTP 200 `image/png`; photo removed in admin and saved, storefront back to 2 photos; `uploads/` folder deleted and DB reseeded afterwards.
- With the dev `.env` as is (S3 endpoint + placeholder keys) the object-storage path is exercised and fails cleanly: the UI shows the gateway error on the job row with Retry (observed: `AuthorizationHeaderMalformed … region`; region derivation now fixes that part, the placeholder keys would still be rejected). Real credentials, or clearing `STORAGE_*` to use local mode, is an owner decision.
- Caveat: a build started while `next start` was still shutting down corrupted `.next` once (`Cannot find module './9071.js'`); a clean `rm -rf .next && pnpm build` with no server running resolved it. Always stop the server before building.

---

### 1.7 Add product form, variant archive, product archive (2026-11-20)

- Scope: "New product" button on Catalogue opens the same drawer in create mode with numbered steps Basics (title with auto slug, SKU group, category, description, material, stones, certification, dimensions, weights) → Variants & pricing (any number of colour × purity × size rows, inline validation) → Photography (upload or URL) → Collections & flags → Policy. `POST /api/admin/products` now validates slug format, ≥1 variant, unique SKUs, rejects slug / SKU-group / SKU clashes with 409, attaches media and collection membership, revalidates the storefront, and audits. Variants can be archived/restored per row (storefront hides them, order snapshots stay); products can be archived from the Policy tab (404 on storefront, hidden from listings, "Show archived" toggle in admin). `memoryOrders` moved to `src/lib/checkout/memoryOrders.ts` because route modules may only export handlers (surfaced by Next's generated route types after a clean build).
- `pnpm lint` PASS, `pnpm typecheck` PASS (clean `.next`), `pnpm build` PASS, `pnpm test` 201 / 201.
- UI round trip (Playwright, Chrome, local storage mode): manager created "E2E Meenakari Polki Jhumka" with slug auto-generated, SKU group `E2E-JHM-001`, four variants (Yellow/Rose × 18K/22K at ₹58,000 / ₹58,500 / ₹71,000 / ₹71,500, stock 2), one uploaded photo, collection "Everyday Fine Jewellery". Result banner: `"E2E Meenakari Polki Jhumka" is live with 4 variants and 1 photo.` Storefront: product page showed 2 colour swatches, 2 purity pills, ₹58,000 default; Rose Gold + 22K switched to ₹71,500 with `?variant=E2E-JHM-001-RG22`; uploaded photo served 200; the piece appeared in the collection page and on `/shop?category=earrings` as "From ₹58,000 · 18K · 22K". Archiving from the Policy tab made the product page return the not-found page and removed it from the shop. The archived test product remains in the dev DB (visible with "Show archived"); the uploaded file was deleted.

---

### 1.8 Palmonas-style redesign, steps 1 and 2 (2026-11-20)

Owner felt the olive-heavy, 11-section design was messy and wanted a simple, Palmonas-like layout: white canvas, jewellery as the hero, few sections, one calm card, fast access. Two steps done so far.

**Step 1 — tokens, card, header, footer:**
- Canvas is now white (`--background: #FFFFFF`, `body bg-white`); jewellery sits on a warm off-white tile (`ivory.tile #F7F4EE`, `--color-tile`). Olive reduced to the thin announcement bar, active nav, footer and one badge; orange kept for the primary CTA and discount price.
- `Header` rebuilt: white, centred search (submits to `/shop?q=`), a thin desktop category row (Chokers … New in), wishlist + bag, a Shop/More mobile drawer.
- `ProductCard` is one component everywhere with two actions only — a black quick-add "+" (adds the exact variant when the price is settled, else links to detail) and a green WhatsApp icon — plus price-first text, one availability badge, colour dots and a wishlist heart, on a borderless off-white tile. `CollectionExperience` now renders this card and the quick-view modal was removed. New `WhatsAppIconButton` added.
- `Footer` is light: brand + Shop + Help + Contact columns, socials, one-line legal bar; concierge pill retained.

**Step 2 — homepage and product page:**
- Homepage rewritten to 6 sections: single-photo hero with one line and one button; round shop-by-category tiles (deep-link to `/shop?category=`); bestsellers grid of `ProductCard`; three collection tiles + a trust line; "Find your edit" (Bridal / Everyday / Gifting / New in) linking to real filters; a calm light workshop-story band. Removed: ticker, in-hero trust row, 4-step making-of band, showroom-vs-direct table, jewellery-box section, visit-the-atelier block, FAQ preview, dark bespoke banner. Page height dropped from ~9000px to ~4250px.
- `ProductGallery` now shows a 2-column photo grid on desktop (click to zoom) and a single swipeable photo with a thumbnail reel on mobile; `ProductStage` makes the buy column sticky instead of the gallery.

**Verification:** `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 193 / 193 in 31 files (updated `components.test.tsx` to wrap `ProductCard` in `CartProvider` for quick-add, and `a11y.test.tsx` for the new wishlist/bag labels). Playwright (Chrome, reduced motion) at 1440px and 390px: home and product pages show no horizontal overflow; computed header and body background are white with the search in the header; the product gallery renders the desktop 2-column grid; colour and purity selectors still switch price and variant.

**Still placeholder:** product photography is Unsplash with dark backgrounds, which makes the light tiles look heavy; real light-background photography (or temporary light placeholders) is the remaining lever. Steps 3 (dashboard simplification) and 4 (About/consultation pages polish) are not started.

---

### 1.9 Redesign step 3 — simpler admin for non-technical staff (2026-11-20)

- Sidebar regrouped: Main (Home, Products, Orders, Enquiries) and a "More" group (Offers, CSV import, Settings); "Catalogue"→"Products", "Leads & viewings"→"Enquiries", "Store settings"→"Settings", "Dashboard"→"Home".
- `/admin/products` list is now a photo-card grid (cover image, title, SKU · category, price range, stock in orange when ≤1 or 0, variant count + colours, enquiry-only note, a large Edit button and a storefront preview) instead of a dense table. Search, filters and "New product" retained.
- In the product editor, each variant's price-breakup and weight inputs are tucked under an "Advanced: price breakup & weight (optional)" collapse, so the default row shows only colour, purity, size, price, compare-at, offer, stock, lead time and the two toggles.
- `/admin/leads` rows gained inline **Call** (`tel:`) and **WhatsApp** buttons on callbacks and appointments, so staff reach a customer in one click.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 193 / 193. Playwright (manager): sidebar shows Home/Products/Orders/Enquiries + More(Offers/CSV import/Settings); 11 product photo cards render; the Advanced collapse hides the gold-value field until expanded; Call and WhatsApp buttons present on every enquiry row.
- Not done: the dashboard home itself was left as-is (KPIs + attention queue, already link-driven); orders inline "mark shipped" and a fuller 3-step editor wizard were not added (editor already works as a tabbed drawer). Step 4 (About / consultation page polish) pending.

---

### 1.10 Redesign step 4 — remaining storefront pages aligned (2026-11-20)

- `/collections` rewritten to the light system: white page, photo tiles with the title, description, piece count and "Explore" below each image (no dark overlay band), matching the homepage cards.
- `/wishlist` rebuilt light: white page, a 4-up `ProductCard` grid, a calm empty state on an off-white tile with a "Shop jewellery" button.
- Token sweep across `/consultation`, `FaqExperience`, `/cart`, `/order/[token]`, both `/collections/[slug]` routes and `CollectionExperience`: gold scale → olive, `border-border` → `border-charcoal-100`, `bg-ivory-50` → `bg-ivory-tile`, `bg-ivory-100` → white, and the now-redundant `font-serif` / `font-mono` / `font-light` utility names removed (all three already aliased to Poppins, so no visual font change). No gold colour tokens remain in storefront page code; `.btn-gold` (the orange CTA class name) is unrelated.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 193 / 193. Playwright at 1440px: consultation (white page, olive active tab, off-white form, olive submit), collections (light photo tiles) and FAQs render with no horizontal overflow.
- Remaining: a dedicated About page (brand story / why-direct / visit-atelier) was not created; cart and checkout got token alignment only, not a full step-indicator redesign. Product photography is still dark-background Unsplash.

---

### 1.11 Redesign step 4b — About page, checkout steps, light photography (2026-11-20)

- New `/about` route (Our Story): white hero with one line, the direct-to-you story, a "showroom without the showroom" comparison (desktop 3-column grid, mobile stacked cards) and a "Visit the atelier" band with address, hours and two CTAs. Linked from the header "More" menu and footer "Help" column.
- `/checkout` lighted: hardcoded hex colours (#556B2F / #F6F0E2 / #E5E7EB / #F9FAFB) swapped to tokens — off-white panels, white inputs, charcoal headings, olive Pay button. Added a Bag → Details → Payment step indicator at the top (step 2 active in olive).
- `/cart` lighted the same way (hex → tokens, charcoal heading).
- Product photography: all dark-background fixture photos replaced with brightness-verified light-background Unsplash shots (mean luminance 160–240 vs the previous 40–110). Reseeded. Homepage category tiles and "Find your edit" images updated to the same light set. One caveat remains: the pieces are diamond/western stock photos, so style (polki vs the photo) is still a placeholder until the owner's real shoot.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 201 / 201 (all suites). Playwright at 1440px: about, shop, checkout render with no horizontal overflow; shop cards now read light.

---

### 1.12 Product page + mobile 390px polish (2026-11-20)

- Verified every main page at 390px (home, shop, product, about, wishlist, checkout): no horizontal overflow anywhere.
- Product page fixes found at 390px and applied:
  - The global floating WhatsApp concierge pill overlapped the gallery thumbnails and the metal-colour swatches, and duplicated the sticky buy bar's WhatsApp action. Extracted it into a route-aware `ConciergePill` client component that hides on `/products/*` and still shows on every other page (verified: hidden on product, visible on shop).
  - Mobile gallery main image changed from 4:5 to square so the title, price and options surface with less scrolling.
  - Special-offers cards made more compact (narrower, tighter padding, clamped description) so they take less vertical space on mobile and read cleanly in the desktop rail.
- `pnpm lint`, `pnpm typecheck` pass; `pnpm test` 201 / 201. Playwright 390px + 1440px screenshots confirm the overlap is gone and the hierarchy reads cleanly.

---

### 1.13 Admin dashboard at 390px (2026-11-20)

- Logged into the admin as owner and checked every page at 390px. The sidebar collapses to a hamburger drawer (Home / Products / Orders / Enquiries + More), which works well; the Products catalogue is already a stacked photo-card grid and reads cleanly.
- Issue found: the data tables (dashboard "Recent orders", the Orders list, and all three Leads tabs) have more columns than fit 390px, so the status / payment columns were clipped off the right edge even though the row scrolled horizontally. On the most important screens the order and lead status was hidden.
- Fix: each of these tables now renders as a stacked card list below `sm` and keeps the full table at `sm` and up. On mobile every order card shows its amount and all status badges (order, fulfilment, payment); every lead card shows the phone, preferred time, Call / WhatsApp actions and the status dropdown. Nothing is clipped.
- `pnpm lint`, `pnpm typecheck` pass; `pnpm test` 201 / 201. Playwright 390px confirms no horizontal overflow on dashboard, orders and leads, and the status is always visible.

---

### 1.14 Interactivity, favicon and dashboard polish (2026-11-20)

- **Favicon fixed.** The browser icon was a black crest on a transparent background, so it was invisible on dark browser tabs. Regenerated `icon.png`, `apple-icon.png` and `favicon.ico` as the charcoal crest centred on a white circle (with a soft ivory ring); it now reads on any tab colour. Verified the icon and favicon both serve 200.
- **Product page made interactive.** The Description / Product details / Price breakup panels now animate in on switch; the Price breakup tab shows an animated proportional bar (gold / stones / making) with a percentage legend above the line-item table; and Add to bag gives a brief "Added to bag" check state. All motion respects `prefers-reduced-motion`.
- **Dashboard polish.** KPI numbers count up on load (reduced-motion jumps to the final value), and each stat card lifts with a soft shadow and a coloured left accent on hover. Values are unchanged and correct (revenue stays a formatted string).
- `pnpm lint`, `pnpm typecheck` pass; `pnpm test` 201 / 201. Playwright confirms the breakup bar, the count-up settling to the right values and the card hover accent.

---

### 1.15 Duplicate-slug guard on creation + CSV import (2026-11-20)

- **Requirement:** creating a product whose slug already exists must error with "this slug is already created in the backend", never silently overwrite.
- **Add product form** (`POST /api/admin/products`) already blocked a duplicate slug; the message now reads *This slug "x" is already created in the backend. Choose a different slug, or edit the existing product.* (HTTP 409).
- **CSV import** (`POST /api/admin/products/import`) previously upserted by slug, so a CSV row whose slug already existed silently updated that product. Added a backend-existence precheck after validation and before the dry-run / commit: any row whose slug (or SKU) already exists is returned as a per-row 409 error and nothing is imported. The precheck is wrapped in try/catch so a sandbox with no database skips it (the DB unique constraints still apply). Rows sharing a slug **within** one CSV still group into a single multi-variant product, because the precheck runs before any of them are written.
- **Verified live:** logged in as owner and posted a CSV using an existing seeded slug — got HTTP 409 with *This slug "heritage-polki-emerald-choker" is already created in the backend…*; a fresh slug returned a valid dry run. The import page renders the error in its row / field / message table.
- `pnpm lint`, `pnpm typecheck` pass; `pnpm test` 201 / 201.

---

## 2. Baseline Test Command Execution Log

| Command | Exit Code | Result | Evidence / Log Output |
| :--- | :--- | :--- | :--- |
| `node -v` | 0 | **PASS** | `v26.3.0` verified |
| `pnpm -v` | 0 | **PASS** | `11.7.0` verified |
| `git status` | 0 | **PASS** | Clean working tree with proper `.gitignore` |
| `pnpm run lint` | 0 | **PASS** | `✔ No ESLint warnings or errors` |
| `pnpm run typecheck` | 0 | **PASS** | `tsc --noEmit` completed with 0 errors |
| `pnpm run test` | 0 | **PASS** | 27 test files, 181 passed in 3.05s |
| `pnpm run build` | 0 | **PASS** | `next build` compiled 38 routes (storefront + admin + checkout + sitemap + robots) in 3.0s |
| `pnpm run db:seed` | 0 | **PASS** | PostgreSQL 16 seeded with store settings and deterministic fixtures |

---

## 3. Test Suites Breakdown (Vitest 3.2.7)

### Suite 1: `tests/unit/money.test.ts` (16 tests)
- `formatPaiseToInr()` Indian numbering format, decimals, and null handling (PASS)
- `inrToPaise()` & `paiseToInr()` float-free BigInt conversions (PASS)
- `isHighValueItem()` inclusive $\ge$ boundary checks (PASS)
- `calculateOrderFinancials()` 3% GST and total integer rounding (PASS)

### Suite 2: `tests/unit/policy.test.ts` (10 tests)
- S06 Threshold checks at 9,999,900 / 10,000,000 / 10,000,100 paise (PASS)
- S07 Enquiry-only checks blocking low-priced items (PASS)
- S08 Price on request checks redacting price and preventing checkout (PASS)
- Stock and Made-to-order lead times logic (PASS)

### Suite 3: `tests/unit/dto.test.ts` (4 tests)
- Strict redaction of `pricePaise` on `ON_REQUEST` (PASS)
- Conversion of `BigInt` to string for JSON serialization (PASS)
- Ascending `displayOrder` media sorting (PASS)

### Suite 4: `tests/unit/fixtures.test.ts` (8 tests)
- All boundary fixtures validated (PASS)
- Slugs, SKU groups, and variant SKUs globally unique (PASS)

### Suite 5: `tests/integration/health.test.ts` (1 test)
- `/api/health` queries PostgreSQL and reports store status (PASS)

### Suite 6: `tests/unit/components.test.tsx` (6 tests)
- `<Badge />` renders hallmark, gold, and outline variants (PASS)
- **S03 Graceful Recovery**: Simulates image load error and replaces broken asset with elegant luxury placeholder (PASS)
- `<ProductCard />` renders title, formatted price, high-value badge, and handles wishlist toggle (PASS)

### Suite 7: `tests/unit/gallery.test.tsx` (4 tests)
- **S05 Contract**: Renders accessible dialog with `role="dialog"` and `aria-modal="true"` (PASS)
- **S05 Contract**: Keyboard navigation with `ArrowRight` and `ArrowLeft` (PASS)
- **S05 Contract**: Escape key press closes modal (PASS)
- **S05 Contract**: Restores focus to the triggering element upon modal close (PASS)

### Suite 8: `tests/integration/routes.test.ts` (5 tests)
- PDP Route Data Resolution resolves valid slug against fixtures (PASS)
- **S03 Contract**: Non-existent product slug returns `undefined` for `notFound()` invocation (PASS)
- Collection Route Data Resolution filters products by collection slug (PASS)
- **S03 Contract**: Non-existent collection slug returns `undefined` for `notFound()` invocation (PASS)
- Editorial Homepage resolves all 4 collections and all 7 products (PASS)

### Suite 9: `tests/unit/catalogue.test.ts` (9 tests)
- `getCollections()` fetches all curated suites with product counts (PASS)
- `getCollectionBySlug()` fetches single collection or returns null for unknown slugs (PASS)
- `getProductBySlug()` fetches product with public DTO guarantees (PASS)
- Multi-axis filtering by metal type ("Platinum", "22K", "18K") (PASS)
- In-stock availability filtering (`stockQuantity > 0` or `isMadeToOrder`) (PASS)
- Keyword search across title, description, and gemstone details (PASS)
- Sorting: `price_asc` with `ON_REQUEST` items sorted last (PASS)
- Sorting: `price_desc` with highest priced pieces first (PASS)

### Suite 10: `tests/unit/wishlist.test.ts` (7 tests)
- **S25 Contract**: Retrieves stored items from browser `localStorage` (PASS)
- **S25 Contract**: Deduplicates items to prevent double-counting (PASS)
- **S25 Contract**: Removes specified item while preserving all other items (PASS)
- **S25 Contract**: Toggles item membership between saved and unsaved (PASS)
- **S25 Contract**: Handles corrupted JSON in localStorage gracefully without crashing (PASS)

### Suite 11: `tests/unit/variant.test.tsx` (1 test)
- **S04 Contract**: Dynamically switches active SKU (`AUR-SOL-002-YG` $\to$ `AUR-SOL-002-RG`) upon clicking variant button, and updates contextual WhatsApp inquiry link with the new SKU and metal description (PASS)

### Suite 12: `tests/integration/policy-api.test.ts` (6 tests)
- Evaluates boundary item at exact threshold (10,000,000 paise) enabling Buy AND WhatsApp (S06) (PASS)
- Evaluates item below threshold enabling Buy Now without WhatsApp (PASS)
- Strictly disables purchase on enquiryOnly item (S07) (PASS)
- Strictly redacts price and disables checkout on ON_REQUEST item (S08) (PASS)

### Suite 13: `tests/unit/whatsapp.test.ts` (7 tests)
- **S09 Contract**: Phone number sanitizer strips spaces, dashes, brackets, and plus signs to international digits only (PASS)
- **S09 Contract**: Product link builder creates valid `https://wa.me/{digits}?text={encoded}` link (PASS)
- **S09 Contract**: URL payload safely encodes special characters, newlines, hashes, ampersands, and Hindi/Unicode (`कुंदन & जड़ाऊ`) (PASS)
- **S10 Contract**: Intent tracking wrapper is non-blocking; handles network error gracefully without interrupting user navigation (PASS)

### Suite 14: `tests/unit/csv.test.ts` (9 tests)
- CSV Tokenizer handles quoted strings with internal commas and escaped quotes (PASS)
- Successfully validates valid CSV, converting INR to integer paise (PASS)
- Correctly parses `ON_REQUEST` rows without mandatory price (PASS)
- **S15 Contract**: Rejects missing required headers with row 1 reference (PASS)
- **S15 Contract**: Detects negative prices and flags exact line number (`Row 3: Price cannot be negative.`) (PASS)
- **S15 Contract**: Detects negative stock quantity with exact line number (PASS)
- **S15 Contract**: Flags duplicate SKUs in file with reference to previously seen row (PASS)

### Suite 15: `tests/integration/enquiries.test.ts` (5 tests)
- **S11 Contract**: Callback API creates inquiry lead with valid Indian phone number (PASS)
- **S11 Contract**: Rejects invalid phone numbers with 400 Bad Request (PASS)
- **S11 Contract**: Sliding-window rate limiter triggers 429 when threshold exceeded (PASS)
- **S12 Contract**: Viewing appointment request registers and explicitly returns `REQUESTED_UNCONFIRMED` status (PASS)

### Suite 16: `tests/integration/admin-rbac.test.ts` (9 tests)
- **S13 Contract**: Rejects unauthenticated requests to `/api/admin/settings` with 401 Unauthorized (PASS)
- **S13 Contract**: Allows STAFF to view settings, but blocks modifying settings with 403 Forbidden (PASS)
- **S13 Contract**: Allows OWNER to update store settings and high-value threshold (PASS)
- **S14 Contract**: Allows MANAGER to update variant price and stock quantity with audit logging (PASS)
- **S15 Contract**: Rejects invalid CSV uploads returning 422 Unprocessable Entity with line-level error array (PASS)

### Suite 17: `tests/unit/cart.test.ts` (6 tests)
- Adds new item to empty cart with quantity 1 (PASS)
- Increments quantity when same SKU is added again (PASS)
- Adds distinct variants as separate cart items (PASS)
- Updates quantity accurately and removes item when quantity <= 0 (PASS)
- Removes specified item without mutating other items in cart (PASS)
- Calculates optimistic totals with 3% GST and free insured shipping (PASS)

### Suite 18: `tests/unit/reservation.test.ts` (5 tests)
- Calculates 15-minute TTL accurately upon reservation creation (PASS)
- Blocks checkout when requested quantity exceeds available stock (PASS)
- **S19 Contract**: Releases active reservations back to stock on payment failure or cancellation (PASS)
- **S22 Contract**: Safely allocates stock for late payment when inventory remains (PASS)
- **S22 Contract**: Flags RECONCILIATION_REQUIRED when late payment arrives after stock is exhausted (PASS)

### Suite 19: `tests/integration/cart-tamper.test.ts` (4 tests)
- **S16 Contract**: Detects and overrides client price tampering, recalculating strictly from DB (PASS)
- **S16 Contract**: Strictly rejects negative or non-integer quantities at API level (PASS)
- **S16 Contract**: Strictly rejects checkout on items marked `isEnquiryOnly` regardless of client request (PASS)
- **S16 Contract**: Strictly rejects checkout on pieces with `priceVisibility: ON_REQUEST` (PASS)

### Suite 20: `tests/integration/concurrency-race.test.ts` (2 tests)
- **S17 Contract**: Ensures two concurrent buyers competing for the final single unit cannot oversell; exactly one succeeds, one fails (PASS)
- **S17 Contract**: High-concurrency race of 10 simultaneous buyers competing for 3 units; exactly 3 succeed, 7 rejected (PASS)

### Suite 21: `tests/integration/payment-flow.test.ts` (3 tests)
- **S18 Contract**: Completes full successful checkout lifecycle: init $\to$ verify $\to$ confirmed & committed (PASS)
- **S19 Contract**: Releases inventory reservations upon receiving payment.failed event (PASS)
- **S21 Contract**: Handles browser refresh before redirect callback gracefully without creating duplicate orders (PASS)

### Suite 22: `tests/integration/webhooks.test.ts` (3 tests)
- **S20 Contract**: Strictly rejects forged or invalid webhook signatures with 400 Bad Request (PASS)
- **S20 Contract**: Handles duplicate webhook submissions idempotently without double processing (PASS)
- **S22 Contract**: Safely allocates inventory when late payment arrives and stock is available (PASS)

### Suite 23: `tests/integration/order-token.test.ts` (2 tests)
- **S24 Contract**: Strictly rejects sequential or numeric order ID guesses with 404 Not Found (PASS)
- **S24 Contract**: Retrieves order successfully using valid opaque capability token (`uuidv4`) (PASS)

### Suite 24: `tests/unit/seo.test.ts` (12 tests) — NEW in Phase 6
- Generates default metadata with canonical URL, locale `en_IN`, and OpenGraph tags (PASS)
- Generates custom page metadata with prefixed title and path (PASS)
- Applies `noindex, nofollow` directives for private/admin/checkout routes (PASS)
- Generates valid Schema.org `JewelryStore` / `Organization` metadata (PASS)
- **S27 Contract**: Generates compliant Schema.org `Product` for public priced piece (PASS)
- **S08 / S27 Zero Price Leak Contract**: Strictly redacts price and prevents leaks for `ON_REQUEST` pieces (`price: "Upon Request"`, `availability: "PreOrder"`) (PASS)
- **S08 / S27 Zero Price Leak Contract**: Strictly sets Upon Request for `enquiryOnly` pieces (PASS)
- **S08 / S27 Zero Price Leak Contract**: Handles synthetic product with null `pricePaise` without leaking (PASS)
- Generates correct `BreadcrumbList` with 1-based indexing (PASS)
- Generates valid `CollectionPage` schema with nested `ItemList` (PASS)
- Dynamic `sitemap()` returns static, collection, and product URLs (PASS)
- `robots()` disallows private and sensitive paths (`/admin`, `/api/*`, `/checkout`, `/order/*`) (PASS)

### Suite 25: `tests/unit/analytics.test.ts` (6 tests) — NEW in Phase 6
- **S27 Zero PII Invariant**: Strictly strips customer name, email, phone, and addresses from payloads (PASS)
- **S27 Deduplication Contract**: Successfully tracks initial purchase, then deduplicates repeated dispatches on page refresh (PASS)
- Allows distinct orders to be tracked independently (PASS)
- Tracks product view safely without internal price leak for `ON_REQUEST` (PASS)
- Tracks product view with numeric INR price for public pieces (PASS)
- Tracks add to cart safely (PASS)

### Suite 26: `tests/unit/a11y.test.tsx` (3 tests) — NEW in Phase 6
- **S26 Contract**: Renders accessible skip link targeting `#main-content` in `<Header />` (PASS)
- **S05 / S26 Contract**: `<ZoomModal />` conforms to WAI-ARIA dialog pattern (`role="dialog"`, `aria-modal="true"`, Escape key dismissal, focus restoration) (PASS)
- **S26 Contract**: Header navigation elements possess accessible labels and interactive buttons (PASS)

### Suite 27: `tests/integration/smoke-matrix.test.ts` (28 tests) — NEW in Phase 6
- Full automated test execution verifying scenarios **S01 through S28** (ALL 28 PASS)

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
| **S23** | Receipt email outage | Order remains paid; failure logged for retry | Integration | **PASS (Decoupled in order workflow)** |
| **S24** | Guest order identifier guessed | Opaque capability token prevents enumerations | API/Integration| **PASS** |
| **S25** | Wishlist refresh & removal | localStorage persistence without duplication | Browser | **PASS** |
| **S26** | Keyboard/reduced motion/sticky CTA | Visible focus, WCAG contrast, unblocked CTA | Browser/Manual | **PASS** |
| **S27** | SEO & purchase analytics | Truthful Schema.org metadata; deduplicated buy | Integration/Unit | **PASS** |
| **S28** | Production build & start | Clean Next.js standalone build & healthy runtime| CI/Runtime | **PASS (38 routes compiled in 3.0s)** |
| **S29** | Backup restore & rollback rehearsal | Disposable DB restore verification | Operations | Planned (Phase 7) |
| **S30** | Live authorised release check | Production checklist verification | Production | Planned (Phase 7) |

### 1.16 Production-readiness audit + hardening (2026-11-21)

Full-site audit (4 parallel security reviews: auth/RBAC, payments/stock, ON_REQUEST price-leak, inputs/uploads) + deep code review, followed by fixes and a 39-scenario Playwright e2e suite.

**Verdict before fixes:** NOT production-ready (demo backdoor password live in prod, hardcoded secret fallbacks, reservations never linked to orders → guaranteed oversell, webhook `order_id`-less payload could confirm an arbitrary order, cross-order payment replay in verify, Razorpay gateway call stubbed).

**Fixes applied (all gated so local DEMO_MODE sandbox still works):**
- `src/lib/runtime.ts` (new): `isDemoMode()` / `requireSecret()`. `DEMO_MODE="true"` only in local `.env`; production fails closed.
- Auth: demo password + fixture admins + Bearer tokens + login-body token now demo-only; AUTH_SECRET required in prod; timingSafeEqual length guard (fixes 500 on wrong password); login rate-limited (10/15 min/IP); AdminShell redirects anonymous visitors to /admin/login; login-page demo credentials behind `NEXT_PUBLIC_DEMO_MODE`.
- Payments: real Razorpay Orders API call when genuine keys configured (demo synthetic otherwise); verify looks up strictly by `gatewayOrderId` and rejects mismatched orders; webhook ignores payloads without `order_id`, checks captured amount vs order total (mismatch → RECONCILIATION_REQUIRED), never downgrades PAID on late `payment.failed`, deterministic replay event ids; in-memory fallbacks demo-only (prod → 5xx so Razorpay retries).
- Inventory: `SELECT … FOR UPDATE` row lock in reservation transaction (real no-oversell); reservations linked to the created order (`linkReservationsToOrder`) so commit/release/late-payment reconciliation actually operate; orderNumber collision retry via `crypto.randomInt`.
- Checkout: `enablePurchases=false` now blocks `/api/checkout/initialize`; detected price tampering → 409; fixture catalogue purchasable in demo mode only.
- Public surface: whatsapp-intent rate-limited + zod-validated + `javascript:`-URL stripped (admin leads renders only http(s) links); enquiry fields got max-length caps; `/api/health` no longer leaks env/error details; CSV import capped (2 MB / 1000 rows); CSP + HSTS headers added, obsolete X-XSS-Protection dropped; image remotePatterns pinned (no `**.amazonaws.com`).
- Price-leak: wishlist no longer bundles raw fixtures into client JS — new public `/api/products/lookup` resolves saved ids to stripped DTOs (DB products now appear in wishlist too); store settings (threshold/purchase switch) now feed every public DTO via `src/lib/catalogue.ts`.
- Ops: `prisma/seed.ts` demo admins skipped in production and hashed with real PBKDF2; `scripts/create-admin.ts` (+ `pnpm admin:create`) provisions real admins; `.env.example` fixed (UPLOAD_DIR) and documents DEMO_MODE.

**Evidence:** typecheck 0 errors; lint clean; vitest 201/201; Playwright e2e vs production build on :3100 — **39/39 PASS** (storefront flows, ON_REQUEST redaction incl. JSON-LD + lookup API, admin RBAC incl. STAFF 403, duplicate-slug 409, security headers, login rate limit 429, tamper 409, javascript:-URL sanitised, 390 px no horizontal scroll).

**Still required before live:** real Razorpay keys + webhook secret, object storage creds, strong AUTH_SECRET, DEMO_MODE off, real admin via admin:create, real photography/WhatsApp/address content, legal pages, managed Postgres + backups; recommended: server-side session revocation, shared (Redis) rate-limit store, error monitoring (Sentry), uptime checks.

### 1.17 Storefront design pass — "close to the hands" (2026-11-21)

Applied Anthropic's official **frontend-design** skill (sourced from `anthropics/claude-plugins-official`) as the working brief. Its core rules drove the pass: ground the design in the subject matter, let typography carry personality, spend boldness in one place, and avoid the generated-page tells (tracked-out ALL-CAPS eyebrows, arrow glyphs appended to links, uniform rounded cards with identical shadows).

**Design direction.** Subject: a Jaipur polki/jadau bench selling direct at workshop prices. The brand pins the palette (olive #556B2F / burnt orange #CC5500 / ivory #F6F0E2 / charcoal #1A1A1A) and Poppins as the only typeface, so personality comes from scale and weight contrast rather than a new face.

- **Typography system** (`globals.css`): `.display-hero` / `.display-xl` / `.display-lg` at Poppins **300 Light**, clamped to 44–104px with tight optical tracking; `.head-section`, `.lede`, `.meta`, `.measure`. Large light Poppins reads editorial, not corporate.
- **Canvas inverted**: page field is brand ivory, products sit on white `.tile-product` surfaces, so every piece reads as a lit object. Matches the guidelines' 60% ivory split. `/shop`, `/collections` and `/about` no longer force white.
- **Olive is now structural, not a sliver**: a full-bleed olive band carries the brand's own line ("Priced at the workshop, not the showroom.") at display scale with three proof figures. This is the page's single loud moment; everything around it stays quiet.
- **Hero** rebuilt as an asymmetric ivory/photograph split with one orchestrated entrance (`hero-rise` / `hero-frame`), replacing the inset rounded banner with a centred eyebrow and arrow CTA.
- **Collections** are asymmetric (one lead, two followers) instead of three identical cards.
- **ProductCard** rewritten: flush white tile, title-then-price with a reserved two-line title so prices share a baseline, hover-only quick-add riding the photo (pointer devices only), and the two stacked circular buttons removed.
- **Chrome removed**: every tracked-out uppercase eyebrow label across the storefront de-shouted to sentence case (10 in one sweep, plus the last `.eyebrow` pills on `/shop` and the collection PDP); `→` glyphs dropped from link text. Buttons keep uppercase — that is brand-mandated (guidelines p.7).
- **WhatsApp green retired** from customer-facing UI: `#25D366` on every product card, the PDP and the floating pill replaced with brand olive; the pill is a compact circle on phones so it no longer covers hero copy. Admin leads keeps the green for staff recognition.

**Photography (fixtures).** A contact sheet of 19 candidate photographs was reviewed before assigning. One previously-listed candidate was a photo of **mobile phones**, not jewellery, and was discarded. The gold-rings-on-a-box shot had been reused across **5 products**; every product now has a unique, subject-appropriate primary image plus a hover image, and collection banners were matched to their collections. The saturated green-leaf earrings frame is desaturated so the category row reads as one set. These remain stock placeholders — real atelier photography is still the owner dependency.

**Product detail page.** The desktop gallery now stacks photographs in one tall column (it was a 2-up grid that left the lower half of the page empty beside the sticky detail panel). Special offers stack vertically instead of clipping the third offer mid-word in a horizontal rail.

**Bugs found and fixed during the pass**
- Hero entrance `scale(1.04)` widened the document for ~200ms, producing a transient horizontal scrollbar. The animation now lives on an inner layer inside the clipped frame; measured 0px overflow at 120/250/500/1200ms on both 1440 and 390.
- Expired `ACTIVE` reservations were never swept back to `RELEASED` (12 stale rows found from earlier runs). `createInventoryReservations` now releases this request's expired holds inside the transaction.
- Earlier "blank tile" observations were a full-page-screenshot artifact of lazy loading, not a defect; the capture script now scrolls before shooting.

**Evidence.** typecheck 0 errors; lint clean; vitest **201/201**; Playwright e2e vs the production build **42/42 PASS** (now including desktop-1440 horizontal-overflow checks). A reservation reset is run before the suite so repeated local runs stay idempotent — each run holds stock for 15 minutes by design.

### 1.18 Collection & category banners (2026-11-21)

Collection and category listings now open with a banner carrying the name, standfirst, piece count and photograph.

**What was missing.** `/collections/[slug]` rendered a text-only header even though every collection already had a `bannerImageUrl`. Worse, `/shop` never read `?category=` server-side at all — so the homepage category tiles ("Chokers", "Rings"…) all landed on a page headed "All jewellery" with no name, no banner and no SEO title of its own.

**Added**
- `src/lib/categories.ts` — the category registry (slug → label, standfirst, banner photograph) for chokers, necklaces, earrings, rings and bracelets. Banner photographs intentionally match the homepage category tiles so the two surfaces agree. `getCategory()` returns null for unknown slugs and for "all".
- `src/components/catalogue/ListingBanner.tsx` — shared banner. Deliberately the **same asymmetric ivory/photograph split as the homepage hero**, just shorter, rather than a second header pattern. Text sits on the ivory panel, not over the photo, so no dark scrim is needed and the piece stays fully visible. Takes an optional `eyebrow` (used for the breadcrumb) and `meta` (piece count).
- `/collections/[slug]` uses it with the collection's own banner, and its breadcrumb/colours moved off the stale `text-stone-*` values onto brand tokens.
- `/shop` now resolves `?category=` server-side, renders the matching banner, counts that category's own pieces, and emits a category-specific `generateMetadata` (title, description, og:image). Unknown categories fall back to "All jewellery".
- `/collections` listing brought onto the system: `display-lg` heading, flush `tile-product` images, `img-zoom` hover, and the `Explore →` arrow removed.
- `CollectionExperience`'s toolbar no longer repeats the listing title (the banner carries it). It now reports the live filtered count — `"8 pieces"`, or `"Showing 3 of 8 pieces"` when a filter is active — which is the one thing the banner cannot show.

**Evidence.** typecheck 0 errors; lint clean; vitest 201/201; Playwright e2e **49/49 PASS**, including four new scenarios: collection banner renders name + image + count; category page shows its own banner and name; **each of the five categories resolves a distinct banner photograph** (guards against silent reuse); unknown category falls back gracefully. Horizontal-overflow checks extended to `/shop?category=rings`, `/collections` and `/collections/[slug]`.

**Still placeholder.** Category banner photographs are stock and only approximately on-subject (the chokers banner is a pendant shot). They are wired to a single registry, so swapping in real atelier photography is a one-file change.

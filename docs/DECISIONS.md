# DECISIONS.md — Architectural Decisions, Confirmed Facts & Launch Blockers

**Project**: Premium Domestic Indian Jewellery Website  
**Date**: 2026-11-14  
**Status**: Phase 0 Baseline  

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
| **WhatsApp Integration** | Server-constructed `https://wa.me/{digitsOnly}?text={encoded}` deep-link. No WhatsApp API sending/bot automation in this release. | Master Prompt |
| **Appointment Requests** | Handled as customer appointment *requests*, not confirmed calendar slots; staff confirms manually. | Master Prompt |

---

## 2. Proposed Technical & Engineering Defaults

These decisions represent standard, robust engineering defaults selected for performance, reliability, and security:

| Component | Proposed Default | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router, Server Components) | Industry standard for SEO-critical e-commerce with server-side policy evaluation and streaming SSR. |
| **Language** | TypeScript (strict mode) | End-to-end type safety for data models, DTOs, and currency math. |
| **Styling & Tokens** | Tailwind CSS v3/v4 with custom theme tokens | Warm Ivory (`#FDFBF7`), Charcoal (`#1A1A1A`), Antique Gold (`#C5A869`), Cream (`#F5EFE6`). |
| **Database** | PostgreSQL 16+ | Robust transactional isolation (`FOR UPDATE` locking) required for atomic inventory reservation and webhook idempotency. |
| **ORM** | Prisma ORM | Type-safe migrations, query generation, and declarative schema models. |
| **Unit / Integration Testing**| Vitest | Fast, ESM-native test runner compatible with TypeScript and Node v26. |
| **E2E Smoke Testing** | Playwright | Multi-viewport testing (360px, 390px, 768px, 1280px, 1440px) matching smoke matrix S01–S30. |
| **Payment Gateway** | Razorpay (Standard Hosted Checkout / Sandbox) | Dominant payment provider for domestic Indian INR transactions (UPI, Cards, NetBanking) with robust webhook signature verification. |
| **Admin Authentication** | NextAuth / Iron-session with `bcrypt` / `argon2` | Maintained secure cookie-session library with server-side RBAC (`OWNER`, `MANAGER`, `STAFF`). |
| **Transactional Email** | Nodemailer / Resend sandbox adapter | For customer order receipts and staff appointment alerts. |
| **Object Storage** | S3-compatible storage (AWS S3, Cloudflare R2, or local storage adapter in dev) | For product images and certificate attachments. |

---

## 3. Explicitly Excluded Scope

The following features are **strictly out of scope** for this release unless authorized via formal change request:
- Customer account registration and password-protected buyer profiles.
- Augmented Reality (AR) or 3D virtual try-on.
- AI styling recommendations or generative chatbots.
- Live scrapers for gold/silver/platinum spot commodity market prices.
- Two-way ERP / inventory synchronization (SAP, Tally, Zoho Inventory).
- International multi-currency commerce, customs duty, or international shipping.
- Automated WhatsApp Business Cloud API chat bots (all WhatsApp CTAs are client-side deep links to staff concierge).

---

## 4. Missing Client Inputs & Launch Blockers

The following items are required from the client. Development will proceed through Phases 1–5 using clearly labelled synthetic fixtures; however, **these items represent hard blockers for Phase 7 (Production Launch)**:

### 4.1 Brand Assets
- [ ] **Brand Name**: Official trade name (Synthetic fallback in dev: `"Aurum Atelier"`).
- [ ] **Brand Logo**: Vector logo (SVG format) and light/dark lockups.
- [ ] **Favicon & Web App Icons**: 32x32, 180x180 PNG/ICO.
- [ ] **Brand Font Licenses**: Heading serif font (e.g. Cormorant Garamond / Playfair Display) and body font (e.g. Inter / Plus Jakarta Sans).

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


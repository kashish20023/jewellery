# DEPLOYMENT_VERCEL.md — Hosted deployment runbook

**Target**: Vercel (Next.js App Router) + managed Postgres + Cloudinary for imagery.
**Repo**: `https://github.com/kashish20023/jewellery` (branch `main`).

---

## 1. One-time setup, in order

### 1.1 Cloudinary (images)
1. Create a free account, then open **Settings → API Keys**.
2. Note the **Cloud name**, **API Key** and **API Secret**.
3. Put them in your local `.env` (see `.env.example`):
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   CLOUDINARY_FOLDER="chudiwalas"
   ```
4. Push the existing imagery up once:
   ```bash
   pnpm media:cloudinary --dry-run   # see the 28 planned uploads, change nothing
   pnpm media:cloudinary --rewrite   # upload, then repoint product/catalogue refs
   pnpm test && pnpm build           # must stay green before committing
   ```
   The manifest of every uploaded asset lands in `docs/cloudinary-media-manifest.json`.

   With `CLOUDINARY_*` set, `/api/admin/media/upload` automatically stores new admin
   uploads in Cloudinary instead of the non-durable local `uploads/` folder.

### 1.2 Postgres
There is no `prisma/migrations/` folder yet, so the schema is pushed directly.
Use the **direct** (non-pooled) connection string for this step:

```bash
DATABASE_URL="<direct-url>" pnpm db:push
DATABASE_URL="<direct-url>" pnpm admin:create you@chudiwalas.com "Your Name" OWNER
```

The second command prints a generated password once if you do not pass one.

### 1.3 Vercel project
Import the GitHub repo. Framework detection is automatic; leave Install and Build
commands at their defaults — `postinstall` runs `prisma generate` for the build.

---

## 2. Environment variables (Production **and** Preview)

Preview deployments run with `NODE_ENV=production`, so `requireSecret()` throws on
anything missing. Set the same values in both environments.

| Variable | Value |
| :--- | :--- |
| `DATABASE_URL` | **Pooled** connection string (pgBouncer / Neon pooler) |
| `AUTH_SECRET` | Fresh 32+ chars — `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Final domain, e.g. `https://chudiwalas.com` (canonicals, sitemap, order links) |
| `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` | `false` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | From §1.1 |
| `CLOUDINARY_FOLDER` | `chudiwalas` |
| `HIGH_VALUE_THRESHOLD_PAISE` | `10000000` (₹1,00,000) |
| `GST_PERCENTAGE` | `3.0` |
| `NEXT_PUBLIC_STORE_NAME` | `Chudiwalas` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Digits only, e.g. `919876543210` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Sandbox keys until live |
| `SMTP_*`, `FROM_EMAIL` | Optional, for transactional email |

`CLOUDINARY_CLOUD_NAME` is read at **build** time by `next.config.ts` for the
`next/image` allowlist and the CSP `img-src`. Adding it later needs a redeploy.

After the first deploy, point the Razorpay webhook at
`https://<domain>/api/webhooks/payment` and keep `RAZORPAY_WEBHOOK_SECRET` in sync.

---

## 3. Post-deploy checks

- `GET /api/health` — returns OK.
- `/shop`, `/collections`, a product page — imagery loads from `res.cloudinary.com`.
- `/admin/login` with the user created in §1.2; the Photography panel should report
  **Cloudinary** storage as durable, not the local `uploads/` warning.
- A sandbox checkout end to end, then confirm the order appears under `/admin/orders`.

---

## 4. Known constraints

- **Repo visibility**: the GitHub repo is public and carries
  `docs/Chudiwalas_Brand_Guidelines.pdf`. Vercel deploys from a private repo equally
  well — consider `gh repo edit --visibility private`.
- **Local `uploads/` is not a hosted option.** Without `CLOUDINARY_*` or `STORAGE_*`,
  admin uploads are written to a read-only, ephemeral serverless filesystem and will
  fail; the admin UI already flags that mode as non-durable.
- **Catalogue falls back to fixtures** when the database is unreachable
  (`src/lib/catalogue.ts`), so the storefront renders even before §1.2 — but checkout
  and admin need the real database.

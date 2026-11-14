# RELEASE_RUNBOOK.md — Operations, Deployment & Rollback Runbook

**Project**: Premium Domestic Indian Jewellery Website  
**Initial Draft**: Phase 0 Baseline  

---

## 1. Overview & Release Strategy
This runbook governs staging and production deployment, configuration validation, database migrations, backup/restore procedures, and emergency rollbacks.

---

## 2. Environment Matrix

| Environment | Purpose | Hosting Target | Database | Payment Mode | Email Mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development** | Feature development | Local Next.js dev server | Local PostgreSQL (Prisma) | Razorpay Test / Mock Sandbox | Console / Local Log |
| **Testing / CI** | Automated verification (S01–S30) | Isolated CI container | Disposable PostgreSQL instance | Mock Sandbox Webhooks | Mock Adapter |
| **Staging / UAT**| Client UAT & visual review | Vercel / Staging VPS | Managed PostgreSQL | Razorpay Sandbox | Resend / Test SMTP |
| **Production** | Live domestic commerce | Hardened Cloud Instance / Vercel | Production PostgreSQL (Multi-AZ) | Razorpay Live Gateway | Domain-verified SMTP/Resend |

---

## 3. Pre-Flight Release Checklist (Phase 7 Gate)

- [ ] **Database Migration Reversibility**: All migrations tested on disposable database with rollback scripts verified.
- [ ] **Database Backup**: Point-in-time recovery (PITR) enabled; manual pre-release snapshot taken.
- [ ] **Environment Secrets**:
  - `DATABASE_URL` (SSL mode enabled)
  - `NEXTAUTH_SECRET` / Session encryption key (min 32 bytes)
  - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER`
  - `HIGH_VALUE_THRESHOLD_PAISE`
  - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- [ ] **SEO & Indexing**:
  - Staging environment: `X-Robots-Tag: noindex, nofollow`
  - Production environment: Valid `robots.txt` and `sitemap.xml`
- [ ] **Smoke Suite Execution**: All 30 smoke test matrix items verified (`S01` to `S30`).

---

## 4. Deployment Procedure

```bash
# 1. Pull latest verified release tag
git checkout tags/v1.0.0

# 2. Install production dependencies
pnpm install --frozen-lockfile --prod=false

# 3. Apply database migrations
pnpm prisma migrate deploy

# 4. Build optimized Next.js bundle
pnpm run build

# 5. Run post-migration health check
curl -f http://localhost:3000/api/health || exit 1

# 6. Restart application process with zero-downtime reload
pm2 reload jewellery-storefront || systemctl restart jewellery-storefront
```

---

## 5. Rollback Procedure

If a critical failure occurs during deployment or post-release verification:

```bash
# 1. Immediately switch traffic to previous release container or rollback branch
git checkout tags/v0.9.0

# 2. Re-apply previous build
pnpm install --frozen-lockfile
pnpm run build
pm2 reload jewellery-storefront

# 3. Rollback database schema if down-migration was required
# (Note: Prefer additive non-breaking schema changes to prevent data loss)
pnpm prisma migrate resolve --rolled-back "migration_name"

# 4. Notify incident manager and verify status via /api/health
```

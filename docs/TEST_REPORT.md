# TEST_REPORT.md — Quality Assurance & Smoke Test Matrix Log

**Project**: Premium Jewellery Domestic Indian Storefront  
**Date**: 2026-11-14  
**Current Phase**: Phase 0 — Discovery and Implementation Contract  

---

## 1. Test Execution Summary

| Phase | Runner | Total Tests | Pass | Fail | Blocked / Not Run | Timestamp |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0 Baseline** | Runtime Inspection | 3 | 3 | 0 | 4 (Unconfigured) | 2026-11-14T14:40:00+05:30 |

---

## 2. Baseline Test Command Execution Log

| Command | Exit Code | Result | Evidence / Log Output |
| :--- | :--- | :--- | :--- |
| `node -v` | 0 | **PASS** | `v26.3.0` verified |
| `pnpm -v` | 0 | **PASS** | `11.7.0` verified |
| `git status` | 0 | **PASS** | Branch `main`, clean repository |
| `pnpm run test` | - | **NOT RUN** | Pending Phase 1 test framework installation |
| `pnpm run test:e2e`| - | **NOT RUN** | Pending Phase 2/6 Playwright installation |

---

## 3. Smoke Test Matrix Contract (S01 – S30) Status

| Test ID | Scenario Description | Layer | Planned Phase | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | Home and navigation at 390/1440 px | Browser | Phase 2 | NOT RUN |
| **S02** | Search/filter/sort and refresh/back | Browser/API | Phase 3 | NOT RUN |
| **S03** | No results, unknown slug, image failure | Browser | Phase 2 | NOT RUN |
| **S04** | Variant change updates SKU/price/stock | Browser/Unit | Phase 3 | NOT RUN |
| **S05** | Zoom keyboard/touch and Escape | Browser/Manual | Phase 2 | NOT RUN |
| **S06** | Price below/equal/above threshold | Unit/Browser | Phase 3 | NOT RUN |
| **S07** | `enquiryOnly` at low price disables purchase | API/Browser | Phase 3 | NOT RUN |
| **S08** | Price on request (no zero price / no leak) | API/Browser | Phase 3 | NOT RUN |
| **S09** | WhatsApp special characters & URL encoding | Unit/Browser | Phase 4 | NOT RUN |
| **S10** | WhatsApp tracking fails (link still works) | Browser | Phase 4 | NOT RUN |
| **S11** | Callback success and DB failure | Integration | Phase 4 | NOT RUN |
| **S12** | Appointment request (persisted unconfirmed) | Integration | Phase 4 | NOT RUN |
| **S13** | Admin anonymous and staff restrictions (RBAC)| API | Phase 4 | NOT RUN |
| **S14** | Admin updates price/stock/policy | Integration | Phase 4 | NOT RUN |
| **S15** | Invalid upload and CSV rows rejected safely | API/Integration | Phase 4 | NOT RUN |
| **S16** | Cart quantity and price tampering rejected | API | Phase 5 | NOT RUN |
| **S17** | Two buyers for final unit (concurrency race) | Integration | Phase 5 | NOT RUN |
| **S18** | Payment sandbox success (one order, one stock) | Integration | Phase 5 | NOT RUN |
| **S19** | Payment fail/cancel/pending releases stock | Integration | Phase 5 | NOT RUN |
| **S20** | Forged/duplicate/out-of-order webhook | API/Integration | Phase 5 | NOT RUN |
| **S21** | Refresh or redirect before callback verification| Browser/API | Phase 5 | NOT RUN |
| **S22** | Reservation expires then late payment arrives | Integration | Phase 5 | NOT RUN |
| **S23** | Receipt email outage does not break paid order | Integration | Phase 5 | NOT RUN |
| **S24** | Guest order capability token (no guessing IDs) | API | Phase 5 | NOT RUN |
| **S25** | Wishlist refresh and removal | Browser | Phase 3 | NOT RUN |
| **S26** | Keyboard/reduced motion/mobile sticky CTA | Browser/Manual | Phase 2 | NOT RUN |
| **S27** | SEO truthful structured data & analytics | Integration | Phase 6 | NOT RUN |
| **S28** | Production build and healthy runtime start | CI/Runtime | Phase 6 | NOT RUN |
| **S29** | Backup restore and rollback rehearsal | Operations | Phase 7 | NOT RUN |
| **S30** | Live authorised release check | Production | Phase 7 | NOT RUN |

---

## 4. Defect Log
*No defects identified in Phase 0 discovery. Baseline environment verified.*

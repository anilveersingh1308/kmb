# Carry Me Back · कैरी मी बैक

Digital Certificate of Appreciation platform for the **Carry Me Back** waste-management campaign of
**Nagar Panchayat Kedarnath, Rudraprayag (Uttarakhand)**.

Pilgrims carry a 1 kg bag of dry waste down from Kedarnath Dham, deposit it at the collection centre, and
instantly receive a personalised, verifiable **प्रशस्ति पत्र** by email — no login, no app.

| Layer | Tech |
|---|---|
| Web | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, Motion, canvas-confetti |
| Backend | Supabase (Postgres + Auth + RLS), Next.js Server Actions & Route Handlers |
| Email | Resend (free tier) via a swappable adapter — zero per-message cost |
| PDF | Browser print (vector) + html2canvas-pro/jsPDF (3× raster) fallback |

---

## Features

- **Pixel-exact certificate** reproduced from the official design on a fixed 1123 × 794 px A4-landscape canvas, auto-scaled to any screen, with auto-fitting long names, the Executive Officer's real signature, serial number, a **unique verification QR code** per certificate and the line *“in collaboration with Nagar Panchayat, Healing Himalayas, and Sulabh International”*.
- **Bilingual** — a हिं / EN toggle (cookie-persisted) switches the landing page sample, the public certificate page, the printed certificate and the PDF between the **Hindi original** and a full **English edition**. `?lang=en|hi` on any public URL forces a language (handy for sharing).
- **QR authenticity check** — scanning the printed QR opens `/c/<token>?via=qr`, which shows a green *“Authentic certificate · यह प्रमाण पत्र असली है”* banner after matching the token against the register. `GET /api/verify/<token>` returns the same result as JSON for third parties; forged / unknown codes get a 404.
- **Public certificate page** `/c/<token>` — cinematic reveal, layered celebration (cannons → gold starburst → 🙏🌿🏔️ shower → glitter rain), Download PDF, Print, Share, WhatsApp, Copy link.
- **Campaign landing page** `/` — Kedarnath peak hero photograph with slow Ken-Burns zoom and scroll parallax, trail photo feature, aurora + snowfall ambience, 3-D tilting certificate preview, live public counters, "how it works", verify box.
- **Staff portal** `/admin` — sign in with **Employee ID *or* email**, using a **password** or a **6-digit one-time code** that the app emails through Resend itself (no dependence on Supabase's 2-per-hour built-in mailer):
  - **Quick Outward** — sub-20-second issue loop, live name preview, optional bag number, **24-hour duplicate guard** (same phone/email → warn, operator can override), QR + link on success, resend email, "Next".
  - **Records** — search, source/date filters, pagination, copy/open/resend, admin edit & delete, **CSV export** (UTF-8 BOM).
  - **Stats** — today / 7-day / all-time, 14-day chart, email delivery health.
  - **Employees** (admin) — create operators/admins with login email, change email, activate/deactivate, reset passwords, last-login.
  - **Settings** (admin) — email master switch, auto-send on issue, sender name/address/reply-to/BCC, editable subject & Hindi/English intro, staff alerts (on issue / on failure), nightly daily-summary email, **send test email**, system status strip, recent email activity.
- **Mobile-app ingest API** `POST /api/mobile-ingest` — API-key protected, zod-validated, idempotent on `client_ref`.
- **Automated email** on issue (server action) + **DB webhook safety net** for rows inserted outside the app + **cron** endpoint for the daily summary.
- **Security** — RLS on every table, public data only via `security definer` RPCs that never return email/phone, unguessable 24-byte tokens, constant-time secret comparison, service-role key server-only, security headers.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local     # fill in values (see below)
npm run dev                     # http://localhost:3000
```

Design preview without a database: **http://localhost:3000/preview?name=Your%20Name**

## 2. Supabase

1. Create a project at https://supabase.com (free tier is fine).
2. Project Settings → API → copy `URL`, `anon` key and `service_role` key into `.env.local`.
3. **Connect** (top bar) → *Session pooler* → copy the URI into `SUPABASE_DB_URL` (replace `[YOUR-PASSWORD]`). Then:

   ```bash
   npm run db:migrate   # applies supabase/migrations/*.sql
   npm run db:seed      # migrations + supabase/seed.sql (demo staff + 14 demo certificates, prints their links)
   ```
   *(Or paste the same files into the SQL Editor in order: `0001`, `0002`, `0003`, `seed.sql`.)*

   Seeded accounts — **change the passwords before going live** (Employees → reset password):

   | Employee ID | Email | Password | Role |
   |---|---|---|---|
   | `NPK-0001` | anilsingh40545@gmail.com | `ChangeMe@2026` | admin |
   | `NPK-0042` | anilsingh40543@gmail.com | `Operator@2026` | operator |
   | `NPK-0043` | anilsingh40542@gmail.com | `Operator@2026` | operator |

4. Authentication → Providers → **Email**: enabled, *Confirm email* OFF (admins create accounts).
5. Authentication → URL Configuration → add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to *Redirect URLs*.

> **How the one-time code works.** `requestLoginCode()` stores a SHA-256 hash of a random 6-digit code in `login_otps` (10-minute expiry, 5 attempts, 4 codes / 10 min) and emails it via Resend. `verifyLoginCode()` checks the hash, then mints a Supabase session server-side with `auth.admin.generateLink` + `verifyOtp`. Supabase's own mailer is never used, so there is no “team-members only” restriction or hourly cap.

### Optional: database webhook (safety net)

Database → Webhooks → Create:
- Table `certificates`, event `INSERT`
- Type HTTP request, `POST https://<your-domain>/api/webhooks/certificate-created`
- Header `x-webhook-secret: <WEBHOOK_SECRET from .env>`

## 3. Email (Resend)

1. https://resend.com → add & verify your domain (or use `onboarding@resend.dev` for testing — it only delivers to your own address).
2. Create an API key → `RESEND_API_KEY`.
3. Set `EMAIL_FROM="Carry Me Back – Nagar Panchayat Kedarnath <certificates@yourdomain.in>"`.

To switch providers, edit `deliver()` in `src/lib/email.ts` — everything else is provider-agnostic. Sender, subject, intro text, BCC and staff alerts are editable at runtime in **Staff portal → Settings**.

> Resend rejects `@example.com` recipients by design — the seeded demo *participants* will show *failed* until you issue certificates with real addresses. Staff accounts use real Gmail addresses, so sign-in codes deliver.

### Daily summary (optional)

`GET /api/cron/daily-summary` (header `Authorization: Bearer <CRON_SECRET>`) emails yesterday's totals to the recipients set in Settings. `vercel.json` schedules it at 21:00 IST; on other hosts use any cron / Supabase `pg_cron` + `http` extension.

## 4. Deploy (Vercel / Netlify / any Node host)

Set the same environment variables in the host's dashboard, set `NEXT_PUBLIC_SITE_URL=https://<your-domain>`, then:

```bash
npm run build && npm start
```

Generate secrets: `openssl rand -hex 32` (once for `MOBILE_APP_KEY`, once for `WEBHOOK_SECRET`).

---

## Mobile app integration

```http
POST https://<your-domain>/api/mobile-ingest
x-api-key: <MOBILE_APP_KEY>
Content-Type: application/json

{
  "full_name": "Shree Vikram",
  "email": "pilgrim@example.com",
  "phone": "9876543210",
  "bag_number": "KB-1023",          // optional
  "bag_quantity": 1,
  "waste_kg": 1,
  "inventory_items": ["INV-778", "INV-779"],   // optional, still accepted from the app
  "operator_employee_id": "NPK-0042",
  "client_ref": "<uuid generated on the device>"
}
```

| Status | Meaning |
|---|---|
| `201` | Created → `{ serial_no, certificate_url, email_status }` |
| `200` + `duplicate: true` | Same `client_ref` seen before (offline retry) → existing certificate returned |
| `409` | Same bag number already recorded today |
| `422` | Validation error → `{ fields: { … } }` |
| `401` | Bad or missing `x-api-key` |

---

## Project structure

```
src/
  app/
    page.tsx                     landing page
    c/[token]/page.tsx           public certificate (tokenised, no auth; ?via=qr = authenticity banner)
    preview/page.tsx             design preview (dev / ALLOW_PREVIEW=1)
    admin/login                  staff sign-in (ID or email · password or OTP) + actions.ts (self-hosted codes)
    admin/(portal)/              layout guard + Quick Outward, records, stats, employees, settings
    admin/actions.ts             server actions (issue, resend, delete, employees, settings)
    auth/callback/route.ts       magic-link landing (kept for Supabase links)
    api/mobile-ingest            mobile app endpoint
    api/verify/[token]           public JSON authenticity check
    api/webhooks/certificate-created
    api/cron/daily-summary
    api/admin/export             CSV export
  components/
    Certificate.tsx              pixel-exact certificate (lang="hi" | "en")
    CertificateView.tsx          public page with celebration + QR verification + actions
    Landing.tsx, Ambient.tsx, LangToggle.tsx, celebration.ts
    admin/                       AdminShell, QuickOutward, RecordsTable, EmployeesPanel, SettingsPanel
  lib/
    supabase/{client,server,admin}.ts
    i18n.ts, lang-server.ts      certificate + UI strings, cookie language resolution
    email.ts, settings.ts, pdf.ts, validation.ts, secrets.ts, certificates.ts, types.ts
  proxy.ts                       session refresh + /admin route guard
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_auth_settings_verify.sql, 0004_login_otps.sql, seed.sql
scripts/
  db-apply.mjs                   npm run db:migrate / db:seed
  db-find-host.mjs               finds the right pooler region if the URI host is wrong
  db-logs.mjs                    prints recent email_logs
  email-test.mjs                 one-off Resend delivery test
  dev-plant-otp.mjs              DEV ONLY: plant a known sign-in code to test the OTP flow
  make-signature.ps1             scanned signature JPEG/PNG → trimmed transparent PNG
public/
  uttarakhand-logo.png           official Uttarakhand Rajya logo (transparent) — certificate, header, favicon
  signature.png                  Executive Officer's signature (transparent, trimmed)
  signature-sdm.png              Prabhari Adhikari / SDM signature (transparent, trimmed)
  img/                           campaign photos (WebP) — catalogued once each in src/lib/photos.ts
```

## Replacing the artwork

- **Signature** is already the Executive Officer's scanned signature (`public/signature.png`). To update it from a new scan: `powershell -File scripts/make-signature.ps1 "path\to\scan.jpg"` — it strips the white paper, trims and saves a transparent PNG.
- **Logo & photos**: `node scripts/build-campaign-photos.mjs "<photo folder>"` rebuilds the WebP photos, the transparent logo and the inline email logo (`src/lib/emblem-png.ts`). Add new photos to `src/lib/photos.ts` — each photo belongs to exactly one section so nothing repeats. Everything else on the certificate is live text and CSS.

## Cost

At ~5,000 certificates / season everything stays inside free tiers: Supabase (500 MB DB, 50k MAU), Resend (3,000 emails / month — upgrade or add Brevo if exceeded), static/serverless hosting.

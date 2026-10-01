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

- **Pixel-exact certificate** reproduced from the official design on a fixed 1123 × 794 px A4-landscape canvas, auto-scaled to any screen, with auto-fitting long names, the Executive Officer's real signature, serial number and a **unique verification QR code** per certificate.
- **QR authenticity check** — scanning the printed QR opens `/c/<token>?via=qr`, which shows a green *“Authentic certificate · यह प्रमाण पत्र असली है”* banner after matching the token against the register. `GET /api/verify/<token>` returns the same result as JSON for third parties; forged / unknown codes get a 404.
- **Public certificate page** `/c/<token>` — cinematic reveal, layered celebration (cannons → gold starburst → 🙏🌿🏔️ shower → glitter rain), Download PDF, Print, Share, WhatsApp, Copy link.
- **Campaign landing page** `/` — aurora + snowfall ambience, 3-D tilting certificate preview, live public counters, "how it works", verify box.
- **Staff portal** `/admin` — sign in with **Employee ID *or* email**, using a **password** or a **6-digit one-time code / magic link** sent to the registered email:
  - **Quick Outward** — sub-20-second issue loop, live name preview, inventory chips, **24-hour duplicate guard** (same phone/email → warn, operator can override), QR + link on success, resend email, "Next".
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

   Seeded accounts — **change them before going live** (edit the two `upsert_employee(...)` lines in `seed.sql` or use Employees → reset password):

   | Employee ID | Email | Password | Role |
   |---|---|---|---|
   | `NPK-0001` | admin@example.com | `ChangeMe@2026` | admin |
   | `NPK-0042` | operator@example.com | `Operator@2026` | operator |

4. Authentication → Providers → **Email**: enabled, *Confirm email* OFF (admins create accounts). For the **one-time code** login to show a 6-digit code, edit Authentication → Email Templates → *Magic Link* and include `{{ .Token }}` in the body (keep `{{ .ConfirmationURL }}` too if you want the link to work).
5. Authentication → URL Configuration → add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to *Redirect URLs*.
6. Recommended: Authentication → **SMTP Settings** → use Resend SMTP (`smtp.resend.com`, user `resend`, password = API key) so OTP emails are branded and not limited to 2 / hour.

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

> Resend rejects `@example.com` recipients by design — the seeded demo participants will show *failed* until you issue certificates with real addresses.

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
  "bag_number": "KB-1023",
  "bag_quantity": 1,
  "waste_kg": 1,
  "inventory_items": ["INV-778", "INV-779"],
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
    admin/login                  staff sign-in (ID or email · password or OTP)
    admin/(portal)/              layout guard + Quick Outward, records, stats, employees, settings
    admin/actions.ts             server actions (issue, resend, delete, employees, settings)
    auth/callback/route.ts       magic-link landing
    api/mobile-ingest            mobile app endpoint
    api/verify/[token]           public JSON authenticity check
    api/webhooks/certificate-created
    api/cron/daily-summary
    api/admin/export             CSV export
  components/
    Certificate.tsx              pixel-exact certificate
    CertificateView.tsx          public page with celebration + QR verification + actions
    Landing.tsx, Ambient.tsx, celebration.ts
    admin/                       AdminShell, QuickOutward, RecordsTable, EmployeesPanel, SettingsPanel
  lib/
    supabase/{client,server,admin}.ts
    email.ts, settings.ts, pdf.ts, validation.ts, secrets.ts, certificates.ts, types.ts
  proxy.ts                       session refresh + /admin route guard
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_auth_settings_verify.sql, seed.sql
scripts/
  db-apply.mjs                   npm run db:migrate / db:seed
  db-find-host.mjs               finds the right pooler region if the URI host is wrong
  db-logs.mjs                    prints recent email_logs
  make-signature.ps1             scanned signature JPEG/PNG → trimmed transparent PNG
public/
  emblem.svg                     ← replace with the official state emblem artwork
  signature.png                  Executive Officer's signature (transparent, trimmed)
```

## Replacing the artwork

- **Signature** is already the Executive Officer's scanned signature (`public/signature.png`). To update it from a new scan: `powershell -File scripts/make-signature.ps1 "path\to\scan.jpg"` — it strips the white paper, trims and saves a transparent PNG.
- **Emblem**: drop the official Uttarakhand state emblem into `public/emblem.svg` (or `.png` and update the `src` in `src/components/Certificate.tsx`). Everything else on the certificate is live text and CSS.

## Cost

At ~5,000 certificates / season everything stays inside free tiers: Supabase (500 MB DB, 50k MAU), Resend (3,000 emails / month — upgrade or add Brevo if exceeded), static/serverless hosting.

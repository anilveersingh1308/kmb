# MASTER BUILD PROMPT — "Carry Me Back" Digital Certificate Platform
### Nagar Panchayat Kedarnath · Rudraprayag (Uttarakhand)

> Paste everything below this line into your AI coding agent. Attach the reference certificate PDF, the Uttarakhand state emblem PNG (transparent) and the signature PNG (transparent) alongside it.

---

## 0. ROLE

You are a senior full-stack engineer and print/graphic designer. Build a production-ready, zero-cost-to-run web platform for the **"Carry Me Back" (कैरी मी बैक)** waste-management campaign at Kedarnath Dham. Pilgrims descending the trek carry a 1 kg bag of dry waste down; on depositing it at the NGO collection centre they receive a personalised, tokenised **Certificate of Appreciation (प्रशस्ति पत्र)** by email. Volume: thousands of certificates per season, on cheap Android phones, on weak Himalayan mobile networks.

Work strictly in this order: **(1) schema & security → (2) pixel-exact certificate → (3) public certificate page → (4) admin portal → (5) email automation → (6) mobile-app API → (7) tests & acceptance checklist.** Do not skip ahead; do not add features not listed here.

---

## 1. TECH STACK (non-negotiable)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Static **HTML5 + CSS3 + vanilla ES2020 JS** (no framework, no bundler required) | < 150 KB first load, works on 2G/3G |
| Hosting | Any static host (Netlify / Cloudflare Pages / Vercel / GitHub Pages) | Free tier |
| Backend & DB | **Supabase** — Postgres, Auth, Row-Level Security, Edge Functions (Deno/TypeScript), Database Webhooks | Serverless, free tier, no row-count ceiling |
| Email | **Resend** (3,000/month free) called from a Supabase Edge Function. Provide a swappable adapter so **Brevo** (300/day free) or Supabase SMTP can replace it by changing one env var | ₹0 per message; no SMS/WhatsApp APIs |
| PDF | Client-side **browser print → "Save as PDF"** as primary (zero cost, vector-sharp), plus **html2canvas + jsPDF** download button at 3× scale as fallback for phones without a print dialog | High-resolution, no server cost |
| Fonts | **Noto Sans Devanagari** (400/700), **Noto Serif** (400 italic), **Inter** or **Poppins** (600) — self-hosted WOFF2 subsets in `/assets/fonts/`, `font-display: swap` | Exact Hindi rendering, offline-safe |

Deliver the repo with this structure:

```
/public
  index.html                ← campaign landing page (hero + "What is Carry Me Back" + verify certificate box)
  certificate.html          ← /c/?t=<token>  public tokenised certificate page
  admin/
    login.html
    dashboard.html          ← Quick Outward form + records table
  assets/
    css/{base,certificate,admin,print}.css
    js/{supabase-client,certificate,admin,pdf}.js
    fonts/…                 ← self-hosted woff2
    img/emblem.png          ← Uttarakhand state emblem (SUPPLIED — do not redraw)
    img/signature.png       ← EO signature (SUPPLIED — transparent PNG)
/supabase
  migrations/0001_schema.sql
  migrations/0002_rls.sql
  functions/send-certificate-email/index.ts
  functions/mobile-ingest/index.ts
  seed.sql                  ← 1 demo employee + 3 demo participants
.env.example
README.md                   ← 10-minute deploy guide (Supabase → Resend → static host)
```

---

## 2. DATABASE SCHEMA (Postgres via Supabase)

```sql
-- employees are Supabase Auth users; this table holds profile + role
create table employees (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,          -- login handle shown on screen e.g. NPK-0042
  full_name text not null,
  role text not null default 'operator' check (role in ('operator','admin')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 80),
  email citext,                              -- nullable: some pilgrims have no email
  phone text check (phone ~ '^[6-9][0-9]{9}$'),
  bag_number text not null,                  -- printed tracking ID on the bag
  bag_quantity int not null default 1 check (bag_quantity between 1 and 50),
  waste_kg numeric(5,2) not null default 1.00,
  inventory_items text[] default '{}',       -- inventory numbers handed over
  source text not null default 'web' check (source in ('web','mobile_app')),
  created_by uuid references employees(id),
  created_at timestamptz default now(),
  unique (bag_number, created_at::date)      -- bag numbers may be recycled across days
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'), -- 32 chars, unguessable
  serial_no text not null unique,            -- human serial: CMB-2026-000123 (generate via sequence + trigger)
  issued_on date not null default current_date,
  view_count int not null default 0,
  created_at timestamptz default now()
);

create table email_logs (
  id bigserial primary key,
  certificate_id uuid references certificates(id) on delete cascade,
  to_email citext not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued','sent','failed','skipped_no_email')),
  error text,
  attempted_at timestamptz default now()
);
```

Requirements:
- Trigger `after insert on participants` → inserts a `certificates` row automatically (one certificate per participant, always).
- Serial number sequence `cmb_serial_seq`, formatted `CMB-<YYYY>-<6-digit zero-padded>`.
- **RLS ON for every table.**
  - `participants`, `email_logs`: `select/insert` only for authenticated users present in `employees` with `is_active = true`; `update/delete` only for `role = 'admin'`.
  - `certificates`: **no direct public select.** Public reads go through a `security definer` RPC `get_certificate(p_token text)` that returns only `{full_name, bag_quantity, waste_kg, serial_no, issued_on}` and increments `view_count`. Never expose email/phone publicly.
  - `employees`: users may read their own row; admins read all.
- Indexes: `participants(created_at desc)`, `participants(phone)`, `participants(email)`, `certificates(token)`.

---

## 3. THE CERTIFICATE — PIXEL-EXACT REPRODUCTION (most important section)

Reproduce the attached PDF **exactly**. Build it as a single `<section class="certificate">` that is laid out on a fixed **A4 landscape canvas of 1123 × 794 CSS px** (297 × 210 mm) and scaled to fit any viewport with `transform: scale()` (never reflow it). All positions below are relative to that canvas.

### 3.1 Page & borders
- Background: pure white `#FFFFFF`.
- **Double gold frame**: outer hairline `1.5px solid #B8962E` inset 28px from page edge; inner rule `4px solid #C9A64B` inset 40px from page edge; a second hairline `1px solid #B8962E` inset 48px. (Three concentric rules: thin, thick, thin — matching the reference.) Use nested `outline`/`box-shadow` or three absolutely-positioned divs; **no images for the border**.
- Nothing may touch the frame; content column is centred, max-width 900px.

### 3.2 Header block (centred, top-down)
1. **Emblem** `img/emblem.png` — 96 × 96 px, top at y = 95. (Uttarakhand state emblem: diamond with red/white/blue bands and text "उत्तराखण्ड राज्य" underneath in the artwork itself. Use the supplied asset, do not attempt to draw it.)
2. `उत्तराखण्ड राज्य` — Noto Sans Devanagari 700, 22px, colour `#1B1B1B`, y ≈ 210.
3. `कार्यालय नगर पंचायत केदारनाथ` — Noto Sans Devanagari 700, 30px, colour **maroon `#7A1F1F`**, y ≈ 250.
4. `रुद्रप्रयाग (उत्तराखंड)` — Noto Sans Devanagari 700, 18px, `#1B1B1B`, y ≈ 292.
5. **Thin gold divider** — 1px `#C9A64B`, width 640px, centred, y ≈ 322.

### 3.3 Title block
6. `प्रशस्ति पत्र` — Noto Sans Devanagari 700, **44px**, colour maroon `#7A1F1F`, y ≈ 380.
7. `CERTIFICATE OF APPRECIATION` — Noto Serif **italic**, 16px, `letter-spacing: 0.32em`, colour grey `#4A4A4A`, y ≈ 430.
8. `यह प्रमाण पत्र अत्यंत गौरव के साथ` — Noto Sans Devanagari 700, 17px, `#1B1B1B`, y ≈ 480.

### 3.4 Participant name line (dynamic)
9. **`{{FULL_NAME}}`** — Inter/Poppins 600, **36px**, `text-transform: uppercase`, colour brown **`#5A3A16`**, centred, y ≈ 540.
   - Sits on a **dotted leader** (`border-bottom: 2px dotted #9A9A9A`) spanning 660px centred; dots visible either side of the name exactly like the reference (`……… SHREE VIKRAM ………`).
   - Auto-fit: if the name exceeds 620px width, reduce font-size in 2px steps down to a minimum of 24px (JS `fitText()`); never wrap the name to two lines.
   - Sanitise: strip HTML, collapse whitespace, cap at 80 chars.

### 3.5 Body paragraph (fixed Hindi text — copy verbatim, do not "improve")
10. Justified paragraph, Noto Sans Devanagari 700, 17.5px, `line-height: 1.95`, colour `#1B1B1B`, width 900px, starting y ≈ 585. Begins with `को` immediately after the name line:

```
को केदारनाथ धाम की पावन और संवेदनशील भूमि को स्वच्छ, प्लास्टिक मुक्त एवं पर्यावरण के अनुकूल बनाए रखने हेतु आयोजित 'कैरी मी बैक' (Carry Me Back) जन-जागरूकता एवं स्वच्छता पहल में एक निष्ठावान वॉलेंटियर के रूप में अपना अमूल्य एवं अनुकरणीय योगदान देने के लिए प्रदान किया जाता है। हिमालयी पारिस्थितिकी के संरक्षण और बाबा केदार के आंगन की गरिमा बनाए रखने के लिए आपका यह निःस्वार्थ सेवा भाव अत्यंत वंदनीय एवं प्रेरणास्पद है। नगर पंचायत केदारनाथ आपके इस उत्कृष्ट प्रयास की सराहना करता है तथा आपके सुखद एवं मंगलमय भविष्य की कामना करता है।
```
   - `'कैरी मी बैक' (Carry Me Back)` — the Latin part renders in Noto Serif 700 exactly as in the reference.

### 3.6 Footer
11. **Left-centre slogan** `स्वच्छ केदारनाथ सुंदर केदारनाथ` — Noto Sans Devanagari 700, 20px, colour **green `#1E7B34`**, positioned x ≈ 560 (centre), y ≈ 745.
12. **Right signature block** (right-aligned column, x centre ≈ 960):
    - `img/signature.png` — 130 × 70 px, blue ink, overlapping slightly above the designation text (y ≈ 665–735).
    - `अधिशासी अधिकारी` — Noto Sans Devanagari 700, 17px, `#1B1B1B`, y ≈ 745.
    - `नगर पंचायत केदारनाथ` — Noto Sans Devanagari 700, 15px, `#1B1B1B`, y ≈ 770.
13. **Micro-footer (new, tiny, unobtrusive)** — bottom-left inside the frame, 9px `#8A8A8A`: `Serial: CMB-2026-000123 · Issued: 30 Sep 2026 · Verify: carrymeback.in/c/?t=…` plus a 60×60 px QR code (generate client-side with a tiny lib, ≤ 6 KB) linking to the same URL. This is the only permitted addition to the original design.

### 3.7 Verification rule
Render the reference PDF and your HTML side-by-side at 1123×794 and overlay at 50% opacity; every text baseline must land within ±3px and colours within ΔE < 3. Screenshot-compare in the test step (Playwright `toHaveScreenshot`, `maxDiffPixelRatio: 0.01`).

---

## 4. PUBLIC CERTIFICATE PAGE — `certificate.html?t=<token>`

- **No login, no signup, no app.** URL is the only credential.
- On load: read `t`, call RPC `get_certificate(t)`. States: `loading` skeleton → `found` (render certificate) → `not_found` (friendly Hindi + English message, no data leak) → `offline` (cached copy via Service Worker if previously viewed).
- Above the certificate: small header bar with emblem, "नगर पंचायत केदारनाथ · Carry Me Back" and a `✓ Verified certificate` badge.
- Below the certificate — three large touch-friendly buttons (min 48px tall):
  1. **Download PDF** → `pdf.js` renders `.certificate` via html2canvas at `scale: 3` into jsPDF `a4 landscape`, filename `Carry-Me-Back-Certificate-<SERIAL>.pdf`. Wait for `document.fonts.ready` and both images before capture.
  2. **Print** → `window.print()`. `print.css`: `@page { size: A4 landscape; margin: 0 }`, hide everything except `.certificate`, `-webkit-print-color-adjust: exact`, scale to exactly 297×210 mm.
  3. **Share** → Web Share API (`navigator.share`) with fallback copy-link; WhatsApp deep link `https://wa.me/?text=` (free, user-initiated — not an API).
- Open Graph / Twitter meta tags: title `Certificate of Appreciation – <Name>`, generic OG image (never the personalised one).
- `<html lang="hi">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, Lighthouse ≥ 95 on Performance/Accessibility/Best-Practices. Total transfer ≤ 250 KB including fonts.
- Service Worker caches shell + fonts + emblem; certificate JSON cached per token in `localStorage` so the page reopens offline on the trek.

---

## 5. ADMIN PORTAL — `/admin/`

### 5.1 Login (`login.html`)
- Fields: **Employee ID** + **Password**. Internally map Employee ID → email `${employee_id}@npk.local` and call `supabase.auth.signInWithPassword`. (Employees never see the synthetic email.)
- Rate-limit with Supabase Auth defaults; show generic "Invalid ID or password" (never reveal which).
- "Remember this device" = `persistSession: true`. Session expiry 12 h. Redirect to dashboard if already logged in.
- Only `is_active = true` employees may proceed; otherwise sign out + message.

### 5.2 Dashboard (`dashboard.html`) — mobile-first, works one-handed on a 5" phone
**Tab 1 — Quick Outward (default)**
Form fields, in order, with big inputs and `inputmode` hints:
| Field | Rules |
|---|---|
| Participant Name * | 2–80 chars, auto Title-Case preview of how it will appear on certificate |
| Email | RFC 5322 basic check; if blank show inline warning "Certificate will only be shareable via link / QR" |
| Phone | `inputmode="numeric"`, 10 digits, Indian mobile regex |
| Bag Number * | text, uppercase, scanner-friendly (auto-focus next on Enter) |
| Quantity of Bags * | number stepper, default 1 |
| Waste (kg) | default 1.00, step 0.25 |
| Inventory Items | tag-input; type number → Enter adds a chip; stored as `text[]` |
Submit button **"Issue Certificate"** → insert into `participants` (trigger creates certificate) → success card shows serial no., QR code, `Copy link`, `Open certificate`, `Resend email` and **`Next participant`** (clears form, refocuses Name). Whole loop must be doable in < 20 seconds.
Duplicate guard: warn if same phone or email was used in the last 24 h (allow override).

**Tab 2 — Records**
- Paginated table (50/page) with search by name/phone/email/bag number/serial, date-range filter, source filter (web / mobile_app).
- Row actions: Open certificate, Copy link, Resend email, (admin only) Edit name / Delete.
- Email status column from `email_logs` (sent / failed / no email) with retry.
- **Export CSV** of current filter (client-side generation, UTF-8 BOM so Hindi opens in Excel).

**Tab 3 — Stats (admin)**
- Today / this week / season totals: certificates issued, bags, kg of waste, emails sent/failed. Plain numbers + one lightweight bar chart (inline SVG, no chart library).

**Tab 4 — Employees (admin only)**
- Create operator (Employee ID, full name, temporary password → uses Supabase Admin API via an Edge Function `admin-create-employee`, never the service key in the browser), toggle active, reset password.

Global: top bar with logged-in name/ID, Logout; auto-logout on 401; toast notifications; all strings in a `i18n.js` map with Hindi + English (UI default English, certificate always Hindi).

---

## 6. EMAIL AUTOMATION

1. **Database Webhook** on `insert` into `certificates` → POST to Edge Function `send-certificate-email`.
2. The function: joins participant; if `email is null` → log `skipped_no_email` and exit. Else send via provider adapter (`RESEND_API_KEY`), from `Carry Me Back – Nagar Panchayat Kedarnath <certificates@yourdomain.in>`, reply-to the NGO's address. Log result to `email_logs`. Retry ×3 with exponential back-off on 5xx.
3. **Email template** (inline-CSS HTML + plaintext alternative, < 40 KB, no external images except emblem):
   - Subject: `🙏 आपका प्रशस्ति पत्र – Carry Me Back, Kedarnath | Your Certificate of Appreciation`
   - Body: emblem, bilingual thanks (Hindi first), big button **"View & Download Certificate"** → `https://<domain>/c/?t=<token>`, serial number, bag count / kg, one line on why it matters, footer "स्वच्छ केदारनाथ सुंदर केदारनाथ". No tracking pixels.
4. Manual `Resend` from admin calls the same function directly with the certificate id (JWT-protected, employee only).
5. Idempotency: skip sending if a `sent` log exists in the last 10 minutes for the same certificate.

---

## 7. MOBILE APP INTEGRATION — Edge Function `mobile-ingest`

`POST /functions/v1/mobile-ingest`, header `x-api-key: <MOBILE_APP_KEY>` (long random secret stored in Supabase secrets; rotateable). Body:
```json
{ "full_name": "...", "email": "...", "phone": "9xxxxxxxxx",
  "bag_number": "KB-1023", "bag_quantity": 1, "waste_kg": 1,
  "inventory_items": ["INV-778","INV-779"], "operator_employee_id": "NPK-0042",
  "client_ref": "uuid-from-app" }
```
- Validates with `zod`; resolves `operator_employee_id` → `created_by`; sets `source = 'mobile_app'`.
- **Idempotent** on `client_ref` (store it; return the existing certificate for repeat submissions so offline-retry in the app never creates duplicates).
- Response `201 { serial_no, certificate_url, email_status }`; `409` on duplicate bag+day; `422` on validation error with field map.
- Provide `README` snippet showing the exact `fetch` call for the app's existing "CARRY ME BACK" screen and a Postman collection.

---

## 8. SECURITY & PRIVACY (OWASP-aligned)

- Only the **anon key** ships to the browser; the **service-role key** lives solely in Edge Function secrets.
- RLS everywhere (Section 2). Public certificate RPC exposes no PII beyond the name.
- Tokens: 24 random bytes, base64url, constant-time lookup via unique index; 404 for unknown tokens with identical timing/messaging.
- All user text inserted via `textContent`, never `innerHTML`; CSP header `default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:`.
- HTTPS only, HSTS, `Referrer-Policy: strict-origin-when-cross-origin`.
- Input validation on both client and Postgres `check` constraints.
- Audit: `created_by` on every participant row; admin deletes are soft (`deleted_at`) if feasible.
- Data-minimisation notice on the certificate page footer: "We store only what is needed to issue this certificate."

---

## 9. PERFORMANCE & COST TARGETS

- First Contentful Paint < 1.5 s on "Slow 4G" throttling; certificate fully rendered < 3 s.
- Monthly run cost at 5,000 certificates: **₹0** (Supabase free, Resend free, static host free). Document upgrade thresholds in README.
- No third-party analytics; optional self-hosted counter via `view_count` only.

---

## 10. DELIVERABLES & ACCEPTANCE CHECKLIST

Return the complete codebase plus:
- [ ] `README.md` with a 10-minute deploy guide: create Supabase project → run migrations → set secrets (`RESEND_API_KEY`, `MOBILE_APP_KEY`, `PUBLIC_SITE_URL`) → deploy functions → create webhook → seed admin → deploy static host → DNS for email.
- [ ] `seed.sql` creating admin `NPK-0001` (password printed once in README, forced change on first login) and 3 demo participants incl. one very long name and one with no email.
- [ ] Playwright tests: (a) certificate visual match vs reference ≤ 1% diff, (b) unknown token → not-found, (c) operator can log in and issue a certificate in ≤ 6 interactions, (d) PDF download produces a 3-page-free single-page A4 landscape PDF, (e) mobile-ingest idempotency.
- [ ] Certificate renders identically in Chrome, Safari iOS, Firefox and in the printed PDF (fonts embedded, no fallback glyphs / tofu boxes in Devanagari).
- [ ] Lighthouse report screenshots ≥ 95/95/95.
- [ ] Zero console errors; zero `innerHTML` with user data; RLS test proving anon key cannot `select * from participants`.

If anything in this brief is ambiguous, choose the option that is **cheaper to run, simpler to operate on a phone at 3,500 m altitude, and closer to the reference PDF** — in that order.

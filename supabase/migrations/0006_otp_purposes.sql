-- =====================================================================
--  0006_otp_purposes.sql — one-time codes for account changes
--  The login_otps table now also carries codes that authorise a staff
--  member's own password / email change. Each code is bound to a purpose
--  (and, for account changes, to the user and the requested new email),
--  so a code issued for one action can never be redeemed for another.
-- =====================================================================
alter table public.login_otps
  add column if not exists purpose text not null default 'login',
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists payload text;

alter table public.login_otps drop constraint if exists login_otps_purpose_check;
alter table public.login_otps add constraint login_otps_purpose_check
  check (purpose in ('login', 'change_password', 'change_email_current', 'change_email_new'));

create index if not exists login_otps_user_purpose_idx on public.login_otps (user_id, purpose, created_at desc);

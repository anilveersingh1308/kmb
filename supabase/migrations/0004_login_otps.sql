-- =====================================================================
--  0004_login_otps.sql — self-hosted one-time login codes
--  Codes are emailed by the app via Resend (not Supabase's limited
--  built-in mailer). Only the service role touches this table.
-- =====================================================================
create table if not exists public.login_otps (
  id          bigserial primary key,
  email       citext not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now(),
  ip          text
);
create index if not exists login_otps_email_idx on public.login_otps (email, created_at desc);
alter table public.login_otps enable row level security;
revoke all on public.login_otps from anon, authenticated;

-- Purge codes older than a day (called opportunistically by the app)
create or replace function public.purge_login_otps()
returns void language sql security definer set search_path = public as $$
  delete from public.login_otps where created_at < now() - interval '1 day';
$$;
revoke all on function public.purge_login_otps() from public;

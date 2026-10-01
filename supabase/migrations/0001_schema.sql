-- =====================================================================
--  Carry Me Back · Nagar Panchayat Kedarnath
--  0001_schema.sql — tables, sequences, triggers, public RPC
-- =====================================================================
create extension if not exists citext;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- employees: profile + role for Supabase Auth users
-- Login handle is employee_id; auth email is synthetic <employee_id>@npk.local
-- ---------------------------------------------------------------------
create table if not exists public.employees (
  id          uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null check (employee_id ~ '^[A-Z0-9-]{3,20}$'),
  full_name   text not null check (length(trim(full_name)) between 2 and 80),
  role        text not null default 'operator' check (role in ('operator','admin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- participants: one row per bag deposit
-- ---------------------------------------------------------------------
create table if not exists public.participants (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (length(trim(full_name)) between 2 and 80),
  email           citext check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  bag_number      text not null check (length(trim(bag_number)) between 1 and 40),
  bag_quantity    int not null default 1 check (bag_quantity between 1 and 50),
  waste_kg        numeric(6,2) not null default 1.00 check (waste_kg > 0 and waste_kg <= 500),
  inventory_items text[] not null default '{}',
  source          text not null default 'web' check (source in ('web','mobile_app')),
  client_ref      text unique,                 -- idempotency key from the mobile app
  created_by      uuid references public.employees(id) on delete set null,
  created_at      timestamptz not null default now(),
  deposit_date    date not null default (now() at time zone 'Asia/Kolkata')::date,
  unique (bag_number, deposit_date)            -- bag numbers may be recycled across days
);

create index if not exists participants_created_at_idx on public.participants (created_at desc);
create index if not exists participants_phone_idx      on public.participants (phone);
create index if not exists participants_email_idx      on public.participants (email);
create index if not exists participants_bag_idx        on public.participants (bag_number);

-- ---------------------------------------------------------------------
-- certificates: one per participant, created by trigger
-- ---------------------------------------------------------------------
create sequence if not exists public.cmb_serial_seq;

create table if not exists public.certificates (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  token          text not null unique default translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),
  serial_no      text not null unique,
  issued_on      date not null default (now() at time zone 'Asia/Kolkata')::date,
  view_count     int  not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists certificates_token_idx on public.certificates (token);

create or replace function public.next_serial_no()
returns text language sql volatile as $$
  select 'CMB-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
         lpad(nextval('public.cmb_serial_seq')::text, 6, '0');
$$;

create or replace function public.create_certificate_for_participant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.certificates (participant_id, serial_no)
  values (new.id, public.next_serial_no());
  return new;
end $$;

drop trigger if exists trg_create_certificate on public.participants;
create trigger trg_create_certificate
after insert on public.participants
for each row execute function public.create_certificate_for_participant();

-- ---------------------------------------------------------------------
-- email_logs
-- ---------------------------------------------------------------------
create table if not exists public.email_logs (
  id                  bigserial primary key,
  certificate_id      uuid references public.certificates(id) on delete cascade,
  to_email            citext,
  provider            text not null default 'resend',
  provider_message_id text,
  status              text not null check (status in ('queued','sent','failed','skipped_no_email')),
  error               text,
  attempted_at        timestamptz not null default now()
);
create index if not exists email_logs_cert_idx on public.email_logs (certificate_id, attempted_at desc);

-- ---------------------------------------------------------------------
-- Public RPC: the ONLY way anonymous visitors read a certificate.
-- Returns name + contribution only. Never email / phone.
-- ---------------------------------------------------------------------
create or replace function public.get_certificate(p_token text)
returns table (
  full_name    text,
  bag_quantity int,
  waste_kg     numeric,
  serial_no    text,
  issued_on    date
)
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) < 20 then
    return;
  end if;

  update public.certificates c
     set view_count = view_count + 1
   where c.token = p_token;

  return query
    select p.full_name, p.bag_quantity, p.waste_kg, c.serial_no, c.issued_on
      from public.certificates c
      join public.participants p on p.id = c.participant_id
     where c.token = p_token;
end $$;

revoke all on function public.get_certificate(text) from public;
grant execute on function public.get_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Helper: is the current auth user an active employee / admin?
-- ---------------------------------------------------------------------
create or replace function public.is_active_employee()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees e where e.id = auth.uid() and e.is_active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees e where e.id = auth.uid() and e.is_active and e.role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Admin view used by the dashboard (joins everything an operator needs)
-- ---------------------------------------------------------------------
create or replace view public.participant_records
with (security_invoker = true) as
select
  p.id, p.full_name, p.email, p.phone, p.bag_number, p.bag_quantity, p.waste_kg,
  p.inventory_items, p.source, p.created_at, p.deposit_date,
  c.id as certificate_id, c.token, c.serial_no, c.issued_on, c.view_count,
  e.employee_id as created_by_employee_id,
  (select l.status from public.email_logs l where l.certificate_id = c.id order by l.attempted_at desc limit 1) as last_email_status
from public.participants p
join public.certificates c on c.participant_id = p.id
left join public.employees e on e.id = p.created_by;

-- ---------------------------------------------------------------------
-- Stats RPC for the dashboard
-- ---------------------------------------------------------------------
create or replace function public.campaign_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'today', (select json_build_object('certificates', count(*), 'bags', coalesce(sum(bag_quantity),0), 'kg', coalesce(sum(waste_kg),0))
              from participants where deposit_date = (now() at time zone 'Asia/Kolkata')::date),
    'week',  (select json_build_object('certificates', count(*), 'bags', coalesce(sum(bag_quantity),0), 'kg', coalesce(sum(waste_kg),0))
              from participants where deposit_date >= (now() at time zone 'Asia/Kolkata')::date - 6),
    'total', (select json_build_object('certificates', count(*), 'bags', coalesce(sum(bag_quantity),0), 'kg', coalesce(sum(waste_kg),0))
              from participants),
    'emails', (select json_build_object(
                 'sent',   count(*) filter (where status = 'sent'),
                 'failed', count(*) filter (where status = 'failed'),
                 'skipped',count(*) filter (where status = 'skipped_no_email'))
               from email_logs),
    'last14', (select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]'::json)
               from (select deposit_date d, count(*) n from participants
                     where deposit_date >= (now() at time zone 'Asia/Kolkata')::date - 13
                     group by deposit_date) s)
  );
$$;
revoke all on function public.campaign_stats() from public;
grant execute on function public.campaign_stats() to authenticated;

-- ---------------------------------------------------------------------
-- Public counters for the landing page (aggregate only, no PII)
-- ---------------------------------------------------------------------
create or replace function public.public_counts()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'certificates', count(*),
    'bags', coalesce(sum(bag_quantity), 0),
    'kg', coalesce(sum(waste_kg), 0)
  ) from public.participants;
$$;
revoke all on function public.public_counts() from public;
grant execute on function public.public_counts() to anon, authenticated;

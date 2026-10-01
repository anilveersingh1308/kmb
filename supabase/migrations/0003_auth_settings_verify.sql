-- =====================================================================
--  0003_auth_settings_verify.sql
--  • employees.email (real address; used for password + OTP login)
--  • app_settings (email / notification preferences, admin-editable)
--  • resolve_login_email(): Employee ID → auth email (login by ID)
--  • verify_certificate(): public authenticity check used by QR scans
--  • find_recent_duplicates(): 24 h duplicate guard for Quick Outward
-- =====================================================================

-- employees.email ------------------------------------------------------
alter table public.employees add column if not exists email citext unique;
alter table public.employees add column if not exists last_login_at timestamptz;

-- Login by Employee ID: returns the auth email for an ACTIVE employee.
create or replace function public.resolve_login_email(p_identifier text)
returns text language sql stable security definer set search_path = public as $$
  select u.email::text
    from public.employees e
    join auth.users u on u.id = e.id
   where e.is_active
     and (upper(e.employee_id) = upper(trim(p_identifier)) or e.email = trim(p_identifier))
   limit 1;
$$;
revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.touch_last_login()
returns void language sql security definer set search_path = public as $$
  update public.employees set last_login_at = now() where id = auth.uid();
$$;
grant execute on function public.touch_last_login() to authenticated;

-- app_settings ---------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.employees(id) on delete set null
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_staff_read  on public.app_settings;
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_staff_read on public.app_settings
  for select to authenticated using (public.is_active_employee());
create policy app_settings_admin_write on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.app_settings to authenticated;

insert into public.app_settings (key, value) values
  ('email', jsonb_build_object(
      'enabled', true,
      'send_on_issue', true,
      'from_name', 'Carry Me Back – Nagar Panchayat Kedarnath',
      'from_address', '',
      'reply_to', '',
      'subject', '🙏 आपका प्रशस्ति पत्र – Carry Me Back, Kedarnath | Your Certificate of Appreciation',
      'intro_hi', 'केदारनाथ धाम की पावन भूमि को स्वच्छ और प्लास्टिक-मुक्त रखने में आपके निःस्वार्थ योगदान के लिए नगर पंचायत केदारनाथ आपका हृदय से आभार व्यक्त करता है।',
      'intro_en', 'Thank you for carrying your waste back down the sacred trail. Your personalised Certificate of Appreciation is ready.',
      'footer_note', 'स्वच्छ केदारनाथ · सुंदर केदारनाथ',
      'bcc', ''
  )),
  ('notifications', jsonb_build_object(
      'notify_on_issue', false,
      'notify_on_failure', true,
      'recipients', '[]'::jsonb,
      'daily_summary', false,
      'summary_recipients', '[]'::jsonb
  ))
on conflict (key) do nothing;

-- email_logs: allow "skipped_disabled" + notification/test kinds ------
alter table public.email_logs drop constraint if exists email_logs_status_check;
alter table public.email_logs add constraint email_logs_status_check
  check (status in ('queued','sent','failed','skipped_no_email','skipped_disabled'));
alter table public.email_logs add column if not exists kind text not null default 'certificate'
  check (kind in ('certificate','notification','summary','test'));
alter table public.email_logs alter column certificate_id drop not null;

-- Public authenticity check (QR scan) ----------------------------------
create or replace function public.verify_certificate(p_token text)
returns table (
  authentic     boolean,
  serial_no     text,
  full_name     text,
  bag_quantity  int,
  waste_kg      numeric,
  issued_on     date,
  issued_at     timestamptz,
  view_count    int,
  issued_by     text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) < 20 then return; end if;
  return query
    select true, c.serial_no, p.full_name, p.bag_quantity, p.waste_kg, c.issued_on, c.created_at, c.view_count,
           'Nagar Panchayat Kedarnath'::text
      from public.certificates c
      join public.participants p on p.id = c.participant_id
     where c.token = p_token;
end $$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Duplicate guard ------------------------------------------------------
create or replace function public.find_recent_duplicates(p_phone text, p_email text)
returns table (id uuid, full_name text, serial_no text, created_at timestamptz, matched_on text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, c.serial_no, p.created_at,
         case when p.phone = p_phone then 'phone' else 'email' end
    from public.participants p
    join public.certificates c on c.participant_id = p.id
   where p.created_at > now() - interval '24 hours'
     and ((p_phone is not null and p_phone <> '' and p.phone = p_phone)
       or (p_email is not null and p_email <> '' and p.email = p_email::citext))
   order by p.created_at desc
   limit 5;
$$;
revoke all on function public.find_recent_duplicates(text, text) from public;
grant execute on function public.find_recent_duplicates(text, text) to authenticated;

-- Daily summary helper -------------------------------------------------
create or replace function public.day_summary(p_date date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'date', p_date,
    'certificates', count(*),
    'bags', coalesce(sum(bag_quantity), 0),
    'kg', coalesce(sum(waste_kg), 0),
    'with_email', count(*) filter (where email is not null),
    'by_operator', (select coalesce(json_agg(json_build_object('operator', coalesce(e.employee_id, 'mobile app'), 'n', s.n) order by s.n desc), '[]'::json)
                    from (select created_by, count(*) n from participants where deposit_date = p_date group by created_by) s
                    left join employees e on e.id = s.created_by)
  ) from participants where deposit_date = p_date;
$$;
revoke all on function public.day_summary(date) from public;
grant execute on function public.day_summary(date) to authenticated;

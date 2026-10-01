-- =====================================================================
--  seed.sql — first admin, one operator, demo participants
--  Run AFTER 0001, 0002, 0003.  Safe to re-run (idempotent).
--
--  ┌────────────────────────────────────────────────────────────────┐
--  │  EDIT THESE before running in production:                      │
--  │    admin   : NPK-0001 / admin@example.com    / ChangeMe@2026    │
--  │    operator: NPK-0042 / operator@example.com / Operator@2026    │
--  │  OTP / magic-link login only works for REAL mailboxes.         │
--  └────────────────────────────────────────────────────────────────┘
-- =====================================================================

create or replace function pg_temp.upsert_employee(
  p_employee_id text, p_email text, p_password text, p_full_name text, p_role text
) returns uuid language plpgsql as $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where email = lower(p_email);
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      lower(p_email), crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('employee_id', p_employee_id, 'full_name', p_full_name),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
            jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
            'email', now(), now(), now());
  end if;
  insert into public.employees (id, employee_id, full_name, role, email)
  values (v_uid, p_employee_id, p_full_name, p_role, lower(p_email))
  on conflict (id) do update set employee_id = excluded.employee_id, email = excluded.email, role = excluded.role;
  return v_uid;
end $$;

select pg_temp.upsert_employee('NPK-0001', 'admin@example.com',    'ChangeMe@2026', 'Executive Officer', 'admin');
select pg_temp.upsert_employee('NPK-0042', 'operator@example.com', 'Operator@2026', 'Rajesh Semwal',     'operator');

-- ---------------------------------------------------------------------
-- Demo participants (certificates + serials are created by trigger)
-- Spread over the last 10 days so Stats / charts have data.
-- ---------------------------------------------------------------------
create or replace function pg_temp.demo_participant(
  p_name text, p_email text, p_phone text, p_bag text, p_qty int, p_kg numeric,
  p_inv text[], p_source text, p_operator text, p_days_ago int
) returns void language plpgsql as $$
declare v_emp uuid; v_ts timestamptz := now() - (p_days_ago || ' days')::interval - (random() * interval '6 hours');
begin
  select id into v_emp from public.employees where employee_id = p_operator;
  if exists (select 1 from public.participants where bag_number = p_bag and deposit_date = (v_ts at time zone 'Asia/Kolkata')::date) then return; end if;
  insert into public.participants (full_name, email, phone, bag_number, bag_quantity, waste_kg, inventory_items, source, created_by, created_at, deposit_date, client_ref)
  values (p_name, p_email, p_phone, p_bag, p_qty, p_kg, p_inv, p_source, v_emp, v_ts, (v_ts at time zone 'Asia/Kolkata')::date,
          case when p_source = 'mobile_app' then 'demo-' || p_bag else null end);
end $$;

select pg_temp.demo_participant('Shree Vikram',                             'demo1@example.com',  '9876543210', 'KB-0001', 1, 1.00, '{INV-101}',         'web',        'NPK-0001', 0);
select pg_temp.demo_participant('Priya Rawat',                              'demo3@example.com',  null,         'KB-0003', 1, 1.25, '{}',                'web',        'NPK-0042', 0);
select pg_temp.demo_participant('Venkatanarasimharajuvaripeta Subramaniam', null,                 '9123456780', 'KB-0002', 2, 2.00, '{INV-102,INV-103}', 'mobile_app', 'NPK-0042', 1);
select pg_temp.demo_participant('Anjali Negi',                              'anjali@example.com', '9812345678', 'KB-0010', 1, 1.00, '{INV-110}',         'web',        'NPK-0042', 1);
select pg_temp.demo_participant('Mohammed Irfan Qureshi',                   'irfan@example.com',  '9898989898', 'KB-0011', 3, 3.50, '{INV-111,INV-112}', 'mobile_app', 'NPK-0042', 2);
select pg_temp.demo_participant('Harpreet Singh Gill',                      null,                 '9700011122', 'KB-0012', 1, 1.00, '{}',                'web',        'NPK-0001', 2);
select pg_temp.demo_participant('Sunita Devi',                              'sunita@example.com', null,         'KB-0013', 1, 0.75, '{INV-113}',         'web',        'NPK-0042', 3);
select pg_temp.demo_participant('Arjun Bisht',                              'arjun@example.com',  '9611122233', 'KB-0014', 2, 2.25, '{INV-114}',         'mobile_app', 'NPK-0042', 4);
select pg_temp.demo_participant('Meera Krishnan',                           'meera@example.com',  '9444455566', 'KB-0015', 1, 1.00, '{}',                'web',        'NPK-0042', 5);
select pg_temp.demo_participant('Rohan Thapliyal',                          null,                 '9555566677', 'KB-0016', 1, 1.00, '{INV-116}',         'web',        'NPK-0001', 6);
select pg_temp.demo_participant('Kavita Joshi',                             'kavita@example.com', '9666677788', 'KB-0017', 4, 4.00, '{INV-117,INV-118,INV-119}', 'mobile_app', 'NPK-0042', 7);
select pg_temp.demo_participant('Deepak Chandra Pant',                      'deepak@example.com', '9777788899', 'KB-0018', 1, 1.00, '{}',                'web',        'NPK-0042', 8);
select pg_temp.demo_participant('Fatima Sheikh',                            'fatima@example.com', '9888899900', 'KB-0019', 2, 1.75, '{INV-120}',         'web',        'NPK-0042', 9);
select pg_temp.demo_participant('Thomas George Varghese',                   'thomas@example.com', '9999900011', 'KB-0020', 1, 1.00, '{INV-121}',         'mobile_app', 'NPK-0042', 10);

-- Demo email logs so Records / Stats show delivery states
insert into public.email_logs (certificate_id, to_email, status, provider_message_id, kind)
select c.id, p.email, 'sent', 'demo-' || c.serial_no, 'certificate'
from public.certificates c join public.participants p on p.id = c.participant_id
where p.email is not null and p.full_name <> 'Fatima Sheikh'
  and not exists (select 1 from public.email_logs l where l.certificate_id = c.id);
insert into public.email_logs (certificate_id, to_email, status, error, kind)
select c.id, p.email, 'failed', 'Demo: mailbox unavailable', 'certificate'
from public.certificates c join public.participants p on p.id = c.participant_id
where p.full_name = 'Fatima Sheikh' and not exists (select 1 from public.email_logs l where l.certificate_id = c.id);
insert into public.email_logs (certificate_id, to_email, status, kind)
select c.id, null, 'skipped_no_email', 'certificate'
from public.certificates c join public.participants p on p.id = c.participant_id
where p.email is null and not exists (select 1 from public.email_logs l where l.certificate_id = c.id);

-- Show the demo certificate links
select p.full_name, c.serial_no, '/c/' || c.token as path
from public.certificates c join public.participants p on p.id = c.participant_id
order by c.created_at desc;

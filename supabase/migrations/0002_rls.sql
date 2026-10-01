-- =====================================================================
--  0002_rls.sql — Row Level Security
--  Anonymous users can read NOTHING directly; they use get_certificate().
-- =====================================================================
alter table public.employees    enable row level security;
alter table public.participants enable row level security;
alter table public.certificates enable row level security;
alter table public.email_logs   enable row level security;

-- employees -----------------------------------------------------------
drop policy if exists employees_self_read  on public.employees;
drop policy if exists employees_admin_all  on public.employees;
create policy employees_self_read on public.employees
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy employees_admin_all on public.employees
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- participants --------------------------------------------------------
drop policy if exists participants_staff_read   on public.participants;
drop policy if exists participants_staff_insert on public.participants;
drop policy if exists participants_admin_update on public.participants;
drop policy if exists participants_admin_delete on public.participants;
create policy participants_staff_read on public.participants
  for select to authenticated using (public.is_active_employee());
create policy participants_staff_insert on public.participants
  for insert to authenticated with check (public.is_active_employee() and created_by = auth.uid());
create policy participants_admin_update on public.participants
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy participants_admin_delete on public.participants
  for delete to authenticated using (public.is_admin());

-- certificates --------------------------------------------------------
drop policy if exists certificates_staff_read on public.certificates;
create policy certificates_staff_read on public.certificates
  for select to authenticated using (public.is_active_employee());
-- inserts happen only via the security-definer trigger; no insert policy on purpose.

-- email_logs ----------------------------------------------------------
drop policy if exists email_logs_staff_read on public.email_logs;
create policy email_logs_staff_read on public.email_logs
  for select to authenticated using (public.is_active_employee());
-- inserts are done server-side with the service role key.

-- grants --------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.participant_records to authenticated;
grant select, insert on public.participants to authenticated;
grant select on public.certificates to authenticated;
grant select on public.email_logs to authenticated;
grant select on public.employees to authenticated;
grant update, delete on public.participants to authenticated;  -- still gated by RLS (admin only)
grant all on public.employees to authenticated;                -- gated by RLS (admin only)

-- =====================================================================
--  0007_admin_stepup.sql — admin re-verification ("step-up") codes
--  Before an admin changes another staff member's login email, resets
--  their password or deletes them, the admin must re-confirm with a
--  one-time code sent to their own email. A verified code unlocks these
--  actions for 10 minutes.
-- =====================================================================
alter table public.login_otps drop constraint if exists login_otps_purpose_check;
alter table public.login_otps add constraint login_otps_purpose_check
  check (purpose in ('login', 'change_password', 'change_email_current', 'change_email_new', 'admin_stepup'));

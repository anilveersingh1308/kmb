"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmployee } from "@/lib/auth-server";
import { hasRecentIdentityCheck, issueCode, maskEmail, verifyCode } from "@/lib/otp";
import { sendAccountChangeNotice } from "@/lib/email";

type CodeSent = { ok: true; masked: string; sentAt: string } | { ok: false; error: string };
type Done = { ok: true; message: string } | { ok: false; error: string };

const NO_EMAIL = "Your account has no login email yet, so a verification code can't be sent. Ask an administrator to add one.";

/** Password rules shared with the UI meter: 8–72 chars, at least one letter and one digit. */
const passwordSchema = z.string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(120);

// ---------------- Password ----------------

/** Step 1: email a code to the account's current address. */
export async function requestPasswordCode(): Promise<CodeSent> {
  const { employee } = await requireEmployee();
  if (!employee.email) return { ok: false, error: NO_EMAIL };
  return issueCode({ email: employee.email, name: employee.full_name, purpose: "change_password", userId: employee.id });
}

/** Step 2: code + new password. Signs out other sessions and emails a security notice. */
export async function confirmPasswordChange(code: string, password: string, confirm: string): Promise<Done> {
  const { supabase, employee } = await requireEmployee();
  if (!employee.email) return { ok: false, error: NO_EMAIL };
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (password !== confirm) return { ok: false, error: "The two passwords don't match." };

  const check = await verifyCode({ email: employee.email, purpose: "change_password", code, userId: employee.id });
  if (!check.ok) return { ok: false, error: check.error };

  const { error } = await createAdminClient().auth.admin.updateUserById(employee.id, { password: parsed.data });
  if (error) return { ok: false, error: error.message.includes("same") ? "Choose a password different from your current one." : error.message };
  await supabase.auth.signOut({ scope: "others" });
  await sendAccountChangeNotice(employee.email, employee.full_name, "password");
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

// ---------------- Login email ----------------

/** Step 1: validate the new address, then prove it's really you with a code to the CURRENT address. */
export async function requestEmailChange(newEmail: string): Promise<CodeSent & { skipIdentity?: boolean }> {
  const { employee } = await requireEmployee();
  const parsed = emailSchema.safeParse(newEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const next = parsed.data;
  if (next === employee.email?.toLowerCase()) return { ok: false, error: "That is already your login email." };

  const admin = createAdminClient();
  const { count } = await admin.from("employees").select("id", { count: "exact", head: true }).eq("email", next).neq("id", employee.id);
  if (count) return { ok: false, error: "That email is already used by another staff account." };

  // Legacy accounts without an email can only prove ownership of the new address.
  if (!employee.email) {
    const sent = await issueCode({ email: next, name: employee.full_name, purpose: "change_email_new", userId: employee.id, payload: next });
    return sent.ok ? { ...sent, skipIdentity: true } : sent;
  }
  return issueCode({ email: employee.email, name: employee.full_name, purpose: "change_email_current", userId: employee.id, payload: next });
}

/** Step 2: code from the current address → send a code to the NEW address. */
export async function verifyEmailIdentity(code: string): Promise<CodeSent> {
  const { employee } = await requireEmployee();
  if (!employee.email) return { ok: false, error: NO_EMAIL };
  const check = await verifyCode({ email: employee.email, purpose: "change_email_current", code, userId: employee.id });
  if (!check.ok) return { ok: false, error: check.error };
  if (!check.payload) return { ok: false, error: "Start the email change again." };
  return issueCode({ email: check.payload, name: employee.full_name, purpose: "change_email_new", userId: employee.id, payload: check.payload });
}

/** Resend the code to the new address (identity step already done). */
export async function resendNewEmailCode(newEmail: string): Promise<CodeSent> {
  const { employee } = await requireEmployee();
  const parsed = emailSchema.safeParse(newEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (employee.email && !(await hasRecentIdentityCheck(employee.id, parsed.data))) return { ok: false, error: "Your identity check has expired. Start again." };
  return issueCode({ email: parsed.data, name: employee.full_name, purpose: "change_email_new", userId: employee.id, payload: parsed.data });
}

/** Step 3: code from the NEW address → switch the login email (auth + employee profile) and notify the old address. */
export async function confirmEmailChange(newEmail: string, code: string): Promise<Done> {
  const { employee } = await requireEmployee();
  const parsed = emailSchema.safeParse(newEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const next = parsed.data;
  // Both proofs are required: you control the account's current inbox (recently) and the new one (now).
  if (employee.email && !(await hasRecentIdentityCheck(employee.id, next))) return { ok: false, error: "Your identity check has expired. Start again." };
  const check = await verifyCode({ email: next, purpose: "change_email_new", code, userId: employee.id });
  if (!check.ok) return { ok: false, error: check.error };
  if (check.payload !== next) return { ok: false, error: "This code was issued for a different address. Start again." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(employee.id, { email: next, email_confirm: true });
  if (error) return { ok: false, error: /already|registered|exists/i.test(error.message) ? "That email is already registered to another account." : error.message };
  const { error: e2 } = await admin.from("employees").update({ email: next }).eq("id", employee.id);
  if (e2) return { ok: false, error: e2.message };

  if (employee.email) await sendAccountChangeNotice(employee.email, employee.full_name, "email", maskEmail(next));
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Login email changed to ${next}. Use it for sign-in codes from now on.` };
}

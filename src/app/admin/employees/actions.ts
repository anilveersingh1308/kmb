"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmployee } from "@/lib/auth-server";
import { endStepUp, issueCode, maskEmail, stepUpExpiry, verifyCode } from "@/lib/otp";
import { sendAccountChangeNotice } from "@/lib/email";
import type { Employee } from "@/lib/types";

/** `stepUp: true` tells the UI to ask the admin for a fresh one-time code, then retry. */
export type AdminResult = { ok: true; message: string; until?: string } | { ok: false; error: string; stepUp?: boolean };

const STEP_UP_NEEDED: AdminResult = { ok: false, stepUp: true, error: "Confirm it's you to continue." };

const passwordSchema = z.string()
  .min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.").regex(/\d/, "Include at least one number.");
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(120);

async function requireAdmin() {
  const ctx = await requireEmployee();
  if (ctx.employee.role !== "admin") throw new Error("Admins only");
  return ctx;
}

/** Admin + a step-up verification from the last 10 minutes + a real, different target employee. */
async function sensitive(targetId: string): Promise<{ me: Employee; target: Employee } | AdminResult> {
  const { employee: me } = await requireAdmin();
  if (!(await stepUpExpiry(me.id))) return STEP_UP_NEEDED;
  if (targetId === me.id) return { ok: false, error: "Use My account to change your own details." };
  const { data: target } = await createAdminClient().from("employees").select("*").eq("id", targetId).maybeSingle();
  if (!target) return { ok: false, error: "That staff account no longer exists." };
  return { me, target: target as Employee };
}

async function activeAdminCount(excludeId: string) {
  const { count } = await createAdminClient().from("employees").select("id", { count: "exact", head: true })
    .eq("role", "admin").eq("is_active", true).neq("id", excludeId);
  return count ?? 0;
}

// ---------------- Step-up (re-verify the admin) ----------------

export async function getStepUp(): Promise<{ until: string | null; email: string | null }> {
  const { employee } = await requireAdmin();
  return { until: await stepUpExpiry(employee.id), email: employee.email ? maskEmail(employee.email) : null };
}

export async function requestStepUpCode(): Promise<{ ok: true; masked: string; sentAt: string } | { ok: false; error: string }> {
  const { employee } = await requireAdmin();
  if (!employee.email) return { ok: false, error: "Your account has no login email, so a code can't be sent. Add one in My account first." };
  return issueCode({ email: employee.email, name: employee.full_name, purpose: "admin_stepup", userId: employee.id });
}

export async function verifyStepUpCode(code: string): Promise<AdminResult> {
  const { employee } = await requireAdmin();
  if (!employee.email) return { ok: false, error: "Your account has no login email." };
  const check = await verifyCode({ email: employee.email, purpose: "admin_stepup", code, userId: employee.id });
  if (!check.ok) return { ok: false, error: check.error };
  const until = await stepUpExpiry(employee.id);
  return { ok: true, message: "Verified — staff changes unlocked for 10 minutes.", until: until ?? undefined };
}

export async function lockStepUp(): Promise<AdminResult> {
  const { employee } = await requireAdmin();
  await endStepUp(employee.id);
  return { ok: true, message: "Locked. You'll need a new code for the next change." };
}

// ---------------- Staff changes ----------------

export async function changeStaffEmail(targetId: string, email: string): Promise<AdminResult> {
  const ctx = await sensitive(targetId);
  if ("ok" in ctx) return ctx;
  const { me, target } = ctx;
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const next = parsed.data;
  if (next === target.email?.toLowerCase()) return { ok: false, error: "That is already their login email." };

  const admin = createAdminClient();
  const { count } = await admin.from("employees").select("id", { count: "exact", head: true }).eq("email", next).neq("id", target.id);
  if (count) return { ok: false, error: "That email is already used by another staff account." };
  const { error } = await admin.auth.admin.updateUserById(target.id, { email: next, email_confirm: true });
  if (error) return { ok: false, error: /already|registered|exists/i.test(error.message) ? "That email is already registered to another account." : error.message };
  const { error: e2 } = await admin.from("employees").update({ email: next }).eq("id", target.id);
  if (e2) return { ok: false, error: e2.message };

  const by = `${me.full_name} (${me.employee_id})`;
  await Promise.all([
    target.email ? sendAccountChangeNotice(target.email, target.full_name, "email", maskEmail(next), by) : null,
    sendAccountChangeNotice(next, target.full_name, "email_new", target.employee_id, by),
  ]);
  revalidatePath("/admin/employees");
  return { ok: true, message: `${target.full_name}'s login email is now ${next}. Both addresses were notified.` };
}

export async function resetStaffPassword(targetId: string, password: string): Promise<AdminResult> {
  const ctx = await sensitive(targetId);
  if ("ok" in ctx) return ctx;
  const { me, target } = ctx;
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await createAdminClient().auth.admin.updateUserById(target.id, { password: parsed.data });
  if (error) return { ok: false, error: error.message };
  // The password itself is never emailed — only a notice that it was reset.
  if (target.email) await sendAccountChangeNotice(target.email, target.full_name, "password", undefined, `${me.full_name} (${me.employee_id})`);
  return { ok: true, message: `Password reset for ${target.full_name}.` };
}

/** How many certificates would lose their "issued by" attribution if this account were deleted. */
export async function staffImpact(targetId: string): Promise<{ records: number }> {
  await requireAdmin();
  const { count } = await createAdminClient().from("participants").select("id", { count: "exact", head: true }).eq("created_by", targetId);
  return { records: count ?? 0 };
}

export async function deleteStaff(targetId: string, confirmId: string): Promise<AdminResult> {
  const ctx = await sensitive(targetId);
  if ("ok" in ctx) return ctx;
  const { me, target } = ctx;
  if (confirmId.trim().toUpperCase() !== target.employee_id) return { ok: false, error: `Type ${target.employee_id} exactly to confirm.` };
  if (target.role === "admin" && target.is_active && (await activeAdminCount(target.id)) === 0) return { ok: false, error: "You can't remove the last active admin." };

  // Deleting the auth user cascades to the employee profile; their records keep the certificate but lose the operator ID.
  const { error } = await createAdminClient().auth.admin.deleteUser(target.id);
  if (error) return { ok: false, error: error.message };
  if (target.email) await sendAccountChangeNotice(target.email, target.full_name, "removed", target.employee_id, `${me.full_name} (${me.employee_id})`);
  revalidatePath("/admin/employees");
  return { ok: true, message: `${target.full_name} (${target.employee_id}) was removed.` };
}

/** Deactivate / reactivate: reversible, so no code needed — but never yourself or the last active admin. */
export async function setStaffActive(targetId: string, active: boolean): Promise<AdminResult> {
  const { employee: me } = await requireAdmin();
  if (targetId === me.id) return { ok: false, error: "You can't deactivate yourself." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("employees").select("*").eq("id", targetId).maybeSingle();
  if (!target) return { ok: false, error: "That staff account no longer exists." };
  if (!active && target.role === "admin" && (await activeAdminCount(target.id)) === 0) return { ok: false, error: "You can't deactivate the last active admin." };
  const { error } = await admin.from("employees").update({ is_active: active }).eq("id", targetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  return { ok: true, message: `${target.full_name} ${active ? "can sign in again" : "can no longer sign in"}.` };
}

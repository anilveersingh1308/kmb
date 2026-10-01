"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCertificateEmail, sendTestEmail as sendTest } from "@/lib/email";
import { participantSchema, zodFieldErrors, type ParticipantInput } from "@/lib/validation";
import type { Employee, EmailSettings, NotificationSettings } from "@/lib/types";

export interface DuplicateHit { id: string; full_name: string; serial_no: string; created_at: string; matched_on: string }

export interface IssueResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Same phone/email seen in the last 24 h — operator must confirm with `force`. */
  duplicates?: DuplicateHit[];
  record?: { id: string; certificate_id: string; serial_no: string; token: string; email_status: string; full_name: string };
}

async function requireEmployee(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; employee: Employee }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: employee } = await supabase.from("employees").select("*").eq("id", user.id).single();
  if (!employee || !employee.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?reason=inactive");
  }
  return { supabase, employee: employee as Employee };
}

export async function issueCertificate(input: ParticipantInput, opts: { force?: boolean } = {}): Promise<IssueResult> {
  const parsed = participantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const { supabase, employee } = await requireEmployee();

  if (!opts.force && (parsed.data.phone || parsed.data.email)) {
    const { data: dups } = await supabase.rpc("find_recent_duplicates", { p_phone: parsed.data.phone, p_email: parsed.data.email });
    if (dups && dups.length) return { ok: false, duplicates: dups as DuplicateHit[] };
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({ ...parsed.data, source: "web", created_by: employee.id })
    .select("id, full_name")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "This bag number has already been recorded today." };
    return { ok: false, error: error.message };
  }

  // Certificate row is created by trigger; read it back with the service role (fast, avoids RLS round-trip).
  const admin = createAdminClient();
  const { data: cert } = await admin.from("certificates").select("id, serial_no, token").eq("participant_id", data.id).single();
  if (!cert) return { ok: false, error: "Certificate was not generated. Please contact the administrator." };

  const email = await sendCertificateEmail(cert.id, { auto: true });
  revalidatePath("/admin/records");
  return { ok: true, record: { id: data.id, certificate_id: cert.id, serial_no: cert.serial_no, token: cert.token, email_status: email.status, full_name: data.full_name } };
}

export async function resendEmail(certificateId: string) {
  await requireEmployee();
  const res = await sendCertificateEmail(certificateId, { force: true });
  revalidatePath("/admin/records");
  return res;
}

export async function deleteParticipant(participantId: string) {
  const { supabase, employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const { error } = await supabase.from("participants").delete().eq("id", participantId);
  revalidatePath("/admin/records");
  return { ok: !error, error: error?.message };
}

export async function updateParticipantName(participantId: string, fullName: string) {
  const { supabase, employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const name = z.string().trim().min(2).max(80).safeParse(fullName);
  if (!name.success) return { ok: false, error: "Invalid name" };
  const { error } = await supabase.from("participants").update({ full_name: name.data }).eq("id", participantId);
  revalidatePath("/admin/records");
  return { ok: !error, error: error?.message };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------- Employees (admin only) ----------------
const employeeSchema = z.object({
  employee_id: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, "Use 3–20 letters, digits or hyphens (e.g. NPK-0042)"),
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email — it is used for OTP sign-in").max(120),
  role: z.enum(["operator", "admin"]),
  password: z.string().min(8, "Minimum 8 characters").max(72),
});

export async function createEmployee(form: FormData) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const parsed = employeeSchema.safeParse({
    employee_id: form.get("employee_id"), full_name: form.get("full_name"), email: form.get("email"), role: form.get("role"), password: form.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { employee_id: parsed.data.employee_id, full_name: parsed.data.full_name },
  });
  if (error || !created.user) return { ok: false, error: error?.message ?? "Could not create user" };

  const { error: profileErr } = await admin.from("employees").insert({
    id: created.user.id, employee_id: parsed.data.employee_id, full_name: parsed.data.full_name, role: parsed.data.role, email: parsed.data.email,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileErr.code === "23505" ? "Employee ID or email already exists" : profileErr.message };
  }
  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function updateEmployeeEmail(id: string, email: string) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { email: parsed.data, email_confirm: true });
  if (error) return { ok: false, error: error.message };
  const { error: e2 } = await admin.from("employees").update({ email: parsed.data }).eq("id", id);
  revalidatePath("/admin/employees");
  return { ok: !e2, error: e2?.message };
}

export async function setEmployeeActive(id: string, active: boolean) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  if (id === employee.id) return { ok: false, error: "You cannot deactivate yourself" };
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ is_active: active }).eq("id", id);
  revalidatePath("/admin/employees");
  return { ok: !error, error: error?.message };
}

export async function resetEmployeePassword(id: string, password: string) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  if (password.length < 8) return { ok: false, error: "Minimum 8 characters" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  return { ok: !error, error: error?.message };
}

/** Any signed-in employee may change their own password. */
export async function changeOwnPassword(current: string, next: string) {
  const { supabase, employee } = await requireEmployee();
  if (next.length < 8) return { ok: false, error: "Minimum 8 characters" };
  const email = employee.email ?? `${employee.employee_id.toLowerCase()}@npk.local`;
  const { error: check } = await supabase.auth.signInWithPassword({ email, password: current });
  if (check) return { ok: false, error: "Current password is incorrect" };
  const { error } = await supabase.auth.updateUser({ password: next });
  return { ok: !error, error: error?.message };
}

// ---------------- Settings (admin only) ----------------
const emailList = z.string().transform((s) => s.split(/[,\s;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))
  .pipe(z.array(z.string().email("One of the recipient emails is invalid")).max(20));

const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  send_on_issue: z.boolean(),
  from_name: z.string().trim().max(80),
  from_address: z.string().trim().toLowerCase().email().or(z.literal("")),
  reply_to: z.string().trim().toLowerCase().email().or(z.literal("")),
  subject: z.string().trim().min(3).max(200),
  intro_hi: z.string().trim().max(600),
  intro_en: z.string().trim().max(600),
  footer_note: z.string().trim().max(120),
  bcc: z.string().trim().toLowerCase().email().or(z.literal("")),
});
const notificationSettingsSchema = z.object({
  notify_on_issue: z.boolean(),
  notify_on_failure: z.boolean(),
  recipients: emailList,
  daily_summary: z.boolean(),
  summary_recipients: emailList,
});

export async function saveEmailSettings(input: EmailSettings) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const parsed = emailSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { error } = await createAdminClient().from("app_settings")
    .upsert({ key: "email", value: parsed.data, updated_at: new Date().toISOString(), updated_by: employee.id });
  revalidatePath("/admin/settings");
  return { ok: !error, error: error?.message };
}

export async function saveNotificationSettings(input: Omit<NotificationSettings, "recipients" | "summary_recipients"> & { recipients: string; summary_recipients: string }) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { error } = await createAdminClient().from("app_settings")
    .upsert({ key: "notifications", value: parsed.data, updated_at: new Date().toISOString(), updated_by: employee.id });
  revalidatePath("/admin/settings");
  return { ok: !error, error: error?.message };
}

export async function sendTestEmail(to: string) {
  const { employee } = await requireEmployee();
  if (employee.role !== "admin") return { ok: false, error: "Admins only" };
  const parsed = z.string().trim().toLowerCase().email().safeParse(to);
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  const res = await sendTest(parsed.data);
  return { ok: res.status === "sent", error: res.error };
}

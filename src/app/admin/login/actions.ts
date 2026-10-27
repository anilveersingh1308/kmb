"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { issueCode, verifyCode } from "@/lib/otp";

/** Employee ID or email → active employee's auth email + name (service role, no RLS). */
async function resolveEmployee(identifier: string) {
  const id = identifier.trim();
  if (!id) return null;
  const admin = createAdminClient();
  const isEmail = id.includes("@");
  const q = admin.from("employees").select("id, full_name, email, employee_id").eq("is_active", true);
  const { data } = isEmail ? await q.eq("email", id.toLowerCase()).maybeSingle() : await q.eq("employee_id", id.toUpperCase()).maybeSingle();
  if (!data) return null;
  // Fall back to the auth email for accounts created before employees.email existed
  let email = data.email as string | null;
  if (!email) {
    const { data: u } = await admin.auth.admin.getUserById(data.id);
    email = u.user?.email ?? null;
  }
  if (!email || email.endsWith("@npk.local")) return null;
  return { id: data.id as string, name: data.full_name as string, email };
}

export async function requestLoginCode(identifier: string): Promise<{ ok: boolean; masked?: string; sentAt?: string; error?: string }> {
  const emp = await resolveEmployee(identifier);
  if (!emp) return { ok: false, error: "No active staff account with a registered email matches that ID / email. Ask an administrator to add your email, or sign in with your password." };
  const res = await issueCode({ email: emp.email, name: emp.name, purpose: "login" });
  return res.ok ? { ok: true, masked: res.masked, sentAt: res.sentAt } : { ok: false, error: res.error };
}

export async function verifyLoginCode(identifier: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const emp = await resolveEmployee(identifier);
  if (!emp) return { ok: false, error: "Incorrect or expired code." };
  const check = await verifyCode({ email: emp.email, purpose: "login", code });
  if (!check.ok) return { ok: false, error: check.error };

  const admin = createAdminClient();
  // Mint a Supabase session for this user without sending any Supabase email.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: emp.email });
  if (linkErr || !link?.properties?.hashed_token) return { ok: false, error: "Could not start a session. Try again." };
  const supabase = await createClient();
  const { error: sessErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (sessErr) return { ok: false, error: "Could not start a session. Try again." };
  await supabase.rpc("touch_last_login");
  return { ok: true };
}

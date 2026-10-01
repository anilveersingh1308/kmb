"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendLoginCodeEmail } from "@/lib/email";

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_10_MIN = 4;

const hash = (email: string, code: string) => createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
const mask = (email: string) => email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(6, b.length)) + c);

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

export async function requestLoginCode(identifier: string): Promise<{ ok: boolean; masked?: string; error?: string }> {
  const emp = await resolveEmployee(identifier);
  if (!emp) return { ok: false, error: "No active staff account with a registered email matches that ID / email. Ask an administrator to add your email, or sign in with your password." };

  const admin = createAdminClient();
  void admin.rpc("purge_login_otps");

  const { count } = await admin.from("login_otps").select("id", { count: "exact", head: true })
    .eq("email", emp.email).gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) >= MAX_CODES_PER_10_MIN) return { ok: false, error: "Too many codes requested. Please wait 10 minutes and try again." };

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { error } = await admin.from("login_otps").insert({
    email: emp.email, code_hash: hash(emp.email, code), expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(), ip,
  });
  if (error) return { ok: false, error: "Could not create a code. Try again." };

  const sent = await sendLoginCodeEmail(emp.email, code, emp.name);
  if (sent.status !== "sent") return { ok: false, error: `Could not send the email (${sent.error ?? "provider error"}). Try again or use your password.` };
  return { ok: true, masked: mask(emp.email) };
}

export async function verifyLoginCode(identifier: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const emp = await resolveEmployee(identifier);
  const digits = code.replace(/\D/g, "");
  if (!emp || digits.length !== 6) return { ok: false, error: "Incorrect or expired code." };

  const admin = createAdminClient();
  const { data: otp } = await admin.from("login_otps").select("id, code_hash, expires_at, attempts")
    .eq("email", emp.email).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!otp) return { ok: false, error: "No active code. Request a new one." };
  if (new Date(otp.expires_at).getTime() < Date.now()) return { ok: false, error: "That code has expired. Request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Request a new code." };

  const expected = Buffer.from(otp.code_hash, "hex");
  const presented = Buffer.from(hash(emp.email, digits), "hex");
  const match = expected.length === presented.length && timingSafeEqual(expected, presented);
  if (!match) {
    await admin.from("login_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return { ok: false, error: `Incorrect code. ${MAX_ATTEMPTS - otp.attempts - 1} attempt${MAX_ATTEMPTS - otp.attempts - 1 === 1 ? "" : "s"} left.` };
  }
  await admin.from("login_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

  // Mint a Supabase session for this user without sending any Supabase email.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: emp.email });
  if (linkErr || !link?.properties?.hashed_token) return { ok: false, error: "Could not start a session. Try again." };
  const supabase = await createClient();
  const { error: sessErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (sessErr) return { ok: false, error: "Could not start a session. Try again." };
  await supabase.rpc("touch_last_login");
  return { ok: true };
}

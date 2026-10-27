import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCodeEmail, type CodePurpose } from "@/lib/email";

export type { CodePurpose };

export const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
/** Per email address, across all purposes — stops a signed-in user from mail-bombing an address. */
export const MAX_CODES_PER_10_MIN = 4;

const hash = (email: string, code: string) => createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
export const maskEmail = (email: string) => email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(6, b.length)) + c);
/** "23:13" in IST — shown on screen and in the email so staff can tell which code is current. */
export const istTime = (d: Date) => d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

type IssueResult = { ok: true; masked: string; sentAt: string } | { ok: false; error: string };
type VerifyResult = { ok: true; payload: string | null } | { ok: false; error: string };

/** Creates a single-use 6-digit code bound to (email, purpose[, user, payload]) and emails it. */
export async function issueCode(opts: { email: string; name: string; purpose: CodePurpose; userId?: string; payload?: string }): Promise<IssueResult> {
  const admin = createAdminClient();
  await admin.rpc("purge_login_otps"); // query builders are lazy — must be awaited to run

  const { count } = await admin.from("login_otps").select("id", { count: "exact", head: true })
    .eq("email", opts.email).gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) >= MAX_CODES_PER_10_MIN) return { ok: false, error: "Too many codes requested. Please wait 10 minutes and try again." };

  // A new request supersedes earlier unused codes for the same account change (login keeps them — see verifyCode).
  // Superseded codes are *expired*, never marked consumed: consumed_at means "verified" (see hasRecentIdentityCheck).
  if (opts.purpose !== "login" && opts.userId) {
    await admin.from("login_otps").update({ expires_at: new Date().toISOString() })
      .eq("user_id", opts.userId).eq("purpose", opts.purpose).is("consumed_at", null);
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { error } = await admin.from("login_otps").insert({
    email: opts.email, code_hash: hash(opts.email, code), expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(), ip,
    purpose: opts.purpose, user_id: opts.userId ?? null, payload: opts.payload ?? null,
  });
  if (error) return { ok: false, error: "Could not create a code. Try again." };

  const sentAt = istTime(new Date());
  const sent = await sendCodeEmail(opts.email, code, opts.name, sentAt, opts.purpose);
  if (sent.status !== "sent") return { ok: false, error: `Could not send the email (${sent.error ?? "provider error"}). Try again.` };
  return { ok: true, masked: maskEmail(opts.email), sentAt };
}

/**
 * Checks a code. For login, any unused unexpired code for the address counts (people often type the code from an
 * earlier email after "Resend"); account changes accept only codes for that user + purpose. A miss counts against
 * every live candidate so accepting several codes never adds guesses. Success consumes the matching code and expires the rest.
 */
export async function verifyCode(opts: { email: string; purpose: CodePurpose; code: string; userId?: string }): Promise<VerifyResult> {
  const digits = opts.code.replace(/\D/g, "");
  if (digits.length !== 6) return { ok: false, error: "Enter the 6-digit code from your email." };

  const admin = createAdminClient();
  let q = admin.from("login_otps").select("id, code_hash, attempts, payload")
    .eq("email", opts.email).eq("purpose", opts.purpose).is("consumed_at", null).gt("expires_at", new Date().toISOString());
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data: live } = await q.order("created_at", { ascending: false }).limit(MAX_CODES_PER_10_MIN);
  if (!live?.length) return { ok: false, error: "That code has expired or was already used. Request a new one." };
  const open = live.filter((o) => o.attempts < MAX_ATTEMPTS);
  if (!open.length) return { ok: false, error: "Too many wrong attempts. Request a new code." };

  const presented = Buffer.from(hash(opts.email, digits), "hex");
  const hit = open.find((o) => {
    const expected = Buffer.from(o.code_hash, "hex");
    return expected.length === presented.length && timingSafeEqual(expected, presented);
  });
  if (!hit) {
    await Promise.all(open.map((o) => admin.from("login_otps").update({ attempts: o.attempts + 1 }).eq("id", o.id)));
    const left = MAX_ATTEMPTS - Math.max(...open.map((o) => o.attempts)) - 1;
    return { ok: false, error: `Incorrect code — check you are using the most recent email. ${left} attempt${left === 1 ? "" : "s"} left.` };
  }
  // consumed_at marks the verified code only; the other live candidates are retired by expiring them.
  const now = new Date().toISOString();
  await admin.from("login_otps").update({ consumed_at: now }).eq("id", hit.id);
  const others = live.filter((o) => o.id !== hit.id).map((o) => o.id);
  if (others.length) await admin.from("login_otps").update({ expires_at: now }).in("id", others);
  return { ok: true, payload: hit.payload ?? null };
}

/** True if this user verified their current email for this exact email change within the last 20 minutes. */
export async function hasRecentIdentityCheck(userId: string, newEmail: string) {
  const { count } = await createAdminClient().from("login_otps").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("purpose", "change_email_current").eq("payload", newEmail)
    .not("consumed_at", "is", null).gte("consumed_at", new Date(Date.now() - 20 * 60_000).toISOString());
  return (count ?? 0) > 0;
}

export const STEP_UP_MINUTES = 10;

/** When the admin's latest verified step-up code stops unlocking sensitive staff actions (ISO), or null if none is active. */
export async function stepUpExpiry(userId: string): Promise<string | null> {
  const since = new Date(Date.now() - STEP_UP_MINUTES * 60_000).toISOString();
  const { data } = await createAdminClient().from("login_otps").select("consumed_at")
    .eq("user_id", userId).eq("purpose", "admin_stepup").not("consumed_at", "is", null).gte("consumed_at", since)
    .order("consumed_at", { ascending: false }).limit(1).maybeSingle();
  return data?.consumed_at ? new Date(new Date(data.consumed_at).getTime() + STEP_UP_MINUTES * 60_000).toISOString() : null;
}

/** "Lock now": back-date this admin's step-up verifications so they no longer count. */
export async function endStepUp(userId: string) {
  await createAdminClient().from("login_otps").update({ consumed_at: new Date(0).toISOString() })
    .eq("user_id", userId).eq("purpose", "admin_stepup").not("consumed_at", "is", null);
}

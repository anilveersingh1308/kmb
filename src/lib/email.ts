import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "./supabase/admin";
import { fromHeader, getSettings, replyToHeader } from "./settings";
import { certificateUrl, SITE_URL, type EmailSettings, type EmailStatus } from "./types";
import { EMBLEM_PNG_BASE64, EMBLEM_PNG_SIZE } from "./emblem-png";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const EMBLEM_CID = "emblem@carrymeback";
// Displayed at half the embedded PNG's pixel size for crisp rendering on high-DPI screens.
const LOGO_W = EMBLEM_PNG_SIZE.width / 2;
const LOGO_H = EMBLEM_PNG_SIZE.height / 2;

/** Government-style light email shell: official logo header, tricolour rule, white card. Table layout + inline styles for mail clients. */
function shell(title: string, body: string, footer: string) {
  const tricolor = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td height="4" bgcolor="#f47c20" style="background:#f47c20;height:4px;line-height:4px;font-size:0">&nbsp;</td>
      <td height="4" bgcolor="#ffffff" style="background:#ffffff;height:4px;line-height:4px;font-size:0">&nbsp;</td>
      <td height="4" bgcolor="#138808" style="background:#138808;height:4px;line-height:4px;font-size:0">&nbsp;</td></tr></table>`;
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f6fa;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f6fa" style="background:#f4f6fa;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #d9e0ea;border-radius:10px;overflow:hidden">
  <tr><td bgcolor="#0b2f6b" style="background:#0b2f6b;padding:7px 24px;color:#ffffff;font-size:11px;letter-spacing:.04em" align="center">उत्तराखण्ड सरकार &nbsp;|&nbsp; Government of Uttarakhand</td></tr>
  <tr><td bgcolor="#ffffff" align="center" style="background:#ffffff;padding:24px 24px 18px">
    <img src="cid:${EMBLEM_CID}" width="${LOGO_W}" height="${LOGO_H}" alt="उत्तराखण्ड राज्य · Uttarakhand Rajya" style="display:block;margin:0 auto 12px;border:0;outline:none;width:${LOGO_W}px;height:${LOGO_H}px">
    <div style="color:#0b2f6b;font-size:22px;font-weight:700;line-height:1.3">नगर पंचायत केदारनाथ</div>
    <div style="color:#33404f;font-size:14px;font-weight:600;margin-top:2px">Nagar Panchayat Kedarnath</div>
    <div style="color:#4b5768;font-size:12px;margin-top:2px">जनपद रुद्रप्रयाग, उत्तराखण्ड · District Rudraprayag, Uttarakhand</div>
    <div style="display:inline-block;margin-top:12px;padding:4px 12px;border:1px solid #f4c79f;border-radius:999px;color:#b4520a;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Carry Me Back · कैरी मी बैक</div>
  </td></tr>
  <tr><td style="padding:0">${tricolor}</td></tr>
  <tr><td style="padding:30px 32px">${body}</td></tr>
  <tr><td bgcolor="#eef2f8" style="background:#eef2f8;padding:18px 32px;text-align:center;border-top:1px solid #d9e0ea">
    <div style="color:#138808;font-weight:700;font-size:15px">${escapeHtml(footer)}</div>
    <div style="color:#4b5768;font-size:11px;margin-top:6px;line-height:1.6">कार्यालय नगर पंचायत केदारनाथ, रुद्रप्रयाग (उत्तराखंड)<br>Office of Nagar Panchayat Kedarnath, Rudraprayag (Uttarakhand)</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 24px"><tr><td bgcolor="#0b2f6b" style="border-radius:8px;background:#0b2f6b">
    <a href="${href}" style="display:inline-block;padding:15px 28px;font-weight:700;font-size:16px;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a></td></tr></table>`;

export function buildCertificateEmail(s: EmailSettings, p: { name: string; url: string; serial: string; bags: number; kg: number }) {
  const name = escapeHtml(p.name);
  const text = `नमस्ते ${p.name},

${s.intro_hi}
आपका प्रशस्ति पत्र यहाँ देखें और डाउनलोड करें: ${p.url}

${s.intro_en}
You carried ${p.bags} bag(s) · ${p.kg.toFixed(2)} kg of waste. Serial: ${p.serial}
View, download or print: ${p.url}

${s.footer_note}
— Nagar Panchayat Kedarnath, Rudraprayag (Uttarakhand)`;

  const body = `
    <p style="font-size:18px;margin:0 0 12px">नमस्ते <b>${name}</b>, 🙏</p>
    <p style="margin:0 0 12px;line-height:1.7">${escapeHtml(s.intro_hi)}</p>
    <p style="margin:0 0 20px;line-height:1.7;color:#444">${escapeHtml(s.intro_en)} You carried <b>${p.bags} bag${p.bags > 1 ? "s" : ""} · ${p.kg.toFixed(2)} kg</b> of waste back down the sacred trail.</p>
    ${button(p.url, "View &amp; Download Certificate →")}
    <p style="font-size:12px;color:#666;margin:0 0 6px;text-align:center">Serial <b>${escapeHtml(p.serial)}</b> · This private link is yours — no login needed. The QR code on the certificate verifies its authenticity.</p>
    <p style="font-size:12px;color:#888;margin:0;text-align:center;word-break:break-all"><a href="${p.url}" style="color:#123f8c">${p.url}</a></p>`;

  return { subject: s.subject, text, html: shell(s.subject, body, s.footer_note) };
}

export interface SendResult { status: EmailStatus; error?: string }

async function deliver(opts: { to: string | string[]; subject: string; html: string; text: string; from: string; replyTo?: string; bcc?: string; ref?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false as const, error: "RESEND_API_KEY not configured" };
  const resend = new Resend(apiKey);
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await resend.emails.send({
      from: opts.from, to: opts.to, replyTo: opts.replyTo, bcc: opts.bcc || undefined,
      subject: opts.subject, html: opts.html, text: opts.text,
      attachments: [{ filename: "uttarakhand-rajya.png", content: Buffer.from(EMBLEM_PNG_BASE64, "base64"), contentType: "image/png", inlineContentId: EMBLEM_CID }],
      headers: opts.ref ? { "X-Entity-Ref-ID": opts.ref } : undefined,
    });
    if (!error && data) return { ok: true as const, id: data.id };
    lastErr = error?.message ?? "unknown error";
    if (!/5\d\d|rate|timeout|too many/i.test(lastErr)) break;
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  return { ok: false as const, error: lastErr };
}

/**
 * Sends (or re-sends) the certificate email.
 * `auto` = triggered by issuing (honours "send_on_issue"); manual resends ignore that toggle.
 * Idempotent: skips if a successful send happened in the last 10 minutes unless `force`.
 */
export async function sendCertificateEmail(certificateId: string, opts: { force?: boolean; auto?: boolean } = {}): Promise<SendResult> {
  const admin = createAdminClient();
  const settings = await getSettings();
  const s = settings.email;

  const { data: cert, error } = await admin
    .from("certificates")
    .select("id, token, serial_no, participants!inner(full_name, email, bag_quantity, waste_kg)")
    .eq("id", certificateId)
    .single();
  if (error || !cert) return { status: "failed", error: error?.message ?? "certificate not found" };

  const p = (Array.isArray(cert.participants) ? cert.participants[0] : cert.participants) as {
    full_name: string; email: string | null; bag_quantity: number; waste_kg: number;
  };

  const log = async (status: EmailStatus, extra: Record<string, unknown> = {}) => {
    await admin.from("email_logs").insert({ certificate_id: certificateId, to_email: p.email, status, kind: "certificate", ...extra });
  };

  if (!p.email) { await log("skipped_no_email"); return { status: "skipped_no_email" }; }
  if (!s.enabled || (opts.auto && !s.send_on_issue)) { await log("skipped_disabled"); return { status: "skipped_disabled" }; }

  if (!opts.force) {
    const { data: recent } = await admin
      .from("email_logs").select("id").eq("certificate_id", certificateId).eq("status", "sent")
      .gte("attempted_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
    if (recent && recent.length) return { status: "sent" };
  }

  const mail = buildCertificateEmail(s, {
    name: p.full_name, url: certificateUrl(cert.token), serial: cert.serial_no, bags: p.bag_quantity, kg: Number(p.waste_kg),
  });
  const res = await deliver({ to: p.email, ...mail, from: fromHeader(s), replyTo: replyToHeader(s), bcc: s.bcc, ref: certificateId });

  if (res.ok) {
    await log("sent", { provider_message_id: res.id });
    void notifyStaff("issue", { name: p.full_name, serial: cert.serial_no, email: p.email, url: certificateUrl(cert.token) });
    return { status: "sent" };
  }
  await log("failed", { error: res.error });
  void notifyStaff("failure", { name: p.full_name, serial: cert.serial_no, email: p.email, url: certificateUrl(cert.token), error: res.error });
  return { status: "failed", error: res.error };
}

/** Internal staff notifications (fire-and-forget). */
export async function notifyStaff(kind: "issue" | "failure", d: { name: string; serial: string; email: string | null; url: string; error?: string }) {
  try {
    const { notifications: n, email: s } = await getSettings();
    if (!s.enabled || n.recipients.length === 0) return;
    if (kind === "issue" && !n.notify_on_issue) return;
    if (kind === "failure" && !n.notify_on_failure) return;
    const subject = kind === "issue"
      ? `✅ Certificate issued: ${d.serial} – ${d.name}`
      : `⚠️ Email failed: ${d.serial} – ${d.name}`;
    const body = `
      <p style="font-size:16px;margin:0 0 12px"><b>${escapeHtml(subject)}</b></p>
      <table style="font-size:14px;color:#333;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#777">Participant</td><td>${escapeHtml(d.name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#777">Serial</td><td>${escapeHtml(d.serial)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#777">Email</td><td>${escapeHtml(d.email ?? "—")}</td></tr>
        ${d.error ? `<tr><td style="padding:4px 12px 4px 0;color:#777">Error</td><td style="color:#b91c1c">${escapeHtml(d.error)}</td></tr>` : ""}
      </table>
      ${button(d.url, "Open certificate")}
      <p style="font-size:12px;color:#888;margin:0">Manage these alerts in Staff portal → Settings.</p>`;
    const res = await deliver({ to: n.recipients, subject, html: shell(subject, body, "Staff notification"), text: `${subject}\n${d.url}`, from: fromHeader(s), replyTo: replyToHeader(s) });
    await createAdminClient().from("email_logs").insert({ to_email: n.recipients.join(","), status: res.ok ? "sent" : "failed", kind: "notification", error: res.ok ? null : res.error, provider_message_id: res.ok ? res.id : null });
  } catch { /* notifications must never break issuing */ }
}

/** Staff sign-in code (sent by us via Resend, bypassing Supabase's rate-limited built-in mailer). */
export type CodePurpose = "login" | "change_password" | "change_email_current" | "change_email_new" | "admin_stepup";

const CODE_COPY: Record<CodePurpose, { subject: (c: string) => string; what: string; text: string; ignore: string }> = {
  login: {
    subject: (c) => `${c} is your Carry Me Back staff sign-in code`,
    what: "Use this one-time code to <b>sign in</b> to the Carry Me Back staff portal.",
    text: "staff sign-in code",
    ignore: "If you did not request this code, you can ignore this email — nobody can sign in without it.",
  },
  change_password: {
    subject: (c) => `${c} — confirm your password change`,
    what: "Use this code to confirm <b>changing your staff portal password</b>.",
    text: "code to change your staff portal password",
    ignore: "If you did not ask to change your password, someone may be signed in to your account — sign out everywhere and contact the administrator.",
  },
  change_email_current: {
    subject: (c) => `${c} — confirm it's you (login email change)`,
    what: "Someone signed in to your staff account asked to <b>change its login email</b>. Use this code to confirm it's you.",
    text: "code to confirm your login email change",
    ignore: "If this wasn't you, do not share this code and contact the administrator — your email stays unchanged without it.",
  },
  admin_stepup: {
    subject: (c) => `${c} — confirm admin action`,
    what: "Use this code to <b>confirm it's you</b> before changing a staff member's email or password, or removing a staff account. It unlocks these actions for 10 minutes.",
    text: "code to confirm an admin action",
    ignore: "If you did not try to manage staff accounts, someone may be signed in as you — change your password and contact the other administrators.",
  },
  change_email_new: {
    subject: (c) => `${c} — verify your new login email`,
    what: "Use this code to <b>verify this address</b> as the new login email for your Carry Me Back staff account.",
    text: "code to verify your new login email",
    ignore: "If you did not expect this, you can ignore this email — the address will not be added.",
  },
};

/** One-time code email for sign-in or for authorising an account change. */
export async function sendCodeEmail(to: string, code: string, employeeName: string, sentAt: string, purpose: CodePurpose = "login"): Promise<SendResult> {
  const { email: s } = await getSettings();
  const copy = CODE_COPY[purpose];
  const subject = copy.subject(code);
  const digits = code.split("").map((d) => `<span style="display:inline-block;width:40px;height:52px;line-height:52px;margin:0 3px;border-radius:8px;background:#eef3fb;border:1px solid #b9c4d4;font-size:26px;font-weight:700;color:#0b2f6b">${d}</span>`).join("");
  const body = `
    <p style="font-size:16px;margin:0 0 6px">Namaste <b>${escapeHtml(employeeName)}</b>,</p>
    <p style="margin:0 0 18px;color:#444;line-height:1.6">${copy.what} It expires in <b>10 minutes</b>.</p>
    <div style="text-align:center;margin:10px 0 8px">${digits}</div>
    <p style="text-align:center;font-size:12px;color:#777;margin:0 0 22px">Requested at ${sentAt} IST · if you asked for several codes, use the latest one.</p>
    <p style="font-size:12px;color:#777;margin:0;line-height:1.6">${copy.ignore} Never share this code with anyone, including people claiming to be from Nagar Panchayat.</p>`;
  const res = await deliver({ to, subject, html: shell(subject, body, "Staff portal · Nagar Panchayat Kedarnath"), text: `Your Carry Me Back ${copy.text} is ${code} (requested at ${sentAt} IST). It expires in 10 minutes.`, from: fromHeader(s), replyTo: replyToHeader(s) });
  await createAdminClient().from("email_logs").insert({ to_email: to, status: res.ok ? "sent" : "failed", kind: "notification", error: res.ok ? null : res.error, provider_message_id: res.ok ? res.id : null });
  return res.ok ? { status: "sent" } : { status: "failed", error: res.error };
}

/** Security notice after a password or login-email change (sent to the old address for email changes). */
export async function sendAccountChangeNotice(to: string, employeeName: string, change: "password" | "email" | "email_new" | "removed", detail?: string, byAdmin?: string): Promise<SendResult> {
  const { email: s } = await getSettings();
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const by = byAdmin ? ` by administrator <b>${escapeHtml(byAdmin)}</b>` : "";
  const subject = {
    password: byAdmin ? "Your staff portal password was reset" : "Your staff portal password was changed",
    email: "Your staff portal login email was changed",
    email_new: "This is now your staff portal login email",
    removed: "Your staff portal account was removed",
  }[change];
  const what = {
    password: byAdmin
      ? `The password for your Carry Me Back staff account was reset${by}. They will share the temporary password with you in person or by phone — change it from <b>My account</b> after signing in.`
      : "The password for your Carry Me Back staff account was changed. Other devices have been signed out.",
    email: `The login email for your Carry Me Back staff account was changed${by} to <b>${escapeHtml(detail ?? "")}</b>. This address will no longer receive sign-in codes.`,
    email_new: `This address was set${by} as the login email for your Carry Me Back staff account (${escapeHtml(detail ?? "")}). Sign-in codes will be sent here from now on.`,
    removed: `Your Carry Me Back staff account (${escapeHtml(detail ?? "")}) was removed${by}. You can no longer sign in to the staff portal.`,
  }[change];
  const body = `
    <p style="font-size:16px;margin:0 0 6px">Namaste <b>${escapeHtml(employeeName)}</b>,</p>
    <p style="margin:0 0 14px;color:#444;line-height:1.6">${what}</p>
    <p style="margin:0 0 18px;color:#444;line-height:1.6">When: <b>${when} IST</b></p>
    <p style="margin:0;padding:12px 14px;border-left:4px solid #f47c20;background:#fff7ef;color:#7a3d06;font-size:13px;line-height:1.6">If you did not make this change, contact the administrator of Nagar Panchayat Kedarnath immediately.</p>`;
  const res = await deliver({ to, subject, html: shell(subject, body, "Staff portal · Nagar Panchayat Kedarnath"), text: `${what.replace(/<[^>]+>/g, "")} When: ${when} IST. If this wasn't you, contact the administrator immediately.`, from: fromHeader(s), replyTo: replyToHeader(s) });
  await createAdminClient().from("email_logs").insert({ to_email: to, status: res.ok ? "sent" : "failed", kind: "notification", error: res.ok ? null : res.error, provider_message_id: res.ok ? res.id : null });
  return res.ok ? { status: "sent" } : { status: "failed", error: res.error };
}

export async function sendTestEmail(to: string): Promise<SendResult> {
  const { email: s } = await getSettings();
  const subject = "✅ Test email – Carry Me Back settings";
  const body = `<p style="font-size:16px">Your email configuration works.</p>
    <table style="font-size:14px;color:#333"><tr><td style="color:#777;padding-right:12px">From</td><td>${escapeHtml(fromHeader(s))}</td></tr>
    <tr><td style="color:#777;padding-right:12px">Reply-to</td><td>${escapeHtml(replyToHeader(s) ?? "—")}</td></tr>
    <tr><td style="color:#777;padding-right:12px">Sent at</td><td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td></tr></table>`;
  const res = await deliver({ to, subject, html: shell(subject, body, s.footer_note), text: "Your Carry Me Back email configuration works.", from: fromHeader(s), replyTo: replyToHeader(s) });
  await createAdminClient().from("email_logs").insert({ to_email: to, status: res.ok ? "sent" : "failed", kind: "test", error: res.ok ? null : res.error, provider_message_id: res.ok ? res.id : null });
  return res.ok ? { status: "sent" } : { status: "failed", error: res.error };
}

export async function sendDailySummary(date: string): Promise<SendResult> {
  const { notifications: n, email: s } = await getSettings();
  if (!n.daily_summary || n.summary_recipients.length === 0) return { status: "skipped_disabled" };
  const admin = createAdminClient();
  const { data } = await admin.rpc("day_summary", { p_date: date });
  const d = data as { certificates: number; bags: number; kg: number; with_email: number; by_operator: { operator: string; n: number }[] };
  const subject = `📊 Carry Me Back – daily summary ${date}: ${d.certificates} certificates, ${Number(d.kg).toFixed(1)} kg`;
  const rows = d.by_operator.map((o) => `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(o.operator)}</td><td><b>${o.n}</b></td></tr>`).join("");
  const body = `<p style="font-size:18px;margin:0 0 16px"><b>${date}</b></p>
    <table style="font-size:15px;color:#333;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#777">Certificates issued</td><td><b>${d.certificates}</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#777">Bags carried</td><td><b>${d.bags}</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#777">Waste removed</td><td><b>${Number(d.kg).toFixed(2)} kg</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#777">With email</td><td><b>${d.with_email}</b></td></tr>
    </table>
    <p style="margin:18px 0 6px;color:#777;font-size:13px">By operator</p>
    <table style="font-size:14px;color:#333;border-collapse:collapse">${rows || "<tr><td>—</td></tr>"}</table>
    ${button(`${SITE_URL}/admin/stats`, "Open dashboard")}`;
  const res = await deliver({ to: n.summary_recipients, subject, html: shell(subject, body, s.footer_note), text: subject, from: fromHeader(s), replyTo: replyToHeader(s) });
  await admin.from("email_logs").insert({ to_email: n.summary_recipients.join(","), status: res.ok ? "sent" : "failed", kind: "summary", error: res.ok ? null : res.error, provider_message_id: res.ok ? res.id : null });
  return res.ok ? { status: "sent" } : { status: "failed", error: res.error };
}

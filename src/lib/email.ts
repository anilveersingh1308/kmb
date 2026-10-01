import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "./supabase/admin";
import { fromHeader, getSettings, replyToHeader } from "./settings";
import { certificateUrl, SITE_URL, type EmailSettings, type EmailStatus } from "./types";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function shell(title: string, body: string, footer: string) {
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#0b0d12;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1b1b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d12;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8d28a">
  <tr><td style="background:linear-gradient(135deg,#7a1f1f,#5a1414);padding:28px 32px;text-align:center">
    <img src="${SITE_URL}/emblem.svg" width="72" height="80" alt="" style="display:block;margin:0 auto 10px">
    <div style="color:#f3e4a8;font-size:13px;letter-spacing:.2em;text-transform:uppercase">Carry Me Back · कैरी मी बैक</div>
    <div style="color:#fff;font-size:22px;font-weight:700;margin-top:6px">नगर पंचायत केदारनाथ</div>
  </td></tr>
  <tr><td style="padding:32px">${body}</td></tr>
  <tr><td style="background:#f6f1e3;padding:18px 32px;text-align:center">
    <div style="color:#1e7b34;font-weight:700;font-size:16px">${escapeHtml(footer)}</div>
    <div style="color:#777;font-size:11px;margin-top:6px">कार्यालय नगर पंचायत केदारनाथ, रुद्रप्रयाग (उत्तराखंड)</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 24px"><tr><td style="border-radius:14px;background:linear-gradient(135deg,#e8d28a,#c9a64b,#b8962e)">
    <a href="${href}" style="display:inline-block;padding:16px 30px;font-weight:700;font-size:16px;color:#2b1d05;text-decoration:none">${label}</a></td></tr></table>`;

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
    <p style="font-size:12px;color:#888;margin:0;text-align:center;word-break:break-all"><a href="${p.url}" style="color:#7a1f1f">${p.url}</a></p>`;

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
export async function sendLoginCodeEmail(to: string, code: string, employeeName: string): Promise<SendResult> {
  const { email: s } = await getSettings();
  const subject = `${code} is your Carry Me Back staff sign-in code`;
  const digits = code.split("").map((d) => `<span style="display:inline-block;width:40px;height:52px;line-height:52px;margin:0 3px;border-radius:10px;background:#f6f1e3;border:1px solid #e8d28a;font-size:26px;font-weight:700;color:#5a1414">${d}</span>`).join("");
  const body = `
    <p style="font-size:16px;margin:0 0 6px">Namaste <b>${escapeHtml(employeeName)}</b>,</p>
    <p style="margin:0 0 18px;color:#444;line-height:1.6">Use this one-time code to sign in to the Carry Me Back staff portal. It expires in <b>10 minutes</b>.</p>
    <div style="text-align:center;margin:10px 0 22px">${digits}</div>
    <p style="font-size:12px;color:#777;margin:0;line-height:1.6">If you did not request this code, you can ignore this email — nobody can sign in without it. Never share this code with anyone, including people claiming to be from Nagar Panchayat.</p>`;
  const res = await deliver({ to, subject, html: shell(subject, body, "Staff portal · Nagar Panchayat Kedarnath"), text: `Your Carry Me Back staff sign-in code is ${code}. It expires in 10 minutes.`, from: fromHeader(s), replyTo: replyToHeader(s) });
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

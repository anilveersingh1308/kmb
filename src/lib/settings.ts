import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { AppSettings, EmailSettings, NotificationSettings } from "./types";

export const DEFAULT_EMAIL: EmailSettings = {
  enabled: true,
  send_on_issue: true,
  from_name: "Carry Me Back – Nagar Panchayat Kedarnath",
  from_address: "",
  reply_to: "",
  subject: "🙏 आपका प्रशस्ति पत्र – Carry Me Back, Kedarnath | Your Certificate of Appreciation",
  intro_hi: "केदारनाथ धाम की पावन भूमि को स्वच्छ और प्लास्टिक-मुक्त रखने में आपके निःस्वार्थ योगदान के लिए नगर पंचायत केदारनाथ आपका हृदय से आभार व्यक्त करता है।",
  intro_en: "Thank you for carrying your waste back down the sacred trail. Your personalised Certificate of Appreciation is ready.",
  footer_note: "स्वच्छ केदारनाथ · सुंदर केदारनाथ",
  bcc: "",
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  notify_on_issue: false,
  notify_on_failure: true,
  recipients: [],
  daily_summary: false,
  summary_recipients: [],
};

export async function getSettings(): Promise<AppSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as Record<string, unknown>]));
  return {
    email: { ...DEFAULT_EMAIL, ...(map.get("email") ?? {}) } as EmailSettings,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(map.get("notifications") ?? {}) } as NotificationSettings,
  };
}

/** Effective From header: settings override env, env overrides Resend's sandbox sender. */
export function fromHeader(s: EmailSettings) {
  const envFrom = process.env.EMAIL_FROM;
  if (s.from_address) return `${s.from_name || "Carry Me Back"} <${s.from_address}>`;
  return envFrom ?? "Carry Me Back <onboarding@resend.dev>";
}
export function replyToHeader(s: EmailSettings) {
  return s.reply_to || process.env.EMAIL_REPLY_TO || undefined;
}

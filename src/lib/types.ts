export type Role = "operator" | "admin";
export type Source = "web" | "mobile_app";
export type EmailStatus = "queued" | "sent" | "failed" | "skipped_no_email" | "skipped_disabled";

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  email: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface EmailSettings {
  enabled: boolean;
  send_on_issue: boolean;
  from_name: string;
  from_address: string;
  reply_to: string;
  subject: string;
  intro_hi: string;
  intro_en: string;
  footer_note: string;
  bcc: string;
}

export interface NotificationSettings {
  notify_on_issue: boolean;
  notify_on_failure: boolean;
  recipients: string[];
  daily_summary: boolean;
  summary_recipients: string[];
}

export interface AppSettings {
  email: EmailSettings;
  notifications: NotificationSettings;
}

export interface VerificationResult {
  authentic: boolean;
  serial_no: string;
  full_name: string;
  bag_quantity: number;
  waste_kg: number;
  issued_on: string;
  issued_at: string;
  view_count: number;
  issued_by: string;
}

export interface PublicCertificate {
  full_name: string;
  bag_quantity: number;
  waste_kg: number;
  serial_no: string;
  issued_on: string; // YYYY-MM-DD
}

export interface ParticipantRecord {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  bag_number: string | null;
  bag_quantity: number;
  waste_kg: number;
  inventory_items: string[];
  source: Source;
  created_at: string;
  deposit_date: string;
  certificate_id: string;
  token: string;
  serial_no: string;
  issued_on: string;
  view_count: number;
  created_by_employee_id: string | null;
  last_email_status: EmailStatus | null;
}

export interface CampaignStats {
  today: Totals;
  week: Totals;
  total: Totals;
  emails: { sent: number; failed: number; skipped: number };
  last14: { d: string; n: number }[];
}

export interface Totals {
  certificates: number;
  bags: number;
  kg: number;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Address used in anything that leaves this device — share/WhatsApp messages, emails, printed QR codes.
 * Local development shares the production database, so a localhost link would be useless to anyone else:
 * fall back to the public site (override with NEXT_PUBLIC_PUBLIC_URL).
 */
const isLocal = (u: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(u);
export const PUBLIC_URL = (isLocal(SITE_URL)
  ? process.env.NEXT_PUBLIC_PUBLIC_URL ?? "https://carry-me-back-kedarnath.vercel.app"
  : SITE_URL).replace(/\/$/, "");

export const certificateUrl = (token: string) => `${PUBLIC_URL}/c/${token}`;
/** URL encoded in the printed QR code; `via=qr` triggers the authenticity banner. */
export const qrVerifyUrl = (token: string) => `${PUBLIC_URL}/c/${token}?via=qr`;

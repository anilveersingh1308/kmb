import { certificateUrl, type ParticipantRecord } from "./types";

export type ExportGroup = "Participant" | "Contact" | "Deposit" | "Record" | "Certificate";

export interface ExportColumn {
  key: string;
  label: string;
  group: ExportGroup;
  /** Personal data — masked when "Hide contact details" is on. */
  personal?: boolean;
  get: (r: ParticipantRecord) => string | number | null;
}

const ist = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/** Single source of truth for the CSV export — used by the export dialog (labels/presets) and the API route (values). */
export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "serial", label: "Serial", group: "Participant", get: (r) => r.serial_no },
  { key: "name", label: "Name", group: "Participant", get: (r) => r.full_name },
  { key: "phone", label: "Phone", group: "Contact", personal: true, get: (r) => r.phone },
  { key: "email", label: "Email", group: "Contact", personal: true, get: (r) => r.email },
  { key: "bag", label: "Bag number", group: "Deposit", get: (r) => r.bag_number },
  { key: "bags", label: "Bags", group: "Deposit", get: (r) => r.bag_quantity },
  { key: "kg", label: "Waste (kg)", group: "Deposit", get: (r) => Number(r.waste_kg).toFixed(2) },
  { key: "inventory", label: "Inventory items", group: "Deposit", get: (r) => (r.inventory_items?.length ? r.inventory_items.join(" | ") : null) },
  { key: "date", label: "Deposit date", group: "Record", get: (r) => r.deposit_date },
  { key: "created", label: "Recorded at (IST)", group: "Record", get: (r) => ist(r.created_at) },
  { key: "source", label: "Source", group: "Record", get: (r) => (r.source === "mobile_app" ? "Mobile app" : "Web") },
  { key: "operator", label: "Operator ID", group: "Record", get: (r) => r.created_by_employee_id },
  { key: "emailStatus", label: "Email status", group: "Certificate", get: (r) => r.last_email_status?.replace(/_/g, " ") ?? null },
  { key: "views", label: "Certificate views", group: "Certificate", get: (r) => r.view_count },
  { key: "url", label: "Certificate link", group: "Certificate", get: (r) => certificateUrl(r.token) },
];

export const EXPORT_GROUPS: ExportGroup[] = ["Participant", "Contact", "Deposit", "Record", "Certificate"];

export const EXPORT_PRESETS: { key: string; label: string; hint: string; cols: string[] }[] = [
  { key: "full", label: "Full report", hint: "Every column", cols: EXPORT_COLUMNS.map((c) => c.key) },
  { key: "contacts", label: "Contact list", hint: "Follow-ups & re-sending links", cols: ["serial", "name", "phone", "email", "emailStatus", "url"] },
  { key: "summary", label: "Collection summary", hint: "For reports — no personal data", cols: ["serial", "date", "bags", "kg", "source", "operator"] },
];

export function maskPhone(v: string) { return v.length > 4 ? `${v.slice(0, 2)}${"•".repeat(v.length - 4)}${v.slice(-2)}` : "••••"; }
export function maskEmail(v: string) { return v.replace(/^(.{1,2})[^@]*(@.*)$/, (_, a, b) => `${a}•••${b}`); }

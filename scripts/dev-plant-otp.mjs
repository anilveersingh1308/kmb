// Dev helper: plants a known sign-in code for an employee so the OTP flow can be tested end-to-end.
// node scripts/dev-plant-otp.mjs NPK-0001 123456
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const [employeeId, code] = process.argv.slice(2);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: emp } = await sb.from("employees").select("email").eq("employee_id", employeeId).single();
const hash = createHash("sha256").update(`${emp.email.toLowerCase()}:${code}`).digest("hex");
const { error } = await sb.from("login_otps").insert({ email: emp.email, code_hash: hash, expires_at: new Date(Date.now() + 600_000).toISOString() });
console.log(error ? error.message : `planted ${code} for ${emp.email}`);
const { data: logs } = await sb.from("email_logs").select("attempted_at,to_email,status,error").eq("kind", "notification").order("attempted_at", { ascending: false }).limit(2);
console.table(logs);

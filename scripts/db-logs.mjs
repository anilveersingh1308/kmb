// Prints the last N email_logs rows (service role). node scripts/db-logs.mjs [n]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from("email_logs").select("attempted_at, kind, to_email, status, error").order("attempted_at", { ascending: false }).limit(Number(process.argv[2] ?? 5));
if (error) throw error;
console.table(data);

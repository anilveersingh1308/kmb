// Applies supabase/migrations/*.sql (in order) and optionally seed.sql against SUPABASE_DB_URL.
//   node scripts/db-apply.mjs            → migrations only
//   node scripts/db-apply.mjs --seed     → migrations + seed.sql
// SUPABASE_DB_URL = Supabase → Connect → "Session pooler" URI (postgresql://postgres.<ref>:<password>@...:5432/postgres)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i).trim();
  if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
}

const url = process.env.SUPABASE_DB_URL;
if (!url || url.includes("[YOUR-PASSWORD]")) {
  console.error("✖ Set SUPABASE_DB_URL in .env.local (Supabase dashboard → Connect → Session pooler URI).");
  process.exit(1);
}

// Parse manually so passwords with #, &, %, @ etc. work without URL-encoding.
const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/:]+):(\d+)\/([^?]+)/);
if (!m) {
  console.error("✖ SUPABASE_DB_URL is not a valid postgresql:// URI.");
  process.exit(1);
}
const [, user, password, host, port, database] = m;
const client = new pg.Client({ host, port: Number(port), user, password, database, ssl: { rejectUnauthorized: false } });
await client.connect();

const dir = join("supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (process.argv.includes("--seed")) files.push("../seed.sql");

for (const f of files) {
  const path = join(dir, f);
  process.stdout.write(`→ ${f} … `);
  try {
    const res = await client.query(readFileSync(path, "utf8"));
    const last = Array.isArray(res) ? res[res.length - 1] : res;
    console.log("ok");
    if (f.endsWith("seed.sql") && last?.rows?.length) {
      console.log("\nDemo certificates:");
      for (const r of last.rows) console.log(`  ${r.serial_no}  ${r.full_name.padEnd(42)} ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${r.path}`);
    }
  } catch (e) {
    console.log("FAILED\n", e.message);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log("\n✔ Database is ready.");

// Finds the right Supabase host for SUPABASE_DB_URL by probing the direct host and common pooler regions.
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const envPath = ".env.local";
const text = readFileSync(envPath, "utf8");
const line = text.split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DB_URL="));
const url = line.slice("SUPABASE_DB_URL=".length).trim();
const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/:]+):(\d+)\/([^?]+)/);
const [, user, password, , , database] = m;
const ref = user.split(".")[1] ?? process.env.REF;

const candidates = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ...["ap-south-1", "ap-southeast-1", "ap-northeast-1", "us-east-1", "us-west-1", "eu-central-1", "eu-west-1", "eu-west-2", "ap-southeast-2", "sa-east-1", "ca-central-1", "us-east-2", "eu-north-1", "ap-northeast-2"]
    .flatMap((r) => [0, 1].map((n) => ({ host: `aws-${n}-${r}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` }))),
];

for (const c of candidates) {
  const client = new pg.Client({ ...c, password, database, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    const good = `postgresql://${c.user}:${password}@${c.host}:${c.port}/${database}`;
    writeFileSync(envPath, text.replace(line, `SUPABASE_DB_URL=${good}`));
    console.log(`✔ Connected via ${c.host} — .env.local updated.`);
    process.exit(0);
  } catch (e) {
    console.log(`✖ ${c.host}: ${e.message.split("\n")[0]}`);
  }
}
console.error("No host worked. Copy the exact URI from Supabase → Connect.");
process.exit(1);

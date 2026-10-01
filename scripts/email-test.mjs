// Sends a one-off test email through Resend using .env.local settings. node scripts/email-test.mjs to@example.com
import { readFileSync } from "node:fs";
import { Resend } from "resend";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const to = process.argv[2];
if (!to) { console.error("usage: node scripts/email-test.mjs recipient@domain"); process.exit(1); }
const resend = new Resend(env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject: "Carry Me Back – delivery test", text: "If you can read this, Resend delivery works." });
console.log(error ? `FAILED: ${error.name}: ${error.message}` : `SENT id=${data.id}`);

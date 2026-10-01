import { NextResponse, type NextRequest } from "next/server";
import { sendDailySummary } from "@/lib/email";
import { secretsMatch } from "@/lib/secrets";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/daily-summary?date=YYYY-MM-DD   (defaults to yesterday, IST)
 * Authorization: Bearer <CRON_SECRET>   — configure in vercel.json or any external cron.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secretsMatch(auth, process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const ist = new Date(Date.now() + 5.5 * 3600_000 - 86400_000);
    date = ist.toISOString().slice(0, 10);
  }
  const res = await sendDailySummary(date);
  return NextResponse.json({ date, ...res });
}

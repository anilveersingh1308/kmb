import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import SettingsPanel from "@/components/admin/SettingsPanel";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("employees").select("role, email").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/admin");

  const settings = await getSettings();
  const { data: recent } = await supabase
    .from("email_logs").select("id, to_email, status, kind, error, attempted_at")
    .order("attempted_at", { ascending: false }).limit(12);

  return (
    <SettingsPanel
      settings={settings}
      myEmail={me.email ?? ""}
      env={{
        resend: Boolean(process.env.RESEND_API_KEY),
        from: process.env.EMAIL_FROM ?? "",
        replyTo: process.env.EMAIL_REPLY_TO ?? "",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
        cron: Boolean(process.env.CRON_SECRET),
      }}
      recentLogs={(recent ?? []) as { id: number; to_email: string | null; status: string; kind: string; error: string | null; attempted_at: string }[]}
    />
  );
}

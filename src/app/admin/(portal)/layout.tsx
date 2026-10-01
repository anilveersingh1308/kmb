import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import type { Employee } from "@/lib/types";

export const metadata: Metadata = { title: "Staff portal", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: employee } = await supabase.from("employees").select("*").eq("id", user.id).maybeSingle();
  if (!employee || !employee.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?reason=inactive");
  }
  return <AdminShell employee={employee as Employee}>{children}</AdminShell>;
}

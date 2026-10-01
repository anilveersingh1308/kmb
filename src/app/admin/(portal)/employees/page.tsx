import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeesPanel from "@/components/admin/EmployeesPanel";
import type { Employee } from "@/lib/types";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("employees").select("*").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/admin");
  const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: true });
  return <EmployeesPanel employees={(data ?? []) as Employee[]} meId={user!.id} />;
}

import { redirect } from "next/navigation";
import EmployeesPanel from "@/components/admin/EmployeesPanel";
import { requireEmployee } from "@/lib/auth-server";
import { maskEmail, stepUpExpiry } from "@/lib/otp";
import type { Employee } from "@/lib/types";

export default async function EmployeesPage() {
  const { supabase, employee: me } = await requireEmployee();
  if (me.role !== "admin") redirect("/admin");
  const [{ data }, until] = await Promise.all([
    supabase.from("employees").select("*").order("created_at", { ascending: true }),
    stepUpExpiry(me.id),
  ]);
  return <EmployeesPanel employees={(data ?? []) as Employee[]} meId={me.id} stepUp={{ until, email: me.email ? maskEmail(me.email) : null }} />;
}

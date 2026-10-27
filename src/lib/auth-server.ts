import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

/** The signed-in, active employee — or a redirect to sign-in. Kept out of "use server" files so it can't be called from the browser. */
export async function requireEmployee(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; employee: Employee }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: employee } = await supabase.from("employees").select("*").eq("id", user.id).single();
  if (!employee || !employee.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?reason=inactive");
  }
  return { supabase, employee: employee as Employee };
}

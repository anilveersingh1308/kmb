import type { Metadata } from "next";
import AccountPanel from "@/components/admin/AccountPanel";
import { requireEmployee } from "@/lib/auth-server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const { employee } = await requireEmployee();
  return <AccountPanel employee={employee} />;
}

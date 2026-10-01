"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, ListOrdered, BarChart3, Users, LogOut, Home, Settings } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import type { Employee } from "@/lib/types";

const TABS = [
  { href: "/admin", label: "Quick Outward", icon: ClipboardPlus },
  { href: "/admin/records", label: "Records", icon: ListOrdered },
  { href: "/admin/stats", label: "Stats", icon: BarChart3 },
  { href: "/admin/employees", label: "Employees", icon: Users, admin: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, admin: true },
];

export default function AdminShell({ employee, children }: { employee: Employee; children: React.ReactNode }) {
  const path = usePathname();
  const tabs = TABS.filter((t) => !t.admin || employee.role === "admin");
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#161a2b_0%,#0b0d12_60%)]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d12]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emblem.svg" alt="" className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-devanagari text-sm font-bold">नगर पंचायत केदारनाथ</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Carry Me Back · Staff portal</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-gold text-[#2b1d05]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-white">{employee.full_name}</div>
              <div className="text-[11px] text-slate-400">{employee.employee_id} · {employee.role}</div>
            </div>
            <form action={signOut}>
              <button className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm" title="Sign out">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-10">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0d12]/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0,1fr))` }}>
          <Link href="/" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-slate-400"><Home className="h-5 w-5" /> Site</Link>
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-gold-light" : "text-slate-400"}`}>
                <Icon className="h-5 w-5" /> {label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

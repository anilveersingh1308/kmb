"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, ListOrdered, BarChart3, Users, LogOut, Settings, UserCog } from "lucide-react";
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
    <div className="min-h-dvh bg-[#f4f6fa]">
      <div className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 text-[11px] sm:px-6">
          <span><span className="font-devanagari font-semibold">उत्तराखण्ड सरकार</span> <span className="opacity-60">|</span> Government of Uttarakhand</span>
          <span className="hidden opacity-80 sm:inline">Authorised staff only · Access is logged</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/uttarakhand.webp" alt="" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <div className="font-devanagari text-sm font-bold text-navy">नगर पंचायत केदारनाथ</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-600">Carry Me Back · Staff portal</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${active ? "bg-navy text-white" : "text-slate-700 hover:bg-slate-50 hover:text-navy"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/admin/account" title="My account — password & email" aria-current={path.startsWith("/admin/account") ? "page" : undefined}
              className={`hidden items-center gap-2.5 rounded-md px-2.5 py-1.5 text-right transition sm:flex ${path.startsWith("/admin/account") ? "bg-[#eef3fb]" : "hover:bg-slate-50"}`}>
              <div>
                <div className="text-sm font-semibold text-ink">{employee.full_name}</div>
                <div className="text-[11px] text-slate-600">{employee.employee_id} · {employee.role}</div>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white"><UserCog className="h-4 w-4" /></span>
            </Link>
            <form action={signOut}>
              <button className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm" title="Sign out">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="tricolor" />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-10">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white shadow-[0_-2px_8px_rgba(16,24,40,.06)] md:hidden">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0,1fr))` }}>
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-navy" : "text-slate-600"}`}>
                <Icon className="h-5 w-5" /> {label.split(" ")[0]}
              </Link>
            );
          })}
          {/* The logo links back to the public site, so this slot is the account page. */}
          <Link href="/admin/account" className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${path.startsWith("/admin/account") ? "text-navy" : "text-slate-600"}`}>
            <UserCog className="h-5 w-5" /> Account
          </Link>
        </div>
      </nav>
    </div>
  );
}

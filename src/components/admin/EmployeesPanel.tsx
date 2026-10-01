"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus, KeyRound, UserCheck, UserX, ShieldCheck, AtSign } from "lucide-react";
import { createEmployee, setEmployeeActive, resetEmployeePassword, updateEmployeeEmail } from "@/app/admin/actions";
import type { Employee } from "@/lib/types";

export default function EmployeesPanel({ employees, meId }: { employees: Employee[]; meId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onCreate = (fd: FormData) => {
    setMsg(null);
    start(async () => {
      const res = await createEmployee(fd);
      setMsg(res.ok ? { ok: true, text: "Employee created. Share the ID and password securely." } : { ok: false, text: res.error ?? "Failed" });
      if (res.ok) formRef.current?.reset();
    });
  };

  const toggle = (e: Employee) => start(async () => {
    const res = await setEmployeeActive(e.id, !e.is_active);
    if (!res.ok) alert(res.error);
  });

  const reset = (e: Employee) => {
    const pwd = prompt(`New password for ${e.employee_id} (min 8 characters):`);
    if (!pwd) return;
    start(async () => {
      const res = await resetEmployeePassword(e.id, pwd);
      alert(res.ok ? "Password updated." : res.error);
    });
  };

  const changeEmail = (e: Employee) => {
    const v = prompt(`Login email for ${e.employee_id} (used for OTP sign-in):`, e.email ?? "");
    if (!v || v === e.email) return;
    start(async () => {
      const res = await updateEmployeeEmail(e.id, v);
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="glass rounded-3xl p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><UserPlus className="h-5 w-5 text-gold-light" /> Add employee</h1>
        <p className="mt-1 text-sm text-slate-400">Operators can issue certificates. Admins can also edit, delete, manage staff and settings. Staff sign in with their Employee ID <i>or</i> email, using a password or a one-time email code.</p>
        <form ref={formRef} action={onCreate} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="employee_id">Employee ID</label>
              <input id="employee_id" name="employee_id" className="input uppercase tracking-wider" placeholder="NPK-0042" required pattern="[A-Za-z0-9-]{3,20}" />
            </div>
            <div>
              <label className="label" htmlFor="email">Login email</label>
              <input id="email" name="email" type="email" className="input" placeholder="name@example.com" required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" className="input" placeholder="Rajesh Semwal" required minLength={2} maxLength={80} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="role">Role</label>
              <select id="role" name="role" className="input" defaultValue="operator">
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="password">Temporary password</label>
              <input id="password" name="password" type="text" className="input font-mono" required minLength={8} maxLength={72} autoComplete="off" />
            </div>
          </div>
          {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>{msg.text}</p>}
          <button disabled={pending} className="btn-gold w-full rounded-2xl px-5 py-3 font-semibold disabled:opacity-60">{pending ? "Working…" : "Create employee"}</button>
        </form>
      </section>

      <section className="glass overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold text-white">Staff ({employees.length})</h2>
        </div>
        <ul className="divide-y divide-white/5">
          {employees.map((e) => (
            <li key={e.id} className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${pending ? "opacity-60" : ""}`}>
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  {e.full_name}
                  {e.role === "admin" && <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-light"><ShieldCheck className="h-3 w-3" /> admin</span>}
                  {e.id === meId && <span className="text-[10px] uppercase tracking-wider text-slate-500">you</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {e.employee_id} · {e.email ?? <span className="text-amber-300">no email (password only)</span>} · {e.is_active ? <span className="text-emerald-300">active</span> : <span className="text-rose-300">inactive</span>}
                  {e.last_login_at && <> · last login {new Date(e.last_login_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => changeEmail(e)} title="Change login email" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><AtSign className="h-4 w-4" /></button>
                <button onClick={() => reset(e)} title="Reset password" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><KeyRound className="h-4 w-4" /></button>
                {e.id !== meId && (
                  <button onClick={() => toggle(e)} title={e.is_active ? "Deactivate" : "Activate"}
                    className={`rounded-lg p-2 ${e.is_active ? "text-rose-300 hover:bg-rose-500/15" : "text-emerald-300 hover:bg-emerald-500/15"}`}>
                    {e.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

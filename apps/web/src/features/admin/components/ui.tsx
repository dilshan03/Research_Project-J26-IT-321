import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import type { AdminResult, Json } from '../services/adminApi';

/* Shared building blocks of the admin dashboard (moved unchanged from AdminDashboardPage). */

export const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
};
export const date = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toLocaleString() : '—');
export const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
export const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

export const Panel: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 min-w-0">
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
    </div>
    {children}
  </section>
);

export const JsonBlock: React.FC<{ label: string; value: unknown; open?: boolean }> = ({ label, value, open }) => (
  <details open={open} className="rounded-xl border border-slate-200 bg-slate-50">
    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">{label}</summary>
    <pre className="px-3 pb-3 text-[11px] leading-snug text-slate-800 overflow-x-auto max-h-96">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  </details>
);

export const Table: React.FC<{ columns: string[]; rows: React.ReactNode[][]; empty?: string }> = ({ columns, rows, empty }) =>
  rows.length === 0 ? (
    <p className="text-xs text-slate-500">{empty ?? 'No records.'}</p>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((cell, j) => <td key={j} className="px-3 py-1.5 font-mono text-slate-800">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

export const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

export const ErrorLine: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{message}</p> : null;

export const useLoad = <T,>(load: () => Promise<AdminResult<T>>, deps: unknown[]) => {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({ loading: true });
  const run = useCallback(async () => {
    setState({ loading: true });
    const res = await load();
    setState({ loading: false, data: res.data, error: res.ok ? undefined : res.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
};

/** Admin page frame: the existing header (brand, read-only badge, account, sign out) with a navigation slot. */
export const AdminShell: React.FC<{ nav: React.ReactNode; children: React.ReactNode }> = ({ nav, children }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-700" />
            <Link to="/admin" className="font-bold">MathQuest Admin</Link>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">read-only</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>{user?.email}</span>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {nav}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">{children}</main>
    </div>
  );
};

export const navTabClass = (active: boolean) =>
  `shrink-0 min-h-[44px] px-3 text-sm font-semibold border-b-2 inline-flex items-center ${
    active ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
  }`;

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogOut, ChevronDown, Code2, Eye } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import type { AdminResult, Json } from '../services/adminApi';

/* Shared building blocks of the admin dashboard and the research pages. */

export const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
};
export const date = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toLocaleString() : '—');
export const shortDate = (v: unknown) =>
  typeof v === 'string' && v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
export const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

/* ------------------------------------------------------------------ */
/* Colour tones (each used with an icon or text, never colour alone)   */
/* ------------------------------------------------------------------ */

export type Tone = 'indigo' | 'violet' | 'sky' | 'teal' | 'emerald' | 'amber' | 'orange' | 'rose' | 'slate';

export const TONES: Record<Tone, { soft: string; text: string; ring: string; solid: string; hex: string }> = {
  indigo: { soft: 'bg-indigo-50', text: 'text-indigo-800', ring: 'border-indigo-200', solid: 'bg-indigo-600', hex: '#4f46e5' },
  violet: { soft: 'bg-violet-50', text: 'text-violet-800', ring: 'border-violet-200', solid: 'bg-violet-600', hex: '#7c3aed' },
  sky: { soft: 'bg-sky-50', text: 'text-sky-800', ring: 'border-sky-200', solid: 'bg-sky-600', hex: '#0284c7' },
  teal: { soft: 'bg-teal-50', text: 'text-teal-800', ring: 'border-teal-200', solid: 'bg-teal-600', hex: '#0d9488' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-800', ring: 'border-emerald-200', solid: 'bg-emerald-600', hex: '#059669' },
  amber: { soft: 'bg-amber-50', text: 'text-amber-900', ring: 'border-amber-200', solid: 'bg-amber-500', hex: '#d97706' },
  orange: { soft: 'bg-orange-50', text: 'text-orange-800', ring: 'border-orange-200', solid: 'bg-orange-500', hex: '#ea580c' },
  rose: { soft: 'bg-rose-50', text: 'text-rose-800', ring: 'border-rose-200', solid: 'bg-rose-600', hex: '#e11d48' },
  slate: { soft: 'bg-slate-100', text: 'text-slate-700', ring: 'border-slate-200', solid: 'bg-slate-500', hex: '#64748b' },
};

/** Small coloured label with an optional icon. */
export const Pill: React.FC<{ tone?: Tone; icon?: React.ReactNode; children: React.ReactNode; title?: string }> = ({
  tone = 'slate',
  icon,
  children,
  title,
}) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONES[tone].soft} ${TONES[tone].text} ${TONES[tone].ring}`}
  >
    {icon}
    {children}
  </span>
);

/** Round initials badge, coloured consistently from the name. */
export const Initials: React.FC<{ name?: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
  const text = (name ?? '?').trim();
  const initials = text.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  const tones: Tone[] = ['indigo', 'violet', 'sky', 'teal', 'emerald', 'amber', 'orange', 'rose'];
  const tone = tones[[...text].reduce((s, c) => s + c.charCodeAt(0), 0) % tones.length];
  const dims = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dims} ${TONES[tone].solid}`}>
      {initials}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Panels, stats and tables                                            */
/* ------------------------------------------------------------------ */

export const Panel: React.FC<{
  title: string;
  note?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, note, icon, tone = 'indigo', actions, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && (
          <span className={`inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-xl ${TONES[tone].soft} ${TONES[tone].text}`}>{icon}</span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
          {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
        </div>
      </div>
      {actions}
    </div>
    {children}
  </section>
);

/** Collapsed raw data for technical users. */
export const JsonBlock: React.FC<{ label: string; value: unknown; open?: boolean }> = ({ label, value, open }) => (
  <details open={open} className="group rounded-xl border border-slate-200 bg-slate-50">
    <summary className="cursor-pointer list-none flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600">
      <Code2 size={14} className="text-slate-400" />
      <span className="flex-1">{label}</span>
      <ChevronDown size={14} className="text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    <pre className="px-3 pb-3 text-[11px] leading-snug text-slate-800 overflow-x-auto max-h-96">{JSON.stringify(value ?? null, null, 2)}</pre>
  </details>
);

/** A labelled, collapsible group (used for "Technical details"). */
export const Disclosure: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm">
    <summary className="cursor-pointer list-none flex items-center gap-2.5 px-4 py-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600">
        <Code2 size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        {note && <span className="block text-xs text-slate-500">{note}</span>}
      </span>
      <ChevronDown size={18} className="text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-2">{children}</div>
  </details>
);

export const Table: React.FC<{ columns: string[]; rows: React.ReactNode[][]; empty?: string; mono?: boolean }> = ({
  columns,
  rows,
  empty,
  mono = true,
}) =>
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
            <tr key={i} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
              {r.map((cell, j) => <td key={j} className={`px-3 py-1.5 text-slate-800 ${mono ? 'font-mono' : ''}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const STAT_TONES: Tone[] = ['indigo', 'violet', 'sky', 'teal', 'emerald', 'amber', 'orange', 'rose'];

/** Headline number card. Without a tone, the colour follows the label so neighbouring cards differ. */
export const Stat: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode; tone?: Tone; hint?: string }> = ({
  label,
  value,
  icon,
  tone,
  hint,
}) => {
  const t = TONES[tone ?? STAT_TONES[[...label].reduce((s, c) => s + c.charCodeAt(0), 0) % STAT_TONES.length]];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${t.ring} bg-white shadow-sm p-4`}>
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${t.solid}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        {icon && <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${t.soft} ${t.text}`}>{icon}</span>}
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
};

export const ErrorLine: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{message}</p> : null;

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 text-sm text-slate-600 py-6" role="status">
    <span className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
    {label}
  </div>
);

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

/* ------------------------------------------------------------------ */
/* Page frame                                                          */
/* ------------------------------------------------------------------ */

/** Admin page frame: colourful header (brand, read-only badge, account, sign out) with a navigation slot. */
export const AdminShell: React.FC<{ nav: React.ReactNode; children: React.ReactNode }> = ({ nav, children }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-indigo-100 via-violet-100 to-rose-100 border-b border-indigo-100 text-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-indigo-600 shadow-sm">
              <ShieldCheck size={20} />
            </span>
            <div>
              <Link to="/admin" className="block font-extrabold leading-tight text-slate-900">MathQuest Admin</Link>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <Eye size={12} /> Read-only • every view is logged
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline text-slate-600">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg bg-white/80 border border-indigo-100 font-semibold text-slate-700 hover:bg-white"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <nav aria-label="Admin sections" className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex gap-1.5 overflow-x-auto">{nav}</div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">{children}</main>
    </div>
  );
};

export const navTabClass = (active: boolean) =>
  `shrink-0 min-h-[40px] px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
  }`;

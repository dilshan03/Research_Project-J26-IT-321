import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, FlaskConical, Inbox, Info, XCircle } from 'lucide-react';
import type { Cell, Distribution, ModelStatus, Provenance } from '../types';

/* Status and provenance always carry an icon/text label, never colour alone. */

const STATUS: Record<ModelStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  IMPLEMENTED: { label: 'Implemented', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  OFFLINE_EXPERIMENT: { label: 'Offline experiment', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: <FlaskConical size={12} /> },
  PROTOTYPE: { label: 'Prototype', cls: 'bg-sky-50 text-sky-800 border-sky-200', icon: <FlaskConical size={12} /> },
  PROVISIONAL: { label: 'Provisional', cls: 'bg-amber-50 text-amber-900 border-amber-200', icon: <AlertTriangle size={12} /> },
  PLANNED: { label: 'Planned', cls: 'bg-slate-50 text-slate-700 border-slate-300', icon: <CircleDashed size={12} /> },
  NOT_IMPLEMENTED: { label: 'Not implemented', cls: 'bg-slate-50 text-slate-600 border-slate-300 border-dashed', icon: <CircleDashed size={12} /> },
};

export const StatusBadge: React.FC<{ status: ModelStatus }> = ({ status }) => {
  const s = STATUS[status] ?? STATUS.PLANNED;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
};

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  live: 'Live app data (aggregate)',
  offline_survey: 'Offline survey (US NSCH)',
  hypothetical: 'Hypothetical input',
  simulated: 'Simulated benchmark',
  synthetic: 'Synthetic scenarios',
  software_test: 'Software test',
  documentation: 'Documentation / plan',
};

const PROVENANCE_CLS: Record<Provenance, string> = {
  live: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  offline_survey: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  hypothetical: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  simulated: 'bg-amber-50 text-amber-900 border-amber-200',
  synthetic: 'bg-sky-50 text-sky-800 border-sky-200',
  software_test: 'bg-slate-100 text-slate-700 border-slate-300',
  documentation: 'bg-slate-50 text-slate-600 border-slate-300',
};

export const ProvenanceTag: React.FC<{ provenance: Provenance }> = ({ provenance }) => (
  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${PROVENANCE_CLS[provenance]}`}>
    {PROVENANCE_LABELS[provenance]}
  </span>
);

export const EmptyState: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
    <Inbox size={22} className="mx-auto text-slate-400" />
    <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
    {children && <div className="mt-1 text-xs text-slate-500 max-w-xl mx-auto">{children}</div>}
  </div>
);

export const Notice: React.FC<{ tone?: 'info' | 'warning'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div
    className={`flex gap-2 rounded-xl border px-3 py-2 text-xs ${
      tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
    }`}
  >
    {tone === 'warning' ? <AlertTriangle size={15} className="shrink-0 mt-px" /> : <Info size={15} className="shrink-0 mt-px" />}
    <div>{children}</div>
  </div>
);

/** Fixed notice shown on every NSCH panel. */
export const NschNotice: React.FC = () => (
  <Notice tone="warning">
    <strong>US survey outcome, not a MathQuest prediction.</strong> K2Q31A is a parent's report of ever being told the child has
    ADD/ADHD (NSCH, ages 6–10). These results are never applied to MathQuest learners and are not diagnostic.
  </Notice>
);

export const TestStatus: React.FC<{ status: 'PASSED' | 'FAILED' | 'NOT_RUN' }> = ({ status }) =>
  status === 'PASSED' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"><CheckCircle2 size={14} /> Passed</span>
  ) : status === 'FAILED' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><XCircle size={14} /> Failed</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><CircleDashed size={14} /> Not run</span>
  );

export const cellText = (c: Cell | undefined): string =>
  !c ? '—' : c.suppressed ? '< 5 (suppressed)' : String(c.count ?? '—');

/** Horizontal bars for a live aggregate distribution; suppressed cells are shown as text, never as a bar. */
export const DistributionBars: React.FC<{ data?: Distribution; label: string }> = ({ data, label }) => {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) return <p className="text-xs text-slate-500">No records.</p>;
  const max = Math.max(1, ...entries.map(([, c]) => c.count ?? 0));
  return (
    <ul aria-label={label} className="space-y-1.5">
      {entries.map(([k, c]) => (
        <li key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate font-mono text-slate-700" title={k}>{k}</span>
          <span className="h-2.5 rounded bg-slate-100 overflow-hidden">
            {!c.suppressed && (
              <span className="block h-full rounded bg-blue-700" style={{ width: `${((c.count ?? 0) / max) * 100}%` }} />
            )}
          </span>
          <span className={`tabular-nums ${c.suppressed ? 'text-slate-500 italic' : 'text-slate-800 font-semibold'}`}>{cellText(c)}</span>
        </li>
      ))}
    </ul>
  );
};

import React from 'react';
import { TONES, type Tone } from './ui';

/*
 * Dependency-free charts for the admin dashboard (inline SVG / HTML).
 * Every chart shows its numbers as text too (legend with counts and percentages), so colour is never the only cue.
 */

export interface Segment {
  label: string;
  value: number;
  tone: Tone;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Donut with the total in the centre and a legend listing every segment's count and share. */
export const DonutChart: React.FC<{ segments: Segment[]; centerLabel: string; ariaLabel: string }> = ({ segments, centerLabel, ariaLabel }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="0 0 120 120" className="w-40 h-40 shrink-0 -rotate-90" role="img" aria-label={ariaLabel}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.label}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={TONES[s.tone].hex}
                strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${s.label}: ${s.value} (${pct(s.value, total)}%)`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <g className="rotate-90 origin-center">
          <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">{total}</text>
          <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#64748b">{centerLabel}</text>
        </g>
      </svg>
      <ul className="w-full space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={`w-3 h-3 rounded-full ${TONES[s.tone].solid}`} />
            <span className="flex-1 text-slate-700">{s.label}</span>
            <span className="font-bold tabular-nums text-slate-900">{s.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-500">{pct(s.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Horizontal bars, each labelled with its value. `stacked` puts long labels above their bar (narrow panels). */
export const BarList: React.FC<{ items: Segment[]; ariaLabel: string; unit?: string; stacked?: boolean }> = ({ items, ariaLabel, unit, stacked }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (stacked) {
    return (
      <ul aria-label={ariaLabel} className="space-y-2.5">
        {items.map((i) => (
          <li key={i.label} className="space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-700">{i.label}</span>
              <span className="tabular-nums font-bold text-slate-900">{i.value}</span>
            </div>
            <span className="block h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <span className={`block h-full rounded-full ${TONES[i.tone].solid}`} style={{ width: `${(i.value / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul aria-label={ariaLabel} className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-slate-700" title={i.label}>{i.label}</span>
          <span className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <span className={`block h-full rounded-full ${TONES[i.tone].solid}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="tabular-nums font-bold text-slate-900">
            {i.value}
            {unit && <span className="font-normal text-slate-500"> {unit}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Ring showing one share (e.g. 7 of 10 completed), with the percentage in the middle. */
export const ProgressRing: React.FC<{ value: number; total: number; tone: Tone; label: string; sub?: string }> = ({ value, total, tone, label, sub }) => {
  const R = 30;
  const C = 2 * Math.PI * R;
  const share = total > 0 ? value / total : 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="w-20 h-20 shrink-0" role="img" aria-label={`${label}: ${value} of ${total}`}>
        <circle cx="40" cy="40" r={R} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={TONES[tone].hex}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${share * C} ${C}`}
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f172a">{pct(value, total)}%</text>
      </svg>
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{sub ?? `${value} of ${total}`}</p>
      </div>
    </div>
  );
};

/** One bar split into parts, with a legend of counts underneath. */
export const StackedBar: React.FC<{ segments: Segment[]; ariaLabel: string }> = ({ segments, ariaLabel }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-2">
      <div role="img" aria-label={ariaLabel} className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.filter((s) => s.value > 0).map((s) => (
          <span key={s.label} className={TONES[s.tone].solid} style={{ width: `${(s.value / Math.max(1, total)) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${TONES[s.tone].solid}`} />
            {s.label} <span className="font-bold text-slate-900 tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * 0–100 % scale with a shaded likely range and a marker for the estimate.
 * Band edges at 50 % and 80 % mark the ELP-X level boundaries (emerging / developing / proficient).
 */
export const RangeBar: React.FC<{ estimate: number; lower: number; upper: number; tone: Tone; label: string }> = ({ estimate, lower, upper, tone, label }) => (
  <div className="space-y-1">
    <div
      role="img"
      aria-label={`${label}: estimate ${Math.round(estimate)}%, likely between ${Math.round(lower)}% and ${Math.round(upper)}%`}
      className="relative h-4 rounded-full bg-gradient-to-r from-amber-100 via-sky-100 to-emerald-100"
    >
      <span className="absolute inset-y-0 w-px bg-white" style={{ left: '50%' }} />
      <span className="absolute inset-y-0 w-px bg-white" style={{ left: '80%' }} />
      <span className={`absolute inset-y-0.5 rounded-full opacity-40 ${TONES[tone].solid}`} style={{ left: `${lower}%`, width: `${Math.max(1, upper - lower)}%` }} />
      <span
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${TONES[tone].solid}`}
        style={{ left: `${estimate}%` }}
      />
    </div>
    <div aria-hidden="true" className="relative h-3 text-[10px] text-slate-400">
      <span className="absolute left-0">0%</span>
      <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>50%</span>
      <span className="absolute -translate-x-1/2" style={{ left: '80%' }}>80%</span>
      <span className="absolute right-0">100%</span>
    </div>
  </div>
);

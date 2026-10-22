import React, { useState } from 'react';

/*
 * Small dependency-free charts (inline SVG / HTML). Colours were checked with the dataviz palette validator:
 * model #1d4ed8 vs baseline #b45309; SHAP "raises" #c2410c vs "lowers" #0369a1 (CVD-safe, >= 3:1 contrast).
 * Every chart has a text alternative (legend, labels and/or a table view).
 */
export const COLORS = { model: '#1d4ed8', baseline: '#b45309', raises: '#c2410c', lowers: '#0369a1', validation: '#b45309' };

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const num = (v: number, digits = 3) => v.toFixed(digits);

const Legend: React.FC<{ items: Array<{ label: string; color: string; dashed?: boolean }> }> = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-4 rounded-sm"
          style={i.dashed ? { borderTop: `2px dashed ${i.color}`, height: 0 } : { background: i.color }}
        />
        {i.label}
      </span>
    ))}
  </div>
);

/* ---------------- Model vs baseline: one small multiple per metric (each has its own scale) ---------------- */

export interface MetricPair {
  metric: string;
  model: number;
  baseline: number;
  better: 'higher' | 'lower';
  ci?: [number, number];
}

export const MetricComparison: React.FC<{ pairs: MetricPair[]; modelLabel: string; baselineLabel: string }> = ({
  pairs,
  modelLabel,
  baselineLabel,
}) => (
  <div className="space-y-3">
    <Legend items={[{ label: modelLabel, color: COLORS.model }, { label: baselineLabel, color: COLORS.baseline }]} />
    <div className="grid gap-3 sm:grid-cols-3">
      {pairs.map((p) => {
        const max = Math.max(p.model, p.baseline, p.ci?.[1] ?? 0) * 1.1 || 1;
        const row = (label: string, value: number, color: string) => (
          <div className="grid grid-cols-[4.5rem_1fr_3.2rem] items-center gap-2 text-[11px]" title={`${label}: ${num(value, 4)}`}>
            <span className="text-slate-600 truncate">{label}</span>
            <span className="h-3 rounded bg-slate-100">
              <span className="block h-full rounded-r" style={{ width: `${(value / max) * 100}%`, background: color }} />
            </span>
            <span className="tabular-nums font-semibold text-slate-800 text-right">{num(value)}</span>
          </div>
        );
        return (
          <figure key={p.metric} className="rounded-xl border border-slate-200 p-3 space-y-1.5">
            <figcaption className="text-xs font-bold text-slate-800">
              {p.metric} <span className="font-normal text-slate-500">({p.better} is better)</span>
            </figcaption>
            {row('Model', p.model, COLORS.model)}
            {row('Baseline', p.baseline, COLORS.baseline)}
            {p.ci && (
              <p className="text-[11px] text-slate-500">
                Provisional 95% CI {num(p.ci[0])}–{num(p.ci[1])} (bootstrap, unweighted, not design-adjusted)
              </p>
            )}
          </figure>
        );
      })}
    </div>
  </div>
);

/* ---------------- Confusion matrix ---------------- */

export const ConfusionMatrix: React.FC<{ tp: number; fp: number; fn: number; tn: number; positiveLabel: string; negativeLabel: string }> = ({
  tp,
  fp,
  fn,
  tn,
  positiveLabel,
  negativeLabel,
}) => {
  const total = tp + fp + fn + tn;
  const cell = (label: string, value: number, correct: boolean) => (
    <div
      className={`rounded-lg border p-3 text-center ${correct ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
      title={`${label}: ${value} (${pct(value / total)})`}
    >
      <p className="text-[11px] font-semibold text-slate-600">{label}</p>
      <p className="text-xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</p>
      <p className="text-[11px] text-slate-500">{pct(value / total)} of {total.toLocaleString()}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-xs max-w-xl" role="table" aria-label="Confusion matrix">
      <span />
      <span className="text-center font-semibold text-slate-600">Predicted: {positiveLabel}</span>
      <span className="text-center font-semibold text-slate-600">Predicted: {negativeLabel}</span>
      <span className="self-center font-semibold text-slate-600 [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
        Survey: {positiveLabel}
      </span>
      {cell('True positive', tp, true)}
      {cell('False negative', fn, false)}
      <span className="self-center font-semibold text-slate-600 [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
        Survey: {negativeLabel}
      </span>
      {cell('False positive', fp, false)}
      {cell('True negative', tn, true)}
    </div>
  );
};

/* ---------------- Calibration (reliability) chart ---------------- */

export interface ReliabilityPoint {
  n: number;
  mean_predicted: number;
  observed_rate: number;
}

export const CalibrationChart: React.FC<{ series: Array<{ label: string; color: string; points: ReliabilityPoint[] }> }> = ({ series }) => {
  const [showTable, setShowTable] = useState(false);
  const all = series.flatMap((s) => s.points);
  const maxV = Math.min(1, Math.ceil(Math.max(0.1, ...all.flatMap((p) => [p.mean_predicted, p.observed_rate])) * 10) / 10);
  const W = 320, H = 260, L = 40, B = 34, T = 10, R = 10;
  const x = (v: number) => L + (v / maxV) * (W - L - R);
  const y = (v: number) => H - B - (v / maxV) * (H - B - T);
  const ticks = Array.from({ length: Math.round(maxV * 10) + 1 }, (_, i) => i / 10).filter((_, i, a) => a.length <= 6 || i % 2 === 0);

  return (
    <div className="space-y-2">
      <Legend items={[...series.map((s) => ({ label: s.label, color: s.color })), { label: 'Perfect calibration', color: '#94a3b8', dashed: true }]} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label="Calibration chart: predicted vs observed rate by decile">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#64748b">{pct(t, 0)}</text>
            <text x={x(t)} y={H - B + 14} textAnchor="middle" fontSize={9} fill="#64748b">{pct(t, 0)}</text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(maxV)} y2={y(maxV)} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#475569">Mean predicted probability (decile)</text>
        <text x={10} y={(T + H - B) / 2} textAnchor="middle" fontSize={10} fill="#475569" transform={`rotate(-90 10 ${(T + H - B) / 2})`}>
          Observed rate
        </text>
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              points={s.points.map((p) => `${x(p.mean_predicted)},${y(p.observed_rate)}`).join(' ')}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(p.mean_predicted)} cy={y(p.observed_rate)} r={4} fill={s.color} stroke="#fff" strokeWidth={2}>
                <title>{`${s.label}, decile ${i + 1} (n=${p.n}): predicted ${pct(p.mean_predicted)}, observed ${pct(p.observed_rate)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-blue-700 hover:underline">
        {showTable ? 'Hide' : 'Show'} table view
      </button>
      {showTable && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Series</th><th className="px-3 py-2">Decile</th><th className="px-3 py-2">n</th>
                <th className="px-3 py-2">Mean predicted</th><th className="px-3 py-2">Observed</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((s) =>
                s.points.map((p, i) => (
                  <tr key={`${s.label}-${i}`} className="border-t border-slate-100 font-mono">
                    <td className="px-3 py-1">{s.label}</td><td className="px-3 py-1">{i + 1}</td><td className="px-3 py-1">{p.n}</td>
                    <td className="px-3 py-1">{pct(p.mean_predicted)}</td><td className="px-3 py-1">{pct(p.observed_rate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ---------------- SHAP contributions (diverging) and importance ---------------- */

export interface Contribution {
  feature: string;
  label: string;
  value?: string | null;
  meaning?: string | null;
  contribution: number;
}

export const ContributionBars: React.FC<{ items: Contribution[]; initial?: number }> = ({ items, initial = 12 }) => {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, initial);
  const max = Math.max(1e-9, ...items.map((i) => Math.abs(i.contribution)));
  return (
    <div className="space-y-2">
      <Legend items={[{ label: 'Raises the model score', color: COLORS.raises }, { label: 'Lowers the model score', color: COLORS.lowers }]} />
      <ul className="space-y-1">
        {shown.map((c) => {
          const w = (Math.abs(c.contribution) / max) * 50;
          const up = c.contribution >= 0;
          const valueText = c.value == null ? 'missing' : c.meaning ? `${c.value} = ${c.meaning}` : c.value;
          return (
            <li
              key={c.feature}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr_4.5rem] items-center gap-x-2 text-[11px]"
              title={`${c.feature} (${c.label}) = ${valueText}: ${up ? '+' : ''}${c.contribution.toFixed(4)} log-odds`}
            >
              <span className="truncate text-slate-700">
                <span className="font-mono font-semibold">{c.feature}</span> <span className="text-slate-500">[{valueText}]</span>
              </span>
              <span className="relative h-3 bg-slate-50 rounded">
                <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
                <span
                  className="absolute inset-y-0 rounded"
                  style={{ background: up ? COLORS.raises : COLORS.lowers, width: `${w}%`, left: up ? '50%' : `${50 - w}%` }}
                />
              </span>
              <span className="tabular-nums text-right font-semibold text-slate-800">
                {up ? '+' : '−'}{Math.abs(c.contribution).toFixed(4)}
              </span>
            </li>
          );
        })}
      </ul>
      {items.length > initial && (
        <button type="button" onClick={() => setAll((v) => !v)} className="text-xs font-semibold text-blue-700 hover:underline">
          {all ? `Show top ${initial}` : `Show all ${items.length} features`}
        </button>
      )}
    </div>
  );
};

export const ImportanceBars: React.FC<{ items: Array<{ feature: string; label: string; meanAbs: number; meanSigned: number }>; initial?: number }> = ({
  items,
  initial = 15,
}) => {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, initial);
  const max = Math.max(1e-9, ...items.map((i) => i.meanAbs));
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {shown.map((f) => (
          <li
            key={f.feature}
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr_4.5rem] items-center gap-x-2 text-[11px]"
            title={`${f.feature} (${f.label}): mean |SHAP| ${f.meanAbs.toFixed(4)}, mean signed ${f.meanSigned.toFixed(4)}`}
          >
            <span className="truncate text-slate-700">
              <span className="font-mono font-semibold">{f.feature}</span> <span className="text-slate-500">{f.label}</span>
            </span>
            <span className="h-3 rounded bg-slate-100">
              <span className="block h-full rounded-r" style={{ width: `${(f.meanAbs / max) * 100}%`, background: COLORS.model }} />
            </span>
            <span className="tabular-nums text-right font-semibold text-slate-800">{f.meanAbs.toFixed(4)}</span>
          </li>
        ))}
      </ul>
      {items.length > initial && (
        <button type="button" onClick={() => setAll((v) => !v)} className="text-xs font-semibold text-blue-700 hover:underline">
          {all ? `Show top ${initial}` : `Show all ${items.length} features`}
        </button>
      )}
    </div>
  );
};

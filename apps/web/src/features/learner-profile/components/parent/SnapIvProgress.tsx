import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Info, ShieldAlert, TrendingUp } from 'lucide-react';
import type { SnapIvComparison, SnapIvHistoryEntry, SnapIvProgress as Progress, SnapIvSubscaleChange } from '../../types/onboarding';
import { SNAP_IV_SCALE_OPTIONS } from '../../types/onboarding';
import { directionArrow, formatAverage, snapIvChartPoints, snapIvDate } from '../../utils/snapIvProgress';
import { parentText } from '../../../../shared/i18n/parentText';

const t = parentText.support.progress;

/* Two colours checked for colour-vision deficiency (same pair as the research charts); the series also differ
   by line style and marker shape, so colour is never the only cue. Neither colour means "good" or "bad". */
const SERIES = {
  inattention: { color: '#1d4ed8', dash: undefined as string | undefined, label: t.inattention },
  hyperactivity: { color: '#b45309', dash: '6 4', label: t.hyperactivity },
};

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

const H = 250;
const L = 30;
const R = 24;
const T = 26;
const B = 46;

/** Width of the element in CSS pixels, so the chart is drawn 1:1 and its text stays readable on phones. */
const useElementWidth = (fallback: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width: Math.max(260, width) };
};

export const SnapIvChart: React.FC<{ history: SnapIvHistoryEntry[] }> = ({ history }) => {
  const { ref, width: W } = useElementWidth(640);
  const points = snapIvChartPoints(history);
  const n = points.length;
  const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / 3) * (H - T - B);
  const other = (key: 'inattention' | 'hyperactivity') => (key === 'inattention' ? 'hyperactivity' : 'inattention');
  // Date labels: the first and last are kept inside the chart edges; with many entries only some are labelled.
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L - R) / 90))));
  const anchor = (i: number) => (n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle');

  const series = (key: 'inattention' | 'hyperactivity') => {
    const s = SERIES[key];
    const pts = points.map((p, i) => ({ i, v: p[key] })).filter((p): p is { i: number; v: number } => p.v !== null);
    // Value label goes on the side away from the other line (above when this value is higher or equal).
    const labelAbove = (i: number, v: number) => {
      const o = points[i][other(key)];
      return o === null ? key === 'inattention' : v > o || (v === o && key === 'inattention');
    };
    return (
      <g key={key}>
        {pts.length > 1 && (
          <polyline
            fill="none"
            stroke={s.color}
            strokeWidth={3}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
          />
        )}
        {pts.map((p) => (
          <g key={p.i}>
            {key === 'inattention' ? (
              <circle cx={x(p.i)} cy={y(p.v)} r={6} fill={s.color} stroke="#fff" strokeWidth={2} />
            ) : (
              <rect x={x(p.i) - 6} y={y(p.v) - 6} width={12} height={12} rx={2} fill={s.color} stroke="#fff" strokeWidth={2} />
            )}
            <text
              x={x(p.i)}
              y={labelAbove(p.i, p.v) ? y(p.v) - 12 : y(p.v) + 23}
              textAnchor={anchor(p.i)}
              fontSize={12}
              fontWeight={700}
              fill={s.color}
            >
              {formatAverage(p.v)}
            </text>
            <title>{`${s.label} • ${snapIvDate(points[p.i].completedAt)} • ${formatAverage(p.v)} / 3`}</title>
          </g>
        ))}
      </g>
    );
  };

  return (
    <figure className="space-y-3">
      <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={t.chartLabel}>
        {[0, 1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={v === 0 ? undefined : '3 4'} />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#64748b">{v}</text>
          </g>
        ))}
        {points.map((p, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 14} textAnchor={anchor(i)} fontSize={12} fill="#475569">
              {snapIvDate(p.completedAt)}
            </text>
          ) : null
        )}
        {series('inattention')}
        {series('hyperactivity')}
      </svg>
      </div>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mq-text">
        {(Object.keys(SERIES) as Array<keyof typeof SERIES>).map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <svg width="30" height="12" aria-hidden="true">
              <line x1="0" x2="30" y1="6" y2="6" stroke={SERIES[k].color} strokeWidth="3" strokeDasharray={SERIES[k].dash} />
              {k === 'inattention' ? <circle cx="15" cy="6" r="4.5" fill={SERIES[k].color} /> : <rect x="10.5" y="1.5" width="9" height="9" rx="1.5" fill={SERIES[k].color} />}
            </svg>
            {SERIES[k].label}
          </span>
        ))}
      </figcaption>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-mq-text-muted">
        {SNAP_IV_SCALE_OPTIONS.map((o) => (
          <li key={o.value} className="rounded-xl bg-mq-surface-soft px-2.5 py-1.5">
            <span className="font-bold text-mq-text-strong">{o.value}</span> = {o.labelSi}
          </li>
        ))}
      </ul>
    </figure>
  );
};

/* ------------------------------------------------------------------ */
/* Comparison cards                                                    */
/* ------------------------------------------------------------------ */

const SubscaleChange: React.FC<{ title: string; items: string; change: SnapIvSubscaleChange; color: string }> = ({ title, items, change, color }) => (
  <article className="rounded-2xl border border-mq-border bg-white p-4 space-y-2 min-w-0">
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="w-3 h-3 rounded-full" style={{ background: color }} />
      <h4 className="text-base font-bold text-mq-text-strong">{title}</h4>
      <span className="text-xs text-mq-text-muted">({items})</span>
    </div>
    {change.direction === 'NOT_COMPARABLE' ? (
      <p className="text-base text-mq-text-muted">{t.direction.NOT_COMPARABLE}</p>
    ) : (
      <>
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs text-mq-text-muted">{t.before}</p>
            <p className="text-2xl font-extrabold text-mq-text-strong tabular-nums">{formatAverage(change.before)}</p>
          </div>
          <span aria-hidden="true" className="pb-1 text-2xl font-bold text-mq-primary">{directionArrow(change.direction)}</span>
          <div>
            <p className="text-xs text-mq-text-muted">{t.now}</p>
            <p className="text-2xl font-extrabold text-mq-text-strong tabular-nums">{formatAverage(change.after)}</p>
          </div>
        </div>
        <p className="text-base font-semibold text-mq-text-strong">{t.direction[change.direction]}</p>
        {change.itemsRatedLower !== null && change.itemsRatedHigher !== null && change.itemsUnchanged !== null && (
          <p className="text-sm text-mq-text-muted">{t.items(change.itemsRatedLower, change.itemsRatedHigher, change.itemsUnchanged)}</p>
        )}
      </>
    )}
  </article>
);

const ComparisonBlock: React.FC<{ title: string; c: SnapIvComparison }> = ({ title, c }) => (
  <div className="space-y-3">
    <div>
      <h3 className="text-base font-bold text-mq-text-strong">{title}</h3>
      <p className="text-sm text-mq-text-muted">{t.period(snapIvDate(c.from), snapIvDate(c.to), c.daysBetween)}</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <SubscaleChange title={t.inattention} items={t.inattentionItems} change={c.inattention} color={SERIES.inattention.color} />
      <SubscaleChange title={t.hyperactivity} items={t.hyperactivityItems} change={c.hyperactivity} color={SERIES.hyperactivity.color} />
    </div>
    {c.flags.length > 0 && (
      <ul className="space-y-1.5">
        {c.flags.map((f) => (
          <li key={f} className="flex items-start gap-2 rounded-xl bg-mq-surface-soft px-3 py-2 text-sm text-mq-text">
            <Info size={16} className="shrink-0 mt-0.5 text-mq-primary" />
            <span>{t.flags[f]}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

/** Parent-facing SNAP-IV history: chart, latest and overall comparisons, every entry, and the fixed notice. */
export const SnapIvProgressSection: React.FC<{ history: SnapIvHistoryEntry[]; progress?: Progress }> = ({ history, progress }) => {
  if (history.length === 0) return null;
  return (
    <div className="space-y-5">
      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-mq-warning/40 bg-amber-50 px-4 py-3"
      >
        <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-700" />
        <div className="space-y-1">
          <p className="text-base font-bold text-mq-text-strong">{t.notDiagnosisTitle}</p>
          <p className="text-sm text-mq-text leading-relaxed">{t.notDiagnosisText}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-bold text-mq-text-strong flex items-center gap-2">
          <TrendingUp size={18} className="text-mq-primary" />
          {t.title}
        </h3>
        <p className="text-sm text-mq-text-muted">{t.intro}</p>
        <div className="rounded-2xl border border-mq-border bg-white p-3 sm:p-4">
          <SnapIvChart history={history} />
        </div>
      </div>

      {progress?.latestChange ? (
        <ComparisonBlock title={t.latestTitle} c={progress.latestChange} />
      ) : (
        <p className="flex items-start gap-2 rounded-2xl bg-mq-surface-soft px-4 py-3 text-base text-mq-text">
          <Info size={18} className="shrink-0 mt-0.5 text-mq-primary" />
          <span>{t.oneEntry}</span>
        </p>
      )}
      {progress?.overallChange && <ComparisonBlock title={t.overallTitle} c={progress.overallChange} />}
      {progress?.latestChange && <p className="text-xs text-mq-text-muted">{t.similarNote}</p>}

      <div className="space-y-2">
        <h3 className="text-base font-bold text-mq-text-strong">{t.historyTitle}</h3>
        <ul className="space-y-2">
          {history.map((h, i) => (
            <li key={`${h.completedAt}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-mq-border/70 bg-white px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-base font-semibold text-mq-text-strong">
                <CalendarDays size={16} className="text-mq-text-muted" />
                {snapIvDate(h.completedAt)}
              </span>
              {(['inattention', 'hyperactivity'] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-mq-surface-soft px-2.5 py-0.5 text-sm text-mq-text">
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: SERIES[k].color }} />
                  {SERIES[k].label}: {h[k] ? t.averageOf(formatAverage(h[k]!.average)) : t.noScores}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SnapIvProgressSection;

/**
 * Display helpers for the parent's SNAP-IV history (SNAPIV-PROGRESS). Pure functions over the server's
 * own results: nothing is re-scored or re-classified here, and no direction is ever presented as better
 * or worse (a lower score means the parent reported the characteristics less often, nothing more).
 */
import type { SnapIvChangeDirection, SnapIvHistoryEntry } from '../types/onboarding';

export interface SnapIvChartPoint {
  completedAt: string | null;
  inattention: number | null;
  hyperactivity: number | null;
}

/** Oldest-first points for the chart (the API lists history newest first). */
export const snapIvChartPoints = (history: SnapIvHistoryEntry[] | undefined): SnapIvChartPoint[] =>
  [...(history ?? [])].reverse().map((h) => ({
    completedAt: h.completedAt,
    inattention: h.inattention ? h.inattention.average : null,
    hyperactivity: h.hyperactivity ? h.hyperactivity.average : null,
  }));

/** Nearest answer on the 0–3 SNAP-IV scale (0 not at all … 3 very much), for a words-based reading of an average. */
export const nearestScaleStep = (average: number): 0 | 1 | 2 | 3 =>
  Math.min(3, Math.max(0, Math.round(average))) as 0 | 1 | 2 | 3;

/** Averages are shown with one decimal (e.g. 1.56 → "1.6"). */
export const formatAverage = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';

/** Arrow used beside a change; the same neutral styling is used for both directions. */
export const directionArrow = (direction: SnapIvChangeDirection): '↓' | '↑' | '≈' | '–' =>
  direction === 'LOWER' ? '↓' : direction === 'HIGHER' ? '↑' : direction === 'SIMILAR' ? '≈' : '–';

/** Numeric YYYY-MM-DD (browsers often lack Sinhala month names, which would mix languages). */
export const snapIvDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

import React from 'react';
import { CheckCircle2, CircleDashed, HelpCircle, MinusCircle, XCircle, GraduationCap } from 'lucide-react';
import { RESULT_LABELS, type DisplayResult, type ItemView, type OptionView } from './model';

/* Presentation only: object symbols for the synthetic item bank's object types. */
const OBJECT_SYMBOLS: Record<string, string> = {
  birds: '🐦', mangoes: '🥭', leaves: '🍃', shells: '🐚', rabbits: '🐇', ducks: '🦆', balls: '⚽',
  elephants: '🐘', butterflies: '🦋', fish: '🐟', flowers: '🌸', stars: '⭐', boats: '⛵',
};
const GAP = { tight: '2px', medium: '8px', wide: '16px' } as Record<string, string>;

export const RESULT_STYLE: Record<DisplayResult, { cls: string; icon: React.ReactNode }> = {
  correct: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: <CheckCircle2 size={14} /> },
  incorrect: { cls: 'bg-rose-50 text-rose-800 border-rose-300', icon: <XCircle size={14} /> },
  helped: { cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: <HelpCircle size={14} /> },
  unknown: { cls: 'bg-violet-50 text-violet-800 border-violet-300', icon: <CircleDashed size={14} /> },
  unanswered: { cls: 'bg-slate-100 text-slate-700 border-slate-300', icon: <MinusCircle size={14} /> },
  guided: { cls: 'bg-sky-50 text-sky-800 border-sky-300', icon: <GraduationCap size={14} /> },
};

export const ResultBadge: React.FC<{ result: DisplayResult }> = ({ result }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RESULT_STYLE[result].cls}`}>
    {RESULT_STYLE[result].icon}
    {RESULT_LABELS[result]}
  </span>
);

/** Deterministic scatter offsets so the drawing is stable between renders. */
const scatterOffset = (seed: string, i: number) => {
  let h = 0;
  for (const ch of `${seed}:${i}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { x: (h % 13) - 6, y: ((h >> 4) % 13) - 6 };
};

const Group: React.FC<{ option: OptionView; symbol: string; seed: string; extentMode: string }> = ({ option, symbol, seed, extentMode }) => {
  const gap = GAP[option.spacing] ?? '8px';
  const cells = Array.from({ length: option.count }, (_, i) => {
    const off = option.pattern === 'scatter' ? scatterOffset(seed, i) : { x: 0, y: 0 };
    return (
      <span key={i} aria-hidden className="text-xl leading-none" style={{ transform: `translate(${off.x}px, ${off.y}px)` }}>
        {symbol}
      </span>
    );
  });
  const layout =
    option.pattern === 'grid'
      ? { display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap }
      : { display: 'flex', flexWrap: 'wrap' as const, gap, justifyContent: extentMode === 'equal_extent' ? 'space-between' : 'center' };
  return (
    <div className="min-h-[88px] flex items-center justify-center p-2" style={{ width: extentMode === 'equal_extent' ? '100%' : undefined }}>
      <div style={layout} role="img" aria-label={`${option.count} objects`}>
        {cells}
      </div>
    </div>
  );
};

export const QuestionCard: React.FC<{ item: ItemView; compact?: boolean }> = ({ item, compact }) => {
  const symbol = OBJECT_SYMBOLS[item.objectType] ?? '●';
  const roleLabel = item.role === 'pre' ? 'Before teaching' : item.role === 'teaching' ? 'Teaching (guided)' : 'New question (transfer)';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Q{item.presentationIndex + 1} · {roleLabel}
          </p>
          <p className="text-sm font-semibold text-slate-900">Which group has the most {item.objectType}?</p>
        </div>
        <ResultBadge result={item.result} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {item.options.map((o) => (
          <div
            key={o.position}
            className={`relative rounded-xl border-2 ${o.isCorrect ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'} ${
              o.isFirstChoice ? 'ring-2 ring-blue-600 ring-offset-1' : ''
            }`}
          >
            {!compact && <Group option={o} symbol={symbol} seed={`${item.itemId}-${o.position}`} extentMode={item.extentMode} />}
            <div className="border-t border-slate-200 px-2 py-1 text-[11px] text-slate-700 space-y-0.5">
              <p className="font-semibold">
                {o.label}: {o.count}
              </p>
              <p className="text-slate-500">
                {o.pattern} · {o.spacing}
              </p>
              <div className="flex flex-wrap gap-1">
                {o.isCorrect && <span className="rounded bg-emerald-600 px-1 text-[10px] font-bold text-white">MOST (key)</span>}
                {o.isFirstChoice && <span className="rounded bg-blue-700 px-1 text-[10px] font-bold text-white">1st answer</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        Layout: {item.extentMode === 'equal_extent' ? 'every group fills the same space' : 'equal gaps between objects'} · arrangement drawn
        independently of the answer
      </p>
      <details className="text-xs text-slate-700">
        <summary className="cursor-pointer font-semibold text-blue-700">Why this result?</summary>
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {item.explanations.map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="mt-1 text-[11px] text-slate-500 font-mono">
          {item.itemId} · help status {item.evidence.assistanceStatus} · record {item.evidence.assistanceRecording ?? 'missing'}
          {item.evidence.flags.length ? ` · flags ${item.evidence.flags.join(', ')}` : ''}
        </p>
      </details>
    </article>
  );
};

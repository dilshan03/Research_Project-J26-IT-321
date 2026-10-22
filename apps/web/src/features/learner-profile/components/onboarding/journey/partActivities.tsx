import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { MathItemAnswer } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import { interactionModeOf, type InputDetail, type ItemMeta } from './evidence';
import { ActivityFrame, PrimaryAction } from './ui';
import { frameProps, useActivity, type ActivityContext } from './activities';
import type { SceneId } from './scenes';

/* Grade 4–5 templates and pictures (fractions, decimals, perimeter, patterns). Same evidence rules as
   Grades 1–3: only the first confirmed response is the child's answer, help is recorded with its timing,
   and correctness is decided on the server. */

/** Tenths wrap to two rows of five on phones so every part stays a comfortable touch target. */
const PARTS_GRID: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 10: 'grid-cols-5 sm:grid-cols-10' };
const partsGrid = (parts: number) => PARTS_GRID[parts] ?? 'grid-cols-4';

/* ------------------------------------------------------------------ */
/* Pictures                                                            */
/* ------------------------------------------------------------------ */

/** A whole split into equal parts, the first `shaded` of them coloured. */
export const PartsStrip: React.FC<{ parts: number; shaded: number; label: string }> = ({ parts, shaded, label }) => (
  <span role="img" aria-label={label} className={`grid ${partsGrid(parts)} w-full max-w-[420px] rounded-lg border-[3px] border-slate-600 overflow-hidden bg-white`}>
    {Array.from({ length: parts }).map((_, i) => (
      <span key={i} aria-hidden="true" className={`h-12 border border-slate-400 ${i < shaded ? 'bg-violet-400' : 'bg-white'}`} />
    ))}
  </span>
);

const UNIT = 40;
const PAD = 22;

/**
 * A w × h garden of unit squares. With `numbered`, every unit edge around the outside is numbered
 * clockwise from the top-left corner (the level-2 visual cue for perimeter).
 */
export const PerimeterPicture: React.FC<{ w: number; h: number; label: string; numbered?: boolean }> = ({ w, h, label, numbered }) => {
  const edges: { x: number; y: number }[] = [];
  for (let i = 0; i < w; i++) edges.push({ x: (i + 0.5) * UNIT, y: 0 });
  for (let i = 0; i < h; i++) edges.push({ x: w * UNIT, y: (i + 0.5) * UNIT });
  for (let i = w - 1; i >= 0; i--) edges.push({ x: (i + 0.5) * UNIT, y: h * UNIT });
  for (let i = h - 1; i >= 0; i--) edges.push({ x: 0, y: (i + 0.5) * UNIT });
  return (
    <svg role="img" aria-label={label} viewBox={`${-PAD} ${-PAD} ${w * UNIT + 2 * PAD} ${h * UNIT + 2 * PAD}`} className="w-full max-w-[300px] h-auto">
      {Array.from({ length: w * h }).map((_, i) => (
        <rect
          key={i}
          x={(i % w) * UNIT}
          y={Math.floor(i / w) * UNIT}
          width={UNIT}
          height={UNIT}
          fill="#bbf7d0"
          stroke="#16a34a"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      ))}
      <rect x={0} y={0} width={w * UNIT} height={h * UNIT} fill="none" stroke="#78350f" strokeWidth={4} />
      {/* Unit marks on the outline */}
      {edges.map((e, i) => (
        <circle key={`m${i}`} cx={e.x} cy={e.y} r={2.5} fill="#78350f" />
      ))}
      {numbered &&
        edges.map((e, i) => {
          const dx = e.x === 0 ? -13 : e.x === w * UNIT ? 13 : 0;
          const dy = e.y === 0 ? -12 : e.y === h * UNIT ? 12 : 0;
          return (
            <g key={`n${i}`} transform={`translate(${e.x + dx} ${e.y + dy})`}>
              <circle r={9} fill="#fde68a" stroke="#b45309" strokeWidth={1} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#78350f">
                {i + 1}
              </text>
            </g>
          );
        })}
    </svg>
  );
};

/** A number sequence ending in "?"; with `step`, the jump between terms is shown (level-2 visual cue). */
export const NumberSequence: React.FC<{ terms: number[]; step?: number }> = ({ terms, step }) => (
  <span role="img" aria-label={`${terms.join(', ')}, ?`} className="inline-flex flex-wrap items-end justify-center gap-x-1 gap-y-3">
    {[...terms.map(String), '?'].map((t, i) => (
      <React.Fragment key={i}>
        {i > 0 && (
          <span aria-hidden="true" className="flex flex-col items-center self-center px-0.5">
            {step !== undefined && <span className="text-xs font-bold text-amber-700">+{step}</span>}
            <span className="text-mq-text-muted">{step !== undefined ? '⟶' : ','}</span>
          </span>
        )}
        <span
          aria-hidden="true"
          className={`min-w-[52px] rounded-xl px-2 py-1.5 text-center text-3xl sm:text-4xl font-extrabold ${
            t === '?' ? 'border-2 border-dashed border-mq-primary text-mq-primary' : 'text-mq-text-strong'
          }`}
        >
          {t}
        </span>
      </React.Fragment>
    ))}
  </span>
);

/** Growing towers of cubes followed by an empty "?" tower. */
export const TowerPattern: React.FC<{ heights: number[]; label: string }> = ({ heights, label }) => (
  <span role="img" aria-label={label} className="inline-flex items-end justify-center gap-4">
    {heights.map((h, i) => (
      <span key={i} aria-hidden="true" className="flex flex-col items-center gap-1">
        <span className="flex flex-col-reverse gap-[3px]">
          {Array.from({ length: h }).map((_, j) => (
            <span key={j} className="block w-7 h-7 rounded-[4px] border-2 border-sky-700 bg-sky-400" />
          ))}
        </span>
        <span className="text-sm font-semibold text-mq-text-muted">{h}</span>
      </span>
    ))}
    <span aria-hidden="true" className="flex flex-col items-center gap-1">
      <span className="flex w-9 h-24 items-center justify-center rounded-md border-2 border-dashed border-mq-primary text-2xl font-bold text-mq-primary">
        ?
      </span>
      <span className="text-sm font-semibold text-mq-text-muted">?</span>
    </span>
  </span>
);

/* ------------------------------------------------------------------ */
/* Template 7: shade parts of a whole                                  */
/* ------------------------------------------------------------------ */

interface ShadeProps {
  meta: ItemMeta;
  scene: SceneId;
  parts: number;
  instruction: string;
  helpClarify: string;
  helpCue: (shaded: number) => string;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer) => void;
}

/**
 * Concrete fraction / tenths construction. Tapping a part shades it; tapping a shaded part again
 * before confirming is a recorded revision. The confirmed number of shaded parts is the answer.
 */
export const ShadePartsActivity: React.FC<ShadeProps> = ({ meta, scene, parts, instruction, helpClarify, helpCue, ctx, onDone }) => {
  const { recorder, instructionKey, replay } = useActivity(meta, instruction, ctx);
  const [shaded, setShaded] = useState<boolean[]>(() => Array.from({ length: parts }, () => false));
  const [helpLevel, setHelpLevel] = useState(0);
  const [lastInput, setLastInput] = useState<InputDetail | null>(null);
  const count = shaded.filter(Boolean).length;

  const toggle = (i: number, e: React.MouseEvent) => {
    if (shaded[i]) recorder.revise(count, count - 1);
    setShaded((s) => s.map((v, j) => (j === i ? !v : v)));
    setLastInput({ inputMethod: 'tap', interactionMode: interactionModeOf(e) });
  };

  const help = () => {
    if (helpLevel === 0) {
      recorder.support(1, 'clarification');
      setHelpLevel(1);
    } else if (helpLevel === 1) {
      recorder.support(2, 'visual_cue');
      setHelpLevel(2);
    }
  };

  const confirm = (e: React.MouseEvent) => {
    recorder.confirm(count, lastInput ?? { inputMethod: 'tap', interactionMode: interactionModeOf(e) });
    onDone(recorder.toAnswer());
  };

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={helpLevel < 2 ? help : undefined}
      helpMessage={helpLevel === 1 ? helpClarify : helpLevel === 2 ? helpCue(count) : null}
      footer={
        <PrimaryAction onClick={confirm} disabled={count === 0}>
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className={`grid ${partsGrid(parts)} w-full max-w-[560px] rounded-xl border-4 border-slate-600 overflow-hidden bg-white shadow-sm`}>
          {shaded.map((isShaded, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={isShaded}
              aria-label={childText.shade.part(i + 1)}
              onClick={(e) => toggle(i, e)}
              className={`min-h-[96px] min-w-[48px] border-2 border-slate-400 cursor-pointer transition-colors ${
                isShaded ? 'bg-violet-400 hover:bg-violet-300' : 'bg-white hover:bg-violet-50'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-mq-text bg-white/85 rounded-xl px-3 py-1.5">{childText.shade.shaded(count, parts)}</p>
      </div>
      <p className="mt-3 text-sm text-mq-text bg-white/80 rounded-xl px-3 py-2 self-start">{childText.shade.takeBack}</p>
    </ActivityFrame>
  );
};

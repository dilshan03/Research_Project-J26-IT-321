import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SHAKE, seededShuffle } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

/**
 * COMPARE_QUANTITY: each option is drawn at a size proportional to its value, so the
 * learner judges by looking. Options are shuffled and labelled with their quantity
 * (never "Bigger"/"Smaller", which would give the answer away).
 */
export function ComparisonScale({ step, calm, onWrong, onCorrect }: MechanicProps) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const options = useMemo(() => seededShuffle(step.game_options, seed), [step.game_options, seed]);

  const values = options.map(o => o.numeric_value);
  const hasValues = values.every(v => typeof v === 'number' && v > 0);
  const max = hasValues ? Math.max(...(values as number[])) : 1;
  // 2.5rem for the smallest possible, up to 6rem for the largest.
  const sizeOf = (opt: GameChoiceOption) =>
    `${2.5 + 3.5 * (hasValues ? (opt.numeric_value as number) / max : opt.is_correct ? 1 : 0.4)}rem`;

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) {
      setDone(true);
      setTimeout(() => onCorrect(opt.text_en), 800);
    } else {
      setWrong(w => [...w, opt.text_en]);
      setShaking(opt.text_en);
      setTimeout(() => setShaking(null), 450);
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="flex flex-wrap items-end justify-center gap-8 w-full">
        {options.map((opt, i) => {
          const isWrong = wrong.includes(opt.text_en);
          const isRight = done && opt.is_correct;

          return (
            <motion.button
              key={opt.text_en}
              id={`compare-${i}`}
              aria-label={hasValues ? String(opt.numeric_value) : `option ${i + 1}`}
              initial={calm ? false : { opacity: 0, y: 24 }}
              animate={shaking === opt.text_en
                ? { opacity: 1, y: 0, ...SHAKE }
                : { opacity: isWrong ? 0.35 : 1, y: 0, scale: isRight ? 1.08 : isWrong ? 0.95 : 1 }}
              transition={{ delay: calm ? 0 : i * 0.12, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={!isWrong && !done ? { scale: 1.06, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-end p-8 rounded-3xl border-2 transition-colors shadow-xl min-w-[200px] min-h-[220px]
                ${isWrong
                  ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                  : isRight
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50'
                  : 'bg-teal-50 border-teal-400 hover:bg-teal-100 text-teal-950 cursor-pointer'
                }`}
            >
              <motion.span
                className="select-none leading-none"
                style={{ fontSize: sizeOf(opt) }}
                animate={isRight && !calm ? { y: [0, -14, 0] } : {}}
                transition={{ duration: 0.5, repeat: 1 }}
              >
                🐘
              </motion.span>
              {hasValues && (
                <span className="mt-4 text-2xl font-extrabold text-slate-800">{opt.numeric_value}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

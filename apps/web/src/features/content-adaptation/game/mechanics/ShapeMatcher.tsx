import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const SHAPE_ICONS: Record<string, { symbol: string; color: string; bg: string }> = {
  CIRCLE: { symbol: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-400' },
  TRIANGLE: { symbol: '🔺', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-400' },
  SQUARE: { symbol: '🟦', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-400' },
  RECTANGLE: { symbol: '🟩', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-400' },
};

export function ShapeMatcher({ step, lang, onWrong, onCorrect }: MechanicProps) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) {
      setDone(true);
      setTimeout(() => onCorrect(opt.text_en), 700);
    } else {
      setWrong(w => [...w, opt.text_en]);
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-xl">
      <div className="text-center px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-400/30">
        <p className="text-xl sm:text-2xl font-bold text-amber-200">
          {lang === 'si' ? step.instruction_si : step.instruction_en}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const shapeKey = (opt.icon_or_shape || 'CIRCLE').toUpperCase();
          const shapeMeta = SHAPE_ICONS[shapeKey] || SHAPE_ICONS.CIRCLE;

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.06, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all shadow-lg
                ${isWrong
                  ? 'opacity-30 bg-slate-900 border-slate-700 cursor-not-allowed scale-95'
                  : done && opt.is_correct
                  ? 'bg-emerald-500/30 border-emerald-400 ring-4 ring-emerald-400/50 scale-105'
                  : `${shapeMeta.bg} cursor-pointer hover:shadow-amber-500/20`
                }`}
            >
              <span className="text-6xl mb-3 select-none">{shapeMeta.symbol}</span>
              <span className="text-lg font-bold text-slate-100 text-center">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

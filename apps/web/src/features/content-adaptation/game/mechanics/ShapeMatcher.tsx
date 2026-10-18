import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const SHAPE_ICONS: Record<string, { symbol: string; color: string; bg: string }> = {
  CIRCLE: { symbol: '🟡', color: 'text-amber-500', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-400' },
  TRIANGLE: { symbol: '🔺', color: 'text-rose-500', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-400' },
  SQUARE: { symbol: '🟦', color: 'text-sky-500', bg: 'bg-sky-50 hover:bg-sky-100 border-sky-400' },
  RECTANGLE: { symbol: '🟩', color: 'text-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400' },
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
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const shapeKey = (opt.icon_or_shape || 'CIRCLE').toUpperCase();
          const shapeMeta = SHAPE_ICONS[shapeKey] || SHAPE_ICONS.CIRCLE;

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.05, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all shadow-lg
                ${isWrong
                  ? 'opacity-35 bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed scale-95'
                  : done && opt.is_correct
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50 scale-105'
                  : `${shapeMeta.bg} cursor-pointer hover:shadow-xl`
                }`}
            >
              <span className="text-6xl mb-3 select-none">{shapeMeta.symbol}</span>
              <span className="text-lg font-extrabold text-slate-800 text-center">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

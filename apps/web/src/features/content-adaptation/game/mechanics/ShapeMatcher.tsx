import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SHAKE, seededShuffle } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const SHAPE_ICONS: Record<string, { symbol: string; color: string; bg: string }> = {
  CIRCLE: { symbol: '🟡', color: 'text-amber-500', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-400' },
  TRIANGLE: { symbol: '🔺', color: 'text-rose-500', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-400' },
  SQUARE: { symbol: '🟦', color: 'text-sky-500', bg: 'bg-sky-50 hover:bg-sky-100 border-sky-400' },
  RECTANGLE: { symbol: '🟩', color: 'text-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400' },
};

export function ShapeMatcher({ step, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const options = useMemo(() => seededShuffle(step.game_options, seed), [step.game_options, seed]);

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) {
      setDone(true);
      setTimeout(() => onCorrect(opt.text_en), 700);
    } else {
      setWrong(w => [...w, opt.text_en]);
      setShaking(opt.text_en);
      setTimeout(() => setShaking(null), 450);
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
        {options.map((opt, i) => {
          const isWrong = wrong.includes(opt.text_en);
          const isRight = done && opt.is_correct;
          const shapeKey = (opt.icon_or_shape || 'CIRCLE').toUpperCase();
          const shapeMeta = SHAPE_ICONS[shapeKey] || SHAPE_ICONS.CIRCLE;

          return (
            <motion.button
              key={opt.text_en}
              id={`shape-${shapeKey.toLowerCase()}`}
              initial={{ opacity: 0, y: 16 }}
              animate={shaking === opt.text_en
                ? { opacity: 1, y: 0, ...SHAKE }
                : { opacity: isWrong ? 0.35 : 1, y: 0, scale: isRight ? 1.06 : isWrong ? 0.95 : 1 }}
              transition={{ delay: calm ? 0 : i * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
              whileHover={!isWrong && !done ? { scale: 1.05, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-colors shadow-lg
                ${isWrong
                  ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                  : isRight
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50'
                  : `${shapeMeta.bg} cursor-pointer hover:shadow-xl`
                }`}
            >
              <motion.span
                className="text-6xl mb-3 select-none"
                animate={isRight && !calm ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6 }}
              >
                {shapeMeta.symbol}
              </motion.span>
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

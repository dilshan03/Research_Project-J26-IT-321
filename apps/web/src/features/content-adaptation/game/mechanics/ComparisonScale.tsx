import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

export function ComparisonScale({ step, lang, onWrong, onCorrect }: MechanicProps) {
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
      {/* Two comparative interactive figures */}
      <div className="flex flex-wrap items-center justify-center gap-8 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const isBig = opt.is_correct; // Typically correct is the requested bigger target

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.06, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all shadow-xl min-w-[200px]
                ${isWrong
                  ? 'opacity-35 bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed scale-95'
                  : done && opt.is_correct
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50 scale-110'
                  : 'bg-teal-50 border-teal-400 hover:bg-teal-100 text-teal-950 cursor-pointer'
                }`}
            >
              <span
                className={`select-none transition-all duration-300 ${
                  isBig ? 'text-7xl sm:text-8xl' : 'text-4xl sm:text-5xl opacity-80'
                }`}
              >
                🐘
              </span>
              <span className="mt-4 text-base sm:text-lg font-extrabold text-slate-800 text-center">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

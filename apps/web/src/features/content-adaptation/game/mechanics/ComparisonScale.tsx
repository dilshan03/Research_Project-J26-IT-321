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
    <div className="flex flex-col items-center gap-8 w-full max-w-xl">
      <div className="text-center px-4 py-3 rounded-2xl bg-teal-500/10 border border-teal-400/30">
        <p className="text-xl sm:text-2xl font-bold text-teal-200">
          {lang === 'si' ? step.instruction_si : step.instruction_en}
        </p>
      </div>

      {/* Two comparative interactive figures */}
      <div className="flex flex-wrap items-center justify-center gap-8 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const isBig = opt.is_correct; // Typically correct is the requested bigger target

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.08, y: -4 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all shadow-xl min-w-[160px]
                ${isWrong
                  ? 'opacity-30 bg-slate-900 border-slate-700 cursor-not-allowed scale-95'
                  : done && opt.is_correct
                  ? 'bg-emerald-500/30 border-emerald-400 ring-4 ring-emerald-400/40 scale-110'
                  : 'bg-teal-500/20 border-teal-400/60 hover:bg-teal-500/30 cursor-pointer'
                }`}
            >
              <span
                className={`select-none transition-all duration-300 ${
                  isBig ? 'text-7xl sm:text-8xl' : 'text-4xl sm:text-5xl opacity-80'
                }`}
              >
                🐘
              </span>
              <span className="mt-4 text-base sm:text-lg font-bold text-slate-100 text-center">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

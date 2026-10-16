import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const COLOR_ICONS: Record<string, { symbol: string; labelSi: string; labelEn: string; bg: string }> = {
  RED: { symbol: '🔴', labelSi: 'රතු', labelEn: 'Red', bg: 'bg-rose-500/20 border-rose-400' },
  BLUE: { symbol: '🔵', labelSi: 'නිල්', labelEn: 'Blue', bg: 'bg-blue-500/20 border-blue-400' },
  YELLOW: { symbol: '🟡', labelSi: 'කහ', labelEn: 'Yellow', bg: 'bg-amber-500/20 border-amber-400' },
  GREEN: { symbol: '🟢', labelSi: 'කොළ', labelEn: 'Green', bg: 'bg-emerald-500/20 border-emerald-400' },
};

export function PatternTrain({ step, lang, onWrong, onCorrect }: MechanicProps) {
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
      <div className="text-center px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-400/30">
        <p className="text-xl sm:text-2xl font-bold text-indigo-200">
          {lang === 'si' ? step.instruction_si : step.instruction_en}
        </p>
      </div>

      {/* Visual Train Sequence */}
      <div className="flex items-center justify-center gap-3 p-4 rounded-3xl bg-slate-900/60 border border-slate-700/60 shadow-inner">
        <span className="text-5xl select-none">🚂</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-3xl">
            🔴
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border-2 border-blue-400 text-3xl">
            🔵
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-3xl">
            🔴
          </div>
          {/* Mystery slot */}
          <motion.div
            animate={done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-dashed text-3xl transition-all
              ${done
                ? 'bg-emerald-500/30 border-emerald-400'
                : 'bg-amber-400/10 border-amber-400/60 animate-pulse'
              }`}
          >
            {done ? '🔵' : '?'}
          </motion.div>
        </div>
      </div>

      {/* Choice Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const colorKey = (opt.icon_or_shape || 'BLUE').toUpperCase();
          const colorMeta = COLOR_ICONS[colorKey] || COLOR_ICONS.BLUE;

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.05 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.95 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all shadow-md
                ${isWrong
                  ? 'opacity-30 bg-slate-900 border-slate-700 cursor-not-allowed'
                  : done && opt.is_correct
                  ? 'bg-emerald-500/30 border-emerald-400 ring-4 ring-emerald-400/40'
                  : `${colorMeta.bg} cursor-pointer`
                }`}
            >
              <span className="text-4xl select-none">{colorMeta.symbol}</span>
              <span className="text-lg font-bold text-slate-100">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

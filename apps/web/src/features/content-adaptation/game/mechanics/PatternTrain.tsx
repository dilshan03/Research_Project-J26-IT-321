import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const COLOR_ICONS: Record<string, { symbol: string; labelSi: string; labelEn: string; bg: string; border: string }> = {
  RED: { symbol: '🔴', labelSi: 'රතු', labelEn: 'Red', bg: 'bg-rose-50 hover:bg-rose-100 text-rose-950', border: 'border-rose-400' },
  BLUE: { symbol: '🔵', labelSi: 'නිල්', labelEn: 'Blue', bg: 'bg-blue-50 hover:bg-blue-100 text-blue-950', border: 'border-blue-400' },
  YELLOW: { symbol: '🟡', labelSi: 'කහ', labelEn: 'Yellow', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-950', border: 'border-amber-400' },
  GREEN: { symbol: '🟢', labelSi: 'කොළ', labelEn: 'Green', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950', border: 'border-emerald-400' },
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
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      {/* Visual Train Track & Sequence */}
      <div className="w-full flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-slate-900/80 border-2 border-slate-700/80 shadow-xl relative overflow-hidden">
        {/* Steam / Track ambiance */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap z-10">
          <motion.span 
            className="text-5xl sm:text-6xl select-none"
            animate={{ x: [0, -2, 2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🚂
          </motion.span>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Carriage 1 */}
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-3xl sm:text-4xl shadow-md">
              🔴
            </div>
            <div className="w-3 h-1 bg-slate-600 rounded-full" />

            {/* Carriage 2 */}
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 border-2 border-blue-400 text-3xl sm:text-4xl shadow-md">
              🔵
            </div>
            <div className="w-3 h-1 bg-slate-600 rounded-full" />

            {/* Carriage 3 */}
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-3xl sm:text-4xl shadow-md">
              🔴
            </div>
            <div className="w-3 h-1 bg-slate-600 rounded-full" />

            {/* Mystery slot carriage */}
            <motion.div
              animate={done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-dashed text-3xl sm:text-4xl transition-all shadow-md
                ${done
                  ? 'bg-emerald-500/30 border-emerald-400'
                  : 'bg-amber-400/20 border-amber-400 animate-pulse text-amber-300 font-bold'
                }`}
            >
              {done ? '🔵' : '?'}
            </motion.div>
          </div>
        </div>

        {/* Railway tracks */}
        <div className="w-full max-w-md h-2 bg-slate-700 rounded-full mt-4 flex justify-between px-4 items-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-amber-700/80 rounded-sm" />
          ))}
        </div>
      </div>

      {/* Choice Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 w-full">
        {step.game_options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const colorKey = (opt.icon_or_shape || 'BLUE').toUpperCase();
          const colorMeta = COLOR_ICONS[colorKey] || COLOR_ICONS.BLUE;

          return (
            <motion.button
              key={opt.text_en}
              whileHover={!isWrong && !done ? { scale: 1.04, y: -2 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.96 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex items-center justify-center gap-3 p-4 sm:p-5 rounded-2xl border-2 transition-all shadow-md
                ${isWrong
                  ? 'opacity-35 bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                  : done && opt.is_correct
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50 text-emerald-950'
                  : `${colorMeta.bg} ${colorMeta.border} cursor-pointer`
                }`}
            >
              <span className="text-3xl sm:text-4xl select-none">{colorMeta.symbol}</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-800">
                {lang === 'si' ? opt.text_si : opt.text_en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SHAKE, seededShuffle } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const COLOR_ICONS: Record<string, { symbol: string; labelSi: string; labelEn: string; bg: string; border: string; car: string }> = {
  RED: { symbol: '🔴', labelSi: 'රතු', labelEn: 'Red', bg: 'bg-rose-50 hover:bg-rose-100 text-rose-950', border: 'border-rose-400', car: 'bg-rose-500/20 border-rose-400' },
  BLUE: { symbol: '🔵', labelSi: 'නිල්', labelEn: 'Blue', bg: 'bg-blue-50 hover:bg-blue-100 text-blue-950', border: 'border-blue-400', car: 'bg-blue-500/20 border-blue-400' },
  YELLOW: { symbol: '🟡', labelSi: 'කහ', labelEn: 'Yellow', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-950', border: 'border-amber-400', car: 'bg-amber-500/20 border-amber-400' },
  GREEN: { symbol: '🟢', labelSi: 'කොළ', labelEn: 'Green', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950', border: 'border-emerald-400', car: 'bg-emerald-500/20 border-emerald-400' },
};

/** Used when the blueprint carries no `visual_props.sequence` (the current generator's default pattern). */
const DEFAULT_SEQUENCE = ['RED', 'BLUE', 'RED'];

const colorOf = (key: string | null | undefined) => COLOR_ICONS[(key || 'BLUE').toUpperCase()] || COLOR_ICONS.BLUE;

export function PatternTrain({ step, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const options = useMemo(() => seededShuffle(step.game_options, seed), [step.game_options, seed]);

  // NIE guides teach both colour/shape patterns and number patterns ("පොදු අන්තරය 2" = goes up by 2).
  const isNumber = step.visual_props?.kind === 'NUMBER';
  const sequence: (string | number)[] = Array.isArray(step.visual_props?.sequence) && step.visual_props.sequence.length
    ? step.visual_props.sequence
    : DEFAULT_SEQUENCE;
  const answer = step.game_options.find(o => o.is_correct);
  const numberCar = 'bg-sky-500/20 border-sky-400 text-white font-extrabold !text-2xl sm:!text-3xl';

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) {
      setDone(true);
      setTimeout(() => onCorrect(opt.text_en), 900);
    } else {
      setWrong(w => [...w, opt.text_en]);
      setShaking(opt.text_en);
      setTimeout(() => setShaking(null), 450);
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  const carClass = 'flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 text-3xl sm:text-4xl shadow-md';

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      {/* Visual Train Track & Sequence */}
      <div className="w-full flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-slate-900/80 border-2 border-slate-700/80 shadow-xl relative overflow-hidden">
        {/* Once complete, the whole train pulls forward: the pattern "works" */}
        <motion.div
          className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap z-10"
          animate={done && !calm ? { x: [0, 24, 0] } : { x: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <motion.span
            className="text-5xl sm:text-6xl select-none"
            animate={calm ? {} : { y: [0, -2, 0] }}
            transition={{ duration: done ? 0.3 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🚂
          </motion.span>

          <div className="flex items-center gap-2 sm:gap-3">
            {sequence.map((c, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  initial={calm ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`${carClass} ${isNumber ? numberCar : colorOf(String(c)).car}`}
                >
                  {isNumber ? c : colorOf(String(c)).symbol}
                </motion.div>
                <div className="w-3 h-1 bg-slate-600 rounded-full" />
              </div>
            ))}

            {/* Mystery slot carriage */}
            <motion.div
              animate={done ? { scale: calm ? 1 : [1, 1.2, 1] } : calm ? {} : { opacity: [0.6, 1, 0.6] }}
              transition={done ? { duration: 0.5 } : { duration: 1.6, repeat: Infinity }}
              className={`${carClass} border-dashed transition-colors
                ${done ? `${isNumber ? numberCar : colorOf(answer?.icon_or_shape).car} border-solid` : 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'}`}
            >
              {done ? (isNumber ? answer?.text_en : colorOf(answer?.icon_or_shape).symbol) : '?'}
            </motion.div>
          </div>
        </motion.div>

        {/* Railway tracks */}
        <div className="w-full max-w-md h-2 bg-slate-700 rounded-full mt-4 flex justify-between px-4 items-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-amber-700/80 rounded-sm" />
          ))}
        </div>
      </div>

      {/* Choice Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 w-full">
        {options.map((opt) => {
          const isWrong = wrong.includes(opt.text_en);
          const colorMeta = colorOf(opt.icon_or_shape);

          return (
            <motion.button
              key={opt.text_en}
              id={`pattern-${opt.text_en.toLowerCase()}`}
              animate={shaking === opt.text_en ? SHAKE : { opacity: isWrong ? 0.35 : 1 }}
              whileHover={!isWrong && !done ? { scale: 1.04, y: -2 } : {}}
              whileTap={!isWrong && !done ? { scale: 0.96 } : {}}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              className={`flex items-center justify-center gap-3 p-4 sm:p-5 rounded-2xl border-2 transition-colors shadow-md
                ${isWrong
                  ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                  : done && opt.is_correct
                  ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-400/50 text-emerald-950'
                  : isNumber
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-400 cursor-pointer'
                  : `${colorMeta.bg} ${colorMeta.border} cursor-pointer`
                }`}
            >
              {isNumber ? (
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{opt.text_en}</span>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl select-none">{colorMeta.symbol}</span>
                  <span className="text-base sm:text-lg font-extrabold text-slate-800">
                    {lang === 'si' ? opt.text_si : opt.text_en}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SHAKE, THEME_ITEM, seededShuffle } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

/**
 * COUNT: the objects are drawn in a tidy grid (rows of 5, like a ten-frame) and the learner
 * taps each one to count it. Tapped objects stay marked, so a distracted learner can pick up
 * where they left off instead of starting again. Then they pick how many there are.
 */
export function CountObjects({ step, theme, isMoney, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const n = Number(step.correct_target_value);
  const icon = isMoney ? '🪙' : THEME_ITEM[theme];
  const [tapped, setTapped] = useState<number[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const options = useMemo(() => seededShuffle(step.game_options, seed), [step.game_options, seed]);

  const tap = (i: number) => {
    if (!tapped.includes(i)) setTapped(t => [...t, i]);
  };

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) {
      setDone(true);
      setTimeout(() => onCorrect(opt.text_en), 700);
    } else {
      setWrong(w => [...w, opt.text_en]);
      setShaking(opt.text_en);
      setTimeout(() => setShaking(null), 450);
      setTapped([]); // fresh, gentle recount
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="grid grid-cols-5 gap-3 rounded-3xl bg-white/70 border-2 border-mq-border p-5" aria-label={lang === 'si' ? 'ගණන් කරන්න' : 'Objects to count'}>
        {Array.from({ length: n }).map((_, i) => {
          const order = tapped.indexOf(i);
          return (
            <motion.button
              key={i}
              id={`count-item-${i}`}
              onClick={() => tap(i)}
              initial={calm ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: calm ? 0 : i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
              whileTap={{ scale: 0.85 }}
              className={`relative w-14 h-14 rounded-2xl text-4xl leading-none flex items-center justify-center border-2 transition-colors
                ${order >= 0 ? 'bg-mq-accent-yellow/25 border-mq-accent-yellow' : 'bg-white border-transparent hover:border-mq-primary/40'}`}
              aria-label={order >= 0 ? String(order + 1) : icon}
            >
              {icon}
              {order >= 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mq-primary text-white text-xs font-extrabold flex items-center justify-center"
                >
                  {order + 1}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {options.map(opt => {
          const isWrong = wrong.includes(opt.text_en);
          const isRight = done && opt.is_correct;
          return (
            <motion.button
              key={opt.text_en}
              id={`count-answer-${opt.text_en}`}
              onClick={() => pick(opt)}
              disabled={isWrong || done}
              animate={shaking === opt.text_en ? SHAKE : { opacity: isWrong ? 0.35 : 1 }}
              whileHover={!isWrong && !done ? { y: -6, scale: 1.05 } : {}}
              whileTap={{ scale: 0.9 }}
              className={`w-24 h-24 rounded-full text-4xl font-extrabold shadow-lg border-4 transition-colors
                ${isRight ? 'bg-mq-success text-white border-white' : isWrong ? 'bg-mq-surface-soft text-mq-border border-transparent' : 'bg-white text-mq-text-strong border-mq-accent-yellow'}`}
            >
              {lang === 'si' ? opt.text_si : opt.text_en}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

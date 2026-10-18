import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LINES } from '../gameKit';
import type { MechanicProps } from './types';

/**
 * IDENTIFY_ENTITY: the problem sentence becomes tappable word tiles.
 * Learner taps the numbers; each one flies onto Gaja's slate.
 * After two misses the numbers start glowing (scaffolded hint).
 */
export function NumberHunt({ step, question, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const targets = (step.operands ?? []).map(String);
  const tokens = question.split(/\s+/).filter(Boolean);
  const [found, setFound] = useState<number[]>([]); // token indexes
  const [shake, setShake] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);

  const foundValues = found.map(i => tokens[i].replace(/\D/g, ''));

  const tap = (i: number) => {
    if (found.includes(i)) return;
    const digits = tokens[i].replace(/\D/g, '');
    const remaining = [...targets];
    foundValues.forEach(v => { const k = remaining.indexOf(v); if (k >= 0) remaining.splice(k, 1); });

    if (digits && remaining.includes(digits)) {
      const next = [...found, i];
      setFound(next);
      if (next.length === targets.length) setTimeout(() => onCorrect(step.correct_target_value), 500);
      return;
    }
    setShake(i);
    setTimeout(() => setShake(null), 450);
    setMisses(m => m + 1);
    onWrong(tokens[i], digits ? 'WORKING_MEMORY_OVERFLOW' : 'IMPULSIVITY', digits ? LINES.retry : LINES.notNumber);
  };

  const hint = misses >= 2;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-2xl" lang={lang}>
        {tokens.map((t, i) => {
          const isFound = found.includes(i);
          const isNum = /\d/.test(t);
          return (
            <motion.button
              key={i}
              id={`hunt-token-${i}`}
              onClick={() => tap(i)}
              disabled={isFound}
              animate={shake === i ? { x: [0, -8, 8, -6, 6, 0] }
                : hint && isNum && !isFound && !calm ? { scale: [1, 1.12, 1] } : {}}
              transition={shake === i ? { duration: 0.4 } : { duration: 1.2, repeat: Infinity }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.92 }}
              className={`${lang === 'si' ? 'sinhala' : 'font-semibold'} rounded-2xl px-4 py-2 text-xl md:text-2xl border-2 transition-colors
                ${isFound ? 'bg-mq-accent-yellow/30 border-mq-accent-yellow text-mq-text-muted line-through'
                  : hint && isNum ? 'bg-mq-accent-yellow/20 border-mq-accent-yellow text-mq-text-strong'
                  : 'bg-white border-mq-border text-mq-text-strong hover:border-mq-primary'}`}
            >
              {t}
            </motion.button>
          );
        })}
      </div>

      {/* Gaja's slate */}
      <div className="flex items-center gap-4 rounded-3xl bg-[#2F3B35] border-8 border-[#B9874F] px-8 py-5 min-w-64 justify-center shadow-xl">
        {targets.map((_, k) => (
          <div key={k} className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center">
            <AnimatePresence>
              {foundValues[k] && (
                <motion.span
                  initial={{ scale: 0, rotate: -30, y: -80 }}
                  animate={{ scale: 1, rotate: 0, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="text-4xl font-extrabold text-white"
                  style={{ fontFamily: 'Comic Sans MS, var(--font-lexend)' }}
                >
                  {foundValues[k]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <p className="text-sm text-mq-text-muted">{lang === 'si' ? `සොයාගත්: ${found.length} / ${targets.length}` : `Found: ${found.length} / ${targets.length}`}</p>
    </div>
  );
}

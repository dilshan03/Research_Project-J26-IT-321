import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LINES, isOver } from '../gameKit';
import { OP_SYMBOL, type MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

const EMPTY_TILT = -14; // left pan heavier when right pan is empty

/**
 * CALCULATE (larger numbers): a balance scale. The expression sits on the left pan;
 * the learner drags an answer weight onto the right pan. The beam tilts to show
 * "too heavy / too light", turning magnitude errors into visible feedback.
 */
export function BalanceScale({ step, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const panRef = useRef<HTMLDivElement>(null);
  const correct = Number(step.correct_target_value);
  const [onPan, setOnPan] = useState<GameChoiceOption | null>(null);
  const [tilt, setTilt] = useState(EMPTY_TILT);
  const [solved, setSolved] = useState(false);
  const [tried, setTried] = useState<string[]>([]);

  const operands = step.operands ?? [];
  const op = step.operation ? OP_SYMBOL[step.operation] : '?';
  const expression = operands.join(` ${op} `);

  const place = (opt: GameChoiceOption) => {
    if (solved || onPan) return;
    const value = opt.numeric_value ?? Number(opt.text_en);
    setOnPan(opt);
    const diff = (value - correct) / Math.max(correct, 1);
    const t = Math.max(-18, Math.min(18, diff * 30 || (value > correct ? 6 : value < correct ? -6 : 0)));
    setTilt(opt.is_correct ? 0 : t);

    if (opt.is_correct) {
      setSolved(true);
      setTimeout(() => onCorrect(opt.text_en), 900);
    } else {
      setTried(x => [...x, opt.text_en]);
      onWrong(opt.text_en, opt.distractor_type, value > correct ? LINES.heavy : LINES.light);
      setTimeout(() => { setOnPan(null); setTilt(EMPTY_TILT); }, 1600);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Scale */}
      <div className="relative w-full max-w-xl h-64">
        {/* Pillar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-4 h-48 rounded-full bg-gradient-to-b from-[#C9A26B] to-[#8E6233]" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-40 h-5 rounded-full bg-[#8E6233]" />
        {/* Beam */}
        <motion.div
          className="absolute left-[8%] right-[8%] top-12 h-3 rounded-full bg-[#8E6233] origin-center"
          animate={{ rotate: tilt }}
          // A settling wobble on success reads as "balanced!"; calm mode settles without overshoot.
          transition={{ type: 'spring', stiffness: 60, damping: calm ? 20 : solved ? 6 : 12 }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-7 h-7 rounded-full bg-mq-accent-yellow border-4 border-[#8E6233]" />
          {/* Left pan */}
          <motion.div className="absolute -left-10 top-2 flex flex-col items-center" animate={{ rotate: -tilt }}>
            <div className="w-0.5 h-12 bg-[#8E6233]" />
            <div className="w-36 h-20 rounded-b-full bg-white/90 border-4 border-[#B9874F] flex items-center justify-center shadow-md">
              <span className="text-2xl font-extrabold text-mq-text-strong whitespace-nowrap">{expression}</span>
            </div>
          </motion.div>
          {/* Right pan (drop zone) */}
          <motion.div className="absolute -right-10 top-2 flex flex-col items-center" animate={{ rotate: -tilt }}>
            <div className="w-0.5 h-12 bg-[#8E6233]" />
            <div ref={panRef}
              className={`w-36 h-20 rounded-b-full border-4 flex items-center justify-center shadow-md transition-colors
                ${solved ? 'bg-[var(--mq-success-bg)] border-mq-success' : 'bg-white/90 border-dashed border-mq-primary'}`}>
              {onPan
                ? <motion.span initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl font-extrabold text-mq-text-strong">{lang === 'si' ? onPan.text_si : onPan.text_en}</motion.span>
                : <span className="text-3xl font-bold text-mq-primary/50">?</span>}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Weights */}
      <div className="flex flex-wrap justify-center gap-5">
        {step.game_options.map(opt => {
          const used = onPan?.text_en === opt.text_en;
          const wasTried = tried.includes(opt.text_en);
          return used ? <div key={opt.text_en} className="w-24 h-24" /> : (
            <motion.button
              key={opt.text_en}
              id={`weight-${opt.text_en}`}
              drag={!solved && !onPan}
              dragSnapToOrigin
              whileDrag={{ scale: 1.15, zIndex: 50 }}
              whileHover={{ y: -5 }}
              onDragEnd={(_, info) => { if (isOver(panRef.current, info.point)) place(opt); }}
              onClick={() => place(opt)}
              disabled={solved}
              className={`relative w-24 h-24 touch-none cursor-grab active:cursor-grabbing ${wasTried ? 'opacity-50' : ''}`}
              aria-label={lang === 'si' ? `බර ${opt.text_si}` : `Weight ${opt.text_en}`}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-5 rounded-t-full border-4 border-b-0 border-[#5F7488]" />
              <div className="absolute bottom-0 inset-x-0 h-20 rounded-2xl bg-gradient-to-b from-[#8CA0B3] to-[#5F7488] shadow-lg flex items-center justify-center">
                <span className="text-3xl font-extrabold text-white">{lang === 'si' ? opt.text_si : opt.text_en}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

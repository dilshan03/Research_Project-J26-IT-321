import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { THEME_ITEM, isOver } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

function Group({ value, icon }: { value: number; icon: string }) {
  if (value <= 10) {
    return (
      <div className="grid grid-cols-5 gap-1 p-3 rounded-2xl bg-white/80 border border-mq-border min-w-28">
        {Array.from({ length: value }).map((_, i) => <span key={i} className="text-2xl leading-none text-center">{icon}</span>)}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-2xl bg-white/80 border border-mq-border">
      <span className="text-3xl">{icon}</span>
      <span className="text-3xl font-extrabold text-mq-text-strong">{value}</span>
    </div>
  );
}

/**
 * SELECT_OPERATOR: two quantity groups with a glowing gap between them.
 * Learner drags (or taps) an operator gem into the gap.
 */
export function OperatorDrop({ step, theme, isMoney, lang, calm, onWrong, onCorrect }: MechanicProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<GameChoiceOption | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const icon = isMoney ? '🪙' : THEME_ITEM[theme];
  const operands = step.operands ?? [];

  const tryPlace = (opt: GameChoiceOption) => {
    if (placed) return;
    if (opt.is_correct) {
      setPlaced(opt);
      setTimeout(() => onCorrect(opt.text_en), 600);
    } else {
      setRejected(opt.text_en);
      setTimeout(() => setRejected(null), 500);
      onWrong(opt.text_en, opt.distractor_type);
    }
  };

  const symbol = (o: GameChoiceOption) => o.text_en.match(/\((.)\)/)?.[1] ?? o.text_en;

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {operands.map((v, i) => (
          <div key={i} className="flex items-center gap-4">
            {i > 0 && (
              <div ref={i === 1 ? slotRef : undefined}
                className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-dashed transition-colors
                  ${placed ? 'border-mq-success bg-[var(--mq-success-bg)]' : 'border-mq-accent-purple bg-mq-accent-purple/10'}`}>
                {placed
                  ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl font-extrabold text-mq-success">{symbol(placed)}</motion.span>
                  : <motion.span animate={calm ? {} : { opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-4xl font-bold text-mq-accent-purple">?</motion.span>}
              </div>
            )}
            <Group value={v} icon={icon} />
          </div>
        ))}
      </div>

      {/* Treasure chest of operator gems */}
      <div className="rounded-3xl bg-gradient-to-b from-[#C68B4E] to-[#9C6634] p-1.5 shadow-xl">
        <div className="flex gap-4 rounded-[1.25rem] bg-[#5B3A1E]/90 px-6 py-5">
          {step.game_options.map(opt => (
            placed?.text_en === opt.text_en ? <div key={opt.text_en} className="w-20 h-20" /> : (
              <motion.button
                key={opt.text_en}
                id={`gem-${symbol(opt)}`}
                aria-label={lang === 'si' ? opt.text_si : opt.text_en}
                drag={!placed}
                dragSnapToOrigin
                whileDrag={{ scale: 1.2, zIndex: 50 }}
                whileHover={{ scale: 1.08, y: -4 }}
                animate={rejected === opt.text_en ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                onDragEnd={(_, info) => { if (isOver(slotRef.current, info.point)) tryPlace(opt); }}
                onClick={() => tryPlace(opt)}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-mq-accent-purple to-mq-info text-white text-4xl font-extrabold shadow-lg cursor-grab active:cursor-grabbing touch-none"
              >
                {symbol(opt)}
              </motion.button>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

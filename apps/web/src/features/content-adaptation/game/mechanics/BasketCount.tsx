import { useRef, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { LINES, THEME_ITEM, isOver } from '../gameKit';
import type { MechanicProps } from './types';
import type { GameChoiceOption } from '../../types';

type Place = 'ground' | 'basket' | 'away';
interface Item { id: string; place: Place; group: 0 | 1 }

/**
 * CALCULATE (small numbers): concrete manipulation, then count.
 *  ADD: drag both groups into the basket.
 *  SUB: basket starts full; drag the taken-away amount out to Gaja's plate.
 * Then pick how many are in the basket. No live counter, so the learner really counts.
 */
export function BasketCount({ step, theme, isMoney, lang, calm, onWrong, onCorrect, onSay }: MechanicProps) {
  const [a, b] = step.operands ?? [0, 0];
  const isSub = step.operation === 'SUB';
  const icon = isMoney ? '🪙' : THEME_ITEM[theme];
  const basketRef = useRef<HTMLDivElement>(null);
  const awayRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<Item[]>(() => isSub
    ? Array.from({ length: a }, (_, i) => ({ id: `i${i}`, place: 'basket' as Place, group: 0 as const }))
    : [
      ...Array.from({ length: a }, (_, i) => ({ id: `a${i}`, place: 'ground' as Place, group: 0 as const })),
      ...Array.from({ length: b }, (_, i) => ({ id: `b${i}`, place: 'ground' as Place, group: 1 as const })),
    ]);
  const [phase, setPhase] = useState<'build' | 'pick'>('build');
  const [wrong, setWrong] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const move = (id: string) => {
    if (phase !== 'build') return;
    const target: Place = isSub ? 'away' : 'basket';
    const next = items.map(it => (it.id === id ? { ...it, place: target } : it));
    setItems(next);
    const finished = isSub ? next.filter(i => i.place === 'away').length >= b : next.every(i => i.place === 'basket');
    if (finished) {
      setTimeout(() => { setPhase('pick'); onSay(LINES.pickCount); }, 500);
    }
  };

  const pick = (opt: GameChoiceOption) => {
    if (done || wrong.includes(opt.text_en)) return;
    if (opt.is_correct) { setDone(true); setTimeout(() => onCorrect(opt.text_en), 700); }
    else { setWrong(w => [...w, opt.text_en]); onWrong(opt.text_en, opt.distractor_type); }
  };

  const draggable = (it: Item) => phase === 'build' && (isSub ? it.place === 'basket' : it.place === 'ground');

  const renderItem = (it: Item) => (
    <motion.button
      key={it.id}
      layoutId={it.id}
      id={`item-${it.id}`}
      drag={draggable(it)}
      dragSnapToOrigin
      whileDrag={{ scale: 1.4, zIndex: 50 }}
      whileHover={draggable(it) ? { scale: 1.15 } : {}}
      onDragEnd={(_, info) => {
        const zone = isSub ? awayRef.current : basketRef.current;
        if (isOver(zone, info.point)) move(it.id);
      }}
      onClick={() => draggable(it) && move(it.id)}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`text-4xl leading-none select-none touch-none ${draggable(it) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${it.group === 1 ? 'drop-shadow-[0_0_6px_rgba(141,108,231,0.8)]' : ''}`}
      aria-label={icon}
    >
      {icon}
    </motion.button>
  );

  const inBasket = items.filter(i => i.place === 'basket');

  return (
    <LayoutGroup>
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="flex flex-wrap items-end justify-center gap-8 w-full">
          {/* Ground (ADD) */}
          {!isSub && (
            <div className="flex gap-6">
              {[0, 1].map(g => (
                <div key={g} className="min-w-32 min-h-24 rounded-3xl bg-white/60 border-2 border-dashed border-mq-border p-3 flex flex-wrap gap-2 justify-center content-center">
                  {items.filter(i => i.place === 'ground' && i.group === g).map(renderItem)}
                </div>
              ))}
            </div>
          )}

          {/* Basket */}
          <motion.div
            ref={basketRef}
            animate={phase === 'pick' && !calm ? { scale: [1, 1.04, 1] } : {}}
            className="relative w-72 min-h-48 rounded-b-[4rem] rounded-t-2xl bg-gradient-to-b from-[#E5B66F] to-[#B9874F] border-4 border-[#8E6233] p-4 pt-6 shadow-xl"
          >
            <div className="absolute -top-3 left-6 right-6 h-6 rounded-full bg-[#8E6233]" />
            <div className="flex flex-wrap gap-2 justify-center content-start">
              {inBasket.map(renderItem)}
            </div>
          </motion.div>

          {/* Gaja's plate (SUB) */}
          {isSub && (
            <div ref={awayRef} className="w-48 min-h-32 rounded-full bg-white/80 border-4 border-dashed border-mq-accent-pink p-4 flex flex-wrap gap-2 justify-center content-center">
              {items.filter(i => i.place === 'away').map(renderItem)}
              {items.every(i => i.place !== 'away') && <span className={`text-mq-text-muted text-sm text-center ${lang === 'si' ? 'sinhala' : ''}`}>{lang === 'si' ? `මෙතනට ${b}ක් දමන්න` : `Put ${b} here`}</span>}
            </div>
          )}
        </div>

        {phase === 'pick' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center gap-4">
            {step.game_options.map(opt => {
              const isWrong = wrong.includes(opt.text_en);
              const isRight = done && opt.is_correct;
              return (
                <motion.button
                  key={opt.text_en}
                  id={`count-${opt.text_en}`}
                  onClick={() => pick(opt)}
                  disabled={isWrong || done}
                  whileHover={{ y: -6, scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-24 h-24 rounded-full text-4xl font-extrabold shadow-lg border-4 transition-colors
                    ${isRight ? 'bg-mq-success text-white border-white' : isWrong ? 'bg-mq-surface-soft text-mq-border border-transparent' : 'bg-white text-mq-text-strong border-mq-accent-yellow'}`}
                >
                  {lang === 'si' ? opt.text_si : opt.text_en}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}

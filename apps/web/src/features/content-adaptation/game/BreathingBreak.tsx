import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GAJA, type Lang } from './gameKit';

const CYCLE_MS = 8000; // 4s in, 4s out

/** Calm-down overlay shown after repeated wrong answers. Skippable after one full breath. */
export function BreathingBreak({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPhase(p => {
        if (p === 'out') setCycles(c => c + 1);
        return p === 'in' ? 'out' : 'in';
      });
    }, CYCLE_MS / 2);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (cycles >= 3) onDone(); }, [cycles, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-mq-surface-blue/95 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="relative flex items-center justify-center w-80 h-80">
        <motion.div
          className="absolute inset-0 rounded-full bg-mq-secondary/30"
          animate={{ scale: phase === 'in' ? 1.15 : 0.7 }}
          transition={{ duration: CYCLE_MS / 2000, ease: 'easeInOut' }}
        />
        <img src={GAJA.encourage} alt="" className="relative w-52 h-52 rounded-full object-cover ring-8 ring-white shadow-xl" />
      </div>
      <p className={`mt-8 text-3xl font-extrabold text-mq-text-strong ${lang === 'si' ? 'sinhala' : ''}`}>
        {phase === 'in'
          ? (lang === 'si' ? 'හෙමින් හුස්ම ගන්න...' : 'Breathe in slowly...')
          : (lang === 'si' ? 'හෙමින් හුස්ම පිට කරන්න...' : 'Breathe out slowly...')}
      </p>
      <div className="flex gap-2 mt-4" aria-label="Breaths completed">
        {[0, 1, 2].map(i => <span key={i} className={`w-3 h-3 rounded-full ${i < cycles ? 'bg-mq-secondary' : 'bg-mq-border'}`} />)}
      </div>
      <button id="break-ready" disabled={cycles < 1} onClick={onDone}
        className="btn btn-primary mt-8 text-lg px-8 disabled:opacity-40 disabled:cursor-not-allowed">
        {lang === 'si' ? 'මම සූදානම්!' : "I'm ready!"}
      </button>
    </motion.div>
  );
}

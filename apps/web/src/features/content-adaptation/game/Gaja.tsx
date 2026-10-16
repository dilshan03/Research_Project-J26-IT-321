import { AnimatePresence, motion } from 'framer-motion';
import { GAJA, type Lang, type Line, type Mood } from './gameKit';

/** Companion character with mood-based pose and a speech bubble. */
export function Gaja({ mood, line, lang, calm, size = 'md' }: {
  mood: Mood; line?: Line | null; lang: Lang; calm: boolean; size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-64 h-64 md:w-80 md:h-80' : 'w-36 h-36 md:w-44 md:h-44';
  return (
    <div className="flex items-end gap-2">
      <motion.div
        className={`${dim} shrink-0 rounded-full overflow-hidden bg-[#FFF8EC] ring-4 ring-white shadow-xl`}
        animate={calm ? {} : mood === 'celebrate' ? { y: [0, -18, 0] } : { y: [0, -6, 0] }}
        transition={{ duration: mood === 'celebrate' ? 0.6 : 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={mood}
            src={GAJA[mood]}
            alt="Gaja the elephant"
            className="w-full h-full object-cover scale-110"
            initial={{ opacity: 0, scale: 1.0 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>
      </motion.div>
      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={line.en}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative mb-10 max-w-xs rounded-3xl rounded-bl-md bg-white px-5 py-3 shadow-lg border border-mq-border"
          >
            <p className={`font-semibold text-mq-text-strong ${lang === 'si' ? 'sinhala text-lg' : 'text-base'}`}>{line[lang]}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

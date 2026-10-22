import { motion } from 'framer-motion';

const PARTICLES = ['⭐', '✨', '🌟', '⭐', '✨', '🌟', '⭐', '✨'];

/**
 * One short star burst when a step is solved. Kept brief (under a second) and
 * sparse so it rewards without overstimulating; calm mode skips it entirely.
 */
export function Celebration({ calm }: { calm: boolean }) {
  if (calm) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center" aria-hidden>
      {PARTICLES.map((p, i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2;
        const dist = 140 + (i % 2) * 50;
        return (
          <motion.span
            key={i}
            className="absolute text-3xl"
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: [0.3, 1.2, 0.8], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {p}
          </motion.span>
        );
      })}
    </div>
  );
}

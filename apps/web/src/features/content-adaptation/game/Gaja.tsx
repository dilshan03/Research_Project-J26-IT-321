import { AnimatePresence, motion } from 'framer-motion';
import { GAJA, type Lang, type Line, type Mood } from './gameKit';
import {
  type CompanionConfig,
  type AuraOption,
  AURA_OPTIONS,
  DEFAULT_COMPANION_CONFIG,
} from './companionTypes';

interface GajaProps {
  mood: Mood;
  line?: Line | null;
  /** Changes on every utterance so a repeated line still re-animates the bubble. */
  lineKey?: number;
  lang: Lang;
  calm: boolean;
  size?: 'md' | 'lg';
  companionConfig?: CompanionConfig;
}

/** Layered Accessories Icons and SVGs */
const HEADWEAR_ICONS: Record<string, string> = {
  crown: '👑',
  explorer: '🤠',
  helmet: '👨‍🚀',
  flower: '🌸',
  scholar: '🎓',
  wizard: '🧙',
};

const EYEWEAR_ICONS: Record<string, string> = {
  shades: '🕶️',
  star_glasses: '⭐',
  round_specs: '👓',
};

const OUTFIT_ICONS: Record<string, string> = {
  sarong: '🧣',
  vest: '🦺',
  cape: '🦸',
  suit: '🚀',
};

/** Mascots Fallback / Styled Archetypes */
const ARCHETYPE_EMOJI: Record<string, string> = {
  gaja: '🐘',
  kalu: '🐵',
  singha: '🦁',
  chuti: '🐰',
};

/** Customizable Companion character with Layered Visual Compositor & mood-based pose */
export function Gaja({
  mood,
  line,
  lineKey = 0,
  lang,
  calm,
  size = 'md',
  companionConfig = DEFAULT_COMPANION_CONFIG,
}: GajaProps) {
  const isLg = size === 'lg';
  const dim = isLg ? 'w-60 h-60 md:w-72 md:h-72' : 'w-36 h-36 md:w-44 md:h-44';
  const aura = AURA_OPTIONS.find((a: AuraOption) => a.id === companionConfig.aura) || AURA_OPTIONS[0];
  const celebrating = mood === 'celebrate' && !calm;

  // Celebrate is a short burst (3 hops) that settles, not an endless frantic loop;
  // otherwise a slow idle float. Calm mode stays still.
  const bounceVariants = calm
    ? { y: 0, scale: 1 }
    : celebrating
    ? { y: [0, -20, 0], scale: [1, 1.04, 1] }
    : { y: [0, -6, 0], scale: 1 };

  const bounceTransition = celebrating
    ? { duration: 0.6, repeat: 2, ease: 'easeInOut' as const }
    : { duration: 3, repeat: Infinity, ease: 'easeInOut' as const };

  const accessoryTransition = { duration: 0.6, repeat: 2 };

  const isBaseElephant = companionConfig.archetype === 'gaja';

  return (
    <div className="flex items-end gap-3 select-none">
      {/* Companion Avatar Compositor Stage */}
      <motion.div
        className={`relative ${dim} shrink-0 rounded-full flex items-center justify-center`}
        animate={bounceVariants}
        transition={bounceTransition}
      >
        {/* Layer 1: Glowing Animated Aura Ring */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 ${isLg ? '35px 8px' : '22px 5px'} ${aura.glow}`,
            border: `3px solid ${aura.hex}`,
          }}
          animate={calm ? {} : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }}
        />

        {/* Layer 2: Base Mascot Portrait */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-[#FFF8EC] ring-4 ring-white shadow-xl flex items-center justify-center">
          {isBaseElephant ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={mood}
                src={GAJA[mood]}
                alt="Companion mascot"
                className="w-full h-full object-cover scale-110"
                initial={{ opacity: 0, scale: 1.0 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-amber-100 to-amber-200">
              <span className={isLg ? 'text-8xl' : 'text-5xl'}>
                {ARCHETYPE_EMOJI[companionConfig.archetype] || '🐘'}
              </span>
              <span className="text-[11px] font-extrabold text-amber-900 mt-1 uppercase tracking-wider">
                {mood === 'celebrate' ? '🎉 HOORAY!' : mood === 'thinking' ? '🤔 HMM...' : '🌟 READY'}
              </span>
            </div>
          )}

          {/* Layer 3: Layered Outfit Overlay (Chest / Body) */}
          {companionConfig.outfit !== 'none' && (
            <motion.div
              className={`absolute bottom-1 z-10 flex items-center justify-center drop-shadow-md ${
                isLg ? 'text-5xl' : 'text-3xl'
              }`}
              animate={celebrating ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={accessoryTransition}
            >
              <span>{OUTFIT_ICONS[companionConfig.outfit]}</span>
            </motion.div>
          )}

          {/* Layer 4: Layered Eyewear Overlay (Eyes) */}
          {companionConfig.eyewear !== 'none' && (
            <motion.div
              className={`absolute z-20 flex items-center justify-center pointer-events-none drop-shadow-md ${
                isLg ? 'top-16 text-5xl' : 'top-9 text-3xl'
              }`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
              animate={celebrating ? { rotate: [0, -5, 5, 0] } : { rotate: 0 }}
              transition={accessoryTransition}
            >
              <span>{EYEWEAR_ICONS[companionConfig.eyewear]}</span>
            </motion.div>
          )}
        </div>

        {/* Layer 5: Layered Headwear Overlay (Floating Above Head) */}
        {companionConfig.headwear !== 'none' && (
          <motion.div
            className={`absolute z-30 pointer-events-none drop-shadow-xl ${
              isLg ? '-top-10 text-6xl' : '-top-6 text-4xl'
            }`}
            animate={
              calm
                ? { y: 0, rotate: 0 }
                : celebrating
                ? { y: [0, -8, 0], rotate: [0, -8, 8, 0] }
                : { y: [0, -2, 0], rotate: 0 }
            }
            transition={
              celebrating
                ? { ...accessoryTransition, ease: 'easeInOut' }
                : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <span>{HEADWEAR_ICONS[companionConfig.headwear]}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Speech Bubble with Custom Companion Nickname */}
      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={`${lineKey}-${lang}`}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative mb-10 max-w-xs rounded-3xl rounded-bl-md bg-white px-5 py-3 shadow-lg border border-mq-border"
          >
            {/* Custom Name Badge */}
            <span
              className="inline-block px-2 py-0.5 mb-1 text-[10px] font-black rounded-md text-white shadow-xs"
              style={{ backgroundColor: aura.hex }}
            >
              {companionConfig.nickname}
            </span>
            <p
              className={`font-semibold text-mq-text-strong ${
                lang === 'si' ? 'sinhala text-lg' : 'text-base'
              }`}
            >
              {line[lang]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

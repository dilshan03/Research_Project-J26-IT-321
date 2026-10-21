import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAJA, type Mood } from '../../content-adaptation/game/gameKit';
import { AgentSpeechBubble } from './AgentSpeechBubble';
import { useAgentStore } from '../store/useAgentStore';

interface GajaAvatarProps {
  mood?: Mood;
  calm?: boolean;
  showSpeechBubble?: boolean;
}

export function GajaAvatar({
  mood,
  calm = false,
  showSpeechBubble = true,
}: GajaAvatarProps) {
  const currentAction = useAgentStore((state) => state.currentAction);

  // Map pedagogical agent action to Gaja's facial mood expressions
  const derivedMood: Mood = useMemo(() => {
    if (mood) return mood;
    if (currentAction === 'correctCelebrate' || currentAction === 'clap') {
      return 'celebrate';
    }
    if (currentAction === 'tryAgain' || currentAction === 'encourage') {
      return 'encourage';
    }
    if (
      currentAction === 'thinking' ||
      currentAction === 'smallHint' ||
      currentAction === 'guidedHint' ||
      currentAction === 'stepByStep' ||
      currentAction === 'explain' ||
      currentAction === 'pointLeft' ||
      currentAction === 'pointRight'
    ) {
      return 'thinking';
    }
    return 'happy';
  }, [mood, currentAction]);

  const celebrating = derivedMood === 'celebrate' && !calm;

  const bounceVariants = calm
    ? { y: 0, scale: 1 }
    : celebrating
    ? { y: [0, -14, 0], scale: [1, 1.05, 1] }
    : { y: [0, -4, 0], scale: 1 };

  const bounceTransition = celebrating
    ? { duration: 0.6, repeat: 3, ease: 'easeInOut' as const }
    : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-end overflow-hidden select-none pb-2">
      {/* 2D Speech Bubble Cloud Overlay */}
      {showSpeechBubble && (
        <div className="absolute top-1 left-2 right-2 z-20 pointer-events-auto">
          <AgentSpeechBubble />
        </div>
      )}

      {/* Gaja the Elephant Stage */}
      <motion.div
        className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
        animate={bounceVariants}
        transition={bounceTransition}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          useAgentStore.getState().playAction('wave', {
            message: 'මම ඔයාගේ මිතුරා ගජා! මම ඔයාට ගණිතය කියලා දෙන්න සූදානම්.',
            duration: 3.5,
          });
        }}
        title="ගජා අලි පැටියා (Gaja the Elephant)"
      >
        {/* Glowing Animated Aura Ring */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: '0 0 25px 5px rgba(245, 158, 11, 0.45)',
            border: '3px solid #F59E0B',
          }}
          animate={calm ? {} : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }}
        />

        {/* Base Mascot Portrait */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-[#FFF8EC] ring-4 ring-white shadow-xl flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={derivedMood}
              src={GAJA[derivedMood]}
              alt="Gaja the Elephant Mascot"
              className="w-full h-full object-cover scale-110"
              initial={{ opacity: 0, scale: 1.0 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>

          {/* Cheerful Name Tag Badge */}
          <div className="absolute bottom-1 z-10 bg-amber-500/90 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide shadow-xs border border-white/50">
            🐘 ගජා (Gaja)
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default GajaAvatar;

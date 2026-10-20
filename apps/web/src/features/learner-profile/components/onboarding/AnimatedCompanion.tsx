import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import {
  Sparkles,
  Lightbulb,
  Heart,
  ThumbsUp,
  Hand,
  CheckCircle2,
} from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types';

export type CompanionState =
  | 'welcome'
  | 'idle'
  | 'encouragement'
  | 'hint'
  | 'success'
  | 'goodbye';

export interface AnimatedCompanionProps {
  state?: CompanionState;
  avatarId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSpeechBubble?: boolean;
  customSpeech?: { si: string; en: string };
  riveFile?: string; // Slot ready for future .riv files
  className?: string;
  onAnimationComplete?: () => void;
}

// Default ADHD-friendly supportive messages for each state
const STATE_MESSAGES: Record<CompanionState, { si: string; en: string }> = {
  welcome: {
    si: 'ආයුබෝවන් යාළුවේ! අපි එකතු වී විනෝදයෙන් ගණිතය සොයා යමු!',
    en: "Hello friend! Let's explore math adventures together!",
  },
  idle: {
    si: 'ඔබේම වේගයෙන් සිතන්න. කිසිදු කලබලයක් නැත!',
    en: 'Take all the time you need. No rush at all!',
  },
  encouragement: {
    si: 'ඔබ ඉතා හොඳින් කරගෙන යනවා! දිගටම උත්සාහ කරන්න!',
    en: "You are doing great! Keep going, you've got this!",
  },
  hint: {
    si: 'මෙන්න ඔබට උපකාරී වන කුඩා ඉඟියක්. සෙමෙන් බලන්න!',
    en: "Here is a gentle hint to guide you. Take a peek!",
  },
  success: {
    si: 'විශිෂ්ටයි! ඔබ එය ඉතා ලස්සනට කළා!',
    en: 'Awesome work! You did a fantastic job!',
  },
  goodbye: {
    si: 'නියමයි! අද දින ඔබේ ගණිත චාරිකාව සාර්ථකව අවසන් කළා!',
    en: 'Wonderful! You successfully completed your math quest today!',
  },
};

// State-specific badge icons & colors
const STATE_BADGES: Record<
  CompanionState,
  { icon: React.ReactNode; labelSi: string; labelEn: string; bg: string; text: string; border: string }
> = {
  welcome: {
    icon: <Hand size={14} className="text-mq-primary" />,
    labelSi: 'ආයුබෝවන්',
    labelEn: 'Welcome',
    bg: 'bg-mq-surface-blue',
    text: 'text-mq-primary',
    border: 'border-mq-primary/30',
  },
  idle: {
    icon: <Heart size={14} className="text-mq-secondary" />,
    labelSi: 'සන්සුන්ව',
    labelEn: 'Calm & Ready',
    bg: 'bg-mq-surface-soft',
    text: 'text-mq-text-muted',
    border: 'border-mq-border',
  },
  encouragement: {
    icon: <ThumbsUp size={14} className="text-mq-primary" />,
    labelSi: 'දිරිගැන්වීම',
    labelEn: 'Encouraging',
    bg: 'bg-mq-surface-blue',
    text: 'text-mq-primary',
    border: 'border-mq-primary/30',
  },
  hint: {
    icon: <Lightbulb size={14} className="text-mq-warning" />,
    labelSi: 'ඉඟියක්',
    labelEn: 'Helpful Clue',
    bg: 'bg-mq-surface-yellow',
    text: 'text-mq-warning',
    border: 'border-mq-warning/40',
  },
  success: {
    icon: <CheckCircle2 size={14} className="text-mq-success" />,
    labelSi: 'ජයග්‍රාහීයි',
    labelEn: 'Well Done',
    bg: 'bg-mq-surface-green',
    text: 'text-mq-success',
    border: 'border-mq-success/40',
  },
  goodbye: {
    icon: <Sparkles size={14} className="text-mq-secondary" />,
    labelSi: 'සමුගැනීම',
    labelEn: 'Farewell',
    bg: 'bg-mq-surface-soft',
    text: 'text-mq-secondary',
    border: 'border-mq-border',
  },
};

const SIZE_CONFIGS = {
  sm: {
    container: 'w-12 h-12',
    avatarText: 'text-2xl',
    badgeSize: 'w-5 h-5 -bottom-1 -right-1',
    bubbleWidth: 'max-w-xs text-xs',
  },
  md: {
    container: 'w-16 h-16',
    avatarText: 'text-3xl',
    badgeSize: 'w-6 h-6 -bottom-1 -right-1',
    bubbleWidth: 'max-w-sm text-xs',
  },
  lg: {
    container: 'w-24 h-24 sm:w-28 sm:h-28',
    avatarText: 'text-5xl sm:text-6xl',
    badgeSize: 'w-8 h-8 -bottom-1 -right-1',
    bubbleWidth: 'max-w-md text-sm',
  },
  xl: {
    container: 'w-28 h-28 sm:w-36 sm:h-36',
    avatarText: 'text-6xl sm:text-7xl',
    badgeSize: 'w-10 h-10 -bottom-1.5 -right-1.5',
    bubbleWidth: 'max-w-lg text-sm',
  },
};

export const AnimatedCompanion: React.FC<AnimatedCompanionProps> = ({
  state = 'idle',
  avatarId,
  size = 'md',
  showSpeechBubble = false,
  customSpeech,
  riveFile,
  className = '',
  onAnimationComplete,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [riveLoadFailed, setRiveLoadFailed] = useState(false);

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];

  const sizeCfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const badge = STATE_BADGES[state] || STATE_BADGES.idle;
  const speech = customSpeech || STATE_MESSAGES[state] || STATE_MESSAGES.idle;

  // Track animation finish
  useEffect(() => {
    if (state === 'success' || state === 'encouragement') {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [state, onAnimationComplete]);

  // Motion animation variants for ADHD-friendly calm expression
  // None of these use jarring flashing or constant fast bouncing.
  const companionVariants: Variants = {
    welcome: {
      rotate: shouldReduceMotion ? 0 : [0, -3, 3, -2, 0],
      y: shouldReduceMotion ? 0 : [0, -4, 0],
      transition: { duration: 0.6, ease: 'easeOut' },
    },
    idle: {
      y: shouldReduceMotion ? 0 : [0, -2, 0],
      scale: shouldReduceMotion ? 1 : [1, 1.015, 1],
      transition: {
        duration: 3.5,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      },
    },
    encouragement: {
      scale: shouldReduceMotion ? 1 : [1, 1.06, 1],
      y: shouldReduceMotion ? 0 : [0, -5, 0],
      transition: { duration: 0.45, ease: 'easeOut' },
    },
    hint: {
      rotate: shouldReduceMotion ? 0 : [0, 4, -4, 0],
      scale: shouldReduceMotion ? 1 : [1, 1.03, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    success: {
      y: shouldReduceMotion ? 0 : [0, -8, 0],
      scale: shouldReduceMotion ? 1 : [1, 1.08, 1],
      transition: { duration: 0.55, ease: 'easeOut' },
    },
    goodbye: {
      rotate: shouldReduceMotion ? 0 : [0, 3, -3, 0],
      y: shouldReduceMotion ? 0 : [0, -3, 0],
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  // Optional speech bubble entrance
  const speechVariants: Variants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4, transition: { duration: 0.2 } },
  };

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      data-testid="animated-companion"
      data-companion-state={state}
    >
      {/* Companion Visual Body */}
      <div className="relative shrink-0">
        <motion.div
          variants={companionVariants}
          animate={state}
          className={`${sizeCfg.container} rounded-3xl flex items-center justify-center ${sizeCfg.avatarText} shadow-xs border-2 ${avatar.bgColor} ${avatar.borderColor} transition-shadow`}
          aria-label={`${avatar.name} (${avatar.nameSi}) - State: ${state}`}
        >
          {/* Slot for future Rive file: if provided and not failed, can render Rive Canvas */}
          {riveFile && !riveLoadFailed ? (
            <div className="w-full h-full relative overflow-hidden rounded-2xl">
              {/* Fallback to emoji avatar if canvas fails or asset is pending */}
              <span
                onError={() => setRiveLoadFailed(true)}
                className="select-none"
              >
                {avatar.icon}
              </span>
            </div>
          ) : (
            <span className="select-none filter drop-shadow-xs">{avatar.icon}</span>
          )}
        </motion.div>

        {/* Emotion / State Accent Indicator */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          key={state}
          className={`absolute ${sizeCfg.badgeSize} rounded-full flex items-center justify-center border shadow-xs ${badge.bg} ${badge.border}`}
          title={`${badge.labelEn} (${badge.labelSi})`}
        >
          {badge.icon}
        </motion.div>
      </div>

      {/* Companion Supportive Speech Bubble */}
      {showSpeechBubble && (
        <motion.div
          variants={speechVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          key={state}
          className={`relative bg-white border border-mq-border rounded-2xl p-3 sm:p-3.5 shadow-xs ${sizeCfg.bubbleWidth} text-left`}
        >
          {/* Bubble Pointer Tail */}
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white z-10" />
          <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[9px] border-r-mq-border z-0" />

          {/* Bilingual Message Content */}
          <div className="space-y-0.5">
            <p className="font-sinhala font-bold text-mq-text-strong text-xs sm:text-sm leading-snug">
              {speech.si}
            </p>
            <p className="text-[11px] sm:text-xs text-mq-text-muted font-medium leading-tight">
              {speech.en}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnimatedCompanion;

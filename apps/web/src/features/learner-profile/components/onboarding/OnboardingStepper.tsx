import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Stethoscope,
  Compass,
  ClipboardList,
  HeartHandshake,
  UserCheck,
  Sparkles,
  Award,
  Check,
  type LucideIcon,
} from 'lucide-react';
import type { OnboardingStepKey } from '../../types/onboarding';

interface StepperProps {
  currentStep: OnboardingStepKey;
  completedSteps: string[];
  onSelectStep?: (step: OnboardingStepKey) => void;
}

interface StepItem {
  key: OnboardingStepKey;
  labelEn: string;
  labelSi: string;
  icon: LucideIcon;
  isParentStage: boolean;
}

const STEPS: StepItem[] = [
  {
    key: 'adhd_information',
    labelEn: 'ADHD Info',
    labelSi: 'ADHD තොරතුරු',
    icon: Stethoscope,
    isParentStage: true,
  },
  {
    key: 'snap_iv',
    labelEn: 'SNAP-IV',
    labelSi: 'විකල්ප ප්‍රශ්නාවලිය',
    icon: ClipboardList,
    isParentStage: true,
  },
  {
    key: 'preferences',
    labelEn: 'Preferences',
    labelSi: 'ඉගෙනුම් මනාප',
    icon: Compass,
    isParentStage: true,
  },
  {
    key: 'social_context',
    labelEn: 'Social Context',
    labelSi: 'ඉගෙනුම් පසුබිම',
    icon: HeartHandshake,
    isParentStage: true,
  },
  {
    key: 'handover',
    labelEn: 'Handover',
    labelSi: 'දරුවාට භාරදීම',
    icon: UserCheck,
    isParentStage: false,
  },
  {
    key: 'math_assessment',
    labelEn: 'Living Canvas',
    labelSi: 'පුංචි ලෝකය',
    icon: Sparkles,
    isParentStage: false,
  },
  {
    key: 'summary',
    labelEn: 'Profile Summary',
    labelSi: 'පැතිකඩ සාරාංශය',
    icon: Award,
    isParentStage: false,
  },
];

export const OnboardingStepper: React.FC<StepperProps> = ({
  currentStep,
  completedSteps,
  onSelectStep,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full bg-white rounded-3xl border border-mq-border p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.key) || idx < currentIdx;
          const isCurrent = step.key === currentStep;
          const isClickable = Boolean(onSelectStep && isCompleted);

          return (
            <div
              key={step.key}
              className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-[70px] sm:min-w-0 flex-1"
            >
              <div
                onClick={() => {
                  if (onSelectStep && isCompleted) {
                    onSelectStep(step.key);
                  }
                }}
                className={`flex flex-col items-center text-center w-full ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
              >
                {/* Step Circle */}
                <motion.div
                  animate={{
                    scale: shouldReduceMotion ? 1 : isCurrent ? 1.05 : 1,
                  }}
                  whileTap={isClickable && !shouldReduceMotion ? { scale: 0.95 } : undefined}
                  transition={{ duration: 0.25 }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-colors ${
                    isCompleted
                      ? 'bg-mq-success text-white'
                      : isCurrent
                      ? 'bg-mq-primary text-white ring-4 ring-mq-primary/20'
                      : 'bg-mq-surface-soft text-mq-text-muted border border-mq-border'
                  }`}
                  title={`${step.labelEn} (${step.labelSi})`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                </motion.div>

                {/* Step Labels */}
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1.5 line-clamp-1 transition-colors ${
                    isCurrent
                      ? 'text-mq-primary'
                      : isCompleted
                      ? 'text-mq-text-strong'
                      : 'text-mq-text-muted'
                  }`}
                >
                  {step.labelEn}
                </span>
                <span className="text-[9px] text-mq-text-muted hidden md:inline truncate max-w-[90px] font-sinhala">
                  {step.labelSi}
                </span>
              </div>

              {/* Animated Connector Bar */}
              {idx < STEPS.length - 1 && (
                <div className="hidden sm:block h-[3px] flex-1 bg-mq-border rounded-full -mt-5 overflow-hidden">
                  <motion.div
                    className="h-full bg-mq-success rounded-full"
                    initial={false}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.3,
                      ease: 'easeOut',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


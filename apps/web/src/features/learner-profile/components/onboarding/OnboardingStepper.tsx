import React from 'react';
import {
  Compass,
  ClipboardList,
  HeartHandshake,
  UserCheck,
  Calculator,
  Award,
  Check,
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
  icon: React.ElementType;
  isParentStage: boolean;
}

const STEPS: StepItem[] = [
  {
    key: 'preferences',
    labelEn: 'Preferences',
    labelSi: 'ඉගෙනුම් මනාප',
    icon: Compass,
    isParentStage: true,
  },
  {
    key: 'snap_iv',
    labelEn: 'SNAP-IV',
    labelSi: 'දෙමාපිය ඇගයීම',
    icon: ClipboardList,
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
    labelEn: 'Math Tasks',
    labelSi: 'ගණිත අභ්‍යාස',
    icon: Calculator,
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
}) => {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full bg-white rounded-3xl border border-mq-border p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.key) || idx < currentIdx;
          const isCurrent = step.key === currentStep;

          return (
            <div
              key={step.key}
              className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-[70px] sm:min-w-0 flex-1"
            >
              <div className="flex flex-col items-center text-center w-full">
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-mq-success text-white'
                      : isCurrent
                      ? 'bg-mq-primary text-white ring-4 ring-mq-primary/20 scale-105'
                      : 'bg-mq-surface-soft text-mq-text-muted border border-mq-border'
                  }`}
                  title={`${step.labelEn} (${step.labelSi})`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                </div>

                {/* Step Labels */}
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1.5 line-clamp-1 ${
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

              {/* Connector Bar */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`hidden sm:block h-[2.5px] flex-1 rounded-full -mt-5 ${
                    isCompleted ? 'bg-mq-success' : 'bg-mq-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

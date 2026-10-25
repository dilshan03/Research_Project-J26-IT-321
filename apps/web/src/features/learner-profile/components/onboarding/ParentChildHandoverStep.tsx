import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Gamepad2,
} from 'lucide-react';
import { AVATAR_OPTIONS, type Learner } from '../../types';
import { AnimatedCompanion } from './AnimatedCompanion';
import { parentText } from '../../../../shared/i18n/parentText';
import { pick } from '../../../../shared/i18n/language';

const t = parentText.handover;

interface Props {
  learner: Learner;
  onContinue: () => void;
  onBack: () => void;
}

export const ParentChildHandoverStep: React.FC<Props> = ({
  learner,
  onContinue,
  onBack,
}) => {
  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner.avatarId) || AVATAR_OPTIONS[0];

  const callingName = learner.preferredName || learner.firstName;

  return (
    <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-10 shadow-sm space-y-8 text-center max-w-2xl mx-auto">
      {/* Top Banner Tag */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
          <Sparkles size={16} />
          <span>{t.badge}</span>
        </div>
        <p className="text-base text-mq-text-muted max-w-md mx-auto">{t.parentInstruction}</p>
      </div>

      {/* Avatar Spotlight with AnimatedCompanion */}
      <div className="flex flex-col items-center space-y-4">
        <AnimatedCompanion
          avatarId={learner.avatarId}
          state="welcome"
          size="lg"
          showSpeechBubble={true}
          customSpeech={{
            si: `ආයුබෝවන්, ${callingName}! අපි එකතු වී ගණිත වික්‍රමය අරඹමු!`,
            en: `Hello, ${callingName}! Let's begin our fun math quest together!`,
          }}
        />
        <div>
          <span className="text-sm font-semibold text-mq-primary block">{pick(avatar.nameSi, avatar.name)}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-mq-text-strong mt-1">
            {t.greeting(callingName)} 👋
          </h2>
          <p className="text-base text-mq-text-muted mt-1">{t.ready}</p>
        </div>
      </div>

      {/* Friendly Rules Card */}
      <div className="bg-mq-surface-soft rounded-2xl p-5 sm:p-6 text-left border border-mq-border/70 space-y-3">
        <h3 className="text-base font-semibold text-mq-text-strong flex items-center gap-2">
          <Gamepad2 size={18} className="text-mq-primary" />
          <span>{t.rulesTitle}</span>
        </h3>
        <ul className="space-y-2 text-sm sm:text-base text-mq-text leading-relaxed">
          {[t.rule1, t.rule2, t.rule3].map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="text-mq-success font-bold leading-relaxed">✓</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="btn btn-secondary w-full sm:w-auto min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>{t.backToParent}</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          onClick={onContinue}
          className="btn btn-primary w-full sm:w-auto min-h-[52px] px-8 rounded-full text-base inline-flex items-center justify-center gap-2 shadow-md"
        >
          <span>{t.start}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
};


import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Gamepad2,
} from 'lucide-react';
import { AVATAR_OPTIONS, type Learner } from '../../types';

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
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
        <Sparkles size={15} />
        <span>දෙමාපියන්ගෙන් දරුවාට භාරදීම (Parent to Child Handover)</span>
      </div>

      {/* Avatar Spotlight */}
      <div className="flex flex-col items-center space-y-3">
        <div
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl shadow-md border-2 animate-bounce-gentle ${avatar.bgColor} ${avatar.borderColor}`}
        >
          <span>{avatar.icon}</span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-mq-primary block">
            {avatar.nameSi} ({avatar.name})
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong font-sinhala mt-1">
            ආයුබෝවන්, {callingName}! 👋
          </h2>
          <p className="text-sm font-semibold text-mq-text-muted mt-1">
            Ready to explore MathQuest, {callingName}?
          </p>
        </div>
      </div>

      {/* Friendly Rules Card */}
      <div className="bg-mq-surface-soft rounded-2xl p-5 sm:p-6 text-left border border-mq-border/70 space-y-3 font-sinhala">
        <h3 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
          <Gamepad2 size={18} className="text-mq-primary" />
          <span>අපේ කුඩා ගණිත ක්‍රීඩාව ගැන (A Fun, Relaxed Activity):</span>
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm text-mq-text leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-mq-success font-bold text-base leading-none">✓</span>
            <span>කිසිදු වේලා සීමාවක් හෝ පීඩනයක් නැත — ඔබේම වේගයෙන් සිතා පිළිතුරු දෙන්න.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-mq-success font-bold text-base leading-none">✓</span>
            <span>අපහසු නම් ඕනෑම වේලාවක <strong>"ඉඟි (Hint)"</strong> බොත්තම එබිය හැක.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-mq-success font-bold text-base leading-none">✓</span>
            <span>වැරදුණාට කිසිදු ප්‍රශ්නයක් නැත — මෙහි ලකුණු කැපීමක් හෝ විභාගයක් නොවේ!</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={15} />
          <span>ආපසු දෙමාපිය ප්‍රශ්නාවලියට</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="btn btn-primary w-full sm:w-auto px-8 py-3 rounded-full text-base font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-transform"
        >
          <span>ගණිත වික්‍රමය අරඹමු! (Start Fun Math Tasks)</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

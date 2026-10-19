import React, { useState } from 'react';
import { Archive, AlertTriangle, Loader2, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react';
import type { Learner } from '../types';
import { parentText } from '../../../shared/i18n/parentText';
import { ParentModalShell } from './parent/ParentModalShell';

interface ArchiveLearnerModalProps {
  isOpen: boolean;
  learner: Learner | null;
  onClose: () => void;
  onConfirmArchive: (learner: Learner) => Promise<void>;
}

const t = parentText.archive;

export const ArchiveLearnerModal: React.FC<ArchiveLearnerModalProps> = ({
  isOpen,
  learner,
  onClose,
  onConfirmArchive,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !learner) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirmArchive(learner);
      onClose();
    } catch {
      setErrorMessage(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = learner.preferredName
    ? `${learner.firstName} ("${learner.preferredName}")`
    : learner.firstName;

  const points = [
    { Icon: EyeOff, text: t.point1(learner.firstName) },
    { Icon: ShieldCheck, text: t.point2 },
    { Icon: RotateCcw, text: t.point3 },
  ];

  return (
    <ParentModalShell
      isOpen={isOpen}
      tone="warning"
      title={t.title}
      subtitle={t.subtitle}
      icon={<Archive size={22} />}
      onClose={onClose}
      isBusy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm w-full sm:w-auto"
          >
            {parentText.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] px-6 rounded-full text-sm w-full sm:w-auto inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
            <span>{isSubmitting ? t.working : t.confirm}</span>
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {errorMessage && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border">
          <p className="text-lg font-bold text-mq-text-strong break-words">{displayName}</p>
          <p className="text-sm text-mq-text-muted">{parentText.common.gradeAndAge(learner.grade, learner.age)}</p>
        </div>

        <ul className="space-y-3">
          {points.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-mq-text leading-relaxed">
              <Icon size={18} className="text-mq-primary shrink-0 mt-0.5" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </ParentModalShell>
  );
};

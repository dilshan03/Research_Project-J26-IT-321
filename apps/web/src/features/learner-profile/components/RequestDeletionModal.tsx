import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert, Loader2, Info } from 'lucide-react';
import type { Learner } from '../types';
import { parentText } from '../../../shared/i18n/parentText';
import { ParentModalShell } from './parent/ParentModalShell';

interface RequestDeletionModalProps {
  isOpen: boolean;
  learner: Learner | null;
  onClose: () => void;
  onSubmitRequest: (learner: Learner, reason?: string) => Promise<void>;
}

const t = parentText.deletion;

export const RequestDeletionModal: React.FC<RequestDeletionModalProps> = ({
  isOpen,
  learner,
  onClose,
  onSubmitRequest,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !learner) return null;

  const isConfirmed = typedConfirmation.trim().toLowerCase() === learner.firstName.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmitRequest(learner, reason.trim() || undefined);
      onClose();
    } catch {
      setErrorMessage(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ParentModalShell
      isOpen={isOpen}
      tone="danger"
      title={t.title}
      subtitle={t.subtitle}
      icon={<Trash2 size={22} />}
      onClose={onClose}
      isBusy={isSubmitting}
      onSubmit={handleSubmit}
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
            type="submit"
            disabled={!isConfirmed || isSubmitting}
            className="btn bg-red-600 hover:bg-red-700 text-white min-h-[44px] px-6 rounded-full text-sm w-full sm:w-auto inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span>{isSubmitting ? t.working : t.submit}</span>
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

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-950 space-y-1.5">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert size={18} className="shrink-0 text-amber-700" />
            <span>{t.noticeTitle}</span>
          </p>
          <p className="leading-relaxed">{t.notice1}</p>
          <p className="leading-relaxed">{t.notice2}</p>
        </div>

        <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border">
          <p className="text-xs text-mq-text-muted">{t.child}</p>
          <p className="text-base font-bold text-mq-text-strong break-words">
            {learner.firstName} {learner.preferredName ? `("${learner.preferredName}")` : ''}
          </p>
        </div>

        <div>
          <label htmlFor="deletion-reason" className="block text-sm font-semibold text-mq-text-strong mb-2">
            {t.reason}
          </label>
          <textarea
            id="deletion-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.reasonPlaceholder}
            rows={2}
            maxLength={400}
            className="w-full text-base p-3 rounded-xl border border-mq-border focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-colors resize-none"
          />
        </div>

        <div>
          <label htmlFor="confirm-name-input" className="block text-sm font-semibold text-mq-text-strong mb-2">
            {t.confirmLabel(learner.firstName)}
          </label>
          <input
            id="confirm-name-input"
            type="text"
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            placeholder={t.confirmPlaceholder(learner.firstName)}
            className="w-full text-base p-3 rounded-xl border border-mq-border focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-colors"
            autoComplete="off"
          />
        </div>

        <p className="flex items-start gap-2 text-xs text-mq-text-muted">
          <Info size={14} className="shrink-0 mt-0.5 text-mq-primary" />
          <span>{t.statusNote}</span>
        </p>
      </div>
    </ParentModalShell>
  );
};

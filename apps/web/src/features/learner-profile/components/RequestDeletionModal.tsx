import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert, Loader2, Info } from 'lucide-react';
import type { Learner } from '../types';

interface RequestDeletionModalProps {
  isOpen: boolean;
  learner: Learner | null;
  onClose: () => void;
  onSubmitRequest: (learner: Learner, reason?: string) => Promise<void>;
}

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
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to submit permanent deletion request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletion-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-red-100 bg-red-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 border border-red-200">
              <Trash2 size={20} />
            </div>
            <div>
              <h2
                id="deletion-modal-title"
                className="text-base sm:text-lg font-bold text-red-950 font-sinhala"
              >
                ස්ථිරව ඉවත් කිරීමට ඉල්ලුම් කරන්න (Request Permanent Deletion)
              </h2>
              <p className="text-xs text-red-700/80">
                Formal request for permanent learner data deletion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-red-700 hover:text-red-900 hover:bg-red-100/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Crucial Notice */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
              <div className="flex items-start gap-2 font-bold text-amber-950">
                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-700" />
                <span>Important Data Policy & Ethics Notice</span>
              </div>
              <p>
                Submitting this form records an official <strong>Permanent Deletion Request</strong>. Data is <em>not immediately destroyed</em> upon submission.
              </p>
              <p>
                All deletion requests undergo administrative and ethics verification in accordance with the project's data governance policy and participant withdrawal protocols.
              </p>
            </div>

            {/* Target Learner */}
            <div className="bg-mq-surface-soft border border-mq-border/70 rounded-2xl p-3.5 text-xs">
              <span className="text-mq-text-muted uppercase font-bold block mb-0.5">
                Target Profile
              </span>
              <span className="text-sm font-bold text-mq-text-strong block">
                {learner.firstName} {learner.preferredName ? `("${learner.preferredName}")` : ''}
              </span>
              <span className="text-mq-text-muted text-[11px] font-mono">
                Learner ID: {learner.learnerId}
              </span>
            </div>

            {/* Optional Reason Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="deletion-reason"
                className="text-xs font-bold text-mq-text-strong block font-sinhala"
              >
                ඉවත් කිරීමට හේතුව (Reason for Request - Optional)
              </label>
              <textarea
                id="deletion-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Relocating, withdrawal of research consent..."
                rows={2}
                maxLength={400}
                className="w-full text-xs p-3 rounded-2xl border border-mq-border focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none"
              />
            </div>

            {/* Required Confirmation Input */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="confirm-name-input"
                className="text-xs font-bold text-mq-text-strong block"
              >
                To confirm, please type <span className="text-red-600 font-extrabold underline">{learner.firstName}</span> below:
              </label>
              <input
                id="confirm-name-input"
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={`Type "${learner.firstName}" to confirm`}
                className="w-full text-xs p-3 rounded-2xl border border-mq-border focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-mq-text-muted">
              <Info size={14} className="shrink-0 text-mq-primary" />
              <span>You will be able to monitor the request status in your dashboard.</span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-mq-border/70 bg-mq-surface-soft/40">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full cursor-pointer"
            >
              අවලංගු කරන්න (Cancel)
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isSubmitting}
              className="btn bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm py-2 px-5 rounded-full flex items-center gap-2 font-bold shadow-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>ඉල්ලීම ඉදිරිපත් වෙමින්...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>ඉල්ලීම ඉදිරිපත් කරන්න (Submit Request)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

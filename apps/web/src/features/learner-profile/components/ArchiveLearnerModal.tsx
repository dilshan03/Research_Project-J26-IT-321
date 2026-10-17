import React, { useState } from 'react';
import { X, Archive, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import type { Learner } from '../types';

interface ArchiveLearnerModalProps {
  isOpen: boolean;
  learner: Learner | null;
  onClose: () => void;
  onConfirmArchive: (learner: Learner) => Promise<void>;
}

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
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to archive learner profile. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = learner.preferredName
    ? `${learner.firstName} ("${learner.preferredName}")`
    : learner.firstName;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl border border-mq-border shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-mq-border/70 bg-mq-surface-soft/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Archive size={20} />
            </div>
            <div>
              <h2
                id="archive-modal-title"
                className="text-base sm:text-lg font-bold text-mq-text-strong font-sinhala"
              >
                දරුවා සංරක්ෂණය කරන්න (Archive Learner)
              </h2>
              <p className="text-xs text-mq-text-muted">
                Hide profile from active views while preserving historical learning records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-text-strong hover:bg-mq-surface-soft transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Child Focus Banner */}
          <div className="bg-mq-surface-blue/50 border border-mq-primary/20 rounded-2xl p-4">
            <p className="text-xs text-mq-text-muted uppercase font-bold tracking-wider mb-1">
              Selected Learner • තෝරාගත් දරුවා
            </p>
            <p className="text-lg font-bold text-mq-text-strong">
              {displayName}
            </p>
            <p className="text-xs text-mq-text-muted mt-0.5">
              Learner ID: <code className="font-mono text-xs">{learner.learnerId}</code> · Grade {learner.grade} · Age {learner.age}
            </p>
          </div>

          {/* Policy & Effect Explanation */}
          <div className="space-y-3 text-xs sm:text-sm text-mq-text-muted leading-relaxed">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-mq-surface-soft text-mq-primary flex items-center justify-center shrink-0 mt-0.5">
                •
              </div>
              <div>
                <strong className="text-mq-text-strong">Active Views:</strong> {learner.firstName} will be hidden from your active child profiles and daily gameplay selection.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-mq-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-mq-text-strong">Data Retention:</strong> Completed assessments, questionnaire responses, and ELP-X proficiency models are <strong>retained securely</strong> in compliance with the research data retention policy. No records are deleted.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-mq-surface-soft text-mq-primary flex items-center justify-center shrink-0 mt-0.5">
                •
              </div>
              <div>
                <strong className="text-mq-text-strong">Restoration:</strong> You can view archived profiles and restore {learner.firstName} back to active learning anytime from the "Archived Learners" tab.
              </div>
            </div>
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
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm py-2 px-5 rounded-full flex items-center gap-2 font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>සංරක්ෂණය වෙමින්...</span>
              </>
            ) : (
              <>
                <Archive size={16} />
                <span>සංරක්ෂණය කරන්න (Archive Profile)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

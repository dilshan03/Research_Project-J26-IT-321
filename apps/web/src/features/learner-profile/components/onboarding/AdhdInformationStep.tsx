import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Stethoscope,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  Info,
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import type {
  AdhdDiagnosisStatus,
  AdhdInformationData,
  AdhdInformationRecord,
  AdhdReportedPresentation,
} from '../../types/onboarding';
import { ADHD_DIAGNOSIS_STATUS_OPTIONS, ADHD_PRESENTATION_OPTIONS } from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';

interface Props {
  initialData?: AdhdInformationRecord | null;
  onSave: (data: AdhdInformationData) => Promise<void>;
  onSaveAndExit?: (data: AdhdInformationData) => Promise<void>;
  /** Shown when editing from the profile summary; the first onboarding step has no Back. */
  onBack?: () => void;
  isSaving: boolean;
  /** Edited from the ADHD & support information page (no step badge or save-and-exit). */
  standalone?: boolean;
}

const t = parentText.adhd;

const currentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const optionClass = (isSelected: boolean) =>
  `p-4 rounded-2xl border text-left transition-colors cursor-pointer min-h-[56px] ${
    isSelected
      ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
      : 'border-mq-border hover:border-mq-primary/40 bg-white'
  }`;

/**
 * Step 1: Parent-reported ADHD information.
 * Records what a qualified healthcare professional reported, as told by the parent.
 * It is not a screening or diagnostic step and is never required to use MathQuest.
 */
export const AdhdInformationStep: React.FC<Props> = ({
  initialData,
  onSave,
  onSaveAndExit,
  onBack,
  isSaving,
  standalone = false,
}) => {
  const [diagnosisStatus, setDiagnosisStatus] = useState<AdhdDiagnosisStatus | null>(
    initialData?.diagnosisStatus ?? null
  );
  const [reportedPresentation, setReportedPresentation] = useState<AdhdReportedPresentation | null>(
    initialData?.reportedPresentation ?? null
  );
  const [reportedMonth, setReportedMonth] = useState<string>(
    initialData?.diagnosisReportedMonth ?? ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDiagnosed = diagnosisStatus === 'yes';

  const handleSelectStatus = (status: AdhdDiagnosisStatus) => {
    setDiagnosisStatus(status);
    setValidationError(null);
    // Presentation and date only apply to a reported diagnosis; never keep stale answers.
    if (status !== 'yes') {
      setReportedPresentation(null);
      setReportedMonth('');
    }
  };

  const buildPayload = (): AdhdInformationData | null => {
    if (!diagnosisStatus) {
      setValidationError(t.errorChooseOne);
      return null;
    }
    if (isDiagnosed && !reportedPresentation) {
      setValidationError(t.errorChoosePresentation);
      return null;
    }
    if (isDiagnosed && reportedMonth && reportedMonth > currentMonth()) {
      setValidationError(t.errorFutureMonth);
      return null;
    }
    return {
      version: 'ADHD-INFO-v1.0',
      diagnosisStatus,
      ...(isDiagnosed && reportedPresentation ? { reportedPresentation } : {}),
      ...(isDiagnosed && reportedMonth ? { diagnosisReportedMonth: reportedMonth } : {}),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (payload) onSave(payload);
  };

  const handleSaveAndExit = () => {
    const payload = buildPayload();
    if (payload && onSaveAndExit) onSaveAndExit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        {!standalone && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-blue text-mq-primary">
            {parentText.onboarding.stepOf(1)}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-mq-text-strong">{t.title}</h2>
        <p className="text-base text-mq-text-muted leading-relaxed">{t.intro}</p>

        <div className="p-4 rounded-2xl bg-mq-surface-green/60 border border-mq-success/30 flex items-start gap-3">
          <ShieldCheck size={20} className="text-mq-success shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-mq-text-strong">{t.reassuranceTitle}</p>
            <p className="text-sm text-mq-text-muted">{t.reassuranceText}</p>
          </div>
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-mq-danger-bg border border-mq-danger/40 text-sm text-mq-danger font-semibold flex items-center gap-2"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Question 1: Diagnosis status */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
            <Stethoscope size={18} />
          </div>
          <div className="space-y-1">
            <h3 id="adhd-status-question" className="text-base font-semibold text-mq-text-strong leading-relaxed">
              {t.q1}
            </h3>
            <p className="text-sm text-mq-text-muted">{t.q1Help}</p>
          </div>
        </div>

        <div role="radiogroup" aria-labelledby="adhd-status-question" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ADHD_DIAGNOSIS_STATUS_OPTIONS.map((opt) => (
            <button
              type="button"
              role="radio"
              aria-checked={diagnosisStatus === opt.value}
              key={opt.value}
              onClick={() => handleSelectStatus(opt.value)}
              className={optionClass(diagnosisStatus === opt.value)}
            >
              <span className="block text-base font-semibold text-mq-text-strong">{opt.labelSi}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question 2: Reported presentation (only when a diagnosis was reported) */}
      {isDiagnosed && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div className="space-y-1">
              <h3 id="adhd-presentation-question" className="text-base font-semibold text-mq-text-strong leading-relaxed">
                {t.q2}
              </h3>
              <p className="text-sm text-mq-text-muted">{t.q2Help}</p>
            </div>
          </div>

          <div role="radiogroup" aria-labelledby="adhd-presentation-question" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADHD_PRESENTATION_OPTIONS.map((opt) => (
              <button
                type="button"
                role="radio"
                aria-checked={reportedPresentation === opt.value}
                key={opt.value}
                onClick={() => {
                  setReportedPresentation(opt.value);
                  setValidationError(null);
                }}
                className={optionClass(reportedPresentation === opt.value)}
              >
                <span className="block text-base font-semibold text-mq-text-strong">{opt.labelSi}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-mq-border/60">
            <label
              htmlFor="adhd-reported-month"
              className="flex items-center gap-2 text-sm font-semibold text-mq-text-strong mb-2"
            >
              <CalendarDays size={16} className="text-mq-primary shrink-0" />
              <span>{t.month}</span>
            </label>
            <input
              id="adhd-reported-month"
              type="month"
              value={reportedMonth}
              min="2000-01"
              max={currentMonth()}
              onChange={(e) => {
                setReportedMonth(e.target.value);
                setValidationError(null);
              }}
              className="w-full sm:w-64 text-base py-2.5 px-3 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Privacy and non-diagnostic notice */}
      <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/70 text-sm text-mq-text-muted leading-relaxed flex items-start gap-3">
        <Info size={18} className="text-mq-primary shrink-0 mt-0.5" />
        <p>{t.privacy}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row gap-3">
          {onBack && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>{parentText.common.back}</span>
            </motion.button>
          )}
          {onSaveAndExit && !standalone && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={isSaving}
              onClick={handleSaveAndExit}
              className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
            >
              <Save size={16} />
              <span>{parentText.common.saveAndExit}</span>
            </motion.button>
          )}
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={isSaving}
          className="btn btn-primary min-h-[48px] px-7 rounded-full text-base inline-flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <span>{onBack ? parentText.common.save : parentText.common.continue}</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

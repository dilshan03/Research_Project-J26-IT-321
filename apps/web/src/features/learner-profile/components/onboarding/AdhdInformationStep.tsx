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

interface Props {
  initialData?: AdhdInformationRecord | null;
  onSave: (data: AdhdInformationData) => Promise<void>;
  onSaveAndExit: (data: AdhdInformationData) => Promise<void>;
  /** Shown when editing from the profile summary; the first onboarding step has no Back. */
  onBack?: () => void;
  isSaving: boolean;
}

const currentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

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
      setValidationError('කරුණාකර එක් පිළිතුරක් තෝරන්න (Please choose one answer).');
      return null;
    }
    if (isDiagnosed && !reportedPresentation) {
      setValidationError(
        'කරුණාකර වාර්තා කළ ස්වරූපය තෝරන්න. නොදන්නේ නම් "විශ්වාස නැත / සඳහන් කර නැත" තෝරන්න (Please choose the reported presentation, or "Not sure / Not specified").'
      );
      return null;
    }
    if (isDiagnosed && reportedMonth && reportedMonth > currentMonth()) {
      setValidationError('අනාගත දිනයක් තෝරා ගත නොහැක (The month cannot be in the future).');
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
    if (payload) onSaveAndExit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary">
          <span>පියවර 1: ADHD තොරතුරු (Step 1 of 6 - Parent Only)</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong font-sinhala">
          දරුවාගේ සෞඛ්‍ය තොරතුරු (About Your Child)
        </h2>
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed font-sinhala">
          ඔබ දන්නා දේ පමණක් සඳහන් කරන්න. මෙම තොරතුරු දරුවාට ගැළපෙන ඉගෙනුම් සහාය සැලසුම් කිරීමට පමණක් භාවිතා වේ.
        </p>
        <p className="text-xs text-mq-text-muted leading-relaxed">
          Share only what you know. This helps us plan suitable learning support.
        </p>

        {/* Reassurance: a diagnosis is never required */}
        <div className="p-4 rounded-2xl bg-mq-surface-green/60 border border-mq-success/30 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-mq-success font-sinhala">
            <ShieldCheck size={16} className="shrink-0" />
            <span>MathQuest භාවිතා කිරීමට ADHD රෝග විනිශ්චයක් අවශ්‍ය නොවේ</span>
          </div>
          <p className="text-mq-text-muted text-[11px] leading-relaxed">
            An ADHD diagnosis is not required to use MathQuest. Every child can continue with the learning activities, whatever you answer here.
          </p>
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-mq-danger-bg border border-mq-danger/40 text-xs text-mq-danger font-bold flex items-center gap-2"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Question 1: Diagnosis status */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
            <Stethoscope size={18} />
          </div>
          <div>
            <h3 id="adhd-status-question" className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              1. සුදුසුකම් ලත් සෞඛ්‍ය වෘත්තිකයෙකු විසින් ඔබේ දරුවාට ADHD රෝග විනිශ්චය කර තිබේද?
            </h3>
            <p className="text-xs text-mq-text-muted">
              Has your child been diagnosed with ADHD by a qualified healthcare professional?
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="adhd-status-question"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {ADHD_DIAGNOSIS_STATUS_OPTIONS.map((opt) => {
            const isSelected = diagnosisStatus === opt.value;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                key={opt.value}
                onClick={() => handleSelectStatus(opt.value)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer min-h-[72px] ${
                  isSelected
                    ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                    : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
                }`}
              >
                <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                  {opt.labelSi}
                </span>
                <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                  {opt.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question 2: Reported presentation (only when a diagnosis was reported) */}
      {isDiagnosed && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3 id="adhd-presentation-question" className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
                2. සෞඛ්‍ය වෘත්තිකයා වාර්තා කළ ADHD ස්වරූපය කුමක්ද?
              </h3>
              <p className="text-xs text-mq-text-muted">
                Which ADHD presentation was reported by the healthcare professional?
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="adhd-presentation-question"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {ADHD_PRESENTATION_OPTIONS.map((opt) => {
              const isSelected = reportedPresentation === opt.value;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  key={opt.value}
                  onClick={() => {
                    setReportedPresentation(opt.value);
                    setValidationError(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                      : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
                  }`}
                >
                  <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                    {opt.labelSi}
                  </span>
                  <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                    {opt.labelEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional month of the professional report */}
          <div className="pt-2 border-t border-mq-border/60">
            <label
              htmlFor="adhd-reported-month"
              className="flex items-center gap-1.5 text-xs font-bold text-mq-text-strong font-sinhala mb-1 pt-3"
            >
              <CalendarDays size={14} className="text-mq-primary shrink-0" />
              <span>රෝග විනිශ්චය වාර්තා කළ මාසය (Month it was reported - optional)</span>
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
              className="w-full sm:w-64 text-xs py-2 px-3 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Privacy and non-diagnostic notice */}
      <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/70 text-[11px] text-mq-text-muted leading-relaxed flex items-start gap-2.5">
        <Info size={16} className="text-mq-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-sinhala">
            මෙය ඔබ ලබා දෙන තොරතුරක් ලෙස පමණක් සටහන් වේ. MathQuest මෙය තහවුරු කිරීම, රෝග විනිශ්චය කිරීම හෝ ක්‍රීඩා දත්ත මත වෙනස් කිරීම සිදු නොකරයි. කරුණාකර වෛද්‍ය ලේඛන උඩුගත නොකරන්න.
          </p>
          <p>
            This is recorded as information you reported. MathQuest does not verify it, diagnose, or change it based on questionnaires or gameplay. Please do not upload medical documents.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onBack && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={15} />
              <span>ආපසු (Back)</span>
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={handleSaveAndExit}
            className="btn btn-secondary w-full sm:w-auto px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center justify-center gap-1.5"
          >
            <Save size={15} />
            <span>සුරැක පසුව සම්පූර්ණ කරන්න (Save & Resume Later)</span>
          </motion.button>
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={isSaving}
          className="btn btn-primary w-full sm:w-auto px-7 py-2.5 rounded-full text-sm font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{onBack ? 'සුරකින්න (Save)' : 'ඉදිරියට (Continue)'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

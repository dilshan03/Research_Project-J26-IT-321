import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  SkipForward,
  Info,
} from 'lucide-react';
import {
  SNAP_IV_ITEMS,
  SNAP_IV_SCALE_OPTIONS,
  type SnapIvItemAnswer,
} from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';

interface Props {
  initialResponses?: SnapIvItemAnswer[];
  onSave: (responses: SnapIvItemAnswer[]) => Promise<void>;
  onSaveAndExit: (responses: SnapIvItemAnswer[]) => Promise<void>;
  onBack: () => void;
  /** SNAP-IV is optional: skipping keeps any previously saved responses. */
  onSkip: () => Promise<void>;
  isSaving: boolean;
}

const t = parentText.snap;

export const SnapIvStep: React.FC<Props> = ({
  initialResponses,
  onSave,
  onSaveAndExit,
  onBack,
  onSkip,
  isSaving,
}) => {
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    if (initialResponses) {
      initialResponses.forEach((r) => {
        map[r.itemId] = r.score;
      });
    }
    return map;
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectScore = (itemId: number, score: number) => {
    setAnswers((prev) => ({ ...prev, [itemId]: score }));
    setValidationError(null);
  };

  const getResponsesArray = (): SnapIvItemAnswer[] => {
    return SNAP_IV_ITEMS.map((item) => ({
      itemId: item.id,
      score: answers[item.id] !== undefined ? answers[item.id] : 0,
    }));
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === 18;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) {
      setValidationError(t.errorIncomplete(answeredCount));
      return;
    }
    onSave(getResponsesArray());
  };

  const renderSection = (subscale: 'inattention' | 'hyperactivity', title: string, from: number, to: number) => (
    <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-8 shadow-xs space-y-5">
      <div className="border-b border-mq-border/70 pb-3">
        <h3 className="text-lg font-bold text-mq-text-strong">{title}</h3>
        <p className="text-sm text-mq-text-muted">{t.itemsRange(from, to)}</p>
      </div>

      <div className="space-y-4">
        {SNAP_IV_ITEMS.filter((item) => item.subscale === subscale).map((item) => (
          <fieldset
            key={item.id}
            className={`p-4 rounded-2xl border transition-colors ${
              answers[item.id] !== undefined ? 'border-mq-border bg-white' : 'border-mq-border/60 bg-mq-surface-soft/50'
            }`}
          >
            <legend className="sr-only">{`${item.id}. ${item.textSi}`}</legend>
            <p className="mb-3 text-base text-mq-text-strong leading-relaxed" aria-hidden="true">
              <span className="font-bold text-mq-primary mr-2">{item.id}.</span>
              {item.textSi}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SNAP_IV_SCALE_OPTIONS.map((scale) => {
                const isSelected = answers[item.id] === scale.value;
                return (
                  <button
                    type="button"
                    key={scale.value}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectScore(item.id, scale.value)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border text-center text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-mq-primary bg-mq-surface-blue text-mq-primary font-semibold ring-2 ring-mq-primary/20'
                        : 'border-mq-border bg-white hover:border-mq-primary/40 text-mq-text'
                    }`}
                  >
                    {scale.labelSi}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-green text-mq-success">
            {parentText.onboarding.stepOf(2)}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-soft text-mq-text-muted border border-mq-border">
            {parentText.common.optional}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-mq-text-strong">{t.title}</h2>
        <p className="text-base text-mq-text-muted leading-relaxed">{t.intro}</p>
        <p className="text-sm text-mq-text-muted leading-relaxed flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5 text-mq-primary" />
          <span>{t.optionalText}</span>
        </p>

        {/* Not a diagnosis */}
        <div className="p-4 rounded-2xl bg-mq-warning-bg/60 border border-mq-warning/40 space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-mq-warning">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{t.notDiagnosisTitle}</span>
          </p>
          <p className="text-sm text-mq-text-muted leading-relaxed">{t.notDiagnosisText}</p>
          <p className="text-xs text-mq-text-muted">{t.sourceNote}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between gap-3 text-sm pt-3 border-t border-mq-border/60">
          <span className="font-semibold text-mq-text-strong">{t.answered(answeredCount)}</span>
          <span className={`font-semibold ${isComplete ? 'text-mq-success' : 'text-mq-warning'}`}>
            {isComplete ? t.allAnswered : t.remaining(18 - answeredCount)}
          </span>
        </div>
      </div>

      {validationError && (
        <div role="alert" className="p-4 rounded-2xl bg-mq-danger-bg border border-mq-danger/40 text-sm text-mq-danger font-semibold flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {renderSection('inattention', t.sectionA, 1, 9)}
      {renderSection('hyperactivity', t.sectionB, 10, 18)}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>{parentText.common.back}</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSaveAndExit(getResponsesArray())}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
          >
            <Save size={16} />
            <span>{parentText.common.saveAndExit}</span>
          </motion.button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSkip()}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
          >
            <SkipForward size={16} />
            <span>{parentText.common.skipForNow}</span>
          </motion.button>
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
                <span>{parentText.common.saveAndContinue}</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
};

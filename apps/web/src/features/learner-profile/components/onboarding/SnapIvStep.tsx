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
} from 'lucide-react';
import {
  SNAP_IV_ITEMS,
  SNAP_IV_SCALE_OPTIONS,
  type SnapIvItemAnswer,
} from '../../types/onboarding';


interface Props {
  initialResponses?: SnapIvItemAnswer[];
  onSave: (responses: SnapIvItemAnswer[]) => Promise<void>;
  onSaveAndExit: (responses: SnapIvItemAnswer[]) => Promise<void>;
  onBack: () => void;
  /** SNAP-IV is optional: skipping keeps any previously saved responses. */
  onSkip: () => Promise<void>;
  isSaving: boolean;
}

export const SnapIvStep: React.FC<Props> = ({
  initialResponses,
  onSave,
  onSaveAndExit,
  onBack,
  onSkip,
  isSaving,
}) => {
  // Store responses as a map of itemId -> score
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
      setValidationError(
        `කරුණාකර සියලු ප්‍රශ්න 18 සඳහා පිළිතුරු සපයන්න (Please answer all 18 items. Currently answered: ${answeredCount}/18).`
      );
      return;
    }
    onSave(getResponsesArray());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-green text-mq-success">
            පියවර 2: දෙමාපිය ප්‍රශ්නාවලිය (Step 2 of 6 - Parent Only)
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-soft text-mq-text-muted border border-mq-border">
            විකල්පයි (Optional)
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong font-sinhala">
          SNAP-IV 18-අයිතම ප්‍රශ්නාවලිය (Parent Rating Scale)
        </h2>
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed font-sinhala">
          පසුගිය මාස 6ක කාලය තුළ දරුවාගේ හැසිරීම් සහ අවධානය යොමුකිරීමේ රටාවන් නිරීක්ෂණය කර පහත අයිතම 18 සඳහා වඩාත්ම ගැළපෙන පිළිතුර තෝරන්න.
        </p>
        <p className="text-xs text-mq-text-muted leading-relaxed">
          This questionnaire is optional. You can skip it now and complete it later from your child's profile summary. Skipping does not affect the learning activities.
        </p>

        {/* Clinical Non-Diagnosis Disclaimer Alert */}
        <div className="p-4 rounded-2xl bg-mq-warning-bg/60 border border-mq-warning/40 text-xs text-mq-text-strong space-y-1 font-sinhala">
          <div className="flex items-center gap-2 font-bold text-mq-warning">
            <ShieldAlert size={16} />
            <span>පර්යේෂණ හා අනුවර්තී අධ්‍යාපනික භාවිතය සඳහා පමණි (Non-Diagnostic Research Notice)</span>
          </div>
          <p className="text-mq-text-muted text-[11px] leading-relaxed">
            මෙම ප්‍රශ්නාවලිය මගින් ADHD හෝ වෙනත් කිසිදු සායනික රෝග විනිශ්චයක් (diagnosis) සිදු නොකෙරේ. මෙම ලකුණු භාවිතා කරනු ලබන්නේ දරුවාට වඩාත් ගැළපෙන ඉගෙනුම් ක්‍රමවේද සහ සහාය හඳුනාගැනීමට පමණි.
          </p>
          <p className="text-mq-text-muted text-[11px] leading-relaxed">
            This is not a diagnostic test. Answers describe what you have observed and are kept separate from any diagnosis you reported.
          </p>
          <p className="text-[10px] text-mq-text-muted italic">
            * Standard Swanson, Nolan, and Pelham (SNAP-IV) 18-item scale with provisional research translation template.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-mq-border/60">
          <span className="font-bold text-mq-text-strong font-sinhala">
            සම්පූර්ණ කරන ලද ප්‍රශ්න: {answeredCount} / 18
          </span>
          <span
            className={`font-bold ${
              isComplete ? 'text-mq-success' : 'text-mq-warning'
            }`}
          >
            {isComplete ? 'සියල්ල සම්පූර්ණයි' : `${18 - answeredCount} ක් ඉතිරිව ඇත`}
          </span>
        </div>
      </div>

      {validationError && (
        <div className="p-4 rounded-2xl bg-mq-danger-bg border border-mq-danger/40 text-xs text-mq-danger font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Subscale 1: Inattention (Items 1-9) */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-mq-border/70 pb-3">
          <span className="text-xs font-bold text-mq-primary uppercase tracking-wider block">
            Subscale A (අයිතම 1 සිට 9 දක්වා)
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-mq-text-strong font-sinhala">
            අවධානය සහ සාන්ද්‍රණය (Inattention Characteristics)
          </h3>
        </div>

        <div className="space-y-4">
          {SNAP_IV_ITEMS.filter((item) => item.subscale === 'inattention').map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                answers[item.id] !== undefined
                  ? 'border-mq-border bg-white shadow-2xs'
                  : 'border-mq-border/60 bg-mq-surface-soft/40'
              }`}
            >
              <div className="mb-3">
                <span className="text-xs font-bold text-mq-primary mr-2">
                  {item.id}.
                </span>
                <span className="text-sm font-bold text-mq-text-strong font-sinhala">
                  {item.textSi}
                </span>
                <p className="text-xs text-mq-text-muted mt-0.5 italic">
                  {item.textEn}
                </p>
              </div>

              {/* 4-Point Radio Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SNAP_IV_SCALE_OPTIONS.map((scale) => {
                  const isSelected = answers[item.id] === scale.value;
                  return (
                    <button
                      type="button"
                      key={scale.value}
                      onClick={() => handleSelectScore(item.id, scale.value)}
                      className={`px-3 py-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-mq-primary bg-mq-surface-blue text-mq-primary font-bold ring-2 ring-mq-primary/20'
                          : 'border-mq-border bg-white hover:border-mq-primary/40 text-mq-text text-xs'
                      }`}
                    >
                      <span className="block text-xs font-bold font-sinhala">
                        {scale.labelSi}
                      </span>
                      <span className="block text-[10px] text-mq-text-muted mt-0.5">
                        {scale.labelEn} ({scale.value})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscale 2: Hyperactivity / Impulsivity (Items 10-18) */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-mq-border/70 pb-3">
          <span className="text-xs font-bold text-mq-primary uppercase tracking-wider block">
            Subscale B (අයිතම 10 සිට 18 දක්වා)
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-mq-text-strong font-sinhala">
            ක්‍රියාශීලීත්වය සහ ආවේගශීලීත්වය (Hyperactivity & Impulsivity Characteristics)
          </h3>
        </div>

        <div className="space-y-4">
          {SNAP_IV_ITEMS.filter((item) => item.subscale === 'hyperactivity').map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                answers[item.id] !== undefined
                  ? 'border-mq-border bg-white shadow-2xs'
                  : 'border-mq-border/60 bg-mq-surface-soft/40'
              }`}
            >
              <div className="mb-3">
                <span className="text-xs font-bold text-mq-primary mr-2">
                  {item.id}.
                </span>
                <span className="text-sm font-bold text-mq-text-strong font-sinhala">
                  {item.textSi}
                </span>
                <p className="text-xs text-mq-text-muted mt-0.5 italic">
                  {item.textEn}
                </p>
              </div>

              {/* 4-Point Radio Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SNAP_IV_SCALE_OPTIONS.map((scale) => {
                  const isSelected = answers[item.id] === scale.value;
                  return (
                    <button
                      type="button"
                      key={scale.value}
                      onClick={() => handleSelectScore(item.id, scale.value)}
                      className={`px-3 py-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-mq-primary bg-mq-surface-blue text-mq-primary font-bold ring-2 ring-mq-primary/20'
                          : 'border-mq-border bg-white hover:border-mq-primary/40 text-mq-text text-xs'
                      }`}
                    >
                      <span className="block text-xs font-bold font-sinhala">
                        {scale.labelSi}
                      </span>
                      <span className="block text-[10px] text-mq-text-muted mt-0.5">
                        {scale.labelEn} ({scale.value})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={15} />
            <span>ආපසු (Back)</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSaveAndExit(getResponsesArray())}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
          >
            <Save size={15} />
            <span>සුරැක පසුව සම්පූර්ණ කරන්න</span>
          </motion.button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSkip()}
            className="btn btn-secondary w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center justify-center gap-1.5"
          >
            <SkipForward size={15} />
            <span>දැනට මඟ හරින්න (Skip for now)</span>
          </motion.button>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: isSaving ? 1 : 1.01 }}
            disabled={isSaving}
            className="btn btn-primary w-full sm:w-auto px-7 py-2.5 rounded-full text-sm font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-sm"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>සුරකින්න සහ ඉදිරියට (Save & Continue)</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
};

import React, { useState } from 'react';
import { useScrollToTopOnChange } from '../../../../shared/hooks/useScrollToTopOnChange';
import { LegacyItemTracker, buildLegacyAnswers } from './legacyAnswers';
import type { MathQuestion, MathItemAnswer, LearningPreferencesData, MathSubmissionExtras } from '../../types/onboarding';
import { LivingCanvasOnboarding } from './LivingCanvasOnboarding';
import { Grade1Journey } from './journey/ChildJourney';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Save,
  Lightbulb,
  X,
  Languages,
  Palette,
} from 'lucide-react';
import { AnimatedCompanion, type CompanionState } from './AnimatedCompanion';

interface Props {
  grade: number;
  preferredLanguage?: string;
  primaryInstructionLanguage?: string;
  sinhalaComprehension?: string;
  englishComprehension?: string;
  learningPreferences?: LearningPreferencesData | null;
  questions: MathQuestion[];
  onSubmit: (answers: MathItemAnswer[], extras?: MathSubmissionExtras) => Promise<void>;
  onSaveAndExit: (answers: MathItemAnswer[]) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
  avatarId?: string;
}

/** Grade 1 uses the interactive onboarding-v2 journey; set to false to fall back to the previous flow. */
const GRADE1_JOURNEY_ENABLED = true;

export const MathAssessmentStep: React.FC<Props> = (props) => {
  if (GRADE1_JOURNEY_ENABLED && props.grade === 1) {
    return <Grade1Journey onSubmit={props.onSubmit} isSubmitting={props.isSubmitting} />;
  }
  return <LegacyMathAssessmentStep {...props} />;
};

/** Previous child assessment flow, unchanged; still used by Grades 2–5. */
const LegacyMathAssessmentStep: React.FC<Props> = (props) => {
  // Default to the new 2D watercolor Living Canvas discovery experience
  const [viewMode, setViewMode] = useState<'canvas' | 'standard'>('canvas');

  if (viewMode === 'canvas') {
    return (
      <div className="space-y-4">
        {/* Living Canvas Experience */}
        <LivingCanvasOnboarding {...props} />

        {/* Small subtle accessible toggle for standard fallback if needed */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setViewMode('standard')}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors font-sans flex items-center gap-1 cursor-pointer"
          >
            <Palette size={12} />
            <span>Switch to Standard View (සාමාන්‍ය දසුන)</span>
          </button>
        </div>
      </div>
    );
  }

  // Fallback: Standard Card Assessment View
  return <StandardMathAssessmentView {...props} onSwitchToCanvas={() => setViewMode('canvas')} />;
};

interface StandardViewProps extends Props {
  onSwitchToCanvas: () => void;
}

const StandardMathAssessmentView: React.FC<StandardViewProps> = ({
  grade,
  preferredLanguage = 'Sinhala',
  primaryInstructionLanguage = 'Sinhala',
  questions,
  onSubmit,
  onSaveAndExit,
  onBack,
  isSubmitting,
  avatarId,
  onSwitchToCanvas,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  useScrollToTopOnChange(currentIndex);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [showHintModal, setShowHintModal] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [numericInput, setNumericInput] = useState('');

  // Measured presentation and first-answer timing (no defaults)
  const trackerRef = React.useRef(new LegacyItemTracker());

  const currentQuestion = questions[currentIndex];

  React.useEffect(() => {
    if (currentQuestion) trackerRef.current.show(currentQuestion.questionId);
    setShowHintModal(false);
    setShowTranslation(false);
    setCompanionState('idle');
    if (currentQuestion && answers[currentQuestion.questionId] !== undefined) {
      setNumericInput(String(answers[currentQuestion.questionId]));
    } else {
      setNumericInput('');
    }
  }, [currentIndex, currentQuestion]);

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4">
        <p className="text-sm font-bold text-mq-text-strong font-sinhala">
          {grade} ශ්‍රේණිය සඳහා ගණිත අභ්‍යාස පූරණය වෙමින් පවතී...
        </p>
        <Loader2 className="animate-spin text-mq-primary mx-auto" size={28} />
      </div>
    );
  }

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    trackerRef.current.answered(currentQuestion.questionId);
    setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: optionId }));
    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + 1,
    }));
    setCompanionState('encouragement');
  };

  const handleNumericChange = (val: string) => {
    setNumericInput(val);
    if (!currentQuestion) return;
    if (val.trim() === '') {
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[currentQuestion.questionId];
        return copy;
      });
    } else {
      trackerRef.current.answered(currentQuestion.questionId);
      const numVal = Number(val);
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.questionId]: isNaN(numVal) ? val : numVal,
      }));
      setAttempts((prev) => ({
        ...prev,
        [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + 1,
      }));
      setCompanionState('encouragement');
    }
  };

  const handleToggleHint = () => {
    if (!currentQuestion) return;
    setHintsUsed((prev) => ({ ...prev, [currentQuestion.questionId]: true }));
    setCompanionState('hint');
    setShowHintModal(true);
  };

  // Only presented questions are sent; unanswered ones as 'skipped'; time only when measured
  const compileAnswers = (): MathItemAnswer[] => {
    trackerRef.current.leave();
    return buildLegacyAnswers(
      questions.map((q) => q.questionId),
      trackerRef.current,
      (id) => ({ userAnswer: answers[id], attempts: attempts[id], hintUsed: hintsUsed[id] })
    );
  };

  const handleNext = () => {
    if (isSubmitting) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompanionState('success');
      onSubmit(compileAnswers());
    }
  };

  const handlePrev = () => {
    if (isSubmitting) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const isCurrentAnswered =
    currentQuestion && answers[currentQuestion.questionId] !== undefined;
  const totalQuestions = questions.length;
  const progressPct = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="space-y-6">
      {/* Return to Living Canvas Banner */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onSwitchToCanvas}
          className="btn btn-secondary text-xs py-1.5 px-3.5 rounded-full inline-flex items-center gap-1.5 font-bold font-sinhala"
        >
          <Sparkles size={14} className="text-teal-600" />
          <span>සජීවී කැන්වසය වෙත ආපසු යන්න (Back to Living Canvas)</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <AnimatedCompanion
            avatarId={avatarId}
            state={companionState}
            size="md"
            onAnimationComplete={() => {
              if (companionState === 'encouragement') setCompanionState('idle');
            }}
          />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mq-primary block font-sinhala">
              ගණිත ගවේෂණය (Math Quest)
            </span>
            <span className="text-sm font-bold text-mq-text-strong font-sinhala">
              ප්‍රශ්න {currentIndex + 1} න් {totalQuestions}
            </span>
          </div>
        </div>

        {/* Progress Bar & Hint Button */}
        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 bg-mq-surface-soft h-2.5 rounded-full overflow-hidden border border-mq-border">
            <motion.div
              className="bg-mq-primary h-full rounded-full"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.35, ease: 'easeOut' }}
            />
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={handleToggleHint}
            className={`btn text-xs py-1.5 px-3.5 rounded-full flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
              hintsUsed[currentQuestion?.questionId || '']
                ? 'bg-mq-surface-yellow text-mq-warning border-mq-warning/40'
                : 'btn-secondary text-mq-primary hover:bg-mq-surface-soft'
            }`}
          >
            <Lightbulb size={15} />
            <span>ඉඟියක් (Hint)</span>
          </motion.button>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-2 border-b border-mq-border/70 pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-mq-surface-blue text-mq-primary">
              <Sparkles size={14} />
              <span>
                {currentQuestion.skillNameSi} ({currentQuestion.skillName})
              </span>
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <h3 className="text-lg sm:text-2xl font-extrabold text-mq-text-strong leading-snug flex-1 font-sinhala">
                {preferredLanguage === 'English' ||
                (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                  ? currentQuestion.promptEn
                  : currentQuestion.promptSi}
              </h3>
              <button
                type="button"
                onClick={() => setShowTranslation((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-mq-surface-soft text-mq-text-muted hover:text-mq-primary border border-mq-border cursor-pointer shrink-0"
              >
                <Languages size={14} />
                <span>
                  {showTranslation
                    ? 'සඟවන්න'
                    : preferredLanguage === 'English' ||
                      (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? 'සිංහල'
                    : 'English'}
                </span>
              </button>
            </div>

            {showTranslation && (
              <div className="p-3.5 rounded-2xl bg-mq-surface-soft border border-mq-border/70 text-xs sm:text-sm text-mq-text font-sinhala">
                <p>
                  {preferredLanguage === 'English' ||
                  (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? currentQuestion.promptSi
                    : currentQuestion.promptEn}
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.questionId] === opt.id;
                return (
                  <motion.button
                    type="button"
                    key={opt.id}
                    whileTap={{ scale: shouldReduceMotion ? 1 : 0.985 }}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-mq-primary bg-mq-surface-blue text-mq-primary ring-2 ring-mq-primary/20 shadow-xs'
                        : 'border-mq-border bg-white hover:border-mq-primary/40 hover:bg-mq-surface-soft/40'
                    }`}
                  >
                    <div>
                      <span className="block text-base font-bold text-mq-text-strong font-sinhala">
                        {opt.textSi}
                      </span>
                      <span className="block text-xs font-semibold text-mq-text-muted mt-0.5">
                        {opt.textEn}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={20} className="text-mq-primary shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <input
                type="number"
                value={numericInput}
                onChange={(e) => handleNumericChange(e.target.value)}
                placeholder="පිළිතුර මෙහි ලියන්න"
                className="w-full text-center text-2xl font-bold py-3 px-4 rounded-2xl border-2 border-mq-border focus:border-mq-primary focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Hint Modal */}
      <AnimatePresence>
        {showHintModal && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl border border-mq-border max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-mq-warning font-sinhala">ඉඟියක්</span>
                <button
                  type="button"
                  onClick={() => setShowHintModal(false)}
                  className="p-1 rounded-full text-mq-text-muted cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm font-bold text-mq-text-strong font-sinhala">
                {currentQuestion.hintSi}
              </p>
              <button
                type="button"
                onClick={() => setShowHintModal(false)}
                className="btn btn-primary w-full py-2.5 rounded-full text-xs font-bold font-sinhala"
              >
                තේරුණා
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrev}
          className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} />
          <span>{currentIndex === 0 ? 'ආපසු' : 'පෙර ප්‍රශ්නය'}</span>
        </button>

        <button
          type="button"
          onClick={() => onSaveAndExit(compileAnswers())}
          className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
        >
          <Save size={15} />
          <span>සුරැක පසුව කරන්න</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting || !isCurrentAnswered}
          onClick={handleNext}
          className="btn btn-primary px-8 py-3 rounded-full text-sm font-bold font-sinhala inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>{currentIndex === totalQuestions - 1 ? 'අවසන් කරමු' : 'ඊළඟ ප්‍රශ්නය'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import type {
  MathQuestion,
  MathItemAnswer,
} from '../../types/onboarding';
import { AnimatedCompanion, type CompanionState } from './AnimatedCompanion';

interface Props {
  grade: number;
  preferredLanguage?: string;
  primaryInstructionLanguage?: string;
  questions: MathQuestion[];
  onSubmit: (answers: MathItemAnswer[]) => Promise<void>;
  onSaveAndExit: (answers: MathItemAnswer[]) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
  avatarId?: string;
}

export const MathAssessmentStep: React.FC<Props> = ({
  grade,
  preferredLanguage = 'Sinhala',
  primaryInstructionLanguage = 'Sinhala',
  questions,
  onSubmit,
  onSaveAndExit,
  onBack,
  isSubmitting,
  avatarId,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  // Store user answers by questionId
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [showHintModal, setShowHintModal] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [companionState, setCompanionState] = useState<CompanionState>('idle');

  // Numeric input state
  const [numericInput, setNumericInput] = useState('');

  // Track start time for current question
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setShowHintModal(false);
    setShowTranslation(false);
    setCompanionState('idle');
    // If existing answer is numeric, populate input
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

  const recordTimeForCurrent = () => {
    if (!currentQuestion) return;
    const elapsedSeconds = (Date.now() - questionStartTimeRef.current) / 1000.0;
    const prev = responseTimesRef.current[currentQuestion.questionId] || 0;
    responseTimesRef.current[currentQuestion.questionId] = Number(
      (prev + elapsedSeconds).toFixed(1)
    );
  };

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    recordTimeForCurrent();

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: optionId,
    }));
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
    setHintsUsed((prev) => ({
      ...prev,
      [currentQuestion.questionId]: true,
    }));
    setCompanionState('hint');
    setShowHintModal(true);
  };

  const compileAnswers = (): MathItemAnswer[] => {
    recordTimeForCurrent();
    return questions.map((q) => ({
      questionId: q.questionId,
      userAnswer: answers[q.questionId] !== undefined ? answers[q.questionId] : '',
      attempts: attempts[q.questionId] || 1,
      responseTimeSeconds: responseTimesRef.current[q.questionId] || 5.0,
      hintUsed: Boolean(hintsUsed[q.questionId]),
    }));
  };

  const handleNext = () => {
    if (isSubmitting) return;
    recordTimeForCurrent();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompanionState('success');
      onSubmit(compileAnswers());
    }
  };

  const handlePrev = () => {
    if (isSubmitting) return;
    recordTimeForCurrent();
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
      {/* Top Header Card with Question Progress & Animated Companion */}
      <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <AnimatedCompanion
            avatarId={avatarId}
            state={companionState}
            size="md"
            onAnimationComplete={() => {
              if (companionState === 'encouragement') {
                setCompanionState('idle');
              }
            }}
          />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mq-primary block">
              {grade} වන ශ්‍රේණිය • ගණිත අභ්‍යාසය (Grade {grade} Math Quest)
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

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-10 shadow-sm space-y-6 animate-fade-in">
          {/* Skill Tag */}
          <div className="flex items-center justify-between gap-2 border-b border-mq-border/70 pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-mq-surface-blue text-mq-primary">
              <Sparkles size={14} />
              <span>
                {currentQuestion.skillNameSi} ({currentQuestion.skillName})
              </span>
            </span>
            <span className="text-xs text-mq-text-muted capitalize font-semibold">
              Difficulty: {currentQuestion.difficulty}
            </span>
          </div>

          {/* Prompt */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <h3
                className={`text-lg sm:text-2xl font-extrabold text-mq-text-strong leading-snug flex-1 ${
                  preferredLanguage === 'English' ||
                  (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? 'font-sans'
                    : 'font-sinhala'
                }`}
              >
                {preferredLanguage === 'English' ||
                (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                  ? currentQuestion.promptEn
                  : currentQuestion.promptSi}
              </h3>
              <button
                type="button"
                onClick={() => setShowTranslation((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer self-start ${
                  showTranslation
                    ? 'bg-mq-surface-blue text-mq-primary border border-mq-primary/40'
                    : 'bg-mq-surface-soft hover:bg-mq-surface-blue text-mq-text-muted hover:text-mq-primary border border-mq-border'
                }`}
                title={showTranslation ? 'Hide translation' : 'Show translation'}
              >
                <Languages size={14} />
                <span>
                  {showTranslation
                    ? 'පරිවර්තනය සඟවන්න (Hide)'
                    : preferredLanguage === 'English' ||
                      (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? 'සිංහල පරිවර්තනය (Sinhala)'
                    : 'English Translation'}
                </span>
              </button>
            </div>

            {/* Optional Translation Accordion */}
            {showTranslation && (
              <div className="p-3.5 rounded-2xl bg-mq-surface-soft border border-mq-border/70 text-xs sm:text-sm text-mq-text leading-relaxed animate-fade-in font-sinhala">
                <span className="text-[10px] font-bold text-mq-text-muted uppercase tracking-wider block mb-1">
                  {preferredLanguage === 'English' ||
                  (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? 'සිංහල අනුවාදය (Sinhala Translation)'
                    : 'English Translation'}
                </span>
                <p>
                  {preferredLanguage === 'English' ||
                  (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
                    ? currentQuestion.promptSi
                    : currentQuestion.promptEn}
                </p>
              </div>
            )}
          </div>

          {/* Visual Representation (if visual type) */}
          {currentQuestion.visualRepresentation && (
            <div className="p-6 rounded-2xl bg-mq-surface-soft border border-mq-border/60 flex items-center justify-center text-center">
              {currentQuestion.visualRepresentation.type === 'icon_grid' && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-4xl sm:text-5xl">
                  {Array.from({ length: currentQuestion.visualRepresentation.count || 5 }).map(
                    (_, i) => (
                      <span
                        key={i}
                        className="animate-float"
                        style={{ animationDelay: `${i * 150}ms` }}
                      >
                        {currentQuestion.visualRepresentation?.icon || '🍎'}
                      </span>
                    )
                  )}
                </div>
              )}

              {currentQuestion.visualRepresentation.type === 'addition_dots' && (
                <div className="flex items-center gap-4 text-3xl sm:text-4xl">
                  <div className="flex gap-1.5">
                    {Array.from({
                      length: currentQuestion.visualRepresentation.firstCount || 3,
                    }).map((_, i) => (
                      <span key={i}>
                        {currentQuestion.visualRepresentation?.firstIcon || '🔵'}
                      </span>
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-mq-text-muted">+</span>
                  <div className="flex gap-1.5">
                    {Array.from({
                      length: currentQuestion.visualRepresentation.secondCount || 2,
                    }).map((_, i) => (
                      <span key={i}>
                        {currentQuestion.visualRepresentation?.secondIcon || '🟢'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.visualRepresentation.type === 'subtraction_icons' && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-3xl sm:text-4xl">
                  {Array.from({
                    length: currentQuestion.visualRepresentation.total || 6,
                  }).map((_, i) => {
                    const isRemoved =
                      i >=
                      (currentQuestion.visualRepresentation?.total || 6) -
                        (currentQuestion.visualRepresentation?.removed || 2);
                    return (
                      <span
                        key={i}
                        className={`transition-opacity ${
                          isRemoved ? 'opacity-30 line-through' : 'opacity-100'
                        }`}
                      >
                        {currentQuestion.visualRepresentation?.icon || '⭐'}
                      </span>
                    );
                  })}
                </div>
              )}

              {currentQuestion.visualRepresentation.type === 'grouped_items' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({
                    length: currentQuestion.visualRepresentation.groups || 4,
                  }).map((_, g) => (
                    <div
                      key={g}
                      className="p-3 rounded-xl bg-white border border-mq-border flex flex-col items-center shadow-xs"
                    >
                      <span className="text-xs font-bold text-mq-text-muted mb-1 font-sinhala">
                        පිඟාන {g + 1}
                      </span>
                      <div className="flex gap-1 text-2xl">
                        {Array.from({
                          length:
                            currentQuestion.visualRepresentation?.itemsPerGroup ||
                            3,
                        }).map((_, it) => (
                          <span key={it}>
                            {currentQuestion.visualRepresentation?.icon || '🥭'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.visualRepresentation.type === 'fraction_circle' && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-24 h-24 rounded-full border-4 border-mq-primary relative overflow-hidden flex items-center justify-center bg-white shadow-xs">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-mq-primary/30 border-l border-b border-mq-primary" />
                    <span className="text-xl font-bold text-mq-text-strong font-mono">1/4</span>
                  </div>
                  <span className="text-xs text-mq-text-muted font-sinhala">
                    සමාන කොටස් 4කින් 1ක්
                  </span>
                </div>
              )}

              {currentQuestion.visualRepresentation.type === 'rectangle_dimensions' && (
                <div className="w-48 h-28 rounded-xl border-2 border-dashed border-mq-primary flex flex-col items-center justify-center bg-white relative">
                  <span className="absolute -top-3 px-2 bg-white text-xs font-bold text-mq-primary">
                    දිග = {currentQuestion.visualRepresentation.length} m
                  </span>
                  <span className="absolute -left-7 py-1 px-1 text-xs font-bold text-mq-primary rotate-[-90deg]">
                    {currentQuestion.visualRepresentation.width} m
                  </span>
                  <span className="text-xs text-mq-text-muted font-sinhala">
                    සෘජුකෝණාස්‍රය
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Options / Answer Input Section */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            /* Multiple Choice / Visual Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentQuestion.options.map((opt) => {
                const isSelected =
                  answers[currentQuestion.questionId] === opt.id;
                return (
                  <motion.button
                    type="button"
                    key={opt.id}
                    whileTap={{ scale: shouldReduceMotion ? 1 : 0.985 }}
                    whileHover={{ scale: shouldReduceMotion ? 1 : 1.01 }}
                    transition={{ duration: 0.15 }}
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
                    {opt.visualIcon && (
                      <span className="text-xl shrink-0">{opt.visualIcon}</span>
                    )}
                    {isSelected && (
                      <CheckCircle2
                        size={20}
                        className="text-mq-primary shrink-0"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            /* Numeric / Text Answer Input */
            <div className="max-w-md mx-auto space-y-3">
              <label className="block text-sm font-bold text-mq-text-strong font-sinhala text-center">
                ඔබේ පිළිතුර ඇතුළත් කරන්න (Type your answer):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={numericInput}
                  onChange={(e) => handleNumericChange(e.target.value)}
                  placeholder="පිළිතුර මෙහි ලියන්න (e.g. 15)"
                  className="w-full text-center text-2xl font-bold py-3.5 px-4 rounded-2xl border-2 border-mq-border focus:border-mq-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hint Modal / Drawer */}
      <AnimatePresence>
        {showHintModal && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-white rounded-3xl border border-mq-border max-w-md w-full p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-mq-warning font-bold">
                  <Lightbulb size={20} />
                  <span className="text-sm font-sinhala">ප්‍රයෝජනවත් ඉඟියක් (Helpful Hint)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHintModal(false);
                    setCompanionState('idle');
                  }}
                  className="p-1.5 rounded-full hover:bg-mq-surface-soft text-mq-text-muted cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Companion Guidance In Hint Modal */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <AnimatedCompanion
                  avatarId={avatarId}
                  state="hint"
                  size="sm"
                />
                <p className="text-xs font-semibold text-mq-text-muted font-sinhala">
                  කලබල නොවී සෙමෙන් කියවා විසඳන්න! (Take your time, you've got this!)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-mq-surface-yellow border border-mq-warning/30 space-y-2 font-sinhala">
                <p className="text-sm font-bold text-mq-text-strong">
                  {currentQuestion.hintSi}
                </p>
                <p className="text-xs text-mq-text-muted italic">
                  {currentQuestion.hintEn}
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowHintModal(false);
                  setCompanionState('idle');
                }}
                className="btn btn-primary w-full py-2.5 rounded-full text-xs font-bold font-sinhala"
              >
                තේරුණා, මම පිළිතුරු දෙන්නම් (Got it!)
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons: Prev, Next / Submit */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            onClick={handlePrev}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowLeft size={15} />
            <span>{currentIndex === 0 ? 'ආපසු' : 'පෙර ප්‍රශ්නය'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            onClick={() => onSaveAndExit(compileAnswers())}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
          >
            <Save size={15} />
            <span>සුරැක පසුව කරන්න</span>
          </motion.button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: isSubmitting || !isCurrentAnswered ? 1 : 1.01 }}
          disabled={isSubmitting || !isCurrentAnswered}
          onClick={handleNext}
          className="btn btn-primary w-full sm:w-auto px-8 py-3 rounded-full text-sm font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : currentIndex === totalQuestions - 1 ? (
            <>
              <span>ඇගයීම අවසන් කර ප්‍රතිඵල බලමු</span>
              <Sparkles size={16} />
            </>
          ) : (
            <>
              <span>ඊළඟ ප්‍රශ්නය</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

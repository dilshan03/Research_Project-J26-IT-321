import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Languages,
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { MathQuestion, MathItemAnswer } from '../../types/onboarding';
import { AnimatedCompanion, type CompanionState } from './AnimatedCompanion';
import { LivingCanvasIsland, type RepresentationMode } from './LivingCanvasIsland';

interface LivingCanvasOnboardingProps {
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

type CanvasStage = 'A_WAKE_UP' | 'B_SHAPE_ISLAND' | 'D_WORLD_READY';

export const LivingCanvasOnboarding: React.FC<LivingCanvasOnboardingProps> = ({
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

  // Active question index
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentQuestion = questions[currentIndex];

  // Language management
  const initialLang =
    preferredLanguage === 'English' ||
    (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
      ? 'en'
      : 'si';
  const [lang, setLang] = useState<'si' | 'en'>(initialLang);

  // Living Canvas Discovery Stages
  const [stage, setStage] = useState<CanvasStage>('A_WAKE_UP');
  const [companionState, setCompanionState] = useState<CompanionState>('welcome');
  const [representationMode, setRepresentationMode] = useState<RepresentationMode>('nature');
  const [showHint, setShowHint] = useState(false);
  const [isDemonstrating, setIsDemonstrating] = useState(false);

  // Interactive Object Manipulation for g1_num_count_01 (Target: 5 apples)
  const TARGET_COUNT = 5;
  const [placedCount, setPlacedCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(TARGET_COUNT);

  // Assessment tracking
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});

  // Reset or initialize on question change
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setStage('A_WAKE_UP');
    setCompanionState('welcome');
    setShowHint(false);
    setIsDemonstrating(false);
    setPlacedCount(0);
    setAvailableCount(TARGET_COUNT);
  }, [currentIndex]);

  const recordTime = () => {
    if (!currentQuestion) return;
    const elapsed = (Date.now() - questionStartTimeRef.current) / 1000.0;
    const prev = responseTimesRef.current[currentQuestion.questionId] || 0;
    responseTimesRef.current[currentQuestion.questionId] = Number(
      (prev + elapsed).toFixed(1)
    );
  };

  // Check if current question is the supported Living Canvas slice
  const isLivingCanvasQuestion =
    currentQuestion &&
    (currentQuestion.questionId === 'g1_num_count_01' ||
      currentQuestion.skillId === 'number_sense' ||
      currentQuestion.visualRepresentation?.type === 'icon_grid');

  // Object manipulation handlers
  const handlePlaceItem = () => {
    if (availableCount <= 0) return;
    const newPlaced = placedCount + 1;
    const newAvailable = availableCount - 1;
    setPlacedCount(newPlaced);
    setAvailableCount(newAvailable);
    setCompanionState('encouragement');

    // Record attempt
    if (currentQuestion) {
      setAttempts((prev) => ({
        ...prev,
        [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + 1,
      }));
    }
  };

  const handleRemoveItem = (_index: number) => {
    if (placedCount <= 0) return;
    setPlacedCount((prev) => prev - 1);
    setAvailableCount((prev) => prev + 1);
  };

  const handleReset = () => {
    setPlacedCount(0);
    setAvailableCount(TARGET_COUNT);
    setCompanionState('idle');
  };

  // Run a short, gentle visual demonstration (Stage C)
  const handleRunDemonstration = () => {
    setIsDemonstrating(true);
    setCompanionState('hint');
    if (currentQuestion) {
      setHintsUsed((prev) => ({ ...prev, [currentQuestion.questionId]: true }));
    }
    setTimeout(() => {
      setIsDemonstrating(false);
      setCompanionState('idle');
    }, 2500);
  };

  const handleToggleHint = () => {
    setShowHint((prev) => !prev);
    if (!showHint && currentQuestion) {
      setHintsUsed((prev) => ({ ...prev, [currentQuestion.questionId]: true }));
      setCompanionState('hint');
    } else {
      setCompanionState('idle');
    }
  };

  // Map island discovery result to existing question bank answer
  const handleConfirmIsland = () => {
    if (!currentQuestion) return;
    recordTime();

    // Map placed count to option ID: 3 -> opt_3, 4 -> opt_4, 5 -> opt_5, 6 -> opt_6
    let selectedOptionId = 'opt_5';
    if (placedCount === 3) selectedOptionId = 'opt_3';
    else if (placedCount === 4) selectedOptionId = 'opt_4';
    else if (placedCount === 5) selectedOptionId = 'opt_5';
    else if (placedCount === 6) selectedOptionId = 'opt_6';
    else {
      // Default to closest option
      selectedOptionId = `opt_${placedCount}`;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: selectedOptionId,
    }));

    if (placedCount === TARGET_COUNT) {
      setCompanionState('success');
      setStage('D_WORLD_READY');
    } else {
      // Gentle encouragement to adjust, not a harsh "wrong answer"
      setCompanionState('encouragement');
      setAttempts((prev) => ({
        ...prev,
        [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + 1,
      }));
    }
  };

  const compileAnswers = (): MathItemAnswer[] => {
    recordTime();
    return questions.map((q) => {
      let finalAns = answers[q.questionId];
      if (finalAns === undefined) {
        // If it was the living canvas question and completed
        if (q.questionId === 'g1_num_count_01') {
          finalAns = `opt_${placedCount || 5}`;
        } else {
          finalAns = '';
        }
      }
      return {
        questionId: q.questionId,
        userAnswer: finalAns,
        attempts: attempts[q.questionId] || 1,
        responseTimeSeconds: responseTimesRef.current[q.questionId] || 6.5,
        hintUsed: Boolean(hintsUsed[q.questionId]),
      };
    });
  };

  const handleFinishAndSubmit = () => {
    if (isSubmitting) return;
    const finalAnswers = compileAnswers();
    onSubmit(finalAnswers);
  };

  // Fallback handler for unsupported questions in Grade 1-5
  const handleSelectFallbackOption = (optId: string) => {
    if (!currentQuestion) return;
    recordTime();
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: optId,
    }));
    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + 1,
    }));
    setCompanionState('encouragement');
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishAndSubmit();
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Top Child-Friendly Discovery Navigation Bar (Minimal, No Pressure) */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl border border-teal-100 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        {/* Companion & Discovery Title */}
        <div className="flex items-center gap-3 min-w-0">
          <AnimatedCompanion
            avatarId={avatarId}
            state={companionState}
            size="md"
            onAnimationComplete={() => {
              if (companionState === 'encouragement') setCompanionState('idle');
            }}
          />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block font-sinhala">
              {lang === 'si'
                ? 'සජීවී කැන්වසය • ඔබේ පුංචි ලෝකය'
                : 'The Living Canvas • A Little World That Learns About Me'}
            </span>
            <span className="text-xs font-semibold text-slate-500 block">
              {lang === 'si'
                ? `සොයාගැනීමේ අදියර ${currentIndex + 1} න් ${questions.length}`
                : `Discovery step ${currentIndex + 1} of ${questions.length}`}
            </span>
          </div>
        </div>

        {/* Language & Sound / Support Controls */}
        <div className="flex items-center gap-2">
          {/* Sinhala / English Toggle */}
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === 'si' ? 'en' : 'si'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            title="Toggle Language"
          >
            <Languages size={14} />
            <span>{lang === 'si' ? 'English' : 'සිංහල'}</span>
          </button>

          {/* Gentle Hint Trigger */}
          <button
            type="button"
            onClick={handleToggleHint}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              showHint
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Lightbulb size={14} className="text-amber-500" />
            <span className="font-sinhala">
              {lang === 'si' ? 'ඉඟියක්' : 'Hint'}
            </span>
          </button>
        </div>
      </div>

      {/* Gentle Hint Drawer / Speech Bubble */}
      <AnimatePresence>
        {showHint && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="bg-amber-50/90 backdrop-blur-xs rounded-2xl border border-amber-200 p-4 shadow-sm flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Lightbulb size={18} />
            </div>
            <div className="space-y-1 text-xs sm:text-sm font-sinhala flex-1">
              <span className="font-bold text-amber-900 block">
                {lang === 'si' ? 'මිතුරු ඉඟියක්:' : 'Gentle Clue:'}
              </span>
              <p className="text-amber-800">
                {lang === 'si' ? currentQuestion.hintSi : currentQuestion.hintEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PRIMARY EXPERIENCE: The Living Canvas (Grade 1 Slice)                      */}
      {/* ========================================================================= */}
      {isLivingCanvasQuestion ? (
        <div className="space-y-5">
          {/* Stage A: The Island Wakes Up Greeting */}
          {stage === 'A_WAKE_UP' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.35 }}
              className="bg-white rounded-3xl border border-teal-100 p-6 sm:p-8 shadow-sm text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-3xl mx-auto flex items-center justify-center shadow-xs">
                🏝️
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-extrabold text-teal-950 font-sinhala leading-snug">
                  {lang === 'si'
                    ? 'ආයුබෝවන්! මේ ඔයාගෙම පුංචි ලෝකය.'
                    : 'Welcome! This is your little world.'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-sinhala leading-relaxed">
                  {lang === 'si'
                    ? 'අපි එකතු වී මෙම දිවයින ගවේෂණය කරමින් හැඩගස්වමු. කිසිදු කලබලයක් නැත, ඔබේම වේගයෙන් සිතන්න.'
                    : "Let's explore and shape this island together. Take all the time you need, in your own calm way."}
                </p>
              </div>

              {/* Action Buttons: Demonstration & Start Shaping */}
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={handleRunDemonstration}
                  className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold text-teal-800 inline-flex items-center gap-2 cursor-pointer font-sinhala"
                >
                  <Play size={14} className="text-teal-600" />
                  <span>{lang === 'si' ? 'පෙන්නන්න (Demonstrate)' : 'Show Demonstration'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('B_SHAPE_ISLAND');
                    setCompanionState('idle');
                  }}
                  className="btn btn-primary px-6 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>{lang === 'si' ? 'අපි ලෝකය හැඩගස්වමු!' : "Let's Shape the Island!"}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Interactive Floating Island Environment (Stage B & Stage D) */}
          {(stage === 'B_SHAPE_ISLAND' || stage === 'D_WORLD_READY') && (
            <div className="space-y-4">
              <LivingCanvasIsland
                placedCount={placedCount}
                totalTarget={TARGET_COUNT}
                representationMode={representationMode}
                onToggleRepresentation={() =>
                  setRepresentationMode((prev) => (prev === 'nature' ? 'stones' : 'nature'))
                }
                availableCount={availableCount}
                onPlaceItem={handlePlaceItem}
                onRemoveItem={handleRemoveItem}
                onReset={handleReset}
                isDemonstrating={isDemonstrating}
                isCompleted={stage === 'D_WORLD_READY'}
                language={lang}
              />

              {/* Stage B: Shape Confirmation Action */}
              {stage === 'B_SHAPE_ISLAND' && (
                <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStage('A_WAKE_UP')}
                    className="btn btn-secondary px-4 py-2 rounded-full text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 font-sinhala cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>{lang === 'si' ? 'නැවත මුලට' : 'Back to Greeting'}</span>
                  </button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmIsland}
                    className="btn btn-primary px-8 py-3 rounded-full text-sm font-bold font-sinhala inline-flex items-center gap-2 shadow-sm cursor-pointer ml-auto"
                  >
                    <span>
                      {lang === 'si'
                        ? 'මගේ ලෝකය හැඩගැසුණා! (The Island is Ready)'
                        : 'The Island is Ready!'}
                    </span>
                    <Sparkles size={16} />
                  </motion.button>
                </div>
              )}

              {/* Stage D: The Island Becomes Their World (Celebration & Transition) */}
              {stage === 'D_WORLD_READY' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 rounded-3xl border border-emerald-200 p-6 sm:p-8 text-center space-y-4 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-xs">
                    🌸
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className="text-xl sm:text-2xl font-extrabold text-emerald-950 font-sinhala">
                      {lang === 'si'
                        ? 'ඔබේ පුංචි ලෝකය සූදානම්!'
                        : 'Your Little World is Ready!'}
                    </h4>
                    <p className="text-xs sm:text-sm text-emerald-800 font-sinhala">
                      {lang === 'si'
                        ? 'අපි MathQuest චාරිකාව ආරම්භ කරමු. ඔබ ඉතා දක්ෂ ලෙස දිවයින හැඩගැසුවා!'
                        : "Let's begin our MathQuest adventure. You shaped this island wonderfully!"}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFinishAndSubmit}
                      className="btn btn-primary px-10 py-3.5 rounded-full text-sm font-bold font-sinhala inline-flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{lang === 'si' ? 'සුරැකෙමින් පවතී...' : 'Saving...'}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {lang === 'si'
                              ? 'වික්‍රමය ආරම්භ කරමු (Begin Adventure)'
                              : 'Begin Adventure'}
                          </span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* FUNCTIONAL STORYBOOK FALLBACK: For remaining Grade 1 items or Grades 2-5   */
        /* (Preserves 100% existing scoring, question IDs, and ELP-X data contracts) */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl border border-teal-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-teal-800 font-sinhala">
              {lang === 'si' ? currentQuestion?.skillNameSi : currentQuestion?.skillName}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Grade {grade}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-sinhala leading-snug">
              {lang === 'si' ? currentQuestion?.promptSi : currentQuestion?.promptEn}
            </h3>
          </div>

          {/* Options Cards */}
          {currentQuestion?.options && currentQuestion.options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.questionId] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectFallbackOption(opt.id)}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <span className="block text-sm font-bold text-slate-800 font-sinhala">
                        {lang === 'si' ? opt.textSi : opt.textEn}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fallback Navigation */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={handlePrevQuestion}
              className="btn btn-secondary px-4 py-2 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>{lang === 'si' ? 'පෙර පියවර' : 'Previous'}</span>
            </button>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="btn btn-primary px-6 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5 shadow-sm"
            >
              <span>
                {currentIndex === questions.length - 1
                  ? lang === 'si'
                    ? 'ඇගයීම අවසන් කරමු'
                    : 'Complete Assessment'
                  : lang === 'si'
                  ? 'ඊළඟ පියවර'
                  : 'Next'}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Subtle Pause & Exit at Bottom (Accessible, no pressure) */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => onSaveAndExit(compileAnswers())}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer font-sinhala"
        >
          {lang === 'si'
            ? 'පසුවට සුරැකීමට අවශ්‍ය නම් මෙතැනින් නික්මෙන්න (Pause & Exit)'
            : 'Pause and save for later'}
        </button>
      </div>
    </div>
  );
};

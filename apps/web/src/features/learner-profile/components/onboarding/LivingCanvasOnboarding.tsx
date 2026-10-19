import React, { useState, useEffect, useRef } from 'react';
import { useScrollToTopOnChange } from '../../../../shared/hooks/useScrollToTopOnChange';
import type { MathQuestion, MathItemAnswer, LearningPreferencesData } from '../../types/onboarding';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Lightbulb,
  Languages,
  Play,
  Volume2,
} from 'lucide-react';
import { AnimatedCompanion, type CompanionState } from './AnimatedCompanion';
import { LivingCanvasIsland, type RepresentationMode } from './LivingCanvasIsland';

interface LivingCanvasOnboardingProps {
  grade: number;
  preferredLanguage?: string;
  primaryInstructionLanguage?: string;
  sinhalaComprehension?: string;
  englishComprehension?: string;
  learningPreferences?: LearningPreferencesData | null;
  questions: MathQuestion[];
  onSubmit: (answers: MathItemAnswer[]) => Promise<void>;
  onSaveAndExit: (answers: MathItemAnswer[]) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
  avatarId?: string;
}

type CanvasStage = 'B_SHAPE_ISLAND' | 'D_WORLD_READY';

export const LivingCanvasOnboarding: React.FC<LivingCanvasOnboardingProps> = ({
  grade: _grade,
  preferredLanguage = 'Sinhala',
  primaryInstructionLanguage = 'Sinhala',
  sinhalaComprehension: _sinhalaComp,
  englishComprehension: _englishComp,
  learningPreferences,
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

  // Language management - initialized strictly from parent preference
  const initialLang =
    preferredLanguage === 'English' ||
    (preferredLanguage === 'Bilingual' && primaryInstructionLanguage === 'English')
      ? 'en'
      : 'si';
  const [lang, setLang] = useState<'si' | 'en'>(initialLang);

  // Living Canvas Discovery Stages
  const [stage, setStage] = useState<CanvasStage>('B_SHAPE_ISLAND');
  useScrollToTopOnChange(`${stage}:${currentIndex}`);
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [representationMode, setRepresentationMode] = useState<RepresentationMode>('nature');
  const [showHint, setShowHint] = useState(false);
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ si: string; en: string } | null>(null);

  // Pool of objects: 8 apples available on tree canopy (more than target 5)
  const TOTAL_POOL = 8;
  const TARGET_COUNT = 5;
  const [placedCount, setPlacedCount] = useState(0);
  const availableCount = Math.max(0, TOTAL_POOL - placedCount);

  // Assessment evidence tracking
  // Rule: Do not count object taps as attempts. Confirmed attempts only increment upon confirmation.
  const [confirmedAttempts, setConfirmedAttempts] = useState(0);
  const [selfCorrectionsCount, setSelfCorrectionsCount] = useState(0);
  const firstConfirmedResponseRef = useRef<string | null>(null);
  const isFirstCorrectRef = useRef<boolean | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const [demonstrationsUsed, setDemonstrationsUsed] = useState<Record<string, boolean>>({});
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});

  // Reset or initialize on question change
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setStage('B_SHAPE_ISLAND');
    setCompanionState('idle');
    setShowHint(false);
    setIsDemonstrating(false);
    setPlacedCount(0);
    setConfirmedAttempts(0);
    setSelfCorrectionsCount(0);
    firstConfirmedResponseRef.current = null;
    isFirstCorrectRef.current = null;
    setFeedbackMessage(null);
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

  // Object manipulation handlers: Child controls picking and removal freely
  const handlePlaceItem = () => {
    if (availableCount <= 0) return;
    setPlacedCount((prev) => prev + 1);
    setCompanionState('idle');
    // Notice: Does NOT increment assessment attempts! Object taps are not attempts.
  };

  const handleRemoveItem = (_index: number) => {
    if (placedCount <= 0) return;
    setPlacedCount((prev) => prev - 1);
    // Track self-corrections before confirmation separately from assessment attempts
    setSelfCorrectionsCount((prev) => prev + 1);
  };

  const handleReset = () => {
    if (placedCount > 0) {
      setSelfCorrectionsCount((prev) => prev + 1);
    }
    setPlacedCount(0);
    setCompanionState('idle');
  };

  // Run a short, gentle visual demonstration
  const handleRunDemonstration = () => {
    setIsDemonstrating(true);
    setCompanionState('hint');
    if (currentQuestion) {
      setDemonstrationsUsed((prev) => ({ ...prev, [currentQuestion.questionId]: true }));
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

  // Explicit "All Done" confirmation handler
  const handleConfirmIsland = () => {
    if (!currentQuestion) return;
    recordTime();

    const newAttempts = confirmedAttempts + 1;
    setConfirmedAttempts(newAttempts);

    // Map placed count to option ID: 3 -> opt_3, 4 -> opt_4, 5 -> opt_5, 6 -> opt_6
    const selectedOptionId = `opt_${placedCount}`;

    // Record first confirmed response permanently:
    // An incorrect first confirmed response is recorded as incorrect even if corrected later.
    if (firstConfirmedResponseRef.current === null) {
      firstConfirmedResponseRef.current = selectedOptionId;
      const isCorrect = placedCount === TARGET_COUNT;
      isFirstCorrectRef.current = isCorrect;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: selectedOptionId,
    }));

    if (placedCount === TARGET_COUNT) {
      setCompanionState('success');
      setStage('D_WORLD_READY');
      setFeedbackMessage(null);
    } else {
      // Gentle encouragement to adjust, not a harsh "wrong answer"
      setCompanionState('encouragement');
      setFeedbackMessage({
        si: `කූඩයේ ඇපල් ${placedCount}ක් ඇත. අපට අවශ්‍ය ඇපල් 5කි. තවත් ඇපල් එකතු කර හෝ ඉවත් කර 'සියල්ල සූදානම්' ඔබන්න!`,
        en: `You gathered ${placedCount} apples. We need 5 apples! Try adding or removing some, then tap All Done!`,
      });
    }
  };

  const compileAnswers = (): MathItemAnswer[] => {
    recordTime();
    return questions.map((q) => {
      let finalAns = answers[q.questionId];
      if (finalAns === undefined) {
        if (q.questionId === 'g1_num_count_01') {
          finalAns = `opt_${placedCount}`;
        } else {
          finalAns = '';
        }
      }

      if (q.questionId === 'g1_num_count_01') {
        const firstConfirmed = firstConfirmedResponseRef.current || `opt_${placedCount}`;
        const isFirstCorrect =
          isFirstCorrectRef.current !== null
            ? isFirstCorrectRef.current
            : placedCount === TARGET_COUNT;

        return {
          questionId: q.questionId,
          userAnswer: finalAns,
          attempts: Math.max(1, confirmedAttempts),
          responseTimeSeconds: responseTimesRef.current[q.questionId] || 6.5,
          hintUsed: Boolean(hintsUsed[q.questionId]),
          firstConfirmedResponse: firstConfirmed,
          isFirstResponseCorrect: isFirstCorrect,
          demonstrationUsed: Boolean(demonstrationsUsed[q.questionId]),
          selfCorrectionsCount: selfCorrectionsCount,
        };
      }

      return {
        questionId: q.questionId,
        userAnswer: finalAns,
        attempts: 1,
        responseTimeSeconds: responseTimesRef.current[q.questionId] || 6.5,
        hintUsed: Boolean(hintsUsed[q.questionId]),
        firstConfirmedResponse: finalAns,
        isFirstResponseCorrect: true,
        demonstrationUsed: false,
        selfCorrectionsCount: 0,
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

  // Web Speech support detection
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in">
      {/* Top Child-Friendly Discovery Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-teal-100 p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block font-sinhala">
              {lang === 'si'
                ? 'සජීවී කැන්වසය • මගේ පුංචි ලෝකය'
                : 'The Living Canvas • A Little World That Learns About Me'}
            </span>
            <span className="text-xs font-semibold text-slate-500 block font-sinhala">
              {lang === 'si'
                ? `ගවේෂණ අදියර ${currentIndex + 1} න් ${questions.length}`
                : `Discovery step ${currentIndex + 1} of ${questions.length}`}
            </span>
          </div>
        </div>

        {/* Language & Clue Controls */}
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

          {/* Gentle Clue Trigger */}
          <button
            type="button"
            onClick={handleToggleHint}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              showHint
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Lightbulb size={14} className={showHint ? 'text-amber-600 fill-amber-500' : 'text-amber-500'} />
            <span className="font-sinhala">
              {lang === 'si' ? 'මිතුරු ඉඟියක්' : 'Gentle Clue'}
            </span>
          </button>
        </div>
      </div>

      {/* Gentle Hint Drawer (Adapts to parent preference: visual_clue, step_guide, audio_hint) */}
      <AnimatePresence>
        {showHint && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="bg-amber-50/95 backdrop-blur-xs rounded-2xl border border-amber-200 p-3.5 shadow-sm flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Lightbulb size={18} className="fill-amber-400" />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm font-sinhala flex-1">
              <span className="font-bold text-amber-900 block">
                {lang === 'si' ? 'මිතුරු ඉඟියක්:' : 'Gentle Clue:'}
              </span>

              {learningPreferences?.hintStyle === 'step_guide' ? (
                <div className="space-y-1 text-amber-900 text-xs font-medium bg-amber-100/60 p-2.5 rounded-xl border border-amber-200">
                  <p>1. {lang === 'si' ? 'ගසෙන් ඇපල් තෝරා තට්ටු කරන්න' : 'Tap apples on the tree to pick them'}</p>
                  <p>2. {lang === 'si' ? 'ඒවා කූඩයට එකතු වේ' : 'They will settle into the basket'}</p>
                  <p>3. {lang === 'si' ? 'කූඩයේ ඇපල් 5ක් වන තුරු ගණන් කරන්න' : 'Count until there are 5 apples in the basket'}</p>
                  <p>4. {lang === 'si' ? "'සියල්ල සූදානම්' බොත්තම ඔබන්න" : "Tap 'All Done' when finished"}</p>
                </div>
              ) : (
                <p className="text-amber-800 leading-relaxed">
                  {lang === 'si' ? currentQuestion.hintSi : currentQuestion.hintEn}
                </p>
              )}

              {/* Audio hint button: only when speech is supported and parent preferred audio assistance */}
              {isSpeechSupported && learningPreferences?.audioAssistance !== 'off' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const textToRead = lang === 'si' ? currentQuestion.hintSi : currentQuestion.hintEn;
                      try {
                        window.speechSynthesis.cancel();
                        const utt = new SpeechSynthesisUtterance(textToRead);
                        utt.lang = lang === 'si' ? 'si-LK' : 'en-US';
                        window.speechSynthesis.speak(utt);
                      } catch {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 px-2.5 py-1 rounded-full bg-amber-200/70 hover:bg-amber-200 cursor-pointer transition-colors"
                  >
                    <Volume2 size={12} />
                    <span>{lang === 'si' ? 'ඉඟියට සවන් දෙන්න' : 'Listen to clue'}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PRIMARY EXPERIENCE: The Living Canvas (Phase 1 Grade 1 Corrected Activity) */}
      {/* ========================================================================= */}
      {isLivingCanvasQuestion ? (
        <div className="space-y-4">
          {/* Friendly Quest Prompt Banner */}
          <div className="bg-white/95 rounded-2xl border border-teal-100 p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide block font-sinhala">
                {lang === 'si' ? 'ගවේෂණ අභියෝගය' : 'Discovery Activity'}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-teal-950 font-sinhala">
                {lang === 'si'
                  ? 'මැජික් ගසෙන් ඇපල් 5ක් කූඩයට එකතු කරන්න. ඔබ සූදානම් වූ පසු "සියල්ල සූදානම්" ඔබන්න!'
                  : 'Gather 5 apples from the magic tree into the basket. When you are ready, tap "All Done"!'}
              </h3>
              {/* Optional bilingual subtitle when bilingual is preferred */}
              {preferredLanguage === 'Bilingual' && (
                <p className="text-xs text-slate-500 font-sans italic">
                  {lang === 'si'
                    ? 'Gather 5 apples from the magic tree into the basket. When ready, tap All Done!'
                    : 'මැජික් ගසෙන් ඇපල් 5ක් කූඩයට එකතු කරන්න.'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRunDemonstration}
              className="btn btn-secondary px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 cursor-pointer font-sinhala"
            >
              <Play size={13} className="text-teal-600" />
              <span>{lang === 'si' ? 'පෙන්නන්න' : 'Demonstrate'}</span>
            </button>
          </div>

          {/* Interactive Floating Island Canvas Component */}
          <LivingCanvasIsland
            placedCount={placedCount}
            targetCount={TARGET_COUNT}
            totalPoolCount={TOTAL_POOL}
            availableCount={availableCount}
            representationMode={representationMode}
            onToggleRepresentation={() =>
              setRepresentationMode((prev) => (prev === 'nature' ? 'stones' : 'nature'))
            }
            onPlaceItem={handlePlaceItem}
            onRemoveItem={handleRemoveItem}
            onReset={handleReset}
            isDemonstrating={isDemonstrating}
            isCompleted={stage === 'D_WORLD_READY'}
            language={lang}
            showHint={showHint}
            onToggleHint={handleToggleHint}
            visualAssistance={learningPreferences?.visualAssistance}
            audioAssistance={learningPreferences?.audioAssistance}
            hintStyle={learningPreferences?.hintStyle}
            celebrationStyle={learningPreferences?.celebrationStyle}
            feedbackMessage={feedbackMessage}
          />

          {/* Stage B: Explicit "All Done" Confirmation Action */}
          {stage === 'B_SHAPE_ISLAND' && (
            <div className="flex items-center justify-end gap-3 pt-1">
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmIsland}
                className="btn btn-primary px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold font-sinhala inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>
                  {lang === 'si'
                    ? 'සියල්ල සූදානම්! (All Done)'
                    : 'All Done!'}
                </span>
                <Sparkles size={16} />
              </motion.button>
            </div>
          )}

          {/* Stage D: Celebration & Adventure Transition */}
          {stage === 'D_WORLD_READY' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 rounded-2xl border border-emerald-200 p-5 sm:p-6 text-center space-y-3 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-xs">
                {learningPreferences?.celebrationStyle === 'badge_sound' ? '🏆' : '🌸'}
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-lg sm:text-xl font-extrabold text-emerald-950 font-sinhala">
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
                  className="btn btn-primary px-8 py-3 rounded-full text-sm font-bold font-sinhala inline-flex items-center gap-2 shadow-md cursor-pointer"
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
      ) : (
        /* ========================================================================= */
        /* FUNCTIONAL STORYBOOK FALLBACK: For unsupported activities or other grades  */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl border border-teal-100 p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <span className="text-xs font-bold text-teal-800 font-sinhala">
              {lang === 'si' ? currentQuestion?.skillNameSi : currentQuestion?.skillName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold font-sinhala border border-slate-200">
              {lang === 'si' ? 'සාමාන්‍ය ඇගයීම් දසුන (Fallback)' : 'Standard View (Fallback)'}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sinhala leading-snug">
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
          <div className="flex items-center justify-between gap-3 pt-2">
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

      {/* Subtle Accessible Pause & Exit at Bottom */}
      <div className="text-center pt-1">
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

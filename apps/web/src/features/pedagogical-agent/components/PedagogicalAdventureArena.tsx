import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
} from 'lucide-react';
import type {
  BlueprintEnvelope,
  DistractorType,
  GameChoiceOption,
  GameMicroStep,
  GameTheme,
  VisualAssetTag,
} from '../../content-adaptation/types';
import { useGameplayTracker } from '../../behaviour-monitoring/useGameplayTracker';
import { Gaja } from '../../content-adaptation/game/Gaja';
import { PedagogicalCompanion } from './PedagogicalCompanion';
import { useInteractionLogger } from '../hooks/useInteractionLogger';
import { useLearnerState } from '../hooks/useLearnerState';
import { useAgentStore } from '../store/useAgentStore';
import type { HintLevel } from '../types/agent.types';

type Lang = 'si' | 'en';

interface Attempt {
  step_order: number;
  option: string;
  correct: boolean;
  distractor_type?: DistractorType | null;
}

const THEMES: Record<
  GameTheme,
  {
    name_si: string;
    name_en: string;
    bg: string;
    card: string;
    accent: string;
    mascot: string;
    mascotBg: string;
  }
> = {
  VILLAGE_MARKET: {
    name_si: 'ගමේ පොළ',
    name_en: 'Village Market',
    bg: 'from-amber-50/90 via-orange-50/50 to-yellow-50/70',
    card: 'border-amber-200',
    accent: 'bg-amber-500',
    mascot: '🧺',
    mascotBg: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  JUNGLE_ADVENTURE: {
    name_si: 'වනාන්තර චාරිකාව',
    name_en: 'Jungle Adventure',
    bg: 'from-emerald-50/90 via-teal-50/50 to-lime-50/70',
    card: 'border-emerald-200',
    accent: 'bg-emerald-500',
    mascot: '🐘',
    mascotBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  SPACE_QUEST: {
    name_si: 'අභ්‍යවකාශ ගමන',
    name_en: 'Space Quest',
    bg: 'from-indigo-50/90 via-sky-50/50 to-violet-50/70',
    card: 'border-indigo-200',
    accent: 'bg-indigo-500',
    mascot: '🚀',
    mascotBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
};

const ASSET_ICON: Record<VisualAssetTag, string> = {
  COIN_BAG: '🪙',
  FRUIT_BASKET: '🍎',
  OPERATOR_CHEST: '🧰',
  NUMBER_BLOCK: '🔢',
  CHARACTER_AVATAR: '🧒',
  SHAPE_CARD: '📐',
  PATTERN_TRAIN: '🚂',
  COMPARISON_SCALE: '⚖️',
};

const FEEDBACK = {
  correct: { si: 'හරි! ඉතා හොඳයි!', en: 'Correct! Well done!' },
  retry: { si: 'කමක් නැහැ, නැවත උත්සාහ කරන්න', en: "That's okay, try again" },
  done: { si: 'ඔබ ක්‍රීඩාව අවසන් කළා!', en: 'You finished the activity!' },
};

function speak(text: string, lang: Lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'si' ? 'si-LK' : 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/** Visual quantity cue: shows up to 10 items so counting stays manageable. */
function QuantityVisual({
  value,
  icon,
  calm,
}: {
  value?: number | null;
  icon: string;
  calm: boolean;
}) {
  if (value == null || value > 10 || value < 1) return null;
  return (
    <div className="flex flex-wrap justify-center gap-0.5 mt-1 text-lg leading-none" aria-hidden>
      {Array.from({ length: value }).map((_, i) => (
        <span
          key={i}
          className={calm ? '' : 'animate-fade-in'}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}

function OptionCard({
  option,
  lang,
  state,
  onPick,
  showQuantity,
  calm,
}: {
  option: GameChoiceOption;
  lang: Lang;
  state: 'idle' | 'wrong' | 'correct';
  onPick: () => void;
  showQuantity: boolean;
  calm: boolean;
}) {
  const styles = {
    idle: 'bg-white border-mq-border hover:border-mq-primary hover:-translate-y-1 hover:shadow-lg cursor-pointer',
    wrong: 'bg-mq-surface-soft border-mq-border opacity-40 cursor-not-allowed',
    correct: 'bg-[var(--mq-success-bg)] border-mq-success ring-4 ring-mq-success/20',
  }[state];

  return (
    <button
      type="button"
      id={`option-${option.text_en.replace(/\W+/g, '-')}`}
      disabled={state !== 'idle'}
      onClick={onPick}
      className={`min-h-24 sm:min-h-28 rounded-3xl border-2 px-4 py-4 text-center transition-all duration-200 ${styles}`}
    >
      <span
        className={`block text-2xl sm:text-3xl font-extrabold text-mq-text-strong ${
          lang === 'si' ? 'sinhala' : ''
        }`}
      >
        {lang === 'si' ? option.text_si : option.text_en}
      </span>
      {showQuantity && <QuantityVisual value={option.numeric_value} icon="🔵" calm={calm} />}
      {state === 'correct' && <CheckCircle2 className="mx-auto mt-2 text-mq-success" size={26} />}
    </button>
  );
}

export interface PedagogicalAdventureArenaProps {
  envelope: BlueprintEnvelope;
  onExit: () => void;
  learnerId?: string;
  studentId?: string;
  parentId?: string;
  studentName?: string;
  studentGrade?: number;
  studentAvatar?: string;
  totalStars?: number;
  totalCoins?: number;
  showResearchHUD?: boolean;
  onComplete?: (result: { activityId: string; starsEarned: number; coinsEarned: number }) => void;
  onRewardEarned?: (starsDelta: number, coinsDelta: number) => void;
  onProgressUpdate?: (progressPercent: number) => void;
  onSessionDataSync?: (summary: {
    completedSteps: number[];
    hintAwareKnowledge: number;
    standardKnowledge: number;
    totalHintsUsed: number;
    cognitiveState?: string;
    fsmState?: string;
    sessionComplete?: boolean;
  }) => void;
}

/**
 * PedagogicalAdventureArena:
 * Dedicated container component inside `features/pedagogical-agent/components/`.
 * Connects the teacher-approved blueprint game with:
 * 1. Side 3D Pedagogical Agent (MathBot 3000 / Gaja) with story-contextual Sinhala speech bubbles & hints
 * 2. Background Bayesian Knowledge Tracing (AD-BKT) & Attention-Disentangled Slip Protection
 * 3. Clean, kid-friendly top bar (NO technical jargon or HUD clutter)
 * 4. Behaviour Monitoring tracker integration (without altering other members' files)
 */
export const PedagogicalAdventureArena: React.FC<PedagogicalAdventureArenaProps> = ({
  envelope,
  onExit,
  learnerId = 'local-demo-learner',
  studentId,
  parentId = 'parent_demo',
  studentName = 'Student',
  studentGrade = 3,
  studentAvatar = '🦉',
  totalStars,
  totalCoins,
  onComplete,
  onRewardEarned,
  onProgressUpdate,
  onSessionDataSync,
}) => {
  const resolvedLearnerId = studentId || learnerId;
  const { blueprint } = envelope;
  const settings = blueprint.adhd_game_settings;
  const theme = THEMES[blueprint.game_theme] || THEMES.VILLAGE_MARKET;
  const calm = settings.stimulus_density === 'LOW';

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const activityId = useMemo(
    () => `mathquest-${blueprint.game_theme}-${blueprint.grade}-${blueprint.topic}`,
    [blueprint.game_theme, blueprint.grade, blueprint.topic]
  );

  // Behaviour Monitoring integration
  const tracker = useGameplayTracker({
    learnerId: resolvedLearnerId,
    activityId,
    gameTheme: blueprint.game_theme,
    grade: blueprint.grade,
    containerRef: gameContainerRef,
  });
  const { isTracking, onStepStart, onAnswerSelect, onAnswerSubmit, onGameExit } = tracker;

  // Game internal states
  const [lang, setLang] = useState<Lang>('si');
  const [stepIndex, setStepIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);

  const [completedRewarded, setCompletedRewarded] = useState(false);
  const [displayedStars, setDisplayedStars] = useState<number | undefined>(totalStars);
  const [displayedCoins, setDisplayedCoins] = useState<number | undefined>(totalCoins);

  // Pedagogical Support Engine state (MathBot emerges on hesitation or lightbulb click)
  const [isSupportActive, setIsSupportActive] = useState<boolean>(false);
  const [idleSeconds, setIdleSeconds] = useState<number>(0);

  const steps = blueprint.micro_steps;
  const finished = stepIndex >= steps.length;
  const currentStep: GameMicroStep | undefined = steps[stepIndex];

  // Timing for response time
  const stepStartTimeRef = useRef<number>(Date.now());

  // Guards to prevent repetitive speech re-triggering bugs
  const lastSpokenStepRef = useRef<number>(-1);
  const lastSpokenLangRef = useRef<Lang>(lang);

  // Reset support visibility and idle timer when a step changes
  useEffect(() => {
    setIsSupportActive(false);
    setIdleSeconds(0);
  }, [stepIndex]);

  // Idle timer: If child stays idle without answering for 18 seconds, Support Agent emerges
  useEffect(() => {
    if (finished || solved || isSupportActive) return;

    const timer = setInterval(() => {
      setIdleSeconds((prev) => {
        const next = prev + 1;
        if (next >= (calm ? 22 : 18)) {
          setIsSupportActive(true);
          // Gently asks if help is needed - does NOT reveal hint automatically
          useAgentStore.getState().playAction('thinking', {
            message:
              lang === 'si'
                ? 'කල්පනා කරනවද? හෝඩුවාවක් බලන්න මාව ඔබන්න! 💡'
                : 'Thinking hard? Click me to see hints! 💡',
            duration: 4.5,
          });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stepIndex, finished, solved, isSupportActive, calm, lang]);

  // Emerges on 2 wrong attempts (verdi answer 2k ebuvoth hri)
  useEffect(() => {
    if (wrongPicks.size >= 2 && !isSupportActive && !solved && !finished) {
      setIsSupportActive(true);
      // Asks if help is needed - does NOT force hint automatically
      useAgentStore.getState().playAction('thinking', {
        message:
          lang === 'si'
            ? 'උදව්වක් අවශ්‍යද? හෝඩුවාවක් බලන්න මාව ඔබන්න! 💡'
            : 'Need some help? Click me to see hints! 💡',
        duration: 4.5,
      });
    }
  }, [wrongPicks.size, isSupportActive, solved, finished, lang]);

  // Explicit Lightbulb Click by child
  const handleOpenSupport = () => {
    setIsSupportActive(true);
    if (useAgentStore.getState().currentHintLevel === 0) {
      handleHintRequest(1);
    } else {
      useAgentStore.getState().playAction('wave', {
        message:
          lang === 'si'
            ? 'හෝඩුවාවන් බලාගන්න! 💡'
            : 'Check out the hints! 💡',
        duration: 3.5,
      });
    }
  };

  useEffect(() => {
    setDisplayedStars(totalStars);
  }, [totalStars]);

  useEffect(() => {
    setDisplayedCoins(totalCoins);
  }, [totalCoins]);

  // Session ID for telemetry
  const sessionId = useMemo(
    () => `adv_${blueprint.activity_id || 'game'}_${resolvedLearnerId}`,
    [blueprint.activity_id, resolvedLearnerId]
  );

  // 1. Telemetry Logger (Runs in background)
  const { logs, metrics, logAnswer, logHint } = useInteractionLogger({
    sessionId,
    studentId: resolvedLearnerId,
    parentId,
    studentName,
    grade: studentGrade,
    questionId: currentStep
      ? `${blueprint.activity_id || 'act'}_step_${currentStep.step_order}`
      : 'adventure_step_0',
    concept: blueprint.topic || 'arithmetic',
  });

  // 2. Mastery Calculation Engine (Runs in background with autoIntervene=false so it does NOT hijack game dialogue)
  const { learnerState, bktComparison, fsmDecision, evaluateInteractions } =
    useLearnerState({
      studentId: resolvedLearnerId,
      parentId,
      sessionId,
      autoIntervene: false, // Critical: Prevents generic FSM messages from spamming and repeating!
    });

  // Re-evaluate BKT in background when interaction logs change
  useEffect(() => {
    if (logs.length > 0) {
      evaluateInteractions(logs);
    }
  }, [logs, evaluateInteractions]);

  // Sync BKT progress to student profile / parent dashboard in background
  useEffect(() => {
    if (onSessionDataSync && logs.length > 0) {
      const completedStepsArray = Array.from({ length: stepIndex }, (_, i) => i + 1);
      onSessionDataSync({
        completedSteps: completedStepsArray,
        hintAwareKnowledge: bktComparison.hintAwareKnowledge,
        standardKnowledge: bktComparison.standardKnowledge,
        totalHintsUsed: metrics.totalHintsCount,
        cognitiveState: learnerState?.cognitiveState,
        fsmState: fsmDecision.fsmState,
        sessionComplete: finished,
      });
    }
  }, [
    stepIndex,
    bktComparison.hintAwareKnowledge,
    bktComparison.standardKnowledge,
    metrics.totalHintsCount,
    learnerState?.cognitiveState,
    fsmDecision.fsmState,
    finished,
    logs.length,
    onSessionDataSync,
  ]);

  // Star calculation based on mistakes
  const starsEarned = useMemo(() => {
    const mistakes = attempts.filter((a) => !a.correct).length;
    return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  }, [attempts]);

  // Contextual Agent Dialogue on Step Start (Runs ONCE per step change to prevent repeating bug)
  useEffect(() => {
    if (
      lastSpokenStepRef.current === stepIndex &&
      lastSpokenLangRef.current === lang
    ) {
      return;
    }

    lastSpokenStepRef.current = stepIndex;
    lastSpokenLangRef.current = lang;
    stepStartTimeRef.current = Date.now();
    useAgentStore.getState().resetHints();

    if (finished) return;

    if (stepIndex === 0 && currentStep) {
      // Support Agent initial greeting (MathBot introduces itself as the helper)
      const supportIntro =
        lang === 'si'
          ? 'ආයුබෝවන්! මම ඔයාගේ AI සහයක (MathBot). ගණන හදන්න උදව් අවශ්‍ය නම් මම හෝඩුවාවක් දෙන්නම්! 💡'
          : "Hello! I'm your AI support companion. Need help? Tap the bulb for a hint! 💡";

      useAgentStore.getState().playAction('wave', { message: supportIntro, duration: 4.0 });
    }
  }, [stepIndex, lang, finished, currentStep, blueprint, theme]);

  // Step start in behaviour tracker
  useEffect(() => {
    if (isTracking && currentStep) {
      onStepStart(currentStep.step_order, currentStep.action_type);
    }
  }, [isTracking, stepIndex, currentStep?.step_order]);

  // On Game Completion: Award stars, coins, and celebrate with game-specific celebration dialogue
  useEffect(() => {
    if (finished && !completedRewarded) {
      setCompletedRewarded(true);
      const earnedCoins = 15;

      setDisplayedStars((prev) => (prev !== undefined ? prev + starsEarned : prev));
      setDisplayedCoins((prev) => (prev !== undefined ? prev + earnedCoins : prev));

      // Celebration dialogue referencing this specific game
      const celebrationMsg =
        blueprint.story_narrative?.gaja_dialogue?.celebrate?.[lang] ||
        (lang === 'si'
          ? `විශිෂ්ටයි! ඔයා '${theme.name_si}' හි සියලුම පියවර සාර්ථකව ජයගත්තා! 🎉`
          : `Splendid! You successfully completed all steps in ${theme.name_en}! 🎉`);

      setIsSupportActive(true);
      useAgentStore.getState().playAction('correctCelebrate', { message: celebrationMsg, duration: 5.0 });

      if (onComplete) {
        onComplete({
          activityId: blueprint.activity_id,
          starsEarned,
          coinsEarned: earnedCoins,
        });
      }

      if (onProgressUpdate) {
        onProgressUpdate(100);
      }
    }
  }, [
    finished,
    completedRewarded,
    starsEarned,
    blueprint.activity_id,
    blueprint.story_narrative,
    theme.name_si,
    theme.name_en,
    lang,
    onComplete,
    onProgressUpdate,
  ]);

  // Construct dynamic 4-level hints strictly referencing THIS micro-step
  const stepHints = useMemo(() => {
    if (!currentStep) return {};
    const gaja = blueprint.story_narrative?.gaja_dialogue;
    const isSi = lang === 'si';

    // Hint 1: Focus attention on this step's question and items
    const lvl1Desc = isSi
      ? `පියවර ${currentStep.step_order} දෙස බලන්න: "${currentStep.instruction_si}". මෙහි ඇති අගයන් කෙරෙහි අවධානය යොමු කරන්න.`
      : `Look at Step ${currentStep.step_order}: "${currentStep.instruction_en}". Pay attention to the given values.`;

    // Hint 2: Scaffolding hint from this game's narrative or operation
    const lvl2Desc =
      gaja?.hint?.[lang] ||
      (isSi
        ? currentStep.action_type === 'SELECT_OPERATOR'
          ? 'අගයන් එකතු වෙනවා නම් (+) ද, අඩු වෙනවා නම් (-) ද තෝරන්න.'
          : 'සංඛ්‍යා පියවරෙන් පියවර සන්සුන්ව ගණන් කර බලන්න.'
        : 'Count step by step steadily.');

    // Hint 3: Distractor elimination based on the actual wrong options of this step
    const wrongOptions = currentStep.game_options.filter((o) => !o.is_correct);
    const sampleWrong = wrongOptions[0];
    const lvl3Desc = sampleWrong
      ? isSi
        ? `සිතන්න: "${sampleWrong.text_si}" මෙතැනට ගැළපෙන්නේ නැත. ඉතිරි විකල්ප සලකා බලන්න.`
        : `Note: "${sampleWrong.text_en}" is not the right choice. Consider the remaining options.`
      : isSi
      ? 'ඉතිරි පිළිතුරු අතරින් වඩාත්ම ගැළපෙන අගය තෝරන්න.'
      : 'Select the best matching option from the choices.';

    // Hint 4: Clear solution reveal for this step
    const lvl4Desc = isSi
      ? `මෙම පියවරේ නිවැරදි පිළිතුර වන්නේ "${currentStep.correct_target_value}" වේ! එය තෝරන්න.`
      : `The correct answer for this step is "${currentStep.correct_target_value}"! Select it.`;

    return {
      1: { title: isSi ? 'හෝඩුවාව 1 (අවධානය)' : 'Hint 1 (Focus)', description: lvl1Desc },
      2: { title: isSi ? 'හෝඩුවාව 2 (මඟපෙන්වීම)' : 'Hint 2 (Guide)', description: lvl2Desc },
      3: { title: isSi ? 'හෝඩුවාව 3 (විශ්ලේෂණය)' : 'Hint 3 (Breakdown)', description: lvl3Desc },
      4: { title: isSi ? 'හෝඩුවාව 4 (විසඳුම)' : 'Hint 4 (Solution)', description: lvl4Desc },
    };
  }, [currentStep, blueprint.story_narrative, lang]);

  // Handle Hint Request from child
  const handleHintRequest = (level: HintLevel) => {
    logHint(level);

    const hintObj = stepHints[level as keyof typeof stepHints];
    const hintMsg = hintObj?.description || 'ගැටලුව සන්සුන්ව විසඳන්න.';

    const actionMap: Record<HintLevel, 'smallHint' | 'guidedHint' | 'stepByStep' | 'explain'> = {
      0: 'smallHint',
      1: 'smallHint',
      2: 'guidedHint',
      3: 'stepByStep',
      4: 'explain',
    };

    useAgentStore.getState().playAction(actionMap[level] || 'smallHint', {
      message: hintMsg,
      duration: 4.5,
    });
  };

  // Exit Game
  const exitGame = async () => {
    try {
      await onGameExit();
    } catch (error) {
      console.error('Failed to finish tracking session', error);
    }
    onExit();
  };

  // Handle Option Pick (Interactions, BKT Mastery & Gaja reaction referencing THIS option)
  const handlePickOption = (opt: GameChoiceOption) => {
    if (!currentStep || solved) return;

    const responseTimeMs = Math.max(200, Date.now() - stepStartTimeRef.current);
    const currentHintLevel = useAgentStore.getState().currentHintLevel;

    // 1. Behaviour Monitoring event
    onAnswerSelect(opt.text_en);
    onAnswerSubmit(opt.text_en, opt.is_correct);

    // 2. Telemetry & BKT Mastery Logging in background
    logAnswer(opt.text_en, opt.is_correct, currentHintLevel, {
      responseTimeMs,
    });

    setAttempts((a) => [
      ...a,
      {
        step_order: currentStep.step_order,
        option: opt.text_en,
        correct: opt.is_correct,
        distractor_type: opt.distractor_type,
      },
    ]);

    if (opt.is_correct) {
      setSolved(true);
      setFeedback('correct');

      // Gaja praises the student referencing this exact correct choice
      const praiseMsg =
        blueprint.story_narrative?.gaja_dialogue?.praise?.[lang] ||
        (lang === 'si'
          ? `හරිම අපූරුයි! '${opt.text_si}' පිළිතුර හරියටම හරි! 🌟`
          : `Awesome! '${opt.text_en}' is the correct choice! 🌟`);

      useAgentStore.getState().playAction('clap', { message: praiseMsg, duration: 3.5 });
    } else {
      setWrongPicks((s) => new Set(s).add(opt.text_en));
      setFeedback('retry');

      // Gaja gently encourages the student referencing this mistake and advising a hint
      const retryMsg =
        blueprint.story_narrative?.gaja_dialogue?.retry?.[lang] ||
        (lang === 'si'
          ? `'${opt.text_si}' නෙවෙයි. කමක් නෑ, හෝඩුවාවක් බලලා නැවත උත්සාහ කරමු!`
          : `'${opt.text_en}' is not quite right. Check a hint and try again!`);

      useAgentStore.getState().playAction('tryAgain', { message: retryMsg, duration: 3.5 });
    }
  };

  const handleNextStep = () => {
    setStepIndex((i) => i + 1);
    setWrongPicks(new Set());
    setSolved(false);
    setFeedback(null);
  };

  const handleRestart = () => {
    lastSpokenStepRef.current = -1;
    setStepIndex(0);
    setWrongPicks(new Set());
    setSolved(false);
    setFeedback(null);
    setAttempts([]);
    setCompletedRewarded(false);
  };

  return (
    <div
      ref={gameContainerRef}
      className={`min-h-screen bg-gradient-to-br ${theme.bg} relative overflow-x-hidden flex flex-col justify-between`}
    >
      {/* Decorative background shapes */}
      {!(settings.visual_clutter_filter && calm) && (
        <>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-mq-secondary/15 rounded-full blur-2xl animate-morph pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-mq-accent-yellow/15 rounded-full blur-2xl animate-morph-square pointer-events-none" />
        </>
      )}

      {/* ========================================================= */}
      {/* 1. TOP HEADER (Simple, Kid-Friendly, NO TECHNICAL WORDS)  */}
      {/* ========================================================= */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 bg-white/80 backdrop-blur-md border-b border-mq-border/70 shadow-xs">
        {/* Left: Exit Button + Game Theme */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="game-exit"
            onClick={() => void exitGame()}
            className="btn bg-white hover:bg-mq-surface-soft text-mq-text-strong border border-mq-border px-3.5 py-2 rounded-2xl shadow-2xs font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>{lang === 'si' ? 'ආපසු' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-2xs border ${theme.mascotBg}`}
            >
              {theme.mascot}
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-mq-text-muted">
                {studentAvatar} {studentName} · Grade {blueprint.grade}
              </p>
              <h2 className="text-sm sm:text-base font-black text-mq-text-strong leading-tight">
                {lang === 'si' ? theme.name_si : theme.name_en}
              </h2>
            </div>
          </div>
        </div>

        {/* Right: Kid Rewards (Stars & Coins) + Language Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {(displayedStars !== undefined || displayedCoins !== undefined) && (
            <div className="flex items-center gap-2">
              {displayedStars !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs sm:text-sm font-black text-amber-950 shadow-2xs">
                  <Star size={16} className="text-amber-500 fill-amber-400 shrink-0 animate-pulse" />
                  <span>
                    {(displayedStars ?? 0).toLocaleString()}{' '}
                    <span className="hidden sm:inline text-[10px] font-extrabold text-amber-800">
                      {lang === 'si' ? 'තරු' : 'Stars'}
                    </span>
                  </span>
                </div>
              )}

              {displayedCoins !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-yellow-50 border-2 border-yellow-300 text-xs sm:text-sm font-black text-yellow-950 shadow-2xs">
                  <span className="text-yellow-600 text-sm">🪙</span>
                  <span>
                    {(displayedCoins ?? 0).toLocaleString()}{' '}
                    <span className="hidden sm:inline text-[10px] font-extrabold text-yellow-800">
                      {lang === 'si' ? 'කාසි' : 'Coins'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Language Toggle */}
          <div
            className="flex rounded-full border border-mq-border bg-white p-0.5 shadow-2xs"
            role="group"
            aria-label="Language"
          >
            {(['si', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                id={`lang-${l}`}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer ${
                  lang === l
                    ? 'bg-mq-primary text-white shadow-2xs'
                    : 'text-mq-text-muted hover:text-mq-primary'
                }`}
              >
                {l === 'si' ? 'සිං' : 'EN'}
              </button>
            ))}
          </div>

          {/* Discreet Help Button (Toggles Pedagogical Support Agent) */}
          <button
            type="button"
            id="bulb-header-trigger"
            onClick={handleOpenSupport}
            className={`px-3 py-1.5 rounded-full text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
              isSupportActive
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white hover:bg-amber-50 text-mq-text-muted hover:text-amber-800 border-mq-border hover:border-amber-300'
            }`}
            title={lang === 'si' ? 'AI සහයකයාගෙන් උදව් ලබාගන්න' : 'Get Help'}
          >
            <span className="text-sm">💡</span>
            <span>{lang === 'si' ? 'උදව්' : 'Help'}</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE: GAME ARENA + SIDE PEDAGOGICAL COMPANION */}
      {/* ========================================================= */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className={`grid grid-cols-1 ${isSupportActive ? 'lg:grid-cols-12' : 'max-w-4xl mx-auto'} gap-6 items-start transition-all duration-300`}>
          {/* Active Game Microstep Card (8 Cols when support open, full centered width when closed) */}
          <div className={`${isSupportActive ? 'lg:col-span-8' : 'w-full'} space-y-4`}>
            {/* Step Progress Dots */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-2" aria-label="Progress">
              {steps.map((s, i) => (
                <div key={s.step_order} className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black border-2 transition-all ${
                      i < stepIndex
                        ? `${theme.accent} text-white border-transparent shadow-xs`
                        : i === stepIndex
                        ? 'bg-white border-mq-primary text-mq-primary scale-110 shadow-md ring-4 ring-mq-primary/20'
                        : 'bg-white/70 border-mq-border text-mq-text-muted'
                    }`}
                  >
                    {i < stepIndex ? <Star size={16} fill="currentColor" /> : s.step_order}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-6 sm:w-8 h-1 rounded-full ${
                        i < stepIndex ? theme.accent : 'bg-mq-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Original Problem Banner (Kept visible to lower cognitive load) */}
            <section
              className={`rounded-3xl bg-white/90 backdrop-blur border-2 ${theme.card} px-5 sm:px-6 py-3.5 shadow-xs`}
            >
              <div className="flex items-center gap-2 text-xs font-black text-mq-text-muted uppercase tracking-wider mb-1">
                <span>{theme.mascot}</span>
                <span>{lang === 'si' ? 'ගණිත ගැටලුව' : 'Math Problem'}</span>
              </div>
              <p className="sinhala text-base sm:text-lg font-extrabold text-mq-text-strong">
                {envelope.raw_sinhala_question || blueprint.raw_sinhala_question}
              </p>
            </section>

            {/* Active Microstep Playing View */}
            {!finished && currentStep && (
              <section
                key={currentStep.step_order}
                className={`rounded-3xl bg-white shadow-md border-2 ${theme.card} p-6 sm:p-8 ${
                  calm ? '' : 'animate-fade-in'
                }`}
              >
                {/* Gaja the Host Presenting the Step Question (Just like the original Content Adaptation game) */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                  <Gaja
                    mood={solved ? 'celebrate' : feedback === 'retry' ? 'encourage' : 'happy'}
                    line={{
                      si: currentStep.instruction_si,
                      en: currentStep.instruction_en,
                    }}
                    lang={lang}
                    calm={calm}
                    size="md"
                  />
                  <button
                    type="button"
                    id="speak-instruction"
                    aria-label="Read instruction aloud"
                    onClick={() =>
                      speak(
                        lang === 'si' ? currentStep.instruction_si : currentStep.instruction_en,
                        lang
                      )
                    }
                    className="self-center sm:self-end mb-8 w-11 h-11 rounded-2xl bg-mq-surface-blue text-mq-primary border border-mq-primary/25 flex items-center justify-center hover:bg-mq-primary hover:text-white transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0"
                    title={lang === 'si' ? 'ප්‍රශ්නය හඬ නගා කියවන්න' : 'Read question aloud'}
                  >
                    <Volume2 size={20} />
                  </button>
                </div>

                {/* Option Choices Grid */}
                <div
                  className={`grid gap-3 sm:gap-4 mt-6 ${
                    currentStep.game_options.length > 3
                      ? 'grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3'
                  }`}
                >
                  {currentStep.game_options.map((opt) => (
                    <OptionCard
                      key={opt.text_en}
                      option={opt}
                      lang={lang}
                      calm={calm}
                      showQuantity={
                        currentStep.action_type === 'CALCULATE_MICROSTEP' && blueprint.grade <= 2
                      }
                      state={
                        solved && opt.is_correct
                          ? 'correct'
                          : wrongPicks.has(opt.text_en) || solved
                          ? 'wrong'
                          : 'idle'
                      }
                      onPick={() => handlePickOption(opt)}
                    />
                  ))}
                </div>

                {/* Step Feedback & Next Step Button */}
                <div className="min-h-16 mt-6 flex items-center justify-center" aria-live="polite">
                  {feedback === 'retry' && (
                    <p
                      className={`px-5 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 font-black text-sm ${
                        lang === 'si' ? 'sinhala' : ''
                      } shadow-xs animate-shake`}
                    >
                      {FEEDBACK.retry[lang]}
                    </p>
                  )}
                  {feedback === 'correct' && (
                    <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
                      <p
                        className={`px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black text-sm ${
                          lang === 'si' ? 'sinhala' : ''
                        } shadow-xs`}
                      >
                        <Sparkles size={16} className="inline -mt-1 mr-1.5 text-emerald-600" />
                        {FEEDBACK.correct[lang]}
                      </p>
                      <button
                        type="button"
                        id="next-step"
                        onClick={handleNextStep}
                        className="btn bg-mq-primary hover:bg-mq-primary-hover active:bg-mq-primary-dark text-white font-extrabold text-base px-6 py-2.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <span>{lang === 'si' ? 'ඊළඟ පියවර' : 'Next Step'}</span> →
                      </button>
                    </div>
                  )}

                  {/* Discreet, non-distracting Hint prompt when support is hidden */}
                  {!isSupportActive && !solved && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={handleOpenSupport}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-mq-text-muted hover:text-amber-800 hover:bg-amber-50/70 border border-mq-border/50 hover:border-amber-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <span className="text-sm">💡</span>
                        <span>{lang === 'si' ? 'උදව්වක් අවශ්‍යද? හෝඩුවාවක් බලන්න' : 'Need help? View a hint'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Finished Celebration Screen (Encouraging, Child-Friendly) */}
            {finished && (
              <section className="rounded-3xl bg-white shadow-xl border-2 border-emerald-300 p-8 sm:p-10 text-center animate-fade-in space-y-5">
                <div className="text-6xl animate-bounce">{theme.mascot}</div>
                <h1
                  className={`text-2xl sm:text-3xl font-black text-mq-text-strong ${
                    lang === 'si' ? 'sinhala' : ''
                  }`}
                >
                  {FEEDBACK.done[lang]}
                </h1>

                {/* 3 Stars Display */}
                <div className="flex justify-center gap-2 my-2">
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      size={44}
                      className={
                        n <= starsEarned
                          ? 'text-amber-400 fill-amber-400 drop-shadow-md animate-float'
                          : 'text-mq-border stroke-[1.5]'
                      }
                      style={{ animationDelay: `${n * 200}ms` }}
                    />
                  ))}
                </div>

                {/* Rewarded Stars & Coins Celebration Banner */}
                <div className="inline-flex flex-wrap items-center justify-center gap-4 bg-amber-50 border-2 border-amber-300/90 px-6 py-3 rounded-2xl shadow-xs">
                  <span className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                    <Star size={20} className="fill-amber-400 text-amber-500 animate-pulse" />
                    <span>
                      +{starsEarned} {lang === 'si' ? 'තරු ලැබුණා!' : 'Stars Earned!'}
                    </span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-yellow-950 flex items-center gap-2">
                    <span className="text-xl">🪙</span>
                    <span>+15 {lang === 'si' ? 'කාසි ලැබුණා!' : 'Coins Earned!'}</span>
                  </span>
                </div>

                {/* Warm Child-Friendly Encouragement Card */}
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold text-center">
                  <p className="text-base font-black text-emerald-800">
                    {lang === 'si'
                      ? 'ඔබ අද දවසේ ගණිත අභියෝගය ජයගත්තා! 🏆'
                      : "You conquered today's math quest! 🏆"}
                  </p>
                  <p className="text-emerald-700 mt-1">
                    {lang === 'si'
                      ? 'ඔබේ දක්ෂතාවය නිසා නව තරු සහ රන් කාසි ඔබේ මාළිගාවට එකතු විය.'
                      : 'New stars and gold coins have been added to your castle.'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    id="game-restart"
                    onClick={handleRestart}
                    className="btn bg-white hover:bg-mq-surface-soft text-mq-text-strong border-2 border-mq-border px-5 py-2.5 rounded-2xl font-black text-sm inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <RotateCcw size={16} />
                    <span>{lang === 'si' ? 'නැවත සෙල්ලම් කරන්න' : 'Play Again'}</span>
                  </button>
                  <button
                    type="button"
                    id="game-finish"
                    onClick={() => void exitGame()}
                    className="btn bg-mq-primary hover:bg-mq-primary-hover active:bg-mq-primary-dark text-white font-black text-sm px-6 py-2.5 rounded-2xl shadow-xs hover:shadow-md inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <CheckCircle2 size={18} />
                    <span>{lang === 'si' ? 'අවසන් කරන්න' : 'Finish Adventure'}</span>
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: PEDAGOGICAL SUPPORT ENGINE (MathBot - only emerges on hesitation/requests) */}
          {isSupportActive && (
            <div className="lg:col-span-4 sticky top-20 space-y-4 animate-fade-in">
              <div className="rounded-3xl overflow-hidden shadow-md transition-all duration-300">
                <PedagogicalCompanion
                  hints={stepHints}
                  onHintRequest={handleHintRequest}
                  disabled={finished}
                  theme="light"
                  defaultAvatar="3d"
                  calm={calm}
                  onClose={() => setIsSupportActive(false)}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PedagogicalAdventureArena;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Flame, Map, RotateCcw, Star, Volume2, VolumeX } from 'lucide-react';
import type { BlueprintEnvelope, DistractorType, GameMicroStep, StudentBehaviorProfile } from '../types';
import {
  beliefs, observe, prefsFromProfile, priorFromProfile, scaffold, trimOptions,
  type TraitBeliefs, type TraitEvent,
} from '../adaptive/traitTracker';
import { useGameplayTracker } from '../../behaviour-monitoring/useGameplayTracker';
import { LINES, SCENES, STORY, getEnglishQuestionFallback, speak, type Lang, type Line, type Mood } from './gameKit';
import { Gaja } from './Gaja';
import { BreathingBreak } from './BreathingBreak';
import { Celebration } from './Celebration';
import { NumberHunt } from './mechanics/NumberHunt';
import { canHunt } from './mechanics/huntNumbers';
import { OperatorDrop } from './mechanics/OperatorDrop';
import { BasketCount } from './mechanics/BasketCount';
import { BalanceScale } from './mechanics/BalanceScale';
import { ShapeMatcher } from './mechanics/ShapeMatcher';
import { PatternTrain } from './mechanics/PatternTrain';
import { ComparisonScale } from './mechanics/ComparisonScale';
import { CountObjects } from './mechanics/CountObjects';
import type { MechanicProps } from './mechanics/types';
import { useCompanion } from './useCompanion';
import { CompanionWardrobeModal } from './CompanionWardrobeModal';

interface Attempt {
  step_order: number;
  label: string;
  correct: boolean;
  /** Exploratory miss (e.g. tapping a word): kept for telemetry, not scored. */
  soft?: boolean;
  distractor_type?: DistractorType | null;
  at: number;
  /** Trait beliefs right after this answer (the learner's adaptation trajectory). */
  beliefs: TraitBeliefs;
}

const IDLE_NUDGE_MS = 20000;
/** Soft per-step time bar (only when the teacher enables the timer). Running out never fails the step. */
const STEP_TIME_MS = 60000;
const COINS_PER_GAME = 15;

function pickMechanic(step: GameMicroStep): { Comp: (p: MechanicProps) => React.ReactElement; intro: Line } {
  if (step.action_type === 'MATCH_SHAPE' || step.operation === 'SHAPE') {
    return { Comp: ShapeMatcher, intro: { si: 'යාළුවේ! ගජා සොයන නිවැරදි හැඩය තෝරමු!', en: "Let's find the shape Gaja is looking for!" } };
  }
  if (step.action_type === 'COMPLETE_PATTERN' || step.operation === 'PATTERN') {
    return step.visual_props?.kind === 'NUMBER'
      ? { Comp: PatternTrain, intro: { si: 'දුම්රිය රටාවේ ඊළඟට එන සංඛ්‍යාව තෝරමු!', en: "Let's find the number that comes next on the train!" } }
      : { Comp: PatternTrain, intro: { si: 'ලස්සන දුම්රිය රටාවේ ඊළඟට එන වර්ණය තෝරමු!', en: "Let's find the colour that comes next on the train!" } };
  }
  if (step.action_type === 'COMPARE_QUANTITY' || step.operation === 'COMPARE') {
    // The step says whether to pick the bigger or the smaller one.
    return { Comp: ComparisonScale, intro: { si: step.instruction_si, en: step.instruction_en } };
  }
  // Older blueprints play coin/item IDENTIFY as a calculation; on a balance scale that read "5 = 5".
  if ((step.operation === 'COUNT' || step.operation === 'IDENTIFY') && step.action_type === 'CALCULATE_MICROSTEP') {
    return { Comp: CountObjects, intro: { si: 'එකින් එක තට්ටු කරලා ගණන් කරමු!', en: "Let's tap each one and count!" } };
  }
  if (step.action_type === 'IDENTIFY_ENTITY') return { Comp: NumberHunt, intro: LINES.identify };
  if (step.action_type === 'SELECT_OPERATOR') return { Comp: OperatorDrop, intro: LINES.operator };
  const ops = step.operands ?? [];
  const answer = Number(step.correct_target_value);
  const small = ops.length === 2 && ops.every(n => n <= 10) && answer <= 20;
  if (small && (step.operation === 'ADD' || step.operation === 'SUB')) {
    return { Comp: BasketCount, intro: step.operation === 'SUB' ? LINES.basketSub : LINES.basketAdd };
  }
  return { Comp: BalanceScale, intro: LINES.balance };
}

/** Text the game treats as English must not be untranslated Sinhala. */
const hasSinhala = (text?: string | null) => !!text && /[඀-෿]/.test(text);

export function GamePlayer({
  envelope,
  onExit,
  learnerId = 'local-demo-learner',
  onComplete,
}: {
  envelope: BlueprintEnvelope;
  onExit: () => void;
  learnerId?: string;
  onComplete?: (result: { activityId: string; starsEarned: number; coinsEarned: number; traitBeliefs: TraitBeliefs }) => void;
}) {
  const { blueprint, raw_sinhala_question: question } = envelope;

  // Behaviour-monitoring telemetry (component 2) observes the whole game surface.
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const activityId = useMemo(
    () => `mathquest-${blueprint.game_theme}-${blueprint.grade}-${blueprint.topic}`,
    [blueprint.game_theme, blueprint.grade, blueprint.topic],
  );
  const tracker = useGameplayTracker({
    learnerId, activityId, gameTheme: blueprint.game_theme, grade: blueprint.grade, containerRef: gameContainerRef,
  });
  const settings = blueprint.adhd_game_settings;
  const staticStory = STORY[blueprint.game_theme];

  const story = useMemo(() => {
    const sn = blueprint.story_narrative;
    if (!sn) {
      return {
        title: staticStory.title,
        intro: staticStory.intro,
        outro: staticStory.outro,
        backdrop: { si: '', en: '' },
        questGoal: { si: '', en: '' },
        dialogue: undefined,
      };
    }
    return {
      title: {
        si: sn.title_si || staticStory.title.si,
        en: sn.title_en || staticStory.title.en,
      },
      intro: {
        si: sn.gaja_dialogue?.intro?.si || staticStory.intro.si,
        en: sn.gaja_dialogue?.intro?.en || staticStory.intro.en,
      },
      outro: {
        si: sn.gaja_dialogue?.celebrate?.si || staticStory.outro.si,
        en: sn.gaja_dialogue?.celebrate?.en || staticStory.outro.en,
      },
      backdrop: {
        si: sn.backdrop_si || '',
        en: sn.backdrop_en || '',
      },
      questGoal: {
        si: sn.quest_goal_si || '',
        en: sn.quest_goal_en || '',
      },
      dialogue: sn.gaja_dialogue,
    };
  }, [blueprint.story_narrative, staticStory]);

  const [lang, setLang] = useState<Lang>('si');

  const sinhalaQuestion = blueprint.raw_sinhala_question || question;
  const activeQuestion = useMemo(() => {
    if (lang === 'en') {
      // Some older "English" prompts are untranslated Sinhala; skip them.
      const english = [
        blueprint.raw_english_question,
        envelope.raw_english_question,
        getEnglishQuestionFallback(question),
        blueprint.story_narrative?.quest_goal_en,
      ].find(t => t && !hasSinhala(t));
      return english || sinhalaQuestion;
    }
    return sinhalaQuestion;
  }, [
    lang,
    blueprint.raw_english_question,
    envelope.raw_english_question,
    blueprint.story_narrative?.quest_goal_en,
    question,
    sinhalaQuestion,
  ]);

  const reduced = useReducedMotion();
  const calm = settings.stimulus_density === 'LOW' || !!reduced;
  const isMoney = /money/i.test(blueprint.topic) || question.includes('රුපියල්');
  // A "find the numbers" step whose numbers are not in the question cannot be finished
  // (older blueprints were built from generic prompts like "let's add them all for Gaja!").
  // It is only a warm-up scaffold, so it is dropped rather than leaving the learner stuck.
  const steps = useMemo(() => {
    const playable = blueprint.micro_steps.filter(
      s => s.action_type !== 'IDENTIFY_ENTITY' || canHunt(s, sinhalaQuestion),
    );
    return playable.length ? playable : blueprint.micro_steps;
  }, [blueprint.micro_steps, sinhalaQuestion]);

  // Bayesian trait tracker: the teacher's archetype is the prior, the child's answers are the
  // evidence, and `adapt` is the play behaviour the current beliefs call for.
  const profile = blueprint.behavior_profile as Partial<StudentBehaviorProfile> | null | undefined;
  const prefs = useMemo(() => prefsFromProfile(profile), [profile]);
  const [traits, setTraits] = useState(() => priorFromProfile(profile));
  const traitsRef = useRef(traits);
  const adapt = useMemo(() => scaffold(beliefs(traits), prefs), [traits, prefs]);
  const learn = useCallback((ev: TraitEvent) => {
    const next = observe(traitsRef.current, ev);
    traitsRef.current = next;
    setTraits(next);
    return scaffold(beliefs(next), prefs);
  }, [prefs]);

  const [voiceOn, setVoiceOn] = useState(adapt.play.voice !== 'OFF');
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const { companion } = useCompanion();
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState<Mood>('happy');
  const [line, setLine] = useState<Line | null>(() => story.intro);
  // Bumped on every utterance so a repeated line (e.g. two retries) still re-animates the bubble.
  const [lineKey, setLineKey] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [wrongRun, setWrongRun] = useState(0);
  const [stepHadMistake, setStepHadMistake] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [breakCount, setBreakCount] = useState(0);
  const [braking, setBraking] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const advanceTimer = useRef<number | undefined>(undefined);
  const brakeTimer = useRef<number | undefined>(undefined);
  /** When the learner could last start answering; answer latency is measured from here. */
  const readyAt = useRef(Date.now());
  // Guards against a double tap scoring the same step twice while the celebration plays.
  const advancing = useRef(false);

  const step = steps[stepIndex];
  const mechanic = useMemo(() => (step ? pickMechanic(step) : null), [step]);
  // Strongly inattentive learners see fewer wrong options. Decided once when the step
  // appears (from the beliefs at that moment) so options never vanish mid-step.
  const playStep = useMemo(() => {
    if (!step) return step;
    const b = beliefs(traitsRef.current);
    const options = trimOptions(step.game_options, scaffold(b, prefs).play.maxWrongOptions, b);
    return options === step.game_options ? step : { ...step, game_options: options };
  }, [step, prefs]);

  /** Impulse brake: ignore taps for `ms` so the learner looks before answering. */
  const holdForThinking = useCallback((ms: number) => {
    window.clearTimeout(brakeTimer.current);
    if (ms <= 0) { setBraking(false); readyAt.current = Date.now(); return; }
    setBraking(true);
    brakeTimer.current = window.setTimeout(() => { setBraking(false); readyAt.current = Date.now(); }, ms);
  }, []);

  // NumberHunt asks the learner to tap the step's numbers in the question. If the English
  // wording lacks them (a translation can drop or spell out numbers), use the Sinhala text.
  const stepQuestion = useMemo(() => {
    if (step?.action_type !== 'IDENTIFY_ENTITY' || lang !== 'en') return activeQuestion;
    return canHunt(step, activeQuestion) ? activeQuestion : sinhalaQuestion;
  }, [step, lang, activeQuestion, sinhalaQuestion]);

  // READ_ON_CLICK profiles hear Gaja only when they tap the speech bubble.
  const autoVoice = voiceOn && adapt.play.voice === 'AUTO';
  const say = useCallback((l: Line, m?: Mood) => {
    setLine(l);
    setLineKey(k => k + 1);
    if (m) setMood(m);
    if (autoVoice) speak(l, lang);
  }, [autoVoice, lang]);

  const handleLanguageToggle = (newL: Lang) => {
    setLang(newL);
    if (autoVoice && line) {
      speak(line, newL);
    }
  };

  // Idle nudge: re-engage gently if nothing happens for a while.
  const resetIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    setNudging(false);
    if (phase !== 'play' || onBreak) return;
    idleTimer.current = window.setTimeout(() => {
      setNudging(true);
      learn({ kind: 'idle' });
      say(mechanic?.intro ?? LINES.nudge, 'thinking');
    }, IDLE_NUDGE_MS);
  }, [phase, onBreak, say, mechanic, learn]);

  useEffect(() => { resetIdle(); return () => window.clearTimeout(idleTimer.current); }, [resetIdle, stepIndex]);
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    window.clearTimeout(advanceTimer.current);
    window.clearTimeout(brakeTimer.current);
  }, []);
  // Every new step starts with the think-pause the current beliefs call for.
  useEffect(() => {
    if (phase === 'play') holdForThinking(adapt.play.brakeMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  const { isTracking, onStepStart, onAnswerSelect, onAnswerSubmit, onGameExit } = tracker;
  useEffect(() => {
    if (isTracking && phase === 'play' && step) onStepStart(step.step_order, step.action_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, phase, stepIndex]);

  const exitGame = async () => {
    try { await onGameExit(); } catch (error) { console.error('Failed to finish tracking session', error); }
    onExit();
  };

  const start = () => {
    setPhase('play');
    setStepIndex(0);
    if (mechanic) say(mechanic.intro, 'thinking');
  };

  const log = (label: string, correct: boolean, distractor?: DistractorType | null, soft = false) => {
    onAnswerSelect(label);
    onAnswerSubmit(label, correct);
    const snapshot = beliefs(traitsRef.current);
    setAttempts(a => [...a, { step_order: step.step_order, label, correct, soft, distractor_type: distractor, at: Date.now(), beliefs: snapshot }]);
  };

  const latency = () => Date.now() - readyAt.current;

  const onWrong: MechanicProps['onWrong'] = (label, distractor, hint, opts) => {
    resetIdle();
    if (opts?.soft) {
      log(label, false, distractor, true);
      say(hint ?? LINES.retry, 'encourage');
      return;
    }
    const next = learn({ kind: 'wrong', distractor, latencyMs: latency() });
    log(label, false, distractor);
    setStepHadMistake(true);
    setStreak(0);
    const run = wrongRun + 1;
    setWrongRun(run);
    if (run >= next.play.breakAfterWrong) {
      say(LINES.breakTime, 'encourage');
      setOnBreak(true);
      setWrongRun(0);
    } else {
      const customRetry = story.dialogue?.retry;
      say(hint ?? (customRetry || LINES.retry), 'encourage');
      holdForThinking(next.play.brakeMs);
    }
  };

  const onCorrect: MechanicProps['onCorrect'] = label => {
    if (advancing.current) return;
    advancing.current = true;
    const next = learn({ kind: 'correct', firstTry: !stepHadMistake, latencyMs: latency(), multiStep: steps.length > 1 });
    log(label, true);
    setWrongRun(0);
    const s = stepHadMistake ? 0 : streak + 1;
    setStreak(s);
    setBestStreak(b => Math.max(b, s));
    setCelebrating(true);
    const customPraise = story.dialogue?.praise;
    say(customPraise || LINES.correct, 'celebrate');
    advanceTimer.current = window.setTimeout(() => {
      advancing.current = false;
      setCelebrating(false);
      const nextIndex = stepIndex + 1;
      setStepHadMistake(false);
      if (nextIndex >= steps.length) {
        setPhase('done');
        say(story.outro, 'celebrate');
      } else {
        setStepIndex(nextIndex);
        say(pickMechanic(steps[nextIndex]).intro, 'thinking');
      }
    }, next.play.advanceMs);
  };

  const onTimeUp = () => {
    if (advancing.current) return;
    say(mechanic?.intro ?? LINES.nudge, 'thinking');
  };

  const restart = () => {
    window.clearTimeout(advanceTimer.current);
    advancing.current = false;
    setCelebrating(false);
    setAttempts([]); setStreak(0); setBestStreak(0); setWrongRun(0); setStepHadMistake(false);
    setStepIndex(0); setPhase('intro'); setMood('happy'); setLine(story.intro);
  };

  const mistakes = attempts.filter(a => !a.correct && !a.soft).length;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  // Report the reward once per completed run (a replay reports again).
  const rewarded = useRef(false);
  useEffect(() => {
    if (phase !== 'done') { rewarded.current = false; return; }
    if (rewarded.current) return;
    rewarded.current = true;
    onComplete?.({ activityId: blueprint.activity_id, starsEarned: stars, coinsEarned: COINS_PER_GAME, traitBeliefs: beliefs(traitsRef.current) });
  }, [phase, stars, blueprint.activity_id, onComplete]);

  return (
    <MotionConfig reducedMotion="user">
    <div ref={gameContainerRef} className="relative min-h-screen overflow-hidden" onPointerDown={resetIdle}>
      {/* Scene */}
      <motion.img
        src={SCENES[blueprint.game_theme]} alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.2 }}
      />
      {/* Clutter filter: a soft wash calms the background so the task stands out */}
      <div className={`absolute inset-0 ${settings.visual_clutter_filter ? (calm ? 'bg-white/55' : 'bg-white/35') : 'bg-white/10'}`} />

      {/* Top bar */}
      <header className="relative z-20 flex items-center gap-3 px-4 md:px-6 py-3">
        <button id="game-exit" onClick={() => void exitGame()} className="btn btn-secondary !bg-white/90"><ArrowLeft size={18} /></button>

        {/* Quest map */}
        {phase !== 'intro' && (
          <div className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 shadow" aria-label="Quest progress">
            <Map size={18} className="text-mq-primary" />
            {steps.map((s, i) => (
              <div key={s.step_order} className="flex items-center gap-2">
                <motion.div
                  animate={i === stepIndex && phase === 'play' && !calm ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${i < stepIndex || phase === 'done' ? 'bg-mq-accent-yellow text-white' : i === stepIndex ? 'bg-mq-primary text-white' : 'bg-mq-border text-mq-text-muted'}`}
                >
                  {i < stepIndex || phase === 'done' ? <Star size={14} fill="currentColor" /> : i + 1}
                </motion.div>
                {i < steps.length - 1 && <div className={`w-6 h-1 rounded-full ${i < stepIndex ? 'bg-mq-accent-yellow' : 'bg-mq-border'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {streak >= 2 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-mq-accent-yellow to-mq-accent-pink px-3 py-1.5 text-white font-extrabold shadow">
                <Flame size={18} fill="currentColor" /> {streak}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            id="open-companion-wardrobe"
            onClick={() => setIsWardrobeOpen(true)}
            title={lang === 'si' ? "මිතුරා සරසන්න (Customize Companion)" : "Customize Companion"}
            className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-1.5 shadow"
          >
            <span>🎨</span>
            <span className="hidden sm:inline">{companion.nickname}</span>
          </button>
          <button id="toggle-voice" onClick={() => setVoiceOn(v => !v)} aria-label="Toggle voice"
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-mq-primary shadow">
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="flex rounded-full bg-white/90 p-1 shadow" role="group" aria-label="Language">
            {(['si', 'en'] as Lang[]).map(l => (
              <button key={l} id={`lang-${l}`} onClick={() => handleLanguageToggle(l)}
                className={`px-3 py-1 rounded-full text-sm font-bold ${lang === l ? 'bg-mq-primary text-white' : 'text-mq-text-muted'}`}>
                {l === 'si' ? 'සිං' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 md:px-8 pb-48">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.section key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center pt-6">
              <h1 className={`text-4xl md:text-5xl font-extrabold text-mq-text-strong drop-shadow-sm mb-3 ${lang === 'si' ? 'sinhala' : ''}`}>
                {story.title[lang]}
              </h1>
              {story.backdrop[lang] && (
                <p className={`max-w-xl text-base md:text-lg text-mq-text-strong/80 mb-4 px-4 ${lang === 'si' ? 'sinhala' : 'font-medium'}`}>
                  {story.backdrop[lang]}
                </p>
              )}
              <Gaja mood="happy" line={story.intro} lang={lang} calm={calm} size="lg" companionConfig={companion} />
              <motion.button id="start-quest" onClick={start}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="btn btn-primary mt-8 text-2xl px-10 py-4 !min-h-0">
                {lang === 'si' ? 'අපි යමු!' : "Let's go!"}
              </motion.button>
            </motion.section>
          )}

          {phase === 'play' && step && mechanic && (
            <motion.section key={`step-${stepIndex}`}
              initial={calm ? { opacity: 0 } : { opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={calm ? { opacity: 0 } : { opacity: 0, x: -60 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              className={`relative mx-auto max-w-4xl mt-4 rounded-[2.5rem] bg-white/90 backdrop-blur-md shadow-2xl border-4 p-6 md:p-10 flex flex-col items-center transition-colors duration-500
                ${celebrating ? 'border-mq-success' : nudging ? 'border-mq-accent-yellow' : 'border-white'}`}
            >
              {settings.timer_enabled && !onBreak && !celebrating && (
                <div className="absolute top-3 left-10 right-10 h-1.5 rounded-full bg-mq-border/60 overflow-hidden" aria-hidden>
                  {/* Re-keyed after a break so the learner returns to a full bar, not a near-empty one. */}
                  <motion.div
                    key={`${stepIndex}-${breakCount}`}
                    className="h-full rounded-full bg-mq-secondary"
                    initial={{ width: '100%' }} animate={{ width: '0%' }}
                    transition={{ duration: STEP_TIME_MS / 1000, ease: 'linear' }}
                    onAnimationComplete={onTimeUp}
                  />
                </div>
              )}
              <AnimatePresence>{celebrating && <Celebration calm={calm} />}</AnimatePresence>
              {/* Working-memory support: answers of solved steps stay in view. */}
              {adapt.play.memoryRecap && stepIndex > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4" aria-label={lang === 'si' ? 'මෙතෙක් විසඳූ' : 'Solved so far'}>
                  {steps.slice(0, stepIndex).map(s => (
                    <span key={s.step_order} className="px-3 py-1 rounded-full bg-[var(--mq-success-bg)] border border-mq-success/40 text-mq-success font-bold">
                      ✓ {s.correct_target_value}
                    </span>
                  ))}
                </div>
              )}
              {/* NumberHunt renders the question itself; shape steps are fully described by the
                  instruction, and an older shape prompt can name a different shape. */}
              {step.action_type !== 'IDENTIFY_ENTITY' && step.action_type !== 'MATCH_SHAPE' && (
                <p className={`${lang === 'si' ? 'sinhala' : 'font-medium'} text-center text-lg text-mq-text mb-6 px-6 py-2.5 rounded-full bg-mq-surface-soft border border-mq-border/50 max-w-2xl w-full mx-auto`}>
                  {activeQuestion}
                </p>
              )}
              <h2 className={`text-center text-2xl md:text-3xl font-extrabold mb-8 max-w-2xl w-full mx-auto ${lang === 'si' ? 'sinhala' : ''}`}>
                {lang === 'si' ? step.instruction_si : step.instruction_en}
              </h2>
              {/* Impulse brake: the mechanic ignores taps briefly so the learner looks first. */}
              <p className={`h-6 mb-2 text-sm font-semibold text-mq-text-muted transition-opacity ${braking ? 'opacity-100' : 'opacity-0'} ${lang === 'si' ? 'sinhala' : ''}`} aria-live="polite">
                {braking ? (lang === 'si' ? '🤔 මොහොතක් හිතලා බලමු…' : '🤔 Look carefully first…') : ''}
              </p>
              <div className={`w-full flex justify-center transition-opacity duration-300 ${braking ? 'pointer-events-none opacity-60' : ''}`} aria-busy={braking}>
                <mechanic.Comp
                  step={playStep ?? step} question={stepQuestion} theme={blueprint.game_theme} isMoney={isMoney}
                  lang={lang} calm={calm} onWrong={onWrong} onCorrect={onCorrect} onSay={l => say(l, 'thinking')}
                  hintAfter={adapt.play.hintAfter}
                />
              </div>
            </motion.section>
          )}

          {phase === 'done' && (
            <motion.section key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-xl mt-6 rounded-[2.5rem] bg-white/90 backdrop-blur-md shadow-2xl p-10 text-center">
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3].map(n => (
                  <motion.div key={n} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + n * 0.25, type: 'spring', stiffness: 260, damping: 14 }}>
                    <Star size={64} className={n <= stars ? 'text-mq-accent-yellow' : 'text-mq-border'} fill="currentColor" />
                  </motion.div>
                ))}
              </div>
              <h1 className={`text-3xl font-extrabold mb-2 ${lang === 'si' ? 'sinhala' : ''}`}>{story.outro[lang]}</h1>
              {bestStreak >= 2 && (
                <p className="font-semibold text-mq-text-muted mb-6 flex items-center justify-center gap-1">
                  <Flame size={18} className="text-mq-accent-pink" />
                  {lang === 'si' ? `හොඳම පෙළ: ${bestStreak}` : `Best streak: ${bestStreak}`}
                </p>
              )}
              <div className="flex justify-center gap-3 mt-6">
                <button id="game-restart" onClick={restart} className="btn btn-secondary"><RotateCcw size={18} /> {lang === 'si' ? 'නැවත' : 'Play again'}</button>
                <button id="game-finish" onClick={() => void exitGame()} className="btn btn-primary">{lang === 'si' ? 'අවසන්' : 'Finish'}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Companion stays in the corner during play */}
      {phase !== 'intro' && (
        // Tapping Gaja reads the current line aloud (the only way for READ_ON_CLICK profiles).
        <button
          type="button"
          id="gaja-speak"
          className="fixed left-4 bottom-4 z-30 text-left"
          aria-label={lang === 'si' ? 'ගජාට සවන් දෙන්න' : 'Hear Gaja'}
          onClick={() => { if (voiceOn && line) speak(line, lang); }}
        >
          <Gaja mood={mood} line={line} lineKey={lineKey} lang={lang} calm={calm} companionConfig={companion} />
        </button>
      )}

      <AnimatePresence>
        {onBreak && <BreathingBreak lang={lang} onDone={() => { setOnBreak(false); setBreakCount(c => c + 1); readyAt.current = Date.now(); say(LINES.nudge, 'happy'); }} />}
      </AnimatePresence>

      <CompanionWardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => setIsWardrobeOpen(false)}
        lang={lang}
      />
    </div>
    </MotionConfig>
  );
}

export default GamePlayer;

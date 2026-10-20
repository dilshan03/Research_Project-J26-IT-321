import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles, Star, Volume2 } from 'lucide-react';
import type {
  BlueprintEnvelope, DistractorType, GameChoiceOption, GameMicroStep, GameTheme, VisualAssetTag,
} from '../types';

type Lang = 'si' | 'en';

interface Attempt {
  step_order: number;
  label: string;
  correct: boolean;
  distractor_type?: DistractorType | null;
  at: number;
}

const BREAK_AFTER_WRONG = 3;
const IDLE_NUDGE_MS = 20000;
const ADVANCE_MS = 1400;
/** Soft per-step time bar (only when the teacher enables the timer). Running out never fails the step. */
const STEP_TIME_MS = 60000;

function pickMechanic(step: GameMicroStep): { Comp: (p: MechanicProps) => React.ReactElement; intro: Line } {
  if (step.action_type === 'MATCH_SHAPE' || step.operation === 'SHAPE') {
    return { Comp: ShapeMatcher, intro: { si: 'යාළුවේ! ගජා සොයන නිවැරදි හැඩය තෝරමු!', en: "Let's find the shape Gaja is looking for!" } };
  }
  if (step.action_type === 'COMPLETE_PATTERN' || step.operation === 'PATTERN') {
    return { Comp: PatternTrain, intro: { si: 'ලස්සන දුම්රිය රටාවේ ඊළඟට එන වර්ණය තෝරමු!', en: "Let's find what comes next in the train pattern!" } };
  }
  if (step.action_type === 'COMPARE_QUANTITY' || step.operation === 'COMPARE') {
    // The step says whether to pick the bigger or the smaller one.
    return { Comp: ComparisonScale, intro: { si: step.instruction_si, en: step.instruction_en } };
  }
  if (step.operation === 'COUNT' && step.action_type === 'CALCULATE_MICROSTEP') {
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

export function GamePlayer({ envelope, onExit }: { envelope: BlueprintEnvelope; onExit: () => void }) {
  const { blueprint } = envelope;
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

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const activityId = useMemo(() => `mathquest-${blueprint.game_theme}-${blueprint.grade}-${blueprint.topic}`, [blueprint.game_theme, blueprint.grade, blueprint.topic]);
  const tracker = useGameplayTracker({ learnerId, activityId, gameTheme: blueprint.game_theme, grade: blueprint.grade, containerRef: gameContainerRef });
  const { isTracking, onStepStart, onAnswerSelect, onAnswerSubmit, onGameExit } = tracker;
  const [lang, setLang] = useState<Lang>('si');

  const activeQuestion = useMemo(() => {
    if (lang === 'en') {
      return (
        blueprint.raw_english_question ||
        envelope.raw_english_question ||
        getEnglishQuestionFallback(question) ||
        blueprint.story_narrative?.quest_goal_en ||
        question
      );
    }
    return blueprint.raw_sinhala_question || question;
  }, [
    lang,
    blueprint.raw_english_question,
    blueprint.raw_sinhala_question,
    envelope.raw_english_question,
    blueprint.story_narrative?.quest_goal_en,
    question,
  ]);

  const reduced = useReducedMotion();
  const calm = settings.stimulus_density === 'LOW' || !!reduced;
  const isMoney = /money/i.test(blueprint.topic) || question.includes('රුපියල්');
  const steps = blueprint.micro_steps;

  const [voiceOn, setVoiceOn] = useState(true);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const { companion } = useCompanion();
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState<Mood>('happy');
  const [line, setLine] = useState<Line | null>(() => story.intro);
  // Bumped on every utterance so a repeated line (e.g. two retries) still re-animates the bubble.
  const [lineKey, setLineKey] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);

  const steps = blueprint.micro_steps;
  const finished = stepIndex >= steps.length;
  const step: GameMicroStep | undefined = steps[stepIndex];
  const stars = useMemo(() => {
    const mistakes = attempts.filter(a => !a.correct).length;
    return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  }, [attempts]);

  const pick = (opt: GameChoiceOption) => {
    if (!step || solved) return;
    setAttempts(a => [...a, {
      step_order: step.step_order, option: opt.text_en, correct: opt.is_correct, distractor_type: opt.distractor_type,
    }]);
    if (opt.is_correct) {
      setSolved(true);
      setFeedback('correct');
    } else {
      const customRetry = story.dialogue?.retry;
      say(hint ?? (customRetry || LINES.retry), 'encourage');
    }
  };

  const onCorrect: MechanicProps['onCorrect'] = label => {
    if (advancing.current) return;
    advancing.current = true;
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
      const next = stepIndex + 1;
      setStepHadMistake(false);
      if (next >= steps.length) {
        setPhase('done');
        say(story.outro, 'celebrate');
      } else {
        setStepIndex(next);
        say(pickMechanic(steps[next]).intro, 'thinking');
      }
    }, ADVANCE_MS);
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

  const mistakes = attempts.filter(a => !a.correct).length;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>
      {/* Decorative background is removed when the visual-clutter filter + low density are on */}
      {!(settings.visual_clutter_filter && calm) && (
        <>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-mq-secondary/15 animate-morph" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-mq-accent-yellow/15 animate-morph-square" />
        </>
      )}

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <button id="game-exit" onClick={onExit} className="btn btn-secondary"><ArrowLeft size={18} /> {lang === 'si' ? 'ආපසු' : 'Back'}</button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mq-text-muted font-semibold">{blueprint.topic} · Grade {blueprint.grade}</p>
          <p className={`font-bold text-mq-text-strong ${lang === 'si' ? 'sinhala' : ''}`}>
            {theme.mascot} {lang === 'si' ? theme.name_si : theme.name_en}
          </p>
        </div>
        <div className="flex rounded-full border border-mq-border bg-white p-1" role="group" aria-label="Language">
          {(['si', 'en'] as Lang[]).map(l => (
            <button key={l} id={`lang-${l}`} onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition ${lang === l ? 'bg-mq-primary text-white' : 'text-mq-text-muted'}`}>
              {l === 'si' ? 'සිං' : 'EN'}
            </button>
          ))}
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
            </div>
          </section>
        )}

        {finished && (
          <section className="rounded-[2rem] bg-white shadow-[var(--mq-shadow-md)] p-10 text-center animate-fade-in">
            <div className="text-6xl mb-3">{theme.mascot}</div>
            <h1 className={`text-3xl font-extrabold mb-4 ${lang === 'si' ? 'sinhala' : ''}`}>{FEEDBACK.done[lang]}</h1>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map(n => (
                <Star key={n} size={44} className={n <= stars ? 'text-mq-accent-yellow animate-float' : 'text-mq-border'}
                  fill="currentColor" style={{ animationDelay: `${n * 200}ms` }} />
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <button id="game-restart" onClick={restart} className="btn btn-secondary"><RotateCcw size={18} /> {lang === 'si' ? 'නැවත' : 'Play again'}</button>
              <button id="game-finish" onClick={onExit} className="btn btn-primary">{lang === 'si' ? 'අවසන්' : 'Finish'}</button>
            </div>
          </section>
        )}
      </main>

      {/* Companion stays in the corner during play */}
      {phase !== 'intro' && (
        <div className="fixed left-4 bottom-4 z-30">
          <Gaja mood={mood} line={line} lineKey={lineKey} lang={lang} calm={calm} companionConfig={companion} />
        </div>
      )}

      <AnimatePresence>
        {onBreak && <BreathingBreak lang={lang} onDone={() => { setOnBreak(false); setBreakCount(c => c + 1); say(LINES.nudge, 'happy'); }} />}
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

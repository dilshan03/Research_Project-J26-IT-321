import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Flame, Map, RotateCcw, Star, Volume2, VolumeX } from 'lucide-react';
import type { BlueprintEnvelope, DistractorType, GameMicroStep } from '../types';
import { LINES, SCENES, STORY, speak, type Lang, type Line, type Mood } from './gameKit';
import { Gaja } from './Gaja';
import { BreathingBreak } from './BreathingBreak';
import { NumberHunt } from './mechanics/NumberHunt';
import { OperatorDrop } from './mechanics/OperatorDrop';
import { BasketCount } from './mechanics/BasketCount';
import { BalanceScale } from './mechanics/BalanceScale';
import type { MechanicProps } from './mechanics/types';

interface Attempt {
  step_order: number;
  label: string;
  correct: boolean;
  distractor_type?: DistractorType | null;
  at: number;
}

const BREAK_AFTER_WRONG = 3;
const IDLE_NUDGE_MS = 20000;

function pickMechanic(step: GameMicroStep): { Comp: (p: MechanicProps) => React.ReactElement; intro: Line } {
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
  const { blueprint, raw_sinhala_question: question } = envelope;
  const settings = blueprint.adhd_game_settings;
  const story = STORY[blueprint.game_theme];
  const reduced = useReducedMotion();
  const calm = settings.stimulus_density === 'LOW' || !!reduced;
  const isMoney = /money/i.test(blueprint.topic) || question.includes('රුපියල්');
  const steps = blueprint.micro_steps;

  const [lang, setLang] = useState<Lang>('si');
  const [voiceOn, setVoiceOn] = useState(true);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState<Mood>('happy');
  const [line, setLine] = useState<Line | null>(story.intro);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [wrongRun, setWrongRun] = useState(0);
  const [stepHadMistake, setStepHadMistake] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [nudging, setNudging] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  const step = steps[stepIndex];
  const mechanic = useMemo(() => (step ? pickMechanic(step) : null), [step]);

  const say = useCallback((l: Line, m?: Mood) => {
    setLine(l);
    if (m) setMood(m);
    if (voiceOn) speak(l, lang);
  }, [voiceOn, lang]);

  // Idle nudge: re-engage gently if nothing happens for a while.
  const resetIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    setNudging(false);
    if (phase !== 'play' || onBreak) return;
    idleTimer.current = window.setTimeout(() => {
      setNudging(true);
      say(mechanic?.intro ?? LINES.nudge, 'thinking');
    }, IDLE_NUDGE_MS);
  }, [phase, onBreak, say, mechanic]);

  useEffect(() => { resetIdle(); return () => window.clearTimeout(idleTimer.current); }, [resetIdle, stepIndex]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const start = () => {
    setPhase('play');
    setStepIndex(0);
    if (mechanic) say(mechanic.intro, 'thinking');
  };

  const log = (label: string, correct: boolean, distractor?: DistractorType | null) =>
    setAttempts(a => [...a, { step_order: step.step_order, label, correct, distractor_type: distractor, at: Date.now() }]);

  const onWrong: MechanicProps['onWrong'] = (label, distractor, hint) => {
    resetIdle();
    log(label, false, distractor);
    setStepHadMistake(true);
    setStreak(0);
    const run = wrongRun + 1;
    setWrongRun(run);
    if (run >= BREAK_AFTER_WRONG) {
      say(LINES.breakTime, 'encourage');
      setOnBreak(true);
      setWrongRun(0);
    } else {
      say(hint ?? LINES.retry, 'encourage');
    }
  };

  const onCorrect: MechanicProps['onCorrect'] = label => {
    log(label, true);
    setWrongRun(0);
    const s = stepHadMistake ? 0 : streak + 1;
    setStreak(s);
    setBestStreak(b => Math.max(b, s));
    say(LINES.correct, 'celebrate');
    setTimeout(() => {
      const next = stepIndex + 1;
      setStepHadMistake(false);
      if (next >= steps.length) {
        setPhase('done');
        say(story.outro, 'celebrate');
      } else {
        setStepIndex(next);
        say(pickMechanic(steps[next]).intro, 'thinking');
      }
    }, 1400);
  };

  const restart = () => {
    setAttempts([]); setStreak(0); setBestStreak(0); setWrongRun(0); setStepHadMistake(false);
    setStepIndex(0); setPhase('intro'); setMood('happy'); setLine(story.intro);
  };

  const mistakes = attempts.filter(a => !a.correct).length;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  return (
    <div className="relative min-h-screen overflow-hidden" onPointerDown={resetIdle}>
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
        <button id="game-exit" onClick={onExit} className="btn btn-secondary !bg-white/90"><ArrowLeft size={18} /></button>

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
          <button id="toggle-voice" onClick={() => setVoiceOn(v => !v)} aria-label="Toggle voice"
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-mq-primary shadow">
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="flex rounded-full bg-white/90 p-1 shadow" role="group" aria-label="Language">
            {(['si', 'en'] as Lang[]).map(l => (
              <button key={l} id={`lang-${l}`} onClick={() => setLang(l)}
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
              <h1 className={`text-4xl md:text-5xl font-extrabold text-mq-text-strong drop-shadow-sm mb-4 ${lang === 'si' ? 'sinhala' : ''}`}>
                {story.title[lang]}
              </h1>
              <Gaja mood="happy" line={story.intro} lang={lang} calm={calm} size="lg" />
              <motion.button id="start-quest" onClick={start}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="btn btn-primary mt-8 text-2xl px-10 py-4 !min-h-0">
                {lang === 'si' ? 'අපි යමු!' : "Let's go!"}
              </motion.button>
            </motion.section>
          )}

          {phase === 'play' && step && mechanic && (
            <motion.section key={`step-${stepIndex}`}
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              className={`mx-auto max-w-4xl mt-4 rounded-[2.5rem] bg-white/85 backdrop-blur-md shadow-2xl border-4 p-6 md:p-10
                ${nudging ? 'border-mq-accent-yellow' : 'border-white'}`}
            >
              {step.action_type !== 'IDENTIFY_ENTITY' && (
                <p className="sinhala text-center text-lg text-mq-text mb-6 px-4 py-2 rounded-2xl bg-mq-surface-soft">{question}</p>
              )}
              <h2 className={`text-center text-2xl md:text-3xl font-extrabold mb-8 ${lang === 'si' ? 'sinhala' : ''}`}>
                {lang === 'si' ? step.instruction_si : step.instruction_en}
              </h2>
              <mechanic.Comp
                step={step} question={question} theme={blueprint.game_theme} isMoney={isMoney}
                lang={lang} calm={calm} onWrong={onWrong} onCorrect={onCorrect} onSay={l => say(l, 'thinking')}
              />
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
                <button id="game-finish" onClick={onExit} className="btn btn-primary">{lang === 'si' ? 'අවසන්' : 'Finish'}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Companion stays in the corner during play */}
      {phase !== 'intro' && (
        <div className="fixed left-4 bottom-4 z-30">
          <Gaja mood={mood} line={line} lang={lang} calm={calm} />
        </div>
      )}

      <AnimatePresence>
        {onBreak && <BreathingBreak lang={lang} onDone={() => { setOnBreak(false); say(LINES.nudge, 'happy'); }} />}
      </AnimatePresence>
    </div>
  );
}

export default GamePlayer;

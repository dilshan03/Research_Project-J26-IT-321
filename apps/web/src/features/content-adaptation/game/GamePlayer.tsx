import { useEffect, useMemo, useRef, useState } from 'react';
// If this file is in a different folder, adjust this relative import.
import { useGameplayTracker } from '../../behaviour-monitoring/useGameplayTracker';
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles, Star, Volume2 } from 'lucide-react';
import type {
  BlueprintEnvelope, DistractorType, GameChoiceOption, GameMicroStep, GameTheme, VisualAssetTag,
} from '../types';

type Lang = 'si' | 'en';

interface Attempt {
  step_order: number;
  option: string;
  correct: boolean;
  distractor_type?: DistractorType | null;
}

const THEMES: Record<GameTheme, { name_si: string; name_en: string; bg: string; card: string; accent: string; mascot: string }> = {
  VILLAGE_MARKET: {
    name_si: 'ගමේ පොළ', name_en: 'Village Market',
    bg: 'from-amber-50 via-orange-50 to-yellow-50', card: 'border-amber-200', accent: 'bg-amber-500', mascot: '🧺',
  },
  JUNGLE_ADVENTURE: {
    name_si: 'වනාන්තර චාරිකාව', name_en: 'Jungle Adventure',
    bg: 'from-emerald-50 via-teal-50 to-lime-50', card: 'border-emerald-200', accent: 'bg-emerald-500', mascot: '🐘',
  },
  SPACE_QUEST: {
    name_si: 'අභ්‍යවකාශ ගමන', name_en: 'Space Quest',
    bg: 'from-indigo-50 via-sky-50 to-violet-50', card: 'border-indigo-200', accent: 'bg-indigo-500', mascot: '🚀',
  },
};

const ASSET_ICON: Record<VisualAssetTag, string> = {
  COIN_BAG: '🪙', FRUIT_BASKET: '🍎', OPERATOR_CHEST: '🧰', NUMBER_BLOCK: '🔢', CHARACTER_AVATAR: '🧒',
  SHAPE_CARD: '',
  PATTERN_TRAIN: '',
  COMPARISON_SCALE: ''
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
function QuantityVisual({ value, icon, calm }: { value?: number | null; icon: string; calm: boolean }) {
  if (value == null || value > 10 || value < 1) return null;
  return (
    <div className="flex flex-wrap justify-center gap-0.5 mt-1 text-lg leading-none" aria-hidden>
      {Array.from({ length: value }).map((_, i) => (
        <span key={i} className={calm ? '' : 'animate-fade-in'} style={{ animationDelay: `${i * 40}ms` }}>{icon}</span>
      ))}
    </div>
  );
}

function OptionCard({
  option, lang, state, onPick, showQuantity, calm,
}: {
  option: GameChoiceOption; lang: Lang; state: 'idle' | 'wrong' | 'correct';
  onPick: () => void; showQuantity: boolean; calm: boolean;
}) {
  const styles = {
    idle: 'bg-white border-mq-border hover:border-mq-primary hover:-translate-y-1 hover:shadow-lg',
    wrong: 'bg-mq-surface-soft border-mq-border opacity-40 cursor-not-allowed',
    correct: 'bg-[var(--mq-success-bg)] border-mq-success ring-4 ring-mq-success/20',
  }[state];
  return (
    <button
      type="button"
      id={`option-${option.text_en.replace(/\W+/g, '-')}`}
      disabled={state !== 'idle'}
      onClick={onPick}
      className={`min-h-28 rounded-3xl border-2 px-4 py-5 text-center transition-all duration-200 ${styles}`}
    >
      <span className={`block text-3xl font-extrabold text-mq-text-strong ${lang === 'si' ? 'sinhala text-2xl' : ''}`}>
        {lang === 'si' ? option.text_si : option.text_en}
      </span>
      {showQuantity && <QuantityVisual value={option.numeric_value} icon="🔵" calm={calm} />}
      {state === 'correct' && <CheckCircle2 className="mx-auto mt-2 text-mq-success" size={28} />}
    </button>
  );
}

export function GamePlayer({
  envelope,
  onExit,
  learnerId = 'local-demo-learner',
  totalStars,
  totalCoins,
}: {
  envelope: BlueprintEnvelope;
  onExit: () => void;
  learnerId?: string;
  totalStars?: number;
  totalCoins?: number;
}) {
  const { blueprint } = envelope;
  const settings = blueprint.adhd_game_settings;
  const theme = THEMES[blueprint.game_theme];
  const calm = settings.stimulus_density === 'LOW';

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const activityId = useMemo(() => `mathquest-${blueprint.game_theme}-${blueprint.grade}-${blueprint.topic}`, [blueprint.game_theme, blueprint.grade, blueprint.topic]);
  const tracker = useGameplayTracker({ learnerId, activityId, gameTheme: blueprint.game_theme, grade: blueprint.grade, containerRef: gameContainerRef });
  const { isTracking, onStepStart, onAnswerSelect, onAnswerSubmit, onGameExit } = tracker;
  const [lang, setLang] = useState<Lang>('si');
  const [stepIndex, setStepIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);

  const steps = blueprint.micro_steps;
  const finished = stepIndex >= steps.length;
  const step: GameMicroStep | undefined = steps[stepIndex];
  useEffect(() => {
    if (isTracking && step) {
      onStepStart(step.step_order, step.action_type);
    }
  }, [isTracking, stepIndex, step?.step_order]);
  const exitGame = async () => {
    try { await onGameExit(); } catch (error) { console.error('Failed to finish tracking session', error); }
    onExit();
  };
  const stars = useMemo(() => {
    const mistakes = attempts.filter(a => !a.correct).length;
    return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  }, [attempts]);

  const pick = (opt: GameChoiceOption) => {
    if (!step || solved) return;
    onAnswerSelect(opt.text_en);
    onAnswerSubmit(opt.text_en, opt.is_correct);
    setAttempts(a => [...a, {
      step_order: step.step_order, option: opt.text_en, correct: opt.is_correct, distractor_type: opt.distractor_type,
    }]);
    if (opt.is_correct) {
      setSolved(true);
      setFeedback('correct');
    } else {
      setWrongPicks(s => new Set(s).add(opt.text_en));
      setFeedback('retry');
    }
  };

  const next = () => {
    setStepIndex(i => i + 1);
    setWrongPicks(new Set());
    setSolved(false);
    setFeedback(null);
  };

  const restart = () => {
    setStepIndex(0); setWrongPicks(new Set()); setSolved(false); setFeedback(null); setAttempts([]);
  };

  return (
    <div ref={gameContainerRef} className={`min-h-screen bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>
      {/* Decorative background is removed when the visual-clutter filter + low density are on */}
      {!(settings.visual_clutter_filter && calm) && (
        <>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-mq-secondary/15 animate-morph" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-mq-accent-yellow/15 animate-morph-square" />
        </>
      )}

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <button id="game-exit" onClick={() => void exitGame()} className="btn btn-secondary shadow-xs">
          <ArrowLeft size={18} /> {lang === 'si' ? 'ආපසු' : 'Back'}
        </button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mq-text-muted font-semibold">{blueprint.topic} · Grade {blueprint.grade}</p>
          <p className={`font-bold text-mq-text-strong ${lang === 'si' ? 'sinhala' : ''}`}>
            {theme.mascot} {lang === 'si' ? theme.name_si : theme.name_en}
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Top Corner Stars & Coins (Kid Rewards Pill) */}
          {(totalStars !== undefined || totalCoins !== undefined) && (
            <div className="flex items-center gap-2">
              {totalStars !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border-2 border-amber-300/80 text-xs sm:text-sm font-black text-amber-950 shadow-2xs">
                  <Star size={16} className="text-amber-500 fill-amber-400 shrink-0 animate-pulse" />
                  <span>
                    {totalStars.toLocaleString()}{' '}
                    <span className="hidden sm:inline text-[10px] font-extrabold text-amber-800">
                      {lang === 'si' ? 'තරු' : 'Stars'}
                    </span>
                  </span>
                </div>
              )}

              {totalCoins !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-yellow-50 border-2 border-yellow-300/80 text-xs sm:text-sm font-black text-yellow-950 shadow-2xs">
                  <span className="text-yellow-600 text-sm">🪙</span>
                  <span>
                    {totalCoins.toLocaleString()}{' '}
                    <span className="hidden sm:inline text-[10px] font-extrabold text-yellow-800">
                      {lang === 'si' ? 'කාසි' : 'Coins'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Language Toggle */}
          <div className="flex rounded-full border border-mq-border bg-white p-1 shadow-2xs" role="group" aria-label="Language">
            {(['si', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                id={`lang-${l}`}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-sm font-bold transition ${
                  lang === l ? 'bg-mq-primary text-white' : 'text-mq-text-muted hover:text-mq-primary'
                }`}
              >
                {l === 'si' ? 'සිං' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        {/* Progress path: one dot per micro-step, no countdown timer */}
        <div className="flex items-center justify-center gap-3 my-6" aria-label="Progress">
          {steps.map((s, i) => (
            <div key={s.step_order} className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold border-2 transition-all
                ${i < stepIndex ? `${theme.accent} text-white border-transparent`
                  : i === stepIndex ? 'bg-white border-mq-primary text-mq-primary scale-110 shadow-md'
                  : 'bg-white/60 border-mq-border text-mq-text-muted'}`}>
                {i < stepIndex ? <Star size={18} fill="currentColor" /> : s.step_order}
              </div>
              {i < steps.length - 1 && <div className={`w-10 h-1 rounded-full ${i < stepIndex ? theme.accent : 'bg-mq-border'}`} />}
            </div>
          ))}
        </div>

        {/* The original problem stays visible to reduce working-memory load */}
        <section className={`rounded-3xl bg-white/80 backdrop-blur border ${theme.card} px-6 py-4 mb-6 shadow-sm`}>
          <p className="sinhala text-lg text-mq-text-strong text-center">{envelope.raw_sinhala_question}</p>
        </section>

        {!finished && step && (
          <section key={step.step_order} className={`rounded-[2rem] bg-white shadow-[var(--mq-shadow-md)] border ${theme.card} p-8 ${calm ? '' : 'animate-fade-in'}`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl" aria-hidden>{ASSET_ICON[step.target_visual_asset]}</span>
              <h1 className={`text-2xl md:text-3xl font-extrabold text-center ${lang === 'si' ? 'sinhala' : ''}`}>
                {lang === 'si' ? step.instruction_si : step.instruction_en}
              </h1>
              <button id="speak-instruction" aria-label="Read instruction aloud"
                onClick={() => speak(lang === 'si' ? step.instruction_si : step.instruction_en, lang)}
                className="w-10 h-10 rounded-full bg-mq-surface-blue text-mq-primary flex items-center justify-center hover:bg-mq-primary hover:text-white transition">
                <Volume2 size={20} />
              </button>
            </div>

            <div className={`grid gap-4 mt-8 ${step.game_options.length > 3 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {step.game_options.map(opt => (
                <OptionCard
                  key={opt.text_en}
                  option={opt}
                  lang={lang}
                  calm={calm}
                  showQuantity={step.action_type === 'CALCULATE_MICROSTEP' && blueprint.grade <= 2}
                  state={solved && opt.is_correct ? 'correct' : wrongPicks.has(opt.text_en) || solved ? 'wrong' : 'idle'}
                  onPick={() => pick(opt)}
                />
              ))}
            </div>

            <div className="min-h-16 mt-6 flex items-center justify-center" aria-live="polite">
              {feedback === 'retry' && (
                <p className={`px-5 py-2 rounded-full bg-[var(--mq-warning-bg)] text-mq-text font-semibold ${lang === 'si' ? 'sinhala' : ''}`}>
                  {FEEDBACK.retry[lang]}
                </p>
              )}
              {feedback === 'correct' && (
                <div className="flex items-center gap-4">
                  <p className={`px-5 py-2 rounded-full bg-[var(--mq-success-bg)] text-mq-success font-bold ${lang === 'si' ? 'sinhala' : ''}`}>
                    <Sparkles size={18} className="inline -mt-1 mr-1" />{FEEDBACK.correct[lang]}
                  </p>
                  <button id="next-step" onClick={next} className="btn btn-primary text-lg px-6">
                    {lang === 'si' ? 'ඊළඟ' : 'Next'} →
                  </button>
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
              <button id="game-finish" onClick={() => void exitGame()} className="btn btn-primary">{lang === 'si' ? 'අවසන්' : 'Finish'}</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default GamePlayer;
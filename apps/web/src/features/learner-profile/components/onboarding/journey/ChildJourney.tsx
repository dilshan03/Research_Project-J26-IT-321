import React, { useRef, useState } from 'react';
import { useScrollToTopOnChange } from '../../../../../shared/hooks/useScrollToTopOnChange';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { ChildPreferenceChoices, MathItemAnswer, MathSubmissionExtras } from '../../../types/onboarding';
import { AVATAR_OPTIONS } from '../../../types';
import { childText } from '../../../../../shared/i18n/childText';
import { ActivityFrame, PrimaryAction, useSinhalaSpeech } from './ui';
import {
  ChoiceActivity,
  CompareGroupsActivity,
  CountIntoContainerActivity,
  MoveToTargetActivity,
  type ActivityContext,
} from './activities';
import { COMPANION_IDS, WORLDS, worldById, type SoundMode, type WorldId } from './themes';
import {
  G1_CALIBRATION,
  G1_COMPARE_PRE,
  G1_COMPARE_SUPPORT,
  G1_COMPARE_TRANSFER,
  G1_COUNT,
  G1_MATCH_GROUP,
  G1_MATCH_NUMERAL,
} from './grade1';

type Phase =
  | 'welcome'
  | 'calibration'
  | 'count'
  | 'match_numeral'
  | 'match_group'
  | 'compare_pre'
  | 'compare_support'
  | 'compare_transfer'
  | 'ending';

const PROGRESS_PHASES: Phase[] = ['welcome', 'calibration', 'count', 'match_numeral', 'match_group', 'compare_pre', 'compare_transfer', 'ending'];

interface Props {
  onSubmit: (answers: MathItemAnswer[], extras: MathSubmissionExtras) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Grade 1 onboarding-v2 child journey (design phases A–F):
 * welcome + child choices → instruction check → independent counting → representation matching
 * → compare pre-probe → guided support (only if needed) → new transfer item → gentle ending.
 * Only items actually shown are submitted; scoring happens on the server.
 */
export const Grade1Journey: React.FC<Props> = ({ onSubmit, isSubmitting }) => {
  const [phase, setPhase] = useState<Phase>('welcome');
  useScrollToTopOnChange(phase);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<WorldId | null>(null);
  const [soundMode, setSoundMode] = useState<SoundMode | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);

  const answers = useRef<MathItemAnswer[]>([]);
  const preferences = useRef<ChildPreferenceChoices | undefined>(undefined);
  const startedAt = useRef<string>(new Date().toISOString());
  const submitting = useRef(false);

  const { speak, enabled: speechEnabled } = useSinhalaSpeech(soundMode ?? undefined);
  const world = worldById(worldId ?? undefined);
  const companion = AVATAR_OPTIONS.find((a) => a.id === companionId) ?? AVATAR_OPTIONS[0];

  const ctx: ActivityContext = {
    progress: { step: PROGRESS_PHASES.indexOf(phase === 'compare_support' ? 'compare_pre' : phase) + 1, total: PROGRESS_PHASES.length },
    speak,
    speechEnabled,
  };

  const record = (answer: MathItemAnswer, next: Phase) => {
    answers.current = [...answers.current.filter((a) => a.questionId !== answer.questionId), answer];
    setPhase(next);
  };

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitFailed(false);
    await onSubmit(answers.current, {
      assessmentProtocolVersion: 'onboarding-v2',
      childPreferences: preferences.current,
      sessionStartedAt: startedAt.current,
      sessionEndedAt: new Date().toISOString(),
    });
    // On success the page leaves this step; reaching here again means the save failed.
    submitting.current = false;
    setSubmitFailed(true);
  };

  /* ---------------- Phase A: welcome and child-expressed preferences ---------------- */
  if (phase === 'welcome') {
    const choiceClass = (selected: boolean) =>
      `rounded-3xl border-4 bg-white/90 p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] cursor-pointer transition-colors ${
        selected ? 'border-mq-primary ring-4 ring-mq-primary/25' : 'border-white hover:border-mq-primary/40'
      }`;
    const ready = companionId && worldId && soundMode;
    return (
      <ActivityFrame
        scene="welcome"
        instruction={childText.welcome.title}
        progress={ctx.progress}
        footer={
          <PrimaryAction
            disabled={!ready}
            onClick={() => {
              if (!ready) return;
              preferences.current = {
                source: 'child',
                avatarId: companionId,
                theme: worldId,
                soundMode,
                chosenAt: new Date().toISOString(),
              };
              setPhase('calibration');
            }}
          >
            <span>{childText.welcome.start}</span>
            <ArrowRight size={22} />
          </PrimaryAction>
        }
      >
        <div className="space-y-5">
          <section>
            <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">
              {childText.welcome.companion}
            </h3>
            <div role="radiogroup" aria-label={childText.welcome.companion} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COMPANION_IDS.map((id) => {
                const avatar = AVATAR_OPTIONS.find((a) => a.id === id);
                if (!avatar) return null;
                return (
                  <button key={id} type="button" role="radio" aria-checked={companionId === id} onClick={() => setCompanionId(id)} className={choiceClass(companionId === id)}>
                    <span aria-hidden="true" className="text-5xl">{avatar.icon}</span>
                    <span className="text-base font-semibold">{avatar.nameSi}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">
              {childText.welcome.world}
            </h3>
            <div role="radiogroup" aria-label={childText.welcome.world} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {WORLDS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={worldId === w.id} onClick={() => setWorldId(w.id)} className={choiceClass(worldId === w.id)}>
                  <span aria-hidden="true" className="text-5xl">{w.icon}</span>
                  <span className="text-base font-semibold">{childText.worlds[w.id]}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">
              {childText.welcome.sound}
            </h3>
            <div role="radiogroup" aria-label={childText.welcome.sound} className="grid grid-cols-2 gap-3 max-w-md">
              {([
                ['gentle', '🔉', childText.welcome.soundGentle],
                ['quiet', '🔇', childText.welcome.soundQuiet],
              ] as const).map(([id, icon, label]) => (
                <button key={id} type="button" role="radio" aria-checked={soundMode === id} onClick={() => setSoundMode(id)} className={choiceClass(soundMode === id)}>
                  <span aria-hidden="true" className="text-4xl">{icon}</span>
                  <span className="text-base font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ActivityFrame>
    );
  }

  /* ---------------- Phase B: non-mathematical instruction check ---------------- */
  if (phase === 'calibration') {
    return (
      <MoveToTargetActivity
        key="calibration"
        meta={G1_CALIBRATION}
        world={world}
        instruction={childText.calibration[world.id]}
        ctx={ctx}
        onDone={(a) => record(a, 'count')}
      />
    );
  }

  /* ---------------- Phase C: independent counting (Nature Garden) ---------------- */
  if (phase === 'count') {
    return (
      <CountIntoContainerActivity
        key="count"
        meta={G1_COUNT.meta}
        scene="nature_garden"
        instruction={childText.count.instruction(G1_COUNT.target)}
        objectIcon={G1_COUNT.objectIcon}
        objectLabel={G1_COUNT.objectLabel}
        containerIcon={G1_COUNT.containerIcon}
        containerLabel={G1_COUNT.containerLabel}
        helperIcon={G1_COUNT.helperIcon}
        poolSize={G1_COUNT.poolSize}
        ctx={ctx}
        onDone={(a) => record(a, 'match_numeral')}
      />
    );
  }

  /* ---------------- Phase D: representation matching (Toy Room) ---------------- */
  if (phase === 'match_numeral' || phase === 'match_group') {
    const item = phase === 'match_numeral' ? G1_MATCH_NUMERAL : G1_MATCH_GROUP;
    return (
      <ChoiceActivity
        key={phase}
        meta={item.meta}
        scene="toy_room"
        instruction={item.instruction}
        helpText={item.helpText}
        stimulus={item.stimulus}
        options={item.options}
        ctx={ctx}
        onDone={(a) => record(a, phase === 'match_numeral' ? 'match_group' : 'compare_pre')}
      />
    );
  }

  /* ---------------- Phase E: learn and transfer (Animal Friends) ---------------- */
  if (phase === 'compare_pre') {
    return (
      <CompareGroupsActivity
        key="compare_pre"
        item={G1_COMPARE_PRE}
        scene="animal_friends"
        mode="independent"
        ctx={ctx}
        onDone={(a, result) => {
          // Support only when the independent pre-probe was not demonstrated unassisted.
          const needsSupport = !result.firstCorrect || result.assistedBeforeFirst;
          record(a, needsSupport ? 'compare_support' : 'compare_transfer');
        }}
      />
    );
  }

  if (phase === 'compare_support') {
    return (
      <CompareGroupsActivity
        key="compare_support"
        item={G1_COMPARE_SUPPORT}
        scene="animal_friends"
        mode="guided"
        intro={childText.compare.supportIntro}
        ctx={ctx}
        onDone={(a) => record(a, 'compare_transfer')}
      />
    );
  }

  if (phase === 'compare_transfer') {
    return (
      <CompareGroupsActivity
        key="compare_transfer"
        item={G1_COMPARE_TRANSFER}
        scene="nature_garden"
        mode="independent"
        intro={childText.compare.transferIntro}
        ctx={ctx}
        onDone={(a) => record(a, 'ending')}
      />
    );
  }

  /* ---------------- Phase F: gentle ending (no score shown) ---------------- */
  return (
    <ActivityFrame
      scene={world.scene}
      instruction={childText.ending.title}
      progress={ctx.progress}
      helpMessage={submitFailed ? childText.ending.error : null}
      footer={
        <PrimaryAction onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
          <span>
            {isSubmitting ? childText.ending.saving : submitFailed ? childText.ending.retry : childText.ending.finish}
          </span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden="true" className={`w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 ${companion.bgColor} ${companion.borderColor}`}>
          {companion.icon}
        </span>
        <p className="text-xl font-semibold text-mq-text-strong bg-white/85 rounded-2xl px-5 py-3">{childText.ending.text}</p>
        <span aria-hidden="true" className="text-4xl">🌟</span>
      </div>
    </ActivityFrame>
  );
};

export default Grade1Journey;

import React, { useRef, useState } from 'react';
import { useScrollToTopOnChange } from '../../../../../shared/hooks/useScrollToTopOnChange';
import type { ChildPreferenceChoices, MathItemAnswer, MathSubmissionExtras } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import type { ItemMeta } from './evidence';
import { useSinhalaSpeech } from './ui';
import { ChoiceActivity, MoveToTargetActivity, type ActivityContext, type ChoiceOption } from './activities';
import { StepChoiceActivity, type StepChoiceItem } from './numberActivities';
import { ShadePartsActivity } from './partActivities';
import { worldById, type SoundMode, type WorldId } from './themes';
import { EndingStep, WelcomeStep } from './JourneyShell';

interface ChoiceStep {
  meta: ItemMeta;
  instruction: string;
  helpText: string;
  stimulus: React.ReactNode;
  options: ChoiceOption[];
  layout: 'wrap' | 'equal';
}

/** Content of a Grade 4–5 journey; the item shapes mirror the server item bank (two skills per grade). */
export interface UpperGradeJourneyConfig {
  calibration: ItemMeta;
  /** Skill 1, concrete: shade parts of a whole. */
  shade: { meta: ItemMeta; parts: number; instruction: string; helpClarify: string; helpCue: (shaded: number) => string };
  /** Skill 1, pictorial and symbolic representation items. */
  read: ChoiceStep;
  match: ChoiceStep;
  /** Skill 2, independent item outside the learn-and-transfer sequence. */
  independent: { item: StepChoiceItem; instruction: string; helpText: string };
  /** Skill 2, pre-probe → guided support (only if needed) → new transfer item. */
  sequence: {
    pre: StepChoiceItem;
    support: StepChoiceItem;
    transfer: StepChoiceItem;
    instruction: string;
    helpText: string;
    supportIntro: string;
    transferIntro: string;
  };
}

type Phase = 'welcome' | 'calibration' | 'shade' | 'read' | 'match' | 'independent' | 'pre' | 'support' | 'transfer' | 'ending';

const PROGRESS_PHASES: Phase[] = ['welcome', 'calibration', 'shade', 'read', 'match', 'independent', 'pre', 'transfer', 'ending'];

interface Props {
  config: UpperGradeJourneyConfig;
  onSubmit: (answers: MathItemAnswer[], extras: MathSubmissionExtras) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Grade 4–5 onboarding-v2 child journey (design phases A–F), same structure as Grades 2–3:
 * welcome + child choices (CP) → instruction check (IC, IA; not scored) → skill 1: shade, read and match
 * (MP, RU, SC, IA) → skill 2: independent item (MP, RU) → pre-probe → guided support only if needed
 * (SR; never independent) → new transfer item (SR, MP) → gentle ending.
 * Only items actually shown are submitted; scoring happens on the server.
 */
const UpperGradeJourney: React.FC<Props> = ({ config, onSubmit, isSubmitting }) => {
  const [phase, setPhase] = useState<Phase>('welcome');
  useScrollToTopOnChange(phase);
  const [submitFailed, setSubmitFailed] = useState(false);
  const answers = useRef<MathItemAnswer[]>([]);
  const [prefs, setPrefs] = useState<ChildPreferenceChoices | undefined>(undefined);
  const [startedAt] = useState(() => new Date().toISOString());
  const submitting = useRef(false);

  const { speak, enabled: speechEnabled } = useSinhalaSpeech((prefs?.soundMode as SoundMode | undefined) ?? undefined);
  const world = worldById((prefs?.theme as WorldId | undefined) ?? undefined);

  const ctx: ActivityContext = {
    progress: { step: PROGRESS_PHASES.indexOf(phase === 'support' ? 'pre' : phase) + 1, total: PROGRESS_PHASES.length },
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
      childPreferences: prefs,
      sessionStartedAt: startedAt,
      sessionEndedAt: new Date().toISOString(),
    });
    // On success the page leaves this step; reaching here again means the save failed.
    submitting.current = false;
    setSubmitFailed(true);
  };

  const { sequence } = config;

  switch (phase) {
    case 'welcome':
      return (
        <WelcomeStep
          progress={ctx.progress}
          onStart={(p) => {
            setPrefs(p);
            setPhase('calibration');
          }}
        />
      );

    case 'calibration':
      return (
        <MoveToTargetActivity
          key="calibration"
          meta={config.calibration}
          world={world}
          instruction={childText.calibration[world.id]}
          ctx={ctx}
          onDone={(a) => record(a, 'shade')}
        />
      );

    case 'shade':
      return <ShadePartsActivity key="shade" scene="toy_room" {...config.shade} ctx={ctx} onDone={(a) => record(a, 'read')} />;

    case 'read':
    case 'match': {
      const item = config[phase];
      return (
        <ChoiceActivity
          key={phase}
          meta={item.meta}
          scene="toy_room"
          instruction={item.instruction}
          helpText={item.helpText}
          stimulus={item.stimulus}
          options={item.options}
          optionsLayout={item.layout}
          ctx={ctx}
          onDone={(a) => record(a, phase === 'read' ? 'match' : 'independent')}
        />
      );
    }

    case 'independent':
      return (
        <StepChoiceActivity
          key="independent"
          item={config.independent.item}
          scene="nature_garden"
          mode="independent"
          instruction={config.independent.instruction}
          helpText={config.independent.helpText}
          ctx={ctx}
          onDone={(a) => record(a, 'pre')}
        />
      );

    case 'pre':
      return (
        <StepChoiceActivity
          key="pre"
          item={sequence.pre}
          scene="animal_friends"
          mode="independent"
          instruction={sequence.instruction}
          helpText={sequence.helpText}
          ctx={ctx}
          onDone={(a, result) => record(a, !result.firstCorrect || result.assistedBeforeFirst ? 'support' : 'transfer')}
        />
      );

    case 'support':
      return (
        <StepChoiceActivity
          key="support"
          item={sequence.support}
          scene="animal_friends"
          mode="guided"
          instruction={sequence.instruction}
          helpText={sequence.helpText}
          intro={sequence.supportIntro}
          ctx={ctx}
          onDone={(a) => record(a, 'transfer')}
        />
      );

    case 'transfer':
      return (
        <StepChoiceActivity
          key="transfer"
          item={sequence.transfer}
          scene={world.scene}
          mode="independent"
          instruction={sequence.instruction}
          helpText={sequence.helpText}
          intro={sequence.transferIntro}
          ctx={ctx}
          onDone={(a) => record(a, 'ending')}
        />
      );

    default:
      return (
        <EndingStep
          scene={world.scene}
          progress={ctx.progress}
          companionId={prefs?.avatarId ?? null}
          isSubmitting={isSubmitting}
          submitFailed={submitFailed}
          onFinish={submit}
        />
      );
  }
};

export default UpperGradeJourney;

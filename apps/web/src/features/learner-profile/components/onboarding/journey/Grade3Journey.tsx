import React, { useRef, useState } from 'react';
import { useScrollToTopOnChange } from '../../../../../shared/hooks/useScrollToTopOnChange';
import type { ChildPreferenceChoices, MathItemAnswer, MathSubmissionExtras } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import { useSinhalaSpeech } from './ui';
import { ChoiceActivity, MoveToTargetActivity, type ActivityContext } from './activities';
import { BuildBaseTenActivity, StepChoiceActivity } from './numberActivities';
import { worldById, type SoundMode, type WorldId } from './themes';
import { EndingStep, WelcomeStep } from './JourneyShell';
import {
  G3_MULT_GROUPS,
  G3_MULT_PRE,
  G3_MULT_SUPPORT,
  G3_MULT_TRANSFER,
  G3_BUILD,
  G3_CALIBRATION,
  G3_READ_BLOCKS,
  G3_SHOW_NUMBER,
} from './grade3';

type Phase =
  | 'welcome'
  | 'calibration'
  | 'build'
  | 'read_blocks'
  | 'show_number'
  | 'mult_groups'
  | 'mult_pre'
  | 'mult_support'
  | 'mult_transfer'
  | 'ending';

const PROGRESS_PHASES: Phase[] = ['welcome', 'calibration', 'build', 'read_blocks', 'show_number', 'mult_groups', 'mult_pre', 'mult_transfer', 'ending'];

interface Props {
  onSubmit: (answers: MathItemAnswer[], extras: MathSubmissionExtras) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Grade 3 onboarding-v2 child journey (design phases A–F):
 * welcome + child choices (CP) → instruction check (IC, IA; not scored) → place value to 1000: build, read and
 * show a number (MP, RU, SC, IA) → independent equal-groups picture (MP, RU) → multiplication pre-probe → guided
 * support (repeated addition) only if needed (SR; never independent) → new transfer item (SR, MP) → gentle ending.
 * Only items actually shown are submitted; scoring happens on the server.
 */
export const Grade3Journey: React.FC<Props> = ({ onSubmit, isSubmitting }) => {
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
    progress: { step: PROGRESS_PHASES.indexOf(phase === 'mult_support' ? 'mult_pre' : phase) + 1, total: PROGRESS_PHASES.length },
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
          meta={G3_CALIBRATION}
          world={world}
          instruction={childText.calibration[world.id]}
          ctx={ctx}
          onDone={(a) => record(a, 'build')}
        />
      );

    case 'build':
      return <BuildBaseTenActivity key="build" meta={G3_BUILD.meta} scene="toy_room" target={G3_BUILD.target} withHundreds ctx={ctx} onDone={(a) => record(a, 'read_blocks')} />;

    case 'read_blocks':
    case 'show_number': {
      const item = phase === 'read_blocks' ? G3_READ_BLOCKS : G3_SHOW_NUMBER;
      return (
        <ChoiceActivity
          key={phase}
          meta={item.meta}
          scene="toy_room"
          instruction={item.instruction}
          helpText={item.helpText}
          stimulus={item.stimulus}
          options={item.options}
          optionsLayout={phase === 'show_number' ? 'equal' : 'wrap'}
          ctx={ctx}
          onDone={(a) => record(a, phase === 'read_blocks' ? 'show_number' : 'mult_groups')}
        />
      );
    }

    case 'mult_groups':
      return (
        <StepChoiceActivity
          key="mult_groups"
          item={G3_MULT_GROUPS}
          scene="nature_garden"
          mode="independent"
          instruction={childText.mult.groups}
          helpText={childText.mult.groupsHelp}
          ctx={ctx}
          onDone={(a) => record(a, 'mult_pre')}
        />
      );

    case 'mult_pre':
      return (
        <StepChoiceActivity
          key="mult_pre"
          item={G3_MULT_PRE}
          scene="animal_friends"
          mode="independent"
          instruction={childText.mult.product}
          helpText={childText.mult.helpClarify}
          ctx={ctx}
          onDone={(a, result) => record(a, !result.firstCorrect || result.assistedBeforeFirst ? 'mult_support' : 'mult_transfer')}
        />
      );

    case 'mult_support':
      return (
        <StepChoiceActivity
          key="mult_support"
          item={G3_MULT_SUPPORT}
          scene="animal_friends"
          mode="guided"
          instruction={childText.mult.product}
          helpText={childText.mult.helpClarify}
          intro={childText.mult.supportIntro}
          ctx={ctx}
          onDone={(a) => record(a, 'mult_transfer')}
        />
      );

    case 'mult_transfer':
      return (
        <StepChoiceActivity
          key="mult_transfer"
          item={G3_MULT_TRANSFER}
          scene={world.scene}
          mode="independent"
          instruction={childText.mult.product}
          helpText={childText.mult.helpClarify}
          intro={childText.mult.transferIntro}
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

export default Grade3Journey;

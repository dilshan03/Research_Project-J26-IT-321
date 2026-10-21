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
  G2_ADD_BLOCKS,
  G2_ADD_PRE,
  G2_ADD_SUPPORT,
  G2_ADD_TRANSFER,
  G2_BUILD,
  G2_CALIBRATION,
  G2_READ_BLOCKS,
  G2_SHOW_NUMBER,
} from './grade2';

type Phase =
  | 'welcome'
  | 'calibration'
  | 'build'
  | 'read_blocks'
  | 'show_number'
  | 'add_blocks'
  | 'add_pre'
  | 'add_support'
  | 'add_transfer'
  | 'ending';

const PROGRESS_PHASES: Phase[] = ['welcome', 'calibration', 'build', 'read_blocks', 'show_number', 'add_blocks', 'add_pre', 'add_transfer', 'ending'];

interface Props {
  onSubmit: (answers: MathItemAnswer[], extras: MathSubmissionExtras) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Grade 2 onboarding-v2 child journey (design phases A–F):
 * welcome + child choices (CP) → instruction check (IC, IA; not scored) → place value: build, read and show
 * a number (MP, RU, SC, IA) → independent addition with blocks (MP, RU) → addition pre-probe → guided support
 * only if needed (SR; never independent) → new transfer item (SR, MP) → gentle ending.
 * Only items actually shown are submitted; scoring happens on the server.
 */
export const Grade2Journey: React.FC<Props> = ({ onSubmit, isSubmitting }) => {
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
    progress: { step: PROGRESS_PHASES.indexOf(phase === 'add_support' ? 'add_pre' : phase) + 1, total: PROGRESS_PHASES.length },
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
          meta={G2_CALIBRATION}
          world={world}
          instruction={childText.calibration[world.id]}
          ctx={ctx}
          onDone={(a) => record(a, 'build')}
        />
      );

    case 'build':
      return <BuildBaseTenActivity key="build" meta={G2_BUILD.meta} scene="toy_room" target={G2_BUILD.target} ctx={ctx} onDone={(a) => record(a, 'read_blocks')} />;

    case 'read_blocks':
    case 'show_number': {
      const item = phase === 'read_blocks' ? G2_READ_BLOCKS : G2_SHOW_NUMBER;
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
          onDone={(a) => record(a, phase === 'read_blocks' ? 'show_number' : 'add_blocks')}
        />
      );
    }

    case 'add_blocks':
      return (
        <StepChoiceActivity
          key="add_blocks"
          item={G2_ADD_BLOCKS}
          scene="nature_garden"
          mode="independent"
          instruction={childText.add2.blocks}
          helpText={childText.add2.helpClarify}
          ctx={ctx}
          onDone={(a) => record(a, 'add_pre')}
        />
      );

    case 'add_pre':
      return (
        <StepChoiceActivity
          key="add_pre"
          item={G2_ADD_PRE}
          scene="animal_friends"
          mode="independent"
          instruction={childText.add2.sum}
          helpText={childText.add2.helpClarify}
          ctx={ctx}
          onDone={(a, result) => record(a, !result.firstCorrect || result.assistedBeforeFirst ? 'add_support' : 'add_transfer')}
        />
      );

    case 'add_support':
      return (
        <StepChoiceActivity
          key="add_support"
          item={G2_ADD_SUPPORT}
          scene="animal_friends"
          mode="guided"
          instruction={childText.add2.sum}
          helpText={childText.add2.helpClarify}
          intro={childText.add2.supportIntro}
          ctx={ctx}
          onDone={(a) => record(a, 'add_transfer')}
        />
      );

    case 'add_transfer':
      return (
        <StepChoiceActivity
          key="add_transfer"
          item={G2_ADD_TRANSFER}
          scene={world.scene}
          mode="independent"
          instruction={childText.add2.sum}
          helpText={childText.add2.helpClarify}
          intro={childText.add2.transferIntro}
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

export default Grade2Journey;

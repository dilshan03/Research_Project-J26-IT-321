import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import type { InteractionMode, MathItemAnswer } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import { ItemRecorder, interactionModeOf, type InputDetail, type InputMethod, type ItemMeta } from './evidence';
import { ActivityFrame, DragTapToken, DropTarget, PrimaryAction, QuietAction } from './ui';
import type { SceneId } from './scenes';
import type { WorldTheme } from './themes';

/* ------------------------------------------------------------------ */
/* Shared plumbing                                                     */
/* ------------------------------------------------------------------ */

export interface ActivityContext {
  progress: { step: number; total: number };
  speak: (text: string) => boolean;
  speechEnabled: boolean;
}

/** Creates the item recorder once per mounted activity and wires instruction replay. */
const useActivity = (meta: ItemMeta, instructionText: string, ctx: ActivityContext) => {
  const [recorder] = useState(() => new ItemRecorder(meta));
  const [instructionKey, setInstructionKey] = useState(0);
  const replay = () => {
    recorder.instruction('replayed');
    ctx.speak(instructionText);
    setInstructionKey((k) => k + 1);
  };
  return { recorder, instructionKey, replay };
};

const frameProps = (ctx: ActivityContext, instructionKey: number, replay: () => void) => ({
  instructionKey,
  onReplay: replay,
  replayIsAudio: ctx.speechEnabled,
  progress: ctx.progress,
});

/* ------------------------------------------------------------------ */
/* Template 1: move a named object onto a target (instruction check)   */
/* ------------------------------------------------------------------ */

interface MoveToTargetProps {
  meta: ItemMeta;
  world: WorldTheme;
  instruction: string;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer) => void;
}

/** Non-mathematical: checks whether the child can follow one simple instruction. Not scored. */
export const MoveToTargetActivity: React.FC<MoveToTargetProps> = ({ meta, world, instruction, ctx, onDone }) => {
  const { recorder, instructionKey, replay } = useActivity(meta, instruction, ctx);
  const { targetObject, distractor, target } = world.calibration;
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const place = (objectId: string, input: InputDetail) => {
    recorder.confirm(objectId, input);
    if (objectId === targetObject.id) {
      setPlaced(true);
      setMessage(childText.calibration.success);
    } else {
      setMessage(childText.common.tryOnce);
    }
    setSelected(null);
  };

  const objects = [distractor, targetObject];

  return (
    <ActivityFrame
      scene={world.scene}
      instruction={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-3xl">{targetObject.icon}</span>
          <span>{instruction}</span>
        </span>
      }
      {...frameProps(ctx, instructionKey, replay)}
      helpMessage={message}
      footer={
        placed ? (
          <PrimaryAction onClick={() => onDone(recorder.toAnswer())}>
            <span>{childText.common.next}</span>
            <ArrowRight size={20} />
          </PrimaryAction>
        ) : (
          <QuietAction onClick={() => onDone(recorder.toAnswer())}>{childText.common.skip}</QuietAction>
        )
      }
    >
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div className="flex justify-center gap-6">
          {!placed &&
            objects.map((obj) => (
              <DragTapToken
                key={obj.id}
                icon={obj.icon}
                label={obj.label}
                selected={selected === obj.id}
                onTap={() => setSelected((prev) => (prev === obj.id ? null : obj.id))}
                onDrop={(_, mode) => place(obj.id, { inputMethod: 'drag', interactionMode: mode })}
                onMiss={() => recorder.missedDrop()}
              />
            ))}
        </div>
        <DropTarget
          id="calibration-target"
          label={target.label}
          active={Boolean(selected)}
          onActivate={(mode) => selected && place(selected, { inputMethod: 'tap', interactionMode: mode })}
          className="min-h-[220px] flex flex-col items-center justify-center gap-2"
        >
          <span aria-hidden="true" className="text-8xl">{target.icon}</span>
          {placed && <span aria-hidden="true" className="text-5xl -mt-10">{targetObject.icon}</span>}
        </DropTarget>
      </div>
      <p className="mt-3 text-sm text-mq-text bg-white/80 rounded-xl px-3 py-2 self-start">{childText.common.tapOrDrag}</p>
    </ActivityFrame>
  );
};

/* ------------------------------------------------------------------ */
/* Template 2: move a number of objects into a container               */
/* ------------------------------------------------------------------ */

interface CountIntoContainerProps {
  meta: ItemMeta;
  scene: SceneId;
  instruction: string;
  objectIcon: string;
  objectLabel: string;
  containerIcon: string;
  containerLabel: string;
  helperIcon: string;
  poolSize: number;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer) => void;
}

/** Independent counting by manipulation. Taking an object back out is recorded as a revision. */
export const CountIntoContainerActivity: React.FC<CountIntoContainerProps> = ({
  meta,
  scene,
  instruction,
  objectIcon,
  objectLabel,
  containerIcon,
  containerLabel,
  helperIcon,
  poolSize,
  ctx,
  onDone,
}) => {
  const { recorder, instructionKey, replay } = useActivity(meta, instruction, ctx);
  const [inContainer, setInContainer] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [helpLevel, setHelpLevel] = useState(0);
  const [lastInput, setLastInput] = useState<InputDetail | null>(null);

  const addOne = (input: InputDetail) => {
    if (inContainer >= poolSize) return;
    setInContainer((n) => n + 1);
    setSelected(null);
    setLastInput(input);
  };

  const removeOne = (mode: InteractionMode) => {
    recorder.revise(inContainer, inContainer - 1);
    setInContainer((n) => n - 1);
    setLastInput({ inputMethod: 'tap', interactionMode: mode });
  };

  const help = () => {
    if (helpLevel === 0) {
      recorder.support(1, 'clarification');
      setHelpLevel(1);
    } else if (helpLevel === 1) {
      recorder.support(2, 'visual_cue');
      setHelpLevel(2);
    }
  };

  const confirm = (e: React.MouseEvent) => {
    recorder.confirm(inContainer, lastInput ?? { inputMethod: 'tap', interactionMode: interactionModeOf(e) });
    onDone(recorder.toAnswer());
  };

  const remaining = poolSize - inContainer;

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={helpLevel < 2 ? help : undefined}
      helpMessage={helpLevel === 1 ? childText.count.helpClarify : helpLevel === 2 ? childText.count.helpCue : null}
      footer={
        <PrimaryAction onClick={confirm} disabled={inContainer === 0}>
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Source: objects still available */}
        <div className="flex flex-col items-center gap-2">
          <span aria-hidden="true" className="text-5xl">{helperIcon}</span>
          <div className="flex flex-wrap justify-center gap-3 max-w-[340px] rounded-3xl bg-white/50 p-3">
            {Array.from({ length: remaining }).map((_, i) => (
              <DragTapToken
                key={`pool-${i}`}
                icon={objectIcon}
                label={objectLabel}
                size="md"
                selected={selected === i}
                onTap={() => setSelected((prev) => (prev === i ? null : i))}
                onDrop={(target, mode) =>
                  target === 'container' ? addOne({ inputMethod: 'drag', interactionMode: mode }) : recorder.missedDrop()
                }
                onMiss={() => recorder.missedDrop()}
              />
            ))}
          </div>
        </div>

        <ArrowRight aria-hidden="true" className="hidden md:block text-mq-text-muted mx-auto" size={32} />

        {/* Container */}
        <DropTarget
          id="container"
          label={containerLabel}
          active={selected !== null}
          onActivate={(mode) => selected !== null && addOne({ inputMethod: 'tap', interactionMode: mode })}
          className="min-h-[220px] p-4 flex flex-col items-center gap-3"
        >
          <span aria-hidden="true" className="text-6xl">{containerIcon}</span>
          <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
            {Array.from({ length: inContainer }).map((_, i) => (
              <button
                key={`in-${i}`}
                type="button"
                aria-label={`${objectLabel} ${childText.count.takeBack}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeOne(interactionModeOf(e));
                }}
                className="relative w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-sm text-3xl flex items-center justify-center cursor-pointer hover:border-amber-300"
              >
                <span aria-hidden="true">{objectIcon}</span>
                {helpLevel >= 2 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mq-primary text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
          {inContainer > 0 && <span className="text-xs text-mq-text-muted">{childText.count.takeBack}</span>}
        </DropTarget>
      </div>
      <p className="mt-3 text-sm text-mq-text bg-white/80 rounded-xl px-3 py-2 self-start">{childText.common.tapOrDrag}</p>
    </ActivityFrame>
  );
};

/* ------------------------------------------------------------------ */
/* Template 3: choose one representation (revisable before confirm)    */
/* ------------------------------------------------------------------ */

export interface ChoiceOption {
  value: string | number;
  ariaLabel: string;
  content: React.ReactNode;
}

interface ChoiceProps {
  meta: ItemMeta;
  scene: SceneId;
  instruction: string;
  helpText: string;
  stimulus: React.ReactNode;
  options: ChoiceOption[];
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer) => void;
}

/** Representation matching. Changing the selection before confirming is a recorded revision. */
export const ChoiceActivity: React.FC<ChoiceProps> = ({ meta, scene, instruction, helpText, stimulus, options, ctx, onDone }) => {
  const { recorder, instructionKey, replay } = useActivity(meta, instruction, ctx);
  const [choice, setChoice] = useState<{ value: string | number; mode: InteractionMode } | null>(null);
  const [helped, setHelped] = useState(false);

  const select = (value: string | number, mode: InteractionMode) => {
    recorder.revise(choice?.value, value);
    setChoice({ value, mode });
  };

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={
        helped
          ? undefined
          : () => {
              recorder.support(1, 'clarification');
              setHelped(true);
            }
      }
      helpMessage={helped ? helpText : null}
      footer={
        <PrimaryAction
          disabled={!choice}
          onClick={() => {
            if (!choice) return;
            recorder.confirm(choice.value, { inputMethod: 'select', interactionMode: choice.mode });
            onDone(recorder.toAnswer());
          }}
        >
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="rounded-3xl bg-white/85 border border-white px-6 py-4 shadow-xs">{stimulus}</div>
        <div role="radiogroup" aria-label={instruction} className="flex flex-wrap justify-center gap-3">
          {options.map((opt) => {
            const isSelected = choice?.value === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={opt.ariaLabel}
                onClick={(e) => select(opt.value, interactionModeOf(e))}
                className={`min-w-[80px] min-h-[80px] px-4 py-3 rounded-2xl border-4 bg-white shadow-sm flex items-center justify-center cursor-pointer transition-colors ${
                  isSelected ? 'border-mq-primary ring-4 ring-mq-primary/25' : 'border-white hover:border-mq-primary/40'
                }`}
              >
                {opt.content}
              </button>
            );
          })}
        </div>
      </div>
    </ActivityFrame>
  );
};

/* ------------------------------------------------------------------ */
/* Template 4: compare two groups (independent or guided)              */
/* ------------------------------------------------------------------ */

export interface CompareGroupsItem {
  meta: ItemMeta;
  left: { icon: string; count: number; label: string };
  right: { icon: string; count: number; label: string };
  /** Layouts deliberately differ so size of the group does not give the answer away. */
  leftLayout: 'spread' | 'cluster';
  rightLayout: 'spread' | 'cluster';
  more: 'left' | 'right';
}

interface CompareProps {
  item: CompareGroupsItem;
  scene: SceneId;
  mode: 'independent' | 'guided';
  intro?: string;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer, result: { firstCorrect: boolean; assistedBeforeFirst: boolean }) => void;
}

const GroupView: React.FC<{ icon: string; count: number; layout: 'spread' | 'cluster' }> = ({ icon, count, layout }) => (
  <div
    className={`flex flex-wrap justify-center content-center ${
      layout === 'spread' ? 'gap-x-10 gap-y-6 max-w-[320px]' : 'gap-1 max-w-[150px]'
    }`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} aria-hidden="true" className="text-4xl sm:text-5xl leading-none">
        {icon}
      </span>
    ))}
  </div>
);

/** One-to-one pairing view used by guided support (L2 lines, L3 highlighted extras). */
const PairedView: React.FC<{ item: CompareGroupsItem; level: number }> = ({ item, level }) => {
  const rows = Math.max(item.left.count, item.right.count);
  return (
    <div className="grid grid-cols-[auto_80px_auto] items-center gap-y-2 justify-center">
      {Array.from({ length: rows }).map((_, i) => {
        const hasLeft = i < item.left.count;
        const hasRight = i < item.right.count;
        const paired = hasLeft && hasRight;
        const extra = !paired && level >= 3;
        return (
          <React.Fragment key={i}>
            <span className={`text-4xl text-center rounded-xl ${extra && hasLeft ? 'bg-amber-200 ring-4 ring-amber-400' : ''}`}>
              {hasLeft ? item.left.icon : ''}
            </span>
            <span className="h-1 mx-2 rounded-full" style={{ background: paired && level >= 2 ? '#3b82f6' : 'transparent' }} />
            <span className={`text-4xl text-center rounded-xl ${extra && hasRight ? 'bg-amber-200 ring-4 ring-amber-400' : ''}`}>
              {hasRight ? item.right.icon : ''}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const CompareGroupsActivity: React.FC<CompareProps> = ({ item, scene, mode, intro, ctx, onDone }) => {
  const instruction = childText.compare.instruction;
  const { recorder, instructionKey, replay } = useActivity(item.meta, instruction, ctx);
  const isGuided = mode === 'guided';
  // Guided support starts at level 1 (support is the purpose of this item, after the pre-probe).
  // The guard keeps this idempotent under StrictMode's double-invoked initializers.
  const [supportLevel, setSupportLevel] = useState(() => {
    if (isGuided && recorder.supportCount === 0) recorder.support(1, 'clarification');
    return isGuided ? 1 : 0;
  });
  const [choice, setChoice] = useState<{ side: 'left' | 'right'; mode: InteractionMode } | null>(null);
  const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null);
  const [assistedBeforeFirst, setAssistedBeforeFirst] = useState(false);

  const select = (side: 'left' | 'right', modeOfInput: InteractionMode) => {
    recorder.revise(choice?.side, side);
    setChoice({ side, mode: modeOfInput });
  };

  const confirm = () => {
    if (!choice) return;
    const correct = choice.side === item.more;
    const isFirst = !recorder.hasResponse;
    recorder.confirm(choice.side, { inputMethod: 'select', interactionMode: choice.mode });
    const first = isFirst ? correct : (firstCorrect as boolean);
    if (isFirst) setFirstCorrect(correct);

    // Guided item: escalate support after an incorrect try, at most to a worked demonstration.
    if (isGuided && !correct && supportLevel < 3) {
      const next = supportLevel + 1;
      recorder.support(next as 2 | 3, next === 2 ? 'visual_cue' : 'worked_demonstration');
      setSupportLevel(next);
      setChoice(null);
      return;
    }
    onDone(recorder.toAnswer(), { firstCorrect: first, assistedBeforeFirst: isFirst ? supportLevel > 0 : assistedBeforeFirst });
  };

  const requestHelp = () => {
    recorder.support(1, 'clarification');
    if (!recorder.hasResponse) setAssistedBeforeFirst(true);
    setSupportLevel(1);
  };

  const supportMessage = isGuided
    ? [intro, supportLevel === 1 ? childText.compare.supportL1 : supportLevel === 2 ? childText.compare.supportL2 : childText.compare.supportL3]
        .filter(Boolean)
        .join(' ')
    : supportLevel === 1
    ? childText.compare.helpClarify
    : intro ?? null;

  const sideButton = (side: 'left' | 'right') => {
    const group = side === 'left' ? item.left : item.right;
    const isSelected = choice?.side === side;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={`${side === 'left' ? childText.compare.left : childText.compare.right}: ${group.label}`}
        onClick={(e) => select(side, interactionModeOf(e))}
        className={`min-h-[200px] rounded-3xl border-4 bg-white/75 p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
          isSelected ? 'border-mq-primary ring-4 ring-mq-primary/25 bg-white/95' : 'border-white hover:border-mq-primary/40'
        }`}
      >
        {isGuided ? (
          <span aria-hidden="true" className="text-4xl leading-none">{group.icon}</span>
        ) : (
          <GroupView icon={group.icon} count={group.count} layout={side === 'left' ? item.leftLayout : item.rightLayout} />
        )}
        <span className="text-base font-semibold text-mq-text-strong">
          {side === 'left' ? childText.compare.left : childText.compare.right}
        </span>
      </button>
    );
  };

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={!isGuided && supportLevel === 0 ? requestHelp : undefined}
      helpMessage={supportMessage}
      footer={
        <PrimaryAction disabled={!choice} onClick={confirm}>
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      {isGuided ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="rounded-3xl bg-white/85 px-6 py-4">
            <PairedView item={item} level={supportLevel} />
          </div>
          <div role="radiogroup" aria-label={instruction} className="grid grid-cols-2 gap-4 w-full max-w-md [&>button]:min-h-[96px]">
            {sideButton('left')}
            {sideButton('right')}
          </div>
        </div>
      ) : (
        <div role="radiogroup" aria-label={instruction} className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sideButton('left')}
          {sideButton('right')}
        </div>
      )}
    </ActivityFrame>
  );
};

export type { InputMethod };

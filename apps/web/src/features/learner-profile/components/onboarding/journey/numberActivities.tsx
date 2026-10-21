import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { InteractionMode, MathItemAnswer } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import { interactionModeOf, type InputDetail, type ItemMeta } from './evidence';
import { ActivityFrame, DragTapToken, DropTarget, PrimaryAction } from './ui';
import { frameProps, useActivity, type ActivityContext } from './activities';
import type { SceneId } from './scenes';

/* Grade 2+ number templates. Same evidence rules as Grade 1: only the first confirmed response is
   the child's answer, help is recorded with its timing, and correctness is decided on the server. */

/* ------------------------------------------------------------------ */
/* Base-ten pictures                                                   */
/* ------------------------------------------------------------------ */

export const TenRod: React.FC<{ highlight?: boolean }> = ({ highlight }) => (
  <span
    aria-hidden="true"
    className={`inline-flex flex-col gap-[2px] rounded-md p-[2px] border-2 ${highlight ? 'border-amber-500 bg-amber-100' : 'border-emerald-700 bg-emerald-50'}`}
  >
    {Array.from({ length: 10 }).map((_, i) => (
      <span key={i} className="w-3.5 h-2.5 rounded-[2px] bg-emerald-500" />
    ))}
  </span>
);

export const OneCube: React.FC<{ highlight?: boolean }> = ({ highlight }) => (
  <span aria-hidden="true" className={`inline-block w-4 h-4 rounded-[3px] border-2 ${highlight ? 'border-amber-500 bg-amber-300' : 'border-sky-700 bg-sky-400'}`} />
);

/** Tens as vertical rods, ones as loose cubes. */
export const BaseTenPicture: React.FC<{ tens: number; ones: number; label?: string }> = ({ tens, ones, label }) => (
  <span role="img" aria-label={label ?? `${tens} × 10, ${ones} × 1`} className="inline-flex items-end gap-1.5">
    {Array.from({ length: tens }).map((_, i) => (
      <TenRod key={`t${i}`} />
    ))}
    {ones > 0 && (
      <span className="inline-grid grid-cols-3 gap-[3px] ml-1">
        {Array.from({ length: ones }).map((_, i) => (
          <OneCube key={`o${i}`} />
        ))}
      </span>
    )}
  </span>
);

/* ------------------------------------------------------------------ */
/* Template 5: build a number with tens and ones                       */
/* ------------------------------------------------------------------ */

interface BuildProps {
  meta: ItemMeta;
  scene: SceneId;
  target: number;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer) => void;
}

const MAX_PIECES = 9;

/**
 * Concrete place-value construction. Adding pieces is building; taking a piece back out before
 * confirming is a recorded revision. The confirmed total (10 × tens + ones) is the answer.
 */
export const BuildBaseTenActivity: React.FC<BuildProps> = ({ meta, scene, target, ctx, onDone }) => {
  const instruction = childText.placeValue.build(target);
  const { recorder, instructionKey, replay } = useActivity(meta, instruction, ctx);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const [selected, setSelected] = useState<'ten' | 'one' | null>(null);
  const [helpLevel, setHelpLevel] = useState(0);
  const [lastInput, setLastInput] = useState<InputDetail | null>(null);
  const total = tens * 10 + ones;

  const add = (piece: 'ten' | 'one', input: InputDetail) => {
    if (piece === 'ten' && tens < MAX_PIECES) setTens((n) => n + 1);
    if (piece === 'one' && ones < MAX_PIECES) setOnes((n) => n + 1);
    setSelected(null);
    setLastInput(input);
  };

  const remove = (piece: 'ten' | 'one', mode: InteractionMode) => {
    recorder.revise(total, total - (piece === 'ten' ? 10 : 1));
    if (piece === 'ten') setTens((n) => n - 1);
    else setOnes((n) => n - 1);
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
    recorder.confirm(total, lastInput ?? { inputMethod: 'tap', interactionMode: interactionModeOf(e) });
    onDone(recorder.toAnswer());
  };

  const source = (piece: 'ten' | 'one') => (
    <div className="flex flex-col items-center gap-2">
      <DragTapToken
        icon={piece === 'ten' ? '🟩' : '🟦'}
        label={piece === 'ten' ? childText.placeValue.ten : childText.placeValue.one}
        selected={selected === piece}
        disabled={(piece === 'ten' ? tens : ones) >= MAX_PIECES}
        onTap={() => setSelected((prev) => (prev === piece ? null : piece))}
        onDrop={(t, mode) => (t === 'tray' ? add(piece, { inputMethod: 'drag', interactionMode: mode }) : recorder.missedDrop())}
        onMiss={() => recorder.missedDrop()}
      />
      <span className="flex items-center gap-1.5 rounded-xl bg-white/85 px-2 py-1 text-sm font-semibold text-mq-text-strong">
        {piece === 'ten' ? <TenRod /> : <OneCube />}
        <span>{piece === 'ten' ? childText.placeValue.ten : childText.placeValue.one}</span>
      </span>
    </div>
  );

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={helpLevel < 2 ? help : undefined}
      helpMessage={helpLevel === 1 ? childText.placeValue.helpClarify : helpLevel === 2 ? childText.placeValue.helpCue(tens, ones) : null}
      footer={
        <PrimaryAction onClick={confirm} disabled={total === 0}>
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
        <div className="flex md:flex-col justify-center gap-6">
          {source('ten')}
          {source('one')}
        </div>
        <DropTarget
          id="tray"
          label={childText.placeValue.tray}
          active={selected !== null}
          onActivate={(mode) => selected && add(selected, { inputMethod: 'tap', interactionMode: mode })}
          className="min-h-[220px] p-4"
        >
          <span aria-hidden="true" className="text-4xl">🧺</span>
          <div className="flex flex-wrap items-end justify-center gap-2 max-w-[440px]">
            {Array.from({ length: tens }).map((_, i) => (
              <button
                key={`t${i}`}
                type="button"
                aria-label={`${childText.placeValue.ten} ${childText.placeValue.takeBack}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove('ten', interactionModeOf(e));
                }}
                className="rounded-lg p-1 hover:bg-amber-100 cursor-pointer"
              >
                <TenRod />
              </button>
            ))}
            {Array.from({ length: ones }).map((_, i) => (
              <button
                key={`o${i}`}
                type="button"
                aria-label={`${childText.placeValue.one} ${childText.placeValue.takeBack}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove('one', interactionModeOf(e));
                }}
                className="rounded-lg p-2 hover:bg-amber-100 cursor-pointer"
              >
                <OneCube />
              </button>
            ))}
          </div>
          {total > 0 && <span className="text-xs text-mq-text-muted">{childText.placeValue.takeBack}</span>}
        </DropTarget>
      </div>
      <p className="mt-3 text-sm text-mq-text bg-white/80 rounded-xl px-3 py-2 self-start">{childText.common.tapOrDrag}</p>
    </ActivityFrame>
  );
};

/* ------------------------------------------------------------------ */
/* Template 6: number choice for a learn-and-transfer sequence         */
/* ------------------------------------------------------------------ */

export interface StepChoiceItem {
  meta: ItemMeta;
  /** Shown above the options (e.g. "32 + 15 = ?"). */
  stimulus: React.ReactNode;
  options: number[];
  /** Client copy of the key, used only to route support and escalate guidance; the server scores. */
  correct: number;
  /** Guided mode: level-2 visual cue and level-3 worked demonstration. */
  visualCue?: React.ReactNode;
  worked?: string;
}

interface StepChoiceProps {
  item: StepChoiceItem;
  scene: SceneId;
  mode: 'independent' | 'guided';
  instruction: string;
  helpText: string;
  intro?: string;
  ctx: ActivityContext;
  onDone: (answer: MathItemAnswer, result: { firstCorrect: boolean; assistedBeforeFirst: boolean }) => void;
}

/**
 * Independent mode: help only on request (recorded; help before the first answer makes it not independent).
 * Guided mode: support is the purpose of the item: L1 at the start, then L2 visual cue and L3 worked
 * demonstration after incorrect tries. Guided answers are never independent evidence (server role `support`).
 */
export const StepChoiceActivity: React.FC<StepChoiceProps> = ({ item, scene, mode, instruction, helpText, intro, ctx, onDone }) => {
  const { recorder, instructionKey, replay } = useActivity(item.meta, instruction, ctx);
  const isGuided = mode === 'guided';
  const [supportLevel, setSupportLevel] = useState(() => {
    if (isGuided && recorder.supportCount === 0) recorder.support(1, 'clarification');
    return isGuided ? 1 : 0;
  });
  const [choice, setChoice] = useState<{ value: number; mode: InteractionMode } | null>(null);
  const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null);
  const [assistedBeforeFirst, setAssistedBeforeFirst] = useState(false);

  const select = (value: number, m: InteractionMode) => {
    recorder.revise(choice?.value, value);
    setChoice({ value, mode: m });
  };

  const confirm = () => {
    if (!choice) return;
    const correct = choice.value === item.correct;
    const isFirst = !recorder.hasResponse;
    recorder.confirm(choice.value, { inputMethod: 'select', interactionMode: choice.mode });
    const first = isFirst ? correct : (firstCorrect as boolean);
    if (isFirst) setFirstCorrect(correct);
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

  const guidedMessage = [
    intro,
    supportLevel === 1 ? childText.add2.supportL1 : supportLevel === 2 ? childText.add2.supportL2 : item.worked,
  ]
    .filter(Boolean)
    .join(' ');
  const message = isGuided ? guidedMessage : supportLevel === 1 ? helpText : intro ?? null;

  return (
    <ActivityFrame
      scene={scene}
      instruction={instruction}
      {...frameProps(ctx, instructionKey, replay)}
      onHelp={!isGuided && supportLevel === 0 ? requestHelp : undefined}
      helpMessage={message}
      footer={
        <PrimaryAction disabled={!choice} onClick={confirm}>
          <Check size={22} />
          <span>{childText.common.done}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="rounded-3xl bg-white/90 border border-white px-6 py-4 shadow-xs">{item.stimulus}</div>
        {isGuided && supportLevel >= 2 && item.visualCue && (
          <div className="rounded-3xl bg-white/90 border border-amber-200 px-5 py-3">{item.visualCue}</div>
        )}
        <div role="radiogroup" aria-label={instruction} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {item.options.map((value) => {
            const isSelected = choice?.value === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={String(value)}
                onClick={(e) => select(value, interactionModeOf(e))}
                className={`min-w-[88px] min-h-[80px] rounded-2xl border-4 bg-white shadow-sm text-3xl font-bold text-mq-text-strong cursor-pointer transition-colors ${
                  isSelected ? 'border-mq-primary ring-4 ring-mq-primary/25' : 'border-white hover:border-mq-primary/40'
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    </ActivityFrame>
  );
};

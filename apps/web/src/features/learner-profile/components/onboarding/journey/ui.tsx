import React, { useEffect, useRef, useState } from 'react';
import { Volume2, RotateCcw, LifeBuoy } from 'lucide-react';
import type { InteractionMode } from '../../../types/onboarding';
import { childText } from '../../../../../shared/i18n/childText';
import { SceneBackdrop, type SceneId } from './scenes';
import type { SoundMode } from './themes';

/** Speaks Sinhala text only if the device actually has a Sinhala voice and sound is on. */
export const useSinhalaSpeech = (soundMode: SoundMode | undefined) => {
  const [hasVoice, setHasVoice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const check = () => setHasVoice(window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('si')));
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, []);

  const enabled = hasVoice && soundMode === 'gentle';
  const speak = (text: string): boolean => {
    if (!enabled) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'si-LK';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };
  return { enabled, speak };
};

interface ActivityFrameProps {
  scene: SceneId;
  instruction: React.ReactNode;
  /** Bumped when the instruction is replayed, to re-highlight it. */
  instructionKey?: number;
  onReplay?: () => void;
  replayIsAudio?: boolean;
  onHelp?: () => void;
  helpMessage?: string | null;
  progress?: { step: number; total: number };
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Scene panel with one instruction at a time, optional help, and a footer for actions. */
export const ActivityFrame: React.FC<ActivityFrameProps> = ({
  scene,
  instruction,
  instructionKey = 0,
  onReplay,
  replayIsAudio = false,
  onHelp,
  helpMessage,
  progress,
  footer,
  children,
}) => (
  <div className="space-y-4">
    <div className="relative overflow-hidden rounded-3xl border border-mq-border shadow-xs min-h-[440px] flex flex-col">
      <SceneBackdrop scene={scene} />

      <div className="relative z-10 p-4 sm:p-5 flex flex-col gap-3 flex-1">
        {/* Instruction bar: solid card for contrast over the scene */}
        <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-white/95 border border-mq-border px-4 py-3 shadow-xs">
          <p
            key={instructionKey}
            className="flex-1 min-w-[200px] text-lg sm:text-xl font-semibold text-mq-text-strong leading-relaxed motion-safe:animate-[fade-in-up_0.5s_ease-out]"
          >
            {instruction}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {onReplay && (
              <button
                type="button"
                onClick={onReplay}
                className="min-h-[48px] px-4 rounded-full border border-mq-border bg-white text-mq-primary font-semibold inline-flex items-center gap-2 hover:bg-mq-surface-soft cursor-pointer"
              >
                {replayIsAudio ? <Volume2 size={20} /> : <RotateCcw size={20} />}
                <span>{replayIsAudio ? childText.common.repeat : childText.common.repeatShow}</span>
              </button>
            )}
            {onHelp && (
              <button
                type="button"
                onClick={onHelp}
                className="min-h-[48px] px-4 rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-semibold inline-flex items-center gap-2 hover:bg-amber-100 cursor-pointer"
              >
                <LifeBuoy size={20} />
                <span>{childText.common.help}</span>
              </button>
            )}
          </div>
        </div>

        {helpMessage && (
          <div role="status" className="rounded-2xl bg-amber-50/95 border border-amber-200 px-4 py-3 text-base text-amber-950">
            {helpMessage}
          </div>
        )}

        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      {progress ? (
        <div className="flex items-center gap-1.5" aria-label={childText.progress(progress.step, progress.total)}>
          {Array.from({ length: progress.total }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full transition-all ${i < progress.step ? 'w-6 bg-mq-primary' : 'w-2.5 bg-mq-border'}`}
            />
          ))}
        </div>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center gap-3">{footer}</div>
    </div>
  </div>
);

export const PrimaryAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`btn btn-primary min-h-[52px] px-8 rounded-full text-lg inline-flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
  />
);

export const QuietAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`min-h-[44px] px-4 rounded-full text-sm text-mq-text-muted underline-offset-4 hover:underline cursor-pointer ${className}`}
  />
);

const pointerMode = (pointerType: string): InteractionMode => (pointerType === 'mouse' ? 'mouse' : 'touch');

interface DragTapTokenProps {
  icon: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  /** Tap (or keyboard) activation: used for tap-to-select then tap-a-target. */
  onTap: (mode: InteractionMode) => void;
  /** Dropped on an element marked with data-drop-target. */
  onDrop: (targetId: string, mode: InteractionMode) => void;
  /** Released by drag outside any target. */
  onMiss: () => void;
}

/**
 * Object that can be dragged onto a target or tapped then placed (accessible alternative).
 * A press that moves less than a few pixels counts as a tap.
 */
export const DragTapToken: React.FC<DragTapTokenProps> = ({
  icon,
  label,
  selected = false,
  disabled = false,
  size = 'lg',
  onTap,
  onDrop,
  onMiss,
}) => {
  const start = useRef<{ x: number; y: number; type: string } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, type: e.pointerType };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (offset || Math.hypot(dx, dy) > 8) setOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const began = start.current;
    start.current = null;
    if (!began || !offset) return;
    suppressClick.current = true;
    setOffset(null);
    const target = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => (el as HTMLElement).closest?.('[data-drop-target]') as HTMLElement | null)
      .find(Boolean);
    const mode = pointerMode(began.type);
    if (target?.dataset.dropTarget) onDrop(target.dataset.dropTarget, mode);
    else onMiss();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (disabled) return;
    const pointerType = (e.nativeEvent as PointerEvent).pointerType;
    onTap(e.detail === 0 ? 'keyboard' : pointerMode(pointerType || 'mouse'));
  };

  const dimension = size === 'lg' ? 'w-16 h-16 sm:w-[72px] sm:h-[72px] text-4xl' : 'w-14 h-14 text-3xl';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        start.current = null;
        setOffset(null);
      }}
      onClick={handleClick}
      style={offset ? { transform: `translate(${offset.x}px, ${offset.y}px)`, zIndex: 30 } : undefined}
      className={`${dimension} rounded-2xl flex items-center justify-center bg-white border-2 shadow-sm select-none touch-none cursor-grab transition-shadow ${
        selected ? 'border-mq-primary ring-4 ring-mq-primary/30' : 'border-white hover:border-mq-primary/50'
      } ${offset ? 'shadow-xl cursor-grabbing' : ''} disabled:opacity-40`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
};

interface DropTargetProps {
  id: string;
  label: string;
  /** Highlighted when an object is selected and waiting to be placed. */
  active?: boolean;
  onActivate: (mode: InteractionMode) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Drop zone. A full-size background button handles tap-to-place and keyboard placement;
 * the content sits above it as a sibling, so buttons inside the zone stay accessible
 * (buttons nested inside a button are hidden from assistive technology).
 */
export const DropTarget: React.FC<DropTargetProps> = ({ id, label, active = false, onActivate, className = '', children }) => (
  <div
    data-drop-target={id}
    className={`relative rounded-3xl border-4 border-dashed transition-colors ${
      active ? 'border-mq-primary bg-white/80' : 'border-white/80 bg-white/55'
    } ${className}`}
  >
    <button
      type="button"
      aria-label={label}
      onClick={(e) => onActivate(e.detail === 0 ? 'keyboard' : pointerMode((e.nativeEvent as PointerEvent).pointerType || 'mouse'))}
      className="absolute inset-0 w-full h-full rounded-3xl cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mq-primary/40"
    />
    {/* While an object is waiting to be placed, the whole zone means "place here". */}
    <div
      className={`relative pointer-events-none flex flex-col items-center justify-center gap-3 h-full ${
        active ? '' : '[&_button]:pointer-events-auto'
      }`}
    >
      {children}
    </div>
  </div>
);

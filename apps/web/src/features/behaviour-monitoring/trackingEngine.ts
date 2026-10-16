/**
 * trackingEngine.ts – Component 4, Function 1
 * Low-level DOM event capture for the MathQuest behaviour tracking system.
 *
 * Responsibilities
 * ─────────────────
 * 1. Attach global mouse / touch listeners on the game container element.
 * 2. Detect long pauses (gaps > LONG_PAUSE_THRESHOLD_MS with no interaction).
 * 3. Emit typed RawGameplayEvent objects via a callback.
 * 4. Provide clean attach / detach lifecycle so no listeners leak.
 *
 * Design principles
 * ─────────────────
 * • Passive: students never know tracking is active.
 * • Zero coupling to game logic: the engine only reads pointer coordinates
 *   and elapsed time; all game-semantic events (answer_select, step_start …)
 *   are emitted by useGameplayTracker directly.
 * • Idempotent: calling attach() twice is safe (previous listeners are removed).
 */

import type { RawGameplayEvent, TrackingContext } from './types';
import { generateEventId, nowISO } from './eventBuffer';

/** ms of pointer silence before a PAUSE_DETECTED event fires */
const LONG_PAUSE_THRESHOLD_MS = 5_000;

/** How often we poll for inactivity (ms) */
const INACTIVITY_POLL_MS = 1_000;

type EventEmitter = (event: RawGameplayEvent) => void;

export interface TrackingEngineOptions {
  context: TrackingContext;
  stepOrder: () => number;                // getter so it always reflects current step
  onEvent: EventEmitter;
}

export interface TrackingEngineHandle {
  /** Start listening on the given container (or document if null). */
  attach: (container?: HTMLElement | null) => void;
  /** Remove all listeners; safe to call multiple times. */
  detach: () => void;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createTrackingEngine(
  options: TrackingEngineOptions,
): TrackingEngineHandle {
  const { context, stepOrder, onEvent } = options;

  let lastActivityAt   = Date.now();
  let attached         = false;
  let pauseFired       = false;   // deduplicate pause events within the same gap
  let inactivityMs     = 0;       // accumulated inactivity this session
  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let container: HTMLElement | Document = document;

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _normalise(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const w = window.innerWidth  || 1;
    const h = window.innerHeight || 1;
    if (e instanceof TouchEvent && e.touches.length > 0) {
      return {
        x: parseFloat((e.touches[0].clientX / w).toFixed(4)),
        y: parseFloat((e.touches[0].clientY / h).toFixed(4)),
      };
    }
    const me = e as MouseEvent;
    return {
      x: parseFloat((me.clientX / w).toFixed(4)),
      y: parseFloat((me.clientY / h).toFixed(4)),
    };
  }

  function _emit(type: RawGameplayEvent['eventType'], extra: Partial<RawGameplayEvent> = {}): void {
    const event: RawGameplayEvent = {
      eventId:    generateEventId(),
      sessionId:  context.sessionId,
      learnerId:  context.learnerId,
      activityId: context.activityId,
      eventType:  type,
      timestamp:  nowISO(),
      stepOrder:  stepOrder(),
      gameTheme:  context.gameTheme,
      questionGrade: context.grade,
      ...extra,
    };
    onEvent(event);
  }

  // ── DOM listeners ────────────────────────────────────────────────────────────

  function _handleClick(e: MouseEvent): void {
    const { x, y } = _normalise(e);
    lastActivityAt = Date.now();
    pauseFired = false;
    _emit('click', { pointerX: x, pointerY: y });
  }

  function _handleTouchStart(e: TouchEvent): void {
    const { x, y } = _normalise(e);
    lastActivityAt = Date.now();
    pauseFired = false;
    _emit('touch_start', { pointerX: x, pointerY: y });
  }

  // ── Inactivity polling ───────────────────────────────────────────────────────

  function _startPoll(): void {
    pollHandle = setInterval(() => {
      const now    = Date.now();
      const gapMs  = now - lastActivityAt;

      if (gapMs >= LONG_PAUSE_THRESHOLD_MS && !pauseFired) {
        pauseFired    = true;
        inactivityMs += gapMs;
        _emit('pause_detected', {
          pauseDurationMs:      gapMs,
          inactivityDurationMs: inactivityMs,
        });
      }

      // When the student comes back after a pause, fire inactivity_end
      if (gapMs < LONG_PAUSE_THRESHOLD_MS && pauseFired) {
        pauseFired = false;
        _emit('inactivity_end', { inactivityDurationMs: inactivityMs });
      }
    }, INACTIVITY_POLL_MS);
  }

  function _stopPoll(): void {
    if (pollHandle !== null) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  // ── Public interface ─────────────────────────────────────────────────────────

  function attach(el?: HTMLElement | null): void {
    if (attached) detach();

    container = el ?? document;
    lastActivityAt = Date.now();
    pauseFired     = false;
    attached       = true;

    (container as HTMLElement).addEventListener('click', _handleClick as EventListener, { passive: true });
    (container as HTMLElement).addEventListener('touchstart', _handleTouchStart as EventListener, { passive: true });

    _startPoll();
  }

  function detach(): void {
    if (!attached) return;
    (container as HTMLElement).removeEventListener('click', _handleClick as EventListener);
    (container as HTMLElement).removeEventListener('touchstart', _handleTouchStart as EventListener);
    _stopPoll();
    attached = false;
  }

  return { attach, detach };
}

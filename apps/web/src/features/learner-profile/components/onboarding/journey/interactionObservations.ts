import type { InteractionObservations } from '../../../types/onboarding';

/**
 * Raw interaction observations for one onboarding item (ONBOARDING-INTERACTION-OBS-v1.0).
 *
 * Records only transparent counts and timestamps (ms from item display): first interaction,
 * short tap bursts, idle gaps, page visibility/focus changes and taps outside interactive
 * targets. No pointer positions, key values, continuous tracking or camera/microphone access.
 * The values are observations, never scores: they are not used for mathematical correctness,
 * IMPSA, IMLR or ELP-X, and are not interpreted as attention, impulsivity or ADHD indicators.
 * Naming follows the pedagogical-engine telemetry (`idleTimeBeforeFirstActionMs`, milliseconds).
 */

export const INTERACTION_OBSERVATION_VERSION = 'ONBOARDING-INTERACTION-OBS-v1.0';

/** Recording parameters (what counts as a burst or idle gap), stored with every record. */
export const OBSERVATION_PARAMETERS = {
  burstMaxGapMs: 500,
  burstMinTaps: 3,
  idleThresholdMs: 10000,
  maxEventsPerList: 50,
} as const;

/** Elements a child is meant to press; a pointer-down elsewhere is recorded as an invalid tap. */
export const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, label, [role="button"], [role="radio"], [role="checkbox"], [draggable="true"], [data-interactive]';

type PageEventType = InteractionObservations['pageEvents'][number]['type'];

const round = (n: number) => Math.round(n);

export class InteractionObserver {
  private readonly startMs: number;
  private firstActionMs: number | null = null;
  private lastActionMs: number | null = null;
  private pointerDowns = 0;
  private keyDowns = 0;
  private lastPointerMs: number | null = null;
  private runStartMs = 0;
  private runCount = 0;
  private bursts: InteractionObservations['tapBursts'] = [];
  private idles: InteractionObservations['idleIntervals'] = [];
  private pageEvents: InteractionObservations['pageEvents'] = [];
  private hiddenSinceMs: number | null = null;
  private hiddenTotalMs = 0;
  private invalidTaps: InteractionObservations['invalidTaps'] = [];
  private invalidCount = 0;
  private invalidMeasurable = false;
  private truncated = false;

  constructor(startMs: number) {
    this.startMs = startMs;
  }

  private rel(atMs: number): number {
    return Math.max(0, atMs - this.startMs);
  }

  private push<T>(list: T[], value: T): void {
    if (list.length < OBSERVATION_PARAMETERS.maxEventsPerList) list.push(value);
    else this.truncated = true;
  }

  private closeRun(): void {
    if (this.runCount >= OBSERVATION_PARAMETERS.burstMinTaps && this.lastPointerMs !== null) {
      this.push(this.bursts, { startMs: round(this.runStartMs), endMs: round(this.lastPointerMs), tapCount: this.runCount });
    }
    this.runCount = 0;
  }

  /**
   * A pointer-down (`kind: 'pointer'`) or key-down (`kind: 'key'`) at `atMs` (same clock as startMs).
   * `onTarget` is whether a pointer-down landed on an interactive element; undefined when unknown.
   */
  interaction(atMs: number, kind: 'pointer' | 'key', onTarget?: boolean): void {
    const t = this.rel(atMs);
    if (this.firstActionMs === null) {
      this.firstActionMs = t;
    } else if (this.lastActionMs !== null && t - this.lastActionMs >= OBSERVATION_PARAMETERS.idleThresholdMs) {
      this.push(this.idles, { startMs: round(this.lastActionMs), durationMs: round(t - this.lastActionMs) });
    }
    this.lastActionMs = t;

    if (kind === 'key') {
      this.keyDowns += 1;
      return;
    }

    this.pointerDowns += 1;
    if (this.lastPointerMs !== null && t - this.lastPointerMs <= OBSERVATION_PARAMETERS.burstMaxGapMs) {
      this.runCount += 1;
    } else {
      this.closeRun();
      this.runStartMs = t;
      this.runCount = 1;
    }
    this.lastPointerMs = t;

    if (onTarget !== undefined) {
      this.invalidMeasurable = true;
      if (!onTarget) {
        this.invalidCount += 1;
        this.push(this.invalidTaps, { atMs: round(t) });
      }
    }
  }

  /** Page visibility (tab/app switch) or window focus change. */
  page(type: PageEventType, atMs: number): void {
    const t = this.rel(atMs);
    this.push(this.pageEvents, { type, atMs: round(t) });
    if (type === 'hidden' && this.hiddenSinceMs === null) this.hiddenSinceMs = t;
    if (type === 'visible' && this.hiddenSinceMs !== null) {
      this.hiddenTotalMs += t - this.hiddenSinceMs;
      this.hiddenSinceMs = null;
    }
  }

  /** Record for the item up to `nowMs`. Does not change the observer, so it can be taken again. */
  snapshot(nowMs: number): InteractionObservations {
    const now = this.rel(nowMs);
    const bursts = [...this.bursts];
    const idles = [...this.idles];
    let truncated = this.truncated;
    const cap = OBSERVATION_PARAMETERS.maxEventsPerList;

    // Include an open burst and a trailing idle gap without mutating state.
    if (this.runCount >= OBSERVATION_PARAMETERS.burstMinTaps && this.lastPointerMs !== null) {
      if (bursts.length < cap) bursts.push({ startMs: round(this.runStartMs), endMs: round(this.lastPointerMs), tapCount: this.runCount });
      else truncated = true;
    }
    if (this.lastActionMs !== null && now - this.lastActionMs >= OBSERVATION_PARAMETERS.idleThresholdMs) {
      if (idles.length < cap) idles.push({ startMs: round(this.lastActionMs), durationMs: round(now - this.lastActionMs) });
      else truncated = true;
    }
    const hidden = this.hiddenTotalMs + (this.hiddenSinceMs !== null ? now - this.hiddenSinceMs : 0);

    return {
      version: INTERACTION_OBSERVATION_VERSION,
      parameters: { ...OBSERVATION_PARAMETERS },
      observedDurationMs: round(now),
      idleTimeBeforeFirstActionMs: this.firstActionMs === null ? null : round(this.firstActionMs),
      pointerDownCount: this.pointerDowns,
      keyDownCount: this.keyDowns,
      tapBursts: bursts,
      idleIntervals: idles,
      pageEvents: [...this.pageEvents],
      hiddenDurationMs: round(hidden),
      invalidTapCount: this.invalidMeasurable ? this.invalidCount : null,
      invalidTaps: [...this.invalidTaps],
      truncated,
    };
  }
}

/** Minimal DOM surface used for wiring, so tests can pass a fake document/window. */
interface EventSource {
  addEventListener(type: string, listener: (e: Event) => void, options?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, listener: (e: Event) => void, options?: EventListenerOptions | boolean): void;
}

/**
 * Wires the observer to document/window events (pointerdown, keydown, visibilitychange, blur,
 * focus). Listeners are passive and capture-phase so the activity's own handlers are unaffected.
 * Returns a detach function.
 */
export const attachInteractionObserver = (
  observer: InteractionObserver,
  doc: EventSource & { visibilityState?: string } = document,
  win: EventSource = window,
  now: () => number = () => performance.now()
): (() => void) => {
  const opts = { capture: true, passive: true };
  const onPointer = (e: Event) => {
    const target = e.target as Element | null;
    const onTarget = target && typeof target.closest === 'function' ? Boolean(target.closest(INTERACTIVE_SELECTOR)) : undefined;
    observer.interaction(now(), 'pointer', onTarget);
  };
  const onKey = () => observer.interaction(now(), 'key');
  const onVisibility = () => observer.page(doc.visibilityState === 'hidden' ? 'hidden' : 'visible', now());
  const onBlur = () => observer.page('blur', now());
  const onFocus = () => observer.page('focus', now());

  doc.addEventListener('pointerdown', onPointer, opts);
  doc.addEventListener('keydown', onKey, opts);
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('blur', onBlur);
  win.addEventListener('focus', onFocus);
  return () => {
    doc.removeEventListener('pointerdown', onPointer, opts);
    doc.removeEventListener('keydown', onKey, opts);
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('blur', onBlur);
    win.removeEventListener('focus', onFocus);
  };
};

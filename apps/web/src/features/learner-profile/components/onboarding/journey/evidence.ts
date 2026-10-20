import type {
  InstructionEvent,
  InteractionMode,
  MathItemAnswer,
  ProbeRole,
  RepresentationType,
  RevisionEvent,
  SupportEvent,
} from '../../../types/onboarding';

/** Static description of one onboarding-v2 item. IDs mirror the server item bank. */
export interface ItemMeta {
  questionId: string;
  activityId: string;
  conceptId: string;
  itemFamilyId?: string;
  probeRole?: ProbeRole;
  representation?: RepresentationType;
  dimensionTags: string[];
}

export type InputMethod = 'drag' | 'tap' | 'select';

export interface InputDetail {
  inputMethod: InputMethod;
  interactionMode?: InteractionMode;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Derives the input device of a click/pointer event without inferring anything about the child. */
export const interactionModeOf = (e: { detail?: number; nativeEvent?: Event }): InteractionMode => {
  if (e.detail === 0) return 'keyboard';
  const pointerType = (e.nativeEvent as PointerEvent | undefined)?.pointerType;
  return pointerType === 'touch' || pointerType === 'pen' ? 'touch' : 'mouse';
};

/**
 * Records truthful evidence for a single presented item.
 * Times are measured from when the item was shown; nothing is defaulted or invented.
 */
export class ItemRecorder {
  readonly meta: ItemMeta;
  private readonly startedAtMs = performance.now();
  private instructionEvents: InstructionEvent[];
  private supportEvents: SupportEvent[] = [];
  private revisionEvents: RevisionEvent[] = [];
  private firstResponse: string | number | undefined;
  private firstResponseSeconds: number | undefined;
  private finalResponse: string | number | undefined;
  private attempts = 0;
  private missedDrops = 0;
  private input: InputDetail | undefined;

  constructor(meta: ItemMeta) {
    this.meta = meta;
    this.instructionEvents = [{ action: 'delivered', timestampSeconds: 0, occurredAt: new Date().toISOString() }];
  }

  private elapsed(): number {
    return round1((performance.now() - this.startedAtMs) / 1000);
  }

  get hasResponse(): boolean {
    return this.firstResponse !== undefined;
  }

  get supportCount(): number {
    return this.supportEvents.length;
  }

  instruction(action: 'replayed' | 'clarified' | 'audio_played'): void {
    this.instructionEvents.push({ action, timestampSeconds: this.elapsed(), occurredAt: new Date().toISOString() });
  }

  support(level: 1 | 2 | 3, type: 'clarification' | 'visual_cue' | 'worked_demonstration'): void {
    this.supportEvents.push({ level, type, timestampSeconds: this.elapsed(), deliveredAt: new Date().toISOString() });
  }

  /** A change from an earlier tentative choice. The first selection is not a revision. */
  revise(prior: string | number | undefined, next: string | number | undefined): void {
    if (prior === undefined || prior === next) return;
    this.revisionEvents.push({ priorResponse: prior, newResponse: next, timestampSeconds: this.elapsed(), revisedAt: new Date().toISOString() });
  }

  missedDrop(): void {
    this.missedDrops += 1;
  }

  confirm(response: string | number, input: InputDetail): void {
    this.attempts += 1;
    if (this.firstResponse === undefined) {
      this.firstResponse = response;
      this.firstResponseSeconds = this.elapsed();
      this.input = input;
    }
    this.finalResponse = response;
  }

  /** Answer payload for a presented item. Correctness is never included; the server derives it. */
  toAnswer(): MathItemAnswer {
    const base: MathItemAnswer = {
      questionId: this.meta.questionId,
      activityId: this.meta.activityId,
      conceptId: this.meta.conceptId,
      itemFamilyId: this.meta.itemFamilyId,
      probeRole: this.meta.probeRole,
      representation: this.meta.representation,
      dimensionTags: this.meta.dimensionTags,
      instructionEvents: this.instructionEvents,
      supportEvents: this.supportEvents,
      revisionEvents: this.revisionEvents,
      hintUsed: this.supportEvents.length > 0,
      missedDropCount: this.missedDrops,
      selfCorrectionsCount: this.revisionEvents.length,
    } as MathItemAnswer;

    if (this.firstResponse === undefined) {
      // Presented but not answered: keep the observed events, no invented answer or time.
      return { ...base, userAnswer: '', attempts: 1, responseStatus: 'skipped' };
    }

    const firstAt = this.firstResponseSeconds ?? 0;
    return {
      ...base,
      userAnswer: this.finalResponse as string | number,
      firstConfirmedResponse: this.firstResponse,
      attempts: Math.max(1, this.attempts),
      responseTimeSeconds: firstAt,
      supportBeforeFirstResponse: this.supportEvents.some((e) => (e.timestampSeconds ?? 0) <= firstAt),
      demonstrationUsed: this.supportEvents.some((e) => e.level === 3),
      interactionMode: this.input?.interactionMode,
      inputMethod: this.input?.inputMethod,
      responseStatus: 'answered',
    };
  }
}

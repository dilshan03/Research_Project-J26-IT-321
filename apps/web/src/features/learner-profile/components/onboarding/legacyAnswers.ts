import type { MathItemAnswer } from '../../types/onboarding';

/**
 * Truthful presentation and timing evidence for the legacy (Grades 2–5) onboarding views.
 *
 * - A question counts as presented only once it has actually been shown.
 * - Response time is the measured on-screen time (across visits) until the child's first answer;
 *   it is omitted when no answer was given. Nothing is defaulted.
 */
export class LegacyItemTracker {
  private readonly now: () => number;
  private readonly presented = new Set<string>();
  private readonly viewMs: Record<string, number> = {};
  private readonly firstResponseMs: Record<string, number> = {};
  private current: { questionId: string; sinceMs: number } | null = null;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  /** The question is now on screen (closes the previous visit). */
  show(questionId: string): void {
    if (this.current?.questionId === questionId) return;
    this.leave();
    this.presented.add(questionId);
    this.current = { questionId, sinceMs: this.now() };
  }

  /** The current question left the screen. */
  leave(): void {
    if (!this.current) return;
    const { questionId, sinceMs } = this.current;
    this.viewMs[questionId] = (this.viewMs[questionId] ?? 0) + (this.now() - sinceMs);
    this.current = null;
  }

  /** The child gave an answer to the question on screen; only the first answer sets the time. */
  answered(questionId: string): void {
    if (this.firstResponseMs[questionId] !== undefined) return;
    if (this.current?.questionId !== questionId) return;
    this.firstResponseMs[questionId] = (this.viewMs[questionId] ?? 0) + (this.now() - this.current.sinceMs);
  }

  wasPresented(questionId: string): boolean {
    return this.presented.has(questionId);
  }

  /** Measured seconds to first answer (1 decimal), or undefined when not measured. */
  responseSeconds(questionId: string): number | undefined {
    const ms = this.firstResponseMs[questionId];
    return ms === undefined ? undefined : Math.round(ms / 100) / 10;
  }
}

/** Per-question evidence a legacy view actually collected. */
export interface LegacyItemEvidence {
  userAnswer?: string | number;
  attempts?: number;
  hintUsed?: boolean;
  firstConfirmedResponse?: string | number;
  isFirstResponseCorrect?: boolean;
  demonstrationUsed?: boolean;
  selfCorrectionsCount?: number;
}

/**
 * Builds the submission for a legacy view:
 * - answered questions are sent with their real values (time only if measured);
 * - presented but unanswered questions are sent as `skipped` with no answer or time;
 * - questions never presented are not sent at all.
 */
export const buildLegacyAnswers = (
  questionIds: string[],
  tracker: LegacyItemTracker,
  evidence: (questionId: string) => LegacyItemEvidence
): MathItemAnswer[] => {
  const out: MathItemAnswer[] = [];
  for (const questionId of questionIds) {
    if (!tracker.wasPresented(questionId)) continue;
    const e = evidence(questionId);
    const hasAnswer = e.userAnswer !== undefined && e.userAnswer !== '';

    if (!hasAnswer) {
      out.push({ questionId, userAnswer: '', attempts: 1, hintUsed: Boolean(e.hintUsed), responseStatus: 'skipped' });
      continue;
    }

    const answer: MathItemAnswer = {
      questionId,
      userAnswer: e.userAnswer as string | number,
      attempts: Math.max(1, e.attempts ?? 1),
      hintUsed: Boolean(e.hintUsed),
    };
    const seconds = tracker.responseSeconds(questionId);
    if (seconds !== undefined) answer.responseTimeSeconds = seconds;
    if (e.firstConfirmedResponse !== undefined) answer.firstConfirmedResponse = e.firstConfirmedResponse;
    if (e.isFirstResponseCorrect !== undefined) answer.isFirstResponseCorrect = e.isFirstResponseCorrect;
    if (e.demonstrationUsed !== undefined) answer.demonstrationUsed = e.demonstrationUsed;
    if (e.selfCorrectionsCount !== undefined) answer.selfCorrectionsCount = e.selfCorrectionsCount;
    out.push(answer);
  }
  return out;
};

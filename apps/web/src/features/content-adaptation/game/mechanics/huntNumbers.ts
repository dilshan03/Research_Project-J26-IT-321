import type { GameMicroStep } from '../../types';

/**
 * The number a word tile stands for: "5ක්" → 5, "රු.50" → 50, "1,000" → 1000, "8.00ට" → 8.
 * Stripping every non-digit instead turned "8.00" into 800. Mirrors `has_all_numbers`
 * in the content-adaptation service's blueprint generator.
 */
export function tokenNumber(token: string): string {
  return token.match(/\d{1,3}(?:,\d{3})+|\d+/)?.[0].replace(/,/g, '') ?? '';
}

/** Whether every number the step asks for (repeats included) can actually be tapped in the text. */
export function canHunt(step: Pick<GameMicroStep, 'operands'>, question: string): boolean {
  const targets = (step.operands ?? []).map(String);
  if (!targets.length) return false;
  const available = question.split(/\s+/).map(tokenNumber).filter(Boolean);
  return targets.every(t => {
    const k = available.indexOf(t);
    if (k < 0) return false;
    available.splice(k, 1);
    return true;
  });
}

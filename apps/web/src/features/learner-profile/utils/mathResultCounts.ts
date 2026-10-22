/**
 * Parent-facing counts that separate independent mathematical performance from guided or helped activities.
 * Uses only the server's own per-item evidence flags (ASSESS-EVIDENCE-v1.0); nothing is re-scored here.
 * Returns null for older records without those flags, so the caller can keep the original wording.
 */
export interface MathResultCounts {
  /** Items the server counted as independent first responses (the evidence ELP-X uses). */
  independentTotal: number;
  independentCorrect: number;
  /** Answered items not counted as independent: guided support, help before the first answer, or help unconfirmed. */
  notIndependent: number;
}

interface EvaluatedItemFlags {
  includedInProficiencyEstimate?: boolean;
  correctFirstResponse?: boolean | null;
}

export const mathResultCounts = (evaluatedItems: unknown): MathResultCounts | null => {
  if (!Array.isArray(evaluatedItems) || evaluatedItems.length === 0) return null;
  const items = evaluatedItems as EvaluatedItemFlags[];
  if (!items.every((i) => i && typeof i.includedInProficiencyEstimate === 'boolean')) return null;
  const independent = items.filter((i) => i.includedInProficiencyEstimate === true);
  return {
    independentTotal: independent.length,
    independentCorrect: independent.filter((i) => i.correctFirstResponse === true).length,
    notIndependent: items.length - independent.length,
  };
};

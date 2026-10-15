/**
 * Shared TypeScript Types: ELP-X Learner Profile and Continuous Evidence Contracts
 * MathQuest Architecture - Evidence-Aware Learner Profiling with Explainable Recommendations
 */

export type ProvisionalSkillLevel =
  | 'INSUFFICIENT_EVIDENCE'
  | 'EMERGING'
  | 'DEVELOPING'
  | 'PROFICIENT';

export type EvidenceSufficiencyStatus = 'SUFFICIENT' | 'INSUFFICIENT';

export interface CredibleInterval {
  lower: number;
  upper: number;
  confidenceLevel: number;
}

export interface ElpxSkillEstimate {
  skillId: string;
  skillName: string;
  skillNameSi: string;
  distinctQuestionsAssessed: number;
  correctFirstResponses: number;
  rawAccuracy: number;
  rawAccuracyPercentage: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  estimatedProficiency: number;
  estimatedProficiencyPercentage: number;
  credibleInterval: CredibleInterval;
  credibleIntervalWidth: number;
  posteriorVariance: number;
  evidenceSufficiency: EvidenceSufficiencyStatus;
  isEvidenceSufficient: boolean;
  provisionalSkillLevel: ProvisionalSkillLevel;
  isProvisional: boolean;
}

export interface StructuredRecommendation {
  recommendationId: string;
  skillId?: string | null;
  strategyCode: string;
  reasonCodes: string[];
  inputEvidenceSummary: Record<string, any>;
  recommendationRulesetVersion: string;
  titleEn: string;
  titleSi: string;
  descriptionEn: string;
  descriptionSi: string;
}

export interface LearningAdaptations {
  visualAssistance?: string;
  audioAssistance?: string;
  activityPace?: string;
  hintStyle?: string;
  celebrationStyle?: string;
}

/**
 * Sanitized profile consumed by Content Adaptation & Pedagogical Engine
 * Excludes raw SNAP-IV scores and sensitive notes
 */
export interface SanitizedLearnerProfile {
  learnerId: string;
  grade: number;
  preferredLanguage?: string;
  profileVersion: string;
  algorithmVersion: string;
  evidenceStatus: EvidenceSufficiencyStatus;
  isOverallEvidenceSufficient: boolean;
  totalDistinctQuestionsEvaluated: number;
  skills: ElpxSkillEstimate[];
  pedagogicalRecommendations: StructuredRecommendation[];
  learningAdaptations: LearningAdaptations;
  lastUpdated: string;
  disclaimer: string;
}

/**
 * Complete versioned ELP-X Profile (for Parent Dashboard & Profile View)
 */
export interface FullElpxLearnerProfile extends SanitizedLearnerProfile {
  totalCorrectFirstResponses: number;
  rawOverallAccuracy: number;
  explanationReasonCodes: string[];
  learningPreferences?: Record<string, any>;
  mlPrediction?: any;
  shapValues?: any;
}

/**
 * Continuous Activity Evidence Event
 */
export interface GameplayActivityEvidence {
  eventId: string;
  learnerId: string;
  questionId?: string;
  activityId?: string;
  skillId: string;
  correctFirstResponse: boolean;
  attempts?: number;
  hintsUsed?: number;
  responseTime?: number;
  activityTimestamp?: string;
  sourceComponent?: string;
}

/** Typed views of the Learner Profile snapshot sections (validated server-side against MQ-RESEARCH-SNAPSHOT-v1). */
import type { ResearchSnapshot, SoftwareTestRun } from '../types';
import type { Contribution, ReliabilityPoint } from '../components/charts';
import type { ImlrDemoSection } from './imlr/types';

export interface Calibration {
  mean_predicted: number;
  observed_rate: number;
  calibration_in_the_large: number;
  calibration_slope: number;
  calibration_intercept: number;
  reliability_deciles: ReliabilityPoint[];
}

export interface AtThreshold {
  threshold: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  sensitivity: number;
  specificity: number;
  precision: number;
  recall: number;
  npv: number;
  f1: number;
  predicted_positive_rate: number;
}

export interface Discrimination {
  n: number;
  positives: number;
  prevalence: number;
  roc_auc: number;
  pr_auc: number;
  pr_auc_no_skill_baseline: number;
  brier: number;
  brier_skill_vs_observed_prevalence: number;
}

export interface NschSection {
  provenance: 'offline_survey';
  experimentId: string;
  outcome: string;
  disclaimer: string;
  population: string;
  developmentYears: number[];
  testYear: number;
  testYearUsedForTrainingOrSelection: false;
  frozenAtUtc: string;
  evaluatedAtUtc: string;
  modelSha256: string;
  seed: number;
  libraryVersions: Record<string, string | null>;
  selectedModel: { family: string; params: Record<string, unknown>; selection_rule: string };
  decisionThreshold: { value: number; rule: string };
  n: { development: number; train: number; validation: number; train_by_year: Record<string, number>; validation_by_year: Record<string, number> };
  trainPrevalence: number;
  preprocessing: string[];
  features: { nSource: number; nEncoded: number; numeric: Array<{ feature: string; label: string }>; categorical: Array<{ feature: string; label: string }> };
  excludedVariableCounts: Record<string, number>;
  leakageScreen: { maxUnivariateAuc: number; limit: number };
  validation: {
    n: number; positives: number; prevalence: number; rocAuc: number; prAuc: number; brier: number; brierSkill: number;
    calibration: Calibration; atThreshold: AtThreshold;
    prevalenceBaseline: { predicted_probability: number; roc_auc: number; pr_auc: number; brier: number };
    candidates: Array<{ family: string; params: Record<string, unknown>; roc_auc: number; pr_auc: number; brier: number }>;
  };
  test: {
    metrics: Discrimination;
    calibration: Calibration;
    atFrozenThreshold: AtThreshold;
    prevalenceBaseline: { predicted_probability: number; roc_auc: number; pr_auc: number; brier: number };
    provisionalBootstrapCi: { roc_auc: [number, number]; pr_auc: [number, number]; brier: [number, number] };
    subgroups: Record<string, { n: number; prevalence: number; roc_auc: number; pr_auc: number; sensitivity: number; specificity: number }>;
    notes: string[];
  };
  evaluationLog: { count: number; entries: Array<{ evaluatedAtUtc: string; modelSha256: string }> };
  hypotheticalExample: {
    provenance: 'hypothetical';
    description: string;
    probability: number;
    threshold: number;
    aboveThreshold: boolean;
    trainPrevalence: number;
    missingInputs: number;
    features: Array<{ feature: string; label: string; value: string | null; meaning: string | null }>;
  };
  shapHypothetical: {
    provenance: 'hypothetical';
    available: boolean;
    message?: string | null;
    method?: string;
    scale?: string;
    baseValue?: number;
    modelOutput?: number;
    reconstructed?: number;
    additivityAbsError?: number;
    contributions?: Contribution[];
  };
  shapGlobal: {
    provenance: 'offline_survey';
    available: boolean;
    message?: string;
    dataset?: string;
    n?: number;
    method?: string;
    scale?: string;
    baseValue?: number;
    additivityMaxAbsError?: number;
    features?: Array<{ feature: string; label: string; meanAbs: number; meanSigned: number }>;
  };
}

export interface RuleCondition {
  feature: string;
  source: string | null;
  value: unknown;
  test: string;
  result: boolean | null;
}

export interface RuleTrace {
  ruleId: string;
  name: string;
  category: string;
  priority: number;
  specStatus: string;
  enabled: boolean;
  status: string;
  disabledReason?: string | null;
  expertReviewPending: string[];
  conditions: RuleCondition[];
  contributingFeatures: string[];
}

export interface MqRecRecommendation {
  recommendationId: string;
  ruleId: string;
  strategyCode: string;
  skillId: string | null;
  priority: number;
  optional?: boolean;
  reasonCodes: string[];
  titleEn?: string;
  action?: string;
  why?: string;
  interactsWithElpx?: { code: string; relation: string } | null;
  conflicts?: Array<{ between: string; resolution: string }>;
  expertReviewPending?: string[];
  evidence: Array<{ sourceId: string; section: string }>;
  trace: { ruleId: string; status: string; contributingFeatures: string[] };
}

export interface MqRecScenario {
  id: string;
  provenance: 'synthetic';
  description: string;
  input: Record<string, unknown>;
  output: {
    engine: { rulesetVersion: string; status: string; note: string };
    recommendations: MqRecRecommendation[];
    uncertaintyNotices: Array<{ code: string; message: string }>;
    ruleTraces: RuleTrace[];
    summary: { triggered: string[]; disabled: string[]; blockedByMissingInput: string[]; recommendationCount: number };
  };
}

export interface MqRecSection {
  provenance: 'synthetic';
  rulesetVersion: string;
  contextSchemaVersion: string;
  status: string;
  integration: string;
  rules: Array<{
    ruleId: string; name: string; category: string; priority: number; specStatus: string; enabled: boolean;
    disabledReason: string | null; expertReviewPending: string[]; evidence: Array<{ sourceId: string; section: string }>;
  }>;
  references: Array<{ sourceId: string; title: string; organization?: string; publicationYear?: number; limitations?: string }>;
  scenarios: MqRecScenario[];
}

export interface ElpxSection {
  algorithmVersion: string;
  recommendationRulesetVersion: string;
  profileSchemaVersion: string;
  evidenceRulesetVersion: string;
  method: { prior: string; estimate: string; interval: string; minimumEvidencePerSkill: number; levels: Record<string, string> };
  strategyCatalogue: Array<{ strategyCode: string; reasonCodeSets: string[][]; titleTemplates: string[] }>;
  simulated: {
    provenance: 'simulated';
    note: string;
    experimentA: Array<Record<string, unknown>>;
    experimentB: Array<Record<string, unknown>>;
    experimentC: Array<Record<string, unknown>>;
  };
}

export interface LearnerProfileSections {
  nsch: NschSection;
  mqRec: MqRecSection;
  elpx: ElpxSection;
  imlrDemo?: ImlrDemoSection;
  softwareTests: SoftwareTestRun[];
}

export const sectionsOf = (snapshot: ResearchSnapshot): LearnerProfileSections =>
  snapshot.sections as unknown as LearnerProfileSections;

export const pct = (v: number | undefined | null, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`);
export const dec = (v: number | undefined | null, digits = 3) => (v == null ? '—' : v.toFixed(digits));

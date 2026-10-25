/** Types for the IMLR prototype demonstration section (exported from research/.../imlr_probe; synthetic only). */

export type AssistanceStatus = 'NONE_CONFIRMED' | 'ASSISTED' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type TransferOutcome = 'INDEPENDENT_CORRECT' | 'INDEPENDENT_INCORRECT' | 'HELPED' | 'ASSISTANCE_UNKNOWN' | 'UNANSWERED';

export interface ImlrOption {
  optionId: string;
  position: number;
  count: number;
  pattern: string;
  spacing: string;
}

export interface ImlrFormItem {
  presentationIndex: number;
  role: 'pre' | 'teaching' | 'transfer';
  itemId: string;
  familyId: string;
  conceptId: string;
  cell: string;
  objectType: string;
  extentMode: string;
  options: ImlrOption[];
  correctPosition: number;
}

export interface ImlrItemEvidence {
  itemId: string;
  role: string;
  presented: boolean;
  answered: boolean;
  skipped: boolean;
  firstResponseSeconds: number | null;
  firstResponsePosition: number | null;
  correctFirstResponse: boolean | null;
  revisions: number;
  instructionReplays: number;
  supportBeforeFirstResponse: Array<{ level: number; origin: string }>;
  supportLevels: number[];
  childHelpRequests: number;
  assistanceRecording: string | null;
  assistanceStatus: AssistanceStatus;
  flags: string[];
}

export interface ImlrSnapshot {
  meta: {
    snapshotSchemaVersion: string;
    protocolId: string;
    protocolVersion: string;
    formId: string;
    seed: number;
    predictionTime: { event: string; seq: number; t: number };
    teachingWindowClosedBeforePredictionTime: boolean;
    eventsUsed: number;
    inputEventsSha256: string;
    featureAllowlist: string[];
  };
  features: Record<string, unknown>;
  snapshotSha256: string;
}

export interface ImlrEvent {
  seq: number;
  t: number;
  type: string;
  itemId?: string;
  level?: number;
  origin?: string;
  action?: string;
  position?: number;
  assistanceRecording?: string;
  window: 'before_prediction_time' | 'prediction_time' | 'after_prediction_time';
}

export interface ImlrScenario {
  id: string;
  title: string;
  description: string;
  synthetic: true;
  inputs: {
    preProbe: ImlrItemEvidence[];
    teaching: ImlrItemEvidence[];
    teachingWindow: { startedSeq: number | null; endedSeq: number | null; closed: boolean };
    snapshot: ImlrSnapshot;
  };
  outcomes: {
    outcomeSchemaVersion: string;
    formId: string;
    predictionTimeSeq: number;
    items: Array<{ itemId: string; presentationIndex: number; assistanceStatus: AssistanceStatus; outcome: TransferOutcome; flags: string[]; evidenceFromSeq: number | null }>;
    counts: Record<TransferOutcome, number>;
    independentCorrect: number;
    independentClassified: number;
    chanceLevelPerItem: number;
    description: string;
    interpretation: string;
    itemDetails: ImlrItemEvidence[];
    label: { status: string; independentTransferCorrect: number; independentTransferClassified: number };
    separation: { predictionTimeSeq: number; inputSnapshotSha256: string; labelFromEventsAtOrAfterSeq: number };
  };
  events: ImlrEvent[];
}

export interface ImlrDemoSection {
  provenance: 'synthetic';
  notice: string;
  protocol: {
    protocolId: string;
    protocolVersion: string;
    status: string;
    phases: Array<{ role: string; items: number }>;
    teachingIsUniversal: boolean;
    responseFormat: string;
    chanceLevel: number;
    helpPolicy: Record<string, string>;
    nonClaims: string[];
    approvalsRequired: string[];
  };
  snapshotSchemaVersion: string;
  outcomeSchemaVersion: string;
  itemBank: { version: string; familyId: string; conceptId: string; expertReview: string; items: Array<Record<string, unknown>> };
  form: { formId: string; seed: number; protocolId: string; protocolVersion: string; itemBankVersion: string; items: ImlrFormItem[] };
  scenarios: ImlrScenario[];
}

/** Types for the sanitized research snapshots (MQ-RESEARCH-SNAPSHOT-v1) served by /api/v1/admin/research. */

export type Json = Record<string, unknown>;

export type Provenance =
  | 'live'
  | 'offline_survey'
  | 'hypothetical'
  | 'simulated'
  | 'synthetic'
  | 'software_test'
  | 'documentation';

export type ModelStatus = 'IMPLEMENTED' | 'OFFLINE_EXPERIMENT' | 'PROTOTYPE' | 'PROVISIONAL' | 'PLANNED' | 'NOT_IMPLEMENTED';

export interface ModelEntry {
  id: string;
  name: string;
  family: string | null;
  version: string | null;
  status: ModelStatus;
  provenance: Provenance;
  description: string;
  location: string | null;
}

export interface SnapshotSource {
  id: string;
  path: string;
  sha256: string;
  provenance: Provenance;
}

export interface SoftwareTestRun {
  suite: string;
  kind: 'software_test';
  command: string;
  ranAtUtc: string;
  status: 'PASSED' | 'FAILED' | 'NOT_RUN';
  testsRun: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  results: Array<{ test: string; outcome: 'passed' | 'failed' | 'error' | 'skipped' }>;
  note?: string | null;
}

export interface ResearchSnapshot {
  schemaVersion: string;
  componentId: string;
  componentTitle: string;
  generatedAtUtc: string;
  generator: { script: string; version: string };
  sources: SnapshotSource[];
  models: ModelEntry[];
  sections: Json;
}

export interface ResearchComponentSummary {
  id: string;
  title: string;
  component: string;
  summary: string;
  liveSummary: boolean;
  snapshotAvailable: boolean;
  snapshotValid: boolean | null;
  generatedAtUtc: string | null;
  modelCount: number;
  modelStatuses: Partial<Record<ModelStatus, number>>;
}

export interface Freshness {
  status: 'CURRENT' | 'STALE' | 'UNVERIFIABLE';
  checked: number;
  changedSources: string[];
  note?: string;
}

export interface ResearchComponentDetail {
  component: Omit<ResearchComponentSummary, 'snapshotAvailable' | 'snapshotValid' | 'generatedAtUtc' | 'modelCount' | 'modelStatuses'>;
  snapshot: ResearchSnapshot | null;
  freshness: Freshness | null;
  emptyReason: string | null;
}

/** A live aggregate cell: a count, or suppressed when fewer than the minimum cell size. */
export interface Cell {
  count: number | null;
  suppressed?: boolean;
}
export type Distribution = Record<string, Cell>;

export interface LiveSummary {
  provenance: 'live';
  generatedAtUtc: string;
  minimumCellSize: number;
  source: string;
  learnerProfiles: Cell;
  learnersAssessed: Cell;
  suppressed: boolean;
  reason?: string;
  protocolVersions?: Distribution;
  grades?: Distribution;
  elpx?: {
    algorithmVersions: Distribution;
    recommendationRulesetVersions: Distribution;
    evidenceStatus: Distribution;
    skillLevels: Record<string, Distribution>;
    strategyCodesLearners: Distribution;
  };
  impsa?: { status: Distribution; evidenceSufficiency: Distribution };
  imlr?: { status: Distribution; evidenceLevel: Distribution };
  notes?: string[];
}

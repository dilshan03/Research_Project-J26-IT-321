import React from 'react';
import { Panel, Stat } from '../../components/ui';
import { PROVENANCE_LABELS, ProvenanceTag } from '../components/badges';
import { ModelCards, SnapshotMeta } from '../components/snapshotPanels';
import type { Freshness, ModelEntry, Provenance, ResearchSnapshot } from '../types';

const GROUPS: Array<{ title: string; note: string; match: (m: ModelEntry) => boolean }> = [
  {
    title: 'In the live application',
    note: 'Running in the learner-profile service on real onboarding evidence.',
    match: (m) => m.provenance === 'live',
  },
  {
    title: 'Offline research',
    note: 'Run outside MathQuest on survey or synthetic data. Not connected to any learner.',
    match: (m) => m.provenance !== 'live' && m.status !== 'NOT_IMPLEMENTED' && m.status !== 'PLANNED',
  },
  {
    title: 'Planned — not implemented',
    note: 'Documented research plans only. No data, training or results exist.',
    match: (m) => m.status === 'NOT_IMPLEMENTED' || m.status === 'PLANNED',
  },
];

const PROVENANCE_HELP: Array<[Provenance, string]> = [
  ['live', 'Counts computed now from stored MathQuest assessments; never individual records; groups under 5 suppressed.'],
  ['offline_survey', 'Public US NSCH survey data (2023–2025), analysed offline. Not MathQuest children.'],
  ['hypothetical', 'A made-up input written to demonstrate the model. Not a real child or respondent.'],
  ['simulated', 'Deterministic simulations used to verify an algorithm’s mathematical behaviour.'],
  ['synthetic', 'Hand-written learner contexts used to test rules. Not real learners.'],
  ['software_test', 'Automated code tests. They check behaviour, not predictive accuracy.'],
];

export const OverviewTab: React.FC<{ snapshot: ResearchSnapshot; freshness: Freshness | null }> = ({ snapshot, freshness }) => {
  const count = (pred: (m: ModelEntry) => boolean) => snapshot.models.filter(pred).length;
  return (
    <div className="space-y-4">
      <Panel title="About this component">
        <p className="text-sm text-slate-700">
          Builds an evidence-aware picture of each child’s mathematics skills from onboarding activities. ELP-X estimates
          per-skill proficiency with Bayesian uncertainty, ELP-X-REC turns those estimates into explainable support strategies,
          and evidence-integrity rules make sure only genuine, first-response evidence is used. Offline research (an NSCH survey
          classifier and the MQ-REC rule prototype) is kept separate from the live application.
        </p>
        <p className="text-xs text-slate-500">
          Mathematical ability is kept separate from attention, accessibility and temporary factors. No component makes clinical
          or diagnostic claims from gameplay.
        </p>
      </Panel>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {/* Tones match the status badges: green live, amber provisional, indigo offline, sky prototype, grey planned */}
        <Stat label="Implemented (live)" value={count((m) => m.status === 'IMPLEMENTED')} tone="emerald" />
        <Stat label="Provisional (live)" value={count((m) => m.status === 'PROVISIONAL')} tone="amber" />
        <Stat label="Offline experiments" value={count((m) => m.status === 'OFFLINE_EXPERIMENT')} tone="indigo" />
        <Stat label="Prototypes" value={count((m) => m.status === 'PROTOTYPE')} tone="sky" />
        <Stat label="Not implemented" value={count((m) => m.status === 'NOT_IMPLEMENTED' || m.status === 'PLANNED')} tone="slate" />
      </div>

      {GROUPS.map((g) => {
        const models = snapshot.models.filter(g.match);
        return models.length === 0 ? null : (
          <Panel key={g.title} title={g.title} note={g.note}>
            <ModelCards models={models} />
          </Panel>
        );
      })}

      <Panel title="How to read the data labels" note="Every result on these pages carries one of these labels.">
        <dl className="grid gap-2 sm:grid-cols-2">
          {PROVENANCE_HELP.map(([p, help]) => (
            <div key={p} className="flex flex-col gap-1">
              <dt><ProvenanceTag provenance={p} /></dt>
              <dd className="text-xs text-slate-600" aria-label={PROVENANCE_LABELS[p]}>{help}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <SnapshotMeta snapshot={snapshot} freshness={freshness} />
    </div>
  );
};

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorLine, Panel, Stat, Table, date } from '../../components/ui';
import { DistributionBars, EmptyState, Notice, NschNotice, ProvenanceTag, StatusBadge, cellText } from '../components/badges';
import type { LiveSummary, ResearchSnapshot } from '../types';
import { dec, pct, type LearnerProfileSections } from './sections';

export interface LiveProps {
  live?: LiveSummary;
  liveError?: string;
  liveLoading: boolean;
}

/** Live aggregate block with loading, error and suppression states. */
export const LiveBlock: React.FC<LiveProps & { children: (live: LiveSummary) => React.ReactNode }> = ({ live, liveError, liveLoading, children }) => {
  if (liveLoading) return <Loader2 className="animate-spin text-slate-500" />;
  if (liveError || !live) return <ErrorLine message={liveError ?? 'Live summary unavailable.'} />;
  if (live.suppressed) {
    return (
      <EmptyState title="Live distributions withheld">
        {live.reason} Assessed learners: {cellText(live.learnersAssessed)}.
      </EmptyState>
    );
  }
  return <>{children(live)}</>;
};

export const ModelsTab: React.FC<{ snapshot: ResearchSnapshot; sections: LearnerProfileSections } & LiveProps> = ({
  snapshot,
  sections,
  ...liveProps
}) => {
  const { elpx, nsch } = sections;
  const h = nsch.hypotheticalExample;
  const notImplemented = snapshot.models.filter((m) => m.status === 'NOT_IMPLEMENTED' || m.status === 'PLANNED');

  return (
    <div className="space-y-4">
      <Notice>
        Results below come from three different kinds of data and must not be compared directly:{' '}
        <ProvenanceTag provenance="live" /> MathQuest aggregates, <ProvenanceTag provenance="offline_survey" /> US survey research and{' '}
        <ProvenanceTag provenance="hypothetical" /> demonstration inputs.
      </Notice>

      {/* ELP-X (live) */}
      <Panel title={`ELP-X Bayesian skill estimates (${elpx.algorithmVersion})`} note={`Profile schema ${elpx.profileSchemaVersion}`}>
        <div className="flex flex-wrap gap-2"><StatusBadge status="IMPLEMENTED" /><ProvenanceTag provenance="live" /></div>
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          <div><dt className="inline text-slate-500">Prior: </dt><dd className="inline text-slate-800">{elpx.method.prior}</dd></div>
          <div><dt className="inline text-slate-500">Estimate: </dt><dd className="inline text-slate-800">{elpx.method.estimate}</dd></div>
          <div><dt className="inline text-slate-500">Uncertainty: </dt><dd className="inline text-slate-800">{elpx.method.interval}</dd></div>
          <div>
            <dt className="inline text-slate-500">Evidence gate: </dt>
            <dd className="inline text-slate-800">at least {elpx.method.minimumEvidencePerSkill} distinct items per skill</dd>
          </div>
        </dl>
        <LiveBlock {...liveProps}>
          {(live) => (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Stat label="Learner profiles" value={cellText(live.learnerProfiles)} />
                <Stat label="Learners with an assessment" value={cellText(live.learnersAssessed)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Overall evidence status</h4>
                  <DistributionBars data={live.elpx?.evidenceStatus} label="Evidence status" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Assessment protocol</h4>
                  <DistributionBars data={live.protocolVersions} label="Protocol versions" />
                </div>
                {Object.entries(live.elpx?.skillLevels ?? {}).map(([skill, dist]) => (
                  <div key={skill} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700">Provisional level — <span className="font-mono">{skill}</span></h4>
                    <DistributionBars data={dist} label={`Skill levels for ${skill}`} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                {live.source}. Counts of learners; groups under {live.minimumCellSize} are suppressed. Computed {date(live.generatedAtUtc)}.
              </p>
            </div>
          )}
        </LiveBlock>
      </Panel>

      {/* IMPSA / IMLR (provisional) */}
      <Panel
        title="IMPSA / IMLR provisional evidence"
        note="Provisional labels from a brief onboarding intake. They are not validated scores and do not certify ability or a learning gain."
      >
        <div className="flex flex-wrap gap-2"><StatusBadge status="PROVISIONAL" /><ProvenanceTag provenance="live" /></div>
        <LiveBlock {...liveProps}>
          {(live) => (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">IMPSA status</h4>
                <DistributionBars data={live.impsa?.status} label="IMPSA status" />
                <h4 className="text-xs font-bold text-slate-700 pt-2">IMPSA evidence sufficiency</h4>
                <DistributionBars data={live.impsa?.evidenceSufficiency} label="IMPSA evidence sufficiency" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">IMLR transfer indicator</h4>
                <DistributionBars data={live.imlr?.status} label="IMLR status" />
                <h4 className="text-xs font-bold text-slate-700 pt-2">IMLR evidence level</h4>
                <DistributionBars data={live.imlr?.evidenceLevel} label="IMLR evidence level" />
              </div>
            </div>
          )}
        </LiveBlock>
      </Panel>

      {/* NSCH classifier (offline) */}
      <Panel title="NSCH trained logistic regression classifier" note={`${nsch.experimentId} • frozen ${date(nsch.frozenAtUtc)}`}>
        <div className="flex flex-wrap gap-2"><StatusBadge status="OFFLINE_EXPERIMENT" /><ProvenanceTag provenance="offline_survey" /></div>
        <NschNotice />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Stat label="Model" value={<span className="text-base">{nsch.selectedModel.family.replace('_', ' ')} C={String(nsch.selectedModel.params.C)}</span>} />
          <Stat label="Source features (encoded)" value={`${nsch.features.nSource} (${nsch.features.nEncoded})`} />
          <Stat label="Decision threshold" value={dec(nsch.decisionThreshold.value)} />
          <Stat label="Training prevalence" value={pct(nsch.trainPrevalence)} />
        </div>
        <p className="text-xs text-slate-600">{nsch.decisionThreshold.rule}. {nsch.selectedModel.selection_rule}.</p>

        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">Example prediction</h4>
            <ProvenanceTag provenance="hypothetical" />
          </div>
          <p className="text-xs text-slate-600">{h.description}</p>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Stat label="Model probability" value={dec(h.probability)} />
            <Stat label="Threshold" value={dec(h.threshold)} />
            <Stat label="Relative to threshold" value={<span className="text-base">{h.aboveThreshold ? 'Above (statistical flag)' : 'Below'}</span>} />
            <Stat label="Missing inputs" value={`${h.missingInputs} / ${h.features.length}`} />
          </div>
          <p className="text-xs text-slate-600">
            The probability estimates how likely a US parent with these survey answers would report having ever been told the child has
            ADD/ADHD. It is not a diagnosis and not applicable to any MathQuest child.
          </p>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-blue-700">All {h.features.length} hypothetical inputs</summary>
            <div className="mt-2">
              <Table
                columns={['feature', 'survey item', 'value']}
                rows={h.features.map((f) => [f.feature, f.label, f.value == null ? 'missing' : f.meaning ? `${f.value} = ${f.meaning}` : f.value])}
              />
            </div>
          </details>
        </div>
        <p className="text-[11px] text-slate-500">
          No held-out 2025 survey record is shown, and there is no endpoint that runs this model: the example was scored once when the
          snapshot was exported.
        </p>
      </Panel>

      {/* Not implemented */}
      <Panel title="Future readiness and longitudinal models" note="Shown so the research plan is visible; nothing here has been built.">
        <div className="grid gap-3 md:grid-cols-3">
          {notImplemented.map((m) => (
            <div key={m.id} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-700">{m.name}</h4>
                <StatusBadge status={m.status} />
              </div>
              <p className="text-xs text-slate-600">{m.description}</p>
              <p className="text-[11px] text-slate-500">No metrics, predictions or explanations exist.</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

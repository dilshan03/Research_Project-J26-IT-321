import React, { useState } from 'react';
import { Panel, Stat, Table } from '../../components/ui';
import { ContributionBars, ImportanceBars } from '../components/charts';
import { EmptyState, Notice, NschNotice, ProvenanceTag } from '../components/badges';
import { ScenarioPicker, scenarioTitle } from './ScenarioPicker';
import { dec, type LearnerProfileSections, type RuleTrace } from './sections';

const TRACE_STYLE: Record<string, string> = {
  TRIGGERED: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  NOT_TRIGGERED: 'text-slate-700 bg-slate-50 border-slate-200',
  MISSING_INPUT: 'text-amber-900 bg-amber-50 border-amber-200',
  INSUFFICIENT_EVIDENCE: 'text-amber-900 bg-amber-50 border-amber-200',
  DISABLED: 'text-slate-500 bg-white border-slate-200 border-dashed',
  SAFEGUARD_APPLIED: 'text-sky-800 bg-sky-50 border-sky-200',
};

const TraceRow: React.FC<{ t: RuleTrace }> = ({ t }) => (
  <details className="rounded-xl border border-slate-200 bg-white">
    <summary className="cursor-pointer px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono font-semibold text-slate-800">{t.ruleId}</span>
      <span className="text-slate-700">{t.name}</span>
      <span className={`ml-auto rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${TRACE_STYLE[t.status] ?? TRACE_STYLE.NOT_TRIGGERED}`}>
        {t.status.replace(/_/g, ' ').toLowerCase()}
      </span>
    </summary>
    <div className="px-3 pb-3 space-y-2 text-xs">
      <p className="text-slate-500">Priority {t.priority} • {t.specStatus} • {t.category}</p>
      {t.disabledReason && <p className="text-slate-600">Disabled: {t.disabledReason}</p>}
      {t.conditions.length > 0 && (
        <Table
          columns={['condition input', 'source', 'value', 'test', 'held?']}
          rows={t.conditions.map((c) => [
            c.feature, c.source ?? '—', c.value == null ? 'missing' : JSON.stringify(c.value), c.test,
            c.result === true ? 'yes' : c.result === false ? 'no' : 'n/a',
          ])}
        />
      )}
      {t.contributingFeatures.length > 0 && (
        <p className="text-slate-600">Inputs that made the rule fire: <span className="font-mono">{t.contributingFeatures.join(', ')}</span></p>
      )}
      {t.expertReviewPending.length > 0 && <p className="text-amber-800">Expert review pending: {t.expertReviewPending.join(' ')}</p>}
    </div>
  </details>
);

export const ExplainabilityTab: React.FC<{ sections: LearnerProfileSections }> = ({ sections }) => {
  const { nsch, elpx, mqRec } = sections;
  const shap = nsch.shapHypothetical;
  const global = nsch.shapGlobal;
  const [scenarioId, setScenarioId] = useState(mqRec.scenarios[0]?.id ?? '');
  const scenario = mqRec.scenarios.find((s) => s.id === scenarioId);
  const references = new Map(mqRec.references.map((r) => [r.sourceId, r.title]));

  return (
    <div className="space-y-4">
      <Notice>
        Three different kinds of explanation are shown separately: <strong>SHAP</strong> attributions for the statistical NSCH model,
        <strong> Bayesian evidence</strong> behind ELP-X estimates, and <strong>rule traces</strong> for MQ-REC. Rule traces are not SHAP values.
      </Notice>

      {/* SHAP: hypothetical example */}
      <Panel title="SHAP — NSCH classifier, hypothetical example" note={shap.method}>
        <div className="flex flex-wrap gap-2"><ProvenanceTag provenance="hypothetical" /><ProvenanceTag provenance="offline_survey" /></div>
        <NschNotice />
        {!shap.available || !shap.contributions ? (
          <EmptyState title="SHAP explanation not available">{shap.message ?? 'It was not exported.'}</EmptyState>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Stat label={`Base value (${shap.scale})`} value={dec(shap.baseValue, 4)} />
              <Stat label="Sum of contributions" value={dec((shap.reconstructed ?? 0) - (shap.baseValue ?? 0), 4)} />
              <Stat label="Model output" value={dec(shap.modelOutput, 4)} />
              <Stat label="Additivity check" value={<span className="text-base">{(shap.additivityAbsError ?? 1) <= 1e-6 ? 'Verified' : 'Failed'}</span>} />
            </div>
            <p className="text-xs text-slate-600">
              Base value + contributions = model output (log-odds). Positive values push this model’s score up and negative values push it
              down, relative to an average training-partition child. They describe the model’s arithmetic — <strong>contributions, not causes</strong>.
            </p>
            <ContributionBars items={shap.contributions} />
          </>
        )}
      </Panel>

      {/* SHAP: aggregate importance on development data */}
      <Panel title="SHAP — aggregate importance (development data only)" note={global.dataset}>
        <ProvenanceTag provenance="offline_survey" />
        {!global.available || !global.features ? (
          <EmptyState title="Aggregate importance not available">{global.message}</EmptyState>
        ) : (
          <>
            <p className="text-xs text-slate-600">
              Mean absolute SHAP value per survey item across {global.n?.toLocaleString()} validation-partition children (2023–2024; the 2025
              test year was not used). Larger means the model leans on the item more often. Max additivity error {global.additivityMaxAbsError?.toExponential(1)}.
            </p>
            <ImportanceBars items={global.features} />
          </>
        )}
      </Panel>

      {/* ELP-X Bayesian evidence */}
      <Panel title={`ELP-X Bayesian evidence (${elpx.algorithmVersion})`} note="How a skill estimate is explained to adults: evidence counts, posterior and its uncertainty.">
        <ProvenanceTag provenance="simulated" />
        <p className="text-xs text-slate-700">
          Prior {elpx.method.prior}; {elpx.method.estimate}; {elpx.method.interval}. A level is given only with at least{' '}
          {elpx.method.minimumEvidencePerSkill} distinct items; otherwise the skill is reported as insufficient evidence.
        </p>
        <Table
          columns={['level', 'rule']}
          rows={Object.entries(elpx.method.levels).map(([k, v]) => [k, v])}
        />
        <h4 className="text-xs font-bold text-slate-700 pt-1">Worked examples (simulated: small samples)</h4>
        <Table
          columns={['scenario', 'n', 'correct', 'naive level', 'ELP-X level', 'posterior p', '95% interval']}
          rows={elpx.simulated.experimentA.map((r) => [
            String(r.description ?? ''), String(r.n), String(r.c), String(r.b1_level), String(r.elpx_level),
            String(r.elpx_p), Array.isArray(r.elpx_ci) ? `[${(r.elpx_ci as number[]).join(', ')}]` : String(r.elpx_ci),
          ])}
        />
        <p className="text-[11px] text-slate-500">{elpx.simulated.note} Per-child ELP-X evidence is visible in the admin Children view.</p>
      </Panel>

      {/* MQ-REC rule traces */}
      <Panel title={`MQ-REC rule traces (${mqRec.rulesetVersion})`} note="Rule trace — not a SHAP explanation. Shows which source-backed rule conditions held for a synthetic learner.">
        <ProvenanceTag provenance="synthetic" />
        <ScenarioPicker scenarios={mqRec.scenarios} selected={scenarioId} onSelect={setScenarioId} />
        {scenario && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 capitalize">{scenarioTitle(scenario)}</p>
            <p className="text-xs text-slate-600">{scenario.description}</p>
            <p className="text-xs text-slate-600">
              Triggered: {scenario.output.summary.triggered.join(', ') || 'none'} • blocked by missing input:{' '}
              {scenario.output.summary.blockedByMissingInput.join(', ') || 'none'} • disabled: {scenario.output.summary.disabled.join(', ') || 'none'}
            </p>
            <div className="space-y-1.5">
              {scenario.output.ruleTraces.map((t) => <TraceRow key={t.ruleId} t={t} />)}
            </div>
            <h4 className="text-xs font-bold text-slate-700 pt-2">Sources behind the triggered rules</h4>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-0.5">
              {scenario.output.recommendations.flatMap((r) => r.evidence.map((e) => (
                <li key={`${r.recommendationId}-${e.sourceId}-${e.section}`}>
                  <span className="font-mono">{r.ruleId}</span>: {references.get(e.sourceId) ?? e.sourceId} — {e.section}
                </li>
              )))}
              {scenario.output.recommendations.length === 0 && <li>No rule produced a recommendation for this scenario.</li>}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
};

import React, { useState } from 'react';
import { JsonBlock, Panel, Table } from '../../components/ui';
import { DistributionBars, Notice, ProvenanceTag, StatusBadge } from '../components/badges';
import { LiveBlock, type LiveProps } from './ModelsTab';
import { ScenarioPicker, scenarioTitle } from './ScenarioPicker';
import type { LearnerProfileSections } from './sections';

export const RecommendationsTab: React.FC<{ sections: LearnerProfileSections } & LiveProps> = ({ sections, ...liveProps }) => {
  const { elpx, mqRec } = sections;
  const [scenarioId, setScenarioId] = useState(mqRec.scenarios[0]?.id ?? '');
  const scenario = mqRec.scenarios.find((s) => s.id === scenarioId);

  return (
    <div className="space-y-4">
      <Notice>
        <strong>Live recommendations</strong> (ELP-X-REC) are produced for real learners in the application and are shown here only as
        aggregate counts. <strong>Offline research outputs</strong> (MQ-REC) are produced for synthetic learners and never reach a child,
        parent or teacher.
      </Notice>

      {/* Live: ELP-X-REC */}
      <Panel title={`Live recommendations — ELP-X-REC (${elpx.recommendationRulesetVersion})`}>
        <div className="flex flex-wrap gap-2"><StatusBadge status="IMPLEMENTED" /><ProvenanceTag provenance="live" /></div>
        <LiveBlock {...liveProps}>
          {(live) => (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Learners who received each strategy (latest assessment)</h4>
              <DistributionBars data={live.elpx?.strategyCodesLearners} label="ELP-X-REC strategy codes" />
            </div>
          )}
        </LiveBlock>
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-blue-700">
            Strategy catalogue ({elpx.strategyCatalogue.length} codes, read from the engine source)
          </summary>
          <div className="mt-2">
            <Table
              columns={['strategy code', 'reason codes', 'title']}
              rows={elpx.strategyCatalogue.map((s) => [
                s.strategyCode, s.reasonCodeSets.map((r) => r.join(' + ')).join(' | '), s.titleTemplates.join(' / '),
              ])}
            />
          </div>
        </details>
      </Panel>

      {/* Offline: MQ-REC */}
      <Panel title={`Offline research — MQ-REC prototype (${mqRec.rulesetVersion})`} note={mqRec.integration}>
        <div className="flex flex-wrap gap-2"><StatusBadge status="PROTOTYPE" /><ProvenanceTag provenance="synthetic" /></div>
        <ScenarioPicker scenarios={mqRec.scenarios} selected={scenarioId} onSelect={setScenarioId} />
        {scenario && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 capitalize">{scenarioTitle(scenario)}</p>
              <p className="text-xs text-slate-600">{scenario.description}</p>
            </div>
            {scenario.output.recommendations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No recommendation was produced: the rules found too little evidence or input.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {scenario.output.recommendations.map((r) => (
                  <article key={r.recommendationId} className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">{r.strategyCode}</span>
                      <span className="text-[11px] text-slate-500">
                        {r.ruleId} • priority {r.priority}{r.optional ? ' • optional' : ''}{r.skillId ? ` • ${r.skillId}` : ''}
                      </span>
                    </div>
                    {r.titleEn && <p className="text-sm font-semibold text-slate-800">{r.titleEn}</p>}
                    {r.action && <p className="text-xs text-slate-700">{r.action}</p>}
                    {r.why && <p className="text-xs text-slate-600"><span className="font-semibold">Why: </span>{r.why}</p>}
                    <p className="text-[11px] text-slate-500">Reason codes: {r.reasonCodes.join(', ')}</p>
                    {r.interactsWithElpx && (
                      <p className="text-[11px] text-slate-500">ELP-X: {r.interactsWithElpx.code} — {r.interactsWithElpx.relation}</p>
                    )}
                    {r.conflicts?.map((c) => (
                      <p key={c.between} className="text-[11px] text-amber-800">Conflict: {c.between} → {c.resolution}</p>
                    ))}
                  </article>
                ))}
              </div>
            )}
            {scenario.output.uncertaintyNotices.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">Uncertainty and missing-data notices</h4>
                <ul className="space-y-1">
                  {scenario.output.uncertaintyNotices.map((n) => (
                    <li key={n.code + n.message} className="text-xs text-slate-600">
                      <span className="font-mono text-[11px] text-slate-500">{n.code}</span> — {n.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <JsonBlock label="Synthetic scenario input" value={scenario.input} />
          </div>
        )}
      </Panel>

      <Panel title="MQ-REC rule registry" note="Disabled rules wait for calibration or expert review and never run.">
        <Table
          columns={['rule', 'name', 'priority', 'status', 'specification', 'evidence']}
          rows={mqRec.rules.map((r) => [
            r.ruleId, r.name, String(r.priority), r.enabled ? 'enabled' : `disabled${r.disabledReason ? ` — ${r.disabledReason}` : ''}`,
            r.specStatus, r.evidence.map((e) => e.sourceId).join(', ') || '—',
          ])}
        />
      </Panel>
    </div>
  );
};

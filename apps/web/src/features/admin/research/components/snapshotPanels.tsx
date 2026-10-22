import React from 'react';
import { Panel, Table, date } from '../../components/ui';
import type { Freshness, ModelEntry, ResearchSnapshot, SoftwareTestRun } from '../types';
import { Notice, ProvenanceTag, StatusBadge, TestStatus } from './badges';

/* Panels shared by every component page, so owners get the same presentation for their own snapshots. */

export const ModelCards: React.FC<{ models: ModelEntry[] }> = ({ models }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {models.map((m) => (
      <article key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
          <StatusBadge status={m.status} />
        </div>
        <p className="text-xs text-slate-600">{m.description}</p>
        <dl className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-[11px]">
          <dt className="text-slate-500">Type</dt>
          <dd className="text-slate-800">{m.family ?? '—'}</dd>
          <dt className="text-slate-500">Version</dt>
          <dd className="font-mono text-slate-800 break-all">{m.version ?? '—'}</dd>
          <dt className="text-slate-500">Data</dt>
          <dd><ProvenanceTag provenance={m.provenance} /></dd>
          {m.location && (
            <>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-mono text-slate-600 break-all">{m.location}</dd>
            </>
          )}
        </dl>
      </article>
    ))}
  </div>
);

export const SnapshotMeta: React.FC<{ snapshot: ResearchSnapshot; freshness: Freshness | null }> = ({ snapshot, freshness }) => (
  <Panel title="Snapshot provenance" note={`${snapshot.schemaVersion} • generated ${date(snapshot.generatedAtUtc)}`}>
    <p className="text-[11px] text-slate-500 break-all">
      Generator: <span className="font-mono">{snapshot.generator.script}</span> v{snapshot.generator.version}
    </p>
    {freshness?.status === 'STALE' && (
      <Notice tone="warning">
        Some source files changed after this snapshot was generated ({freshness.changedSources.join(', ')}). Regenerate the snapshot
        before relying on these figures.
      </Notice>
    )}
    {freshness?.status === 'CURRENT' && (
      <Notice>All {freshness.checked} available source files match the hashes recorded in the snapshot.</Notice>
    )}
    {freshness?.status === 'UNVERIFIABLE' && <Notice>{freshness.note ?? 'Source files are not available to verify.'}</Notice>}
    <details className="rounded-xl border border-slate-200">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
        Source files ({snapshot.sources.length}) with SHA-256
      </summary>
      <div className="p-2">
        <Table
          columns={['source', 'path', 'data', 'sha256']}
          rows={snapshot.sources.map((s) => [s.id, s.path, <ProvenanceTag key={s.id} provenance={s.provenance} />, `${s.sha256.slice(0, 16)}…`])}
        />
      </div>
    </details>
  </Panel>
);

export const SoftwareTestsPanel: React.FC<{ runs: SoftwareTestRun[]; title?: string }> = ({ runs, title = 'Software tests' }) => (
  <Panel
    title={title}
    note="Automated checks that the code behaves as specified (leakage guards, rule guardrails, determinism). These are not model validation and say nothing about predictive accuracy."
  >
    {runs.length === 0 ? (
      <p className="text-xs text-slate-500">No test runs were recorded in this snapshot.</p>
    ) : (
      <div className="space-y-3">
        {runs.map((r) => (
          <div key={r.suite} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{r.suite}</p>
              <TestStatus status={r.status} />
            </div>
            <p className="text-xs text-slate-600">
              {r.passed}/{r.testsRun} passed • {r.failed} failed • {r.errors} errors • {r.skipped} skipped • ran {date(r.ranAtUtc)}
            </p>
            <p className="text-[11px] font-mono text-slate-500 break-all">{r.command}</p>
            {r.note && <p className="text-xs text-slate-500">{r.note}</p>}
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-blue-700">Individual tests</summary>
              <ul className="mt-2 grid gap-0.5 sm:grid-cols-2 text-[11px] font-mono">
                {r.results.map((t) => (
                  <li key={t.test} className={t.outcome === 'passed' ? 'text-slate-600' : 'text-red-700 font-semibold'}>
                    {t.outcome === 'passed' ? '✓' : t.outcome === 'skipped' ? '○' : '✗'} {t.test}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
    )}
  </Panel>
);

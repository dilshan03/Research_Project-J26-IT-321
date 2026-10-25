import React, { useMemo, useState } from 'react';
import { ArrowRight, Coffee, FlaskConical, HelpCircle, Lock, ShieldQuestion } from 'lucide-react';
import { Panel, Table } from '../../../components/ui';
import { EmptyState, Notice } from '../../components/badges';
import { QuestionCard, RESULT_STYLE, ResultBadge } from './QuestionCard';
import {
  EVENT_LABELS,
  FEATURE_LABELS,
  RESULT_LABELS,
  buildScenarioView,
  formatFeature,
  type DisplayResult,
  type ItemView,
  type ScenarioView,
} from './model';
import type { ImlrDemoSection, ImlrEvent } from './types';

const SyntheticBanner: React.FC<{ notice: string; status: string }> = ({ notice, status }) => (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-900">
    <FlaskConical size={16} className="shrink-0" />
    <span className="font-bold tracking-wide">SYNTHETIC · RESEARCH PROTOTYPE</span>
    <span>{notice} No real child, no model, no prediction. Status: {status}.</span>
  </div>
);

/* ---------------- 1. Scenario selector ---------------- */

const ScenarioSelector: React.FC<{ demo: ImlrDemoSection; selected: string; onSelect: (id: string) => void }> = ({ demo, selected, onSelect }) => (
  <div role="radiogroup" aria-label="Synthetic scenario" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    {demo.scenarios.map((s, i) => {
      const active = s.id === selected;
      return (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onSelect(s.id)}
          className={`text-left rounded-xl border-2 p-3 min-h-[44px] transition-colors ${
            active ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">Synthetic scenario {i + 1}</span>
          <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
          <span className="block text-[11px] text-slate-600 mt-0.5">{s.description}</span>
        </button>
      );
    })}
  </div>
);

/* ---------------- 2. Timeline ---------------- */

const StageChips: React.FC<{ items: ItemView[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((it) => (
      <span key={it.itemId} title={RESULT_LABELS[it.result]} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${RESULT_STYLE[it.result].cls}`}>
        {RESULT_STYLE[it.result].icon} Q{it.presentationIndex + 1}
      </span>
    ))}
  </div>
);

const Timeline: React.FC<{ view: ScenarioView }> = ({ view }) => {
  const stages = [
    { n: 1, title: 'Before teaching', sub: '2 questions answered alone', body: <StageChips items={view.pre} />, tone: 'border-slate-300' },
    { n: 2, title: 'Teaching', sub: `2 guided questions · highest help level ${view.summary.teachingMaxSupportLevel}`, body: <StageChips items={view.teaching} />, tone: 'border-sky-300' },
    {
      n: 3,
      title: 'Evidence boundary',
      sub: 'Inputs frozen before any new question',
      body: (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
          <Lock size={12} /> snapshot {view.scenario.inputs.snapshot.snapshotSha256.slice(0, 10)}…
        </span>
      ),
      tone: 'border-blue-400',
    },
    { n: 4, title: 'New questions (transfer)', sub: '3 unseen questions, help only if asked', body: <StageChips items={view.transfer} />, tone: 'border-emerald-300' },
  ];
  return (
    <ol className="grid gap-2 md:grid-cols-4" aria-label="Assessment timeline">
      {stages.map((s, i) => (
        <li key={s.n} className="relative">
          <div className={`h-full rounded-xl border-2 ${s.tone} bg-white p-3 space-y-1.5`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{s.n}</span>
              <span className="text-sm font-bold text-slate-900">{s.title}</span>
            </div>
            <p className="text-[11px] text-slate-600">{s.sub}</p>
            {s.body}
          </div>
          {i < stages.length - 1 && (
            <ArrowRight size={16} className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 bg-slate-100 rounded-full" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
};

/* ---------------- 4. Before-and-after summary ---------------- */

const SEGMENT_COLORS: Record<DisplayResult, string> = {
  correct: '#047857', incorrect: '#be123c', helped: '#b45309', unknown: '#6d28d9', unanswered: '#94a3b8', guided: '#0369a1',
};

const Summary: React.FC<{ view: ScenarioView }> = ({ view }) => {
  const s = view.summary;
  const chanceOfN = s.transferIndependentClassified * s.chanceLevel;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold text-slate-500">Before teaching (alone)</p>
        <p className="text-2xl font-bold text-slate-900">
          {s.preIndependentCorrect} <span className="text-base font-semibold text-slate-500">of {s.preIndependentClassified}</span>
        </p>
        <p className="text-[11px] text-slate-600">correct without help (recorded separately)</p>
      </div>
      <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
        <p className="text-xs font-semibold text-sky-800">Teaching (guided)</p>
        <p className="text-2xl font-bold text-slate-900">
          {s.teachingItems} <span className="text-base font-semibold text-slate-500">questions</span>
        </p>
        <div className="mt-1 flex gap-1" aria-label={`Highest support level ${s.teachingMaxSupportLevel} of 3`}>
          {[1, 2, 3].map((l) => (
            <span key={l} className={`h-2 flex-1 rounded ${l <= s.teachingMaxSupportLevel ? 'bg-sky-700' : 'bg-sky-100'}`} />
          ))}
        </div>
        <p className="text-[11px] text-slate-600 mt-1">highest help level {s.teachingMaxSupportLevel} of 3 · never counted as independent</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
        <p className="text-xs font-semibold text-emerald-800">New questions (alone)</p>
        <p className="text-2xl font-bold text-slate-900">
          {s.transferIndependentCorrect} <span className="text-base font-semibold text-slate-500">of {s.transferIndependentClassified}</span>
        </p>
        <div className="mt-1 flex h-3 gap-0.5 overflow-hidden rounded" role="img" aria-label="Results of the three new questions">
          {view.transfer.map((t) => (
            <span key={t.itemId} className="flex-1" style={{ background: SEGMENT_COLORS[t.result] }} title={`Q${t.presentationIndex + 1}: ${RESULT_LABELS[t.result]}`} />
          ))}
        </div>
        <p className="text-[11px] text-slate-600 mt-1">
          chance level {Math.round(s.chanceLevel * 100)}% per 3-option question
          {s.transferIndependentClassified > 0 ? ` (≈ ${chanceOfN.toFixed(1)} of ${s.transferIndependentClassified} by guessing)` : ''}
        </p>
      </div>
    </div>
  );
};

/* ---------------- 5. Snapshot vs outcomes ---------------- */

const SnapshotPanel: React.FC<{ view: ScenarioView }> = ({ view }) => {
  const snap = view.scenario.inputs.snapshot;
  const out = view.scenario.outcomes;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Lock size={15} /> Inputs: frozen before the new questions</h4>
        <p className="text-xs text-slate-600">
          Only events before the evidence boundary ({snap.meta.eventsUsed} events) were read. Nothing about the new questions — not
          even which ones they are — can appear here.
        </p>
        <Table
          columns={['information available before transfer', 'value']}
          rows={Object.entries(snap.features).map(([k, v]) => [FEATURE_LABELS[k] ?? k, formatFeature(k, v)])}
        />
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-900">Outcomes: recorded after the boundary</h4>
        <p className="text-xs text-slate-600">
          Kept in a separate record. Outcomes are never fed back into the inputs.
        </p>
        <Table
          columns={['new question', 'result', 'help status']}
          rows={view.transfer.map((t) => [`Q${t.presentationIndex + 1} (${t.objectType})`, <ResultBadge key={t.itemId} result={t.result} />, t.evidence.assistanceStatus])}
        />
        <p className="text-xs text-slate-700">{out.description}</p>
        <p className="text-[11px] text-slate-500">Research record status: {out.label.status}</p>
      </div>
      <details className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">Technical: snapshot fingerprint and separation</summary>
        <div className="px-3 pb-3 text-[11px] font-mono text-slate-700 space-y-0.5 break-all">
          <p>snapshotSha256: {snap.snapshotSha256}</p>
          <p>inputEventsSha256: {snap.meta.inputEventsSha256}</p>
          <p>prediction time: {snap.meta.predictionTime.event} at seq {snap.meta.predictionTime.seq}</p>
          <p>teaching window closed before boundary: {String(snap.meta.teachingWindowClosedBeforePredictionTime)}</p>
          <p>label uses events at/after seq {out.separation.labelFromEventsAtOrAfterSeq}; linked to input snapshot {out.separation.inputSnapshotSha256.slice(0, 16)}…</p>
        </div>
      </details>
    </div>
  );
};

/* ---------------- 6. Evidence integrity ---------------- */

const RULES = [
  { icon: <HelpCircle size={18} />, title: 'Helped answers are not independent', text: 'If help started before the first answer, the answer shows what the child can do with help — so it is counted as “helped”, not as independent.' },
  { icon: <ShieldQuestion size={18} />, title: 'Missing record = unknown', text: 'If the help record is missing or incomplete, we cannot prove no help was given. The answer is “unknown”, never assumed to be independent.' },
  { icon: <Coffee size={18} />, title: 'A break is not teaching', text: 'Children can rest at any time. A break is recorded, but it gives no mathematical help, so it does not change how an answer is counted.' },
];

const EventRow: React.FC<{ e: ImlrEvent; qIndex: Map<string, number> }> = ({ e, qIndex }) => {
  const q = e.itemId !== undefined ? qIndex.get(e.itemId) : undefined;
  const detail = [
    q !== undefined ? `Q${q + 1}` : '',
    e.level ? `level ${e.level}` : '',
    e.origin ? (e.origin === 'child_request' ? 'child asked' : 'by activity') : '',
    e.action ?? '',
    e.assistanceRecording ? `record ${e.assistanceRecording}` : e.type === 'ITEM_ENDED' ? 'record missing' : '',
  ].filter(Boolean).join(' · ');
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-2 text-[11px]">
      <span className="font-mono text-slate-500">#{e.seq}</span>
      <span className="text-slate-800">{EVENT_LABELS[e.type] ?? e.type}{detail ? <span className="text-slate-500"> — {detail}</span> : null}</span>
    </li>
  );
};

const IntegrityPanel: React.FC<{ view: ScenarioView; qIndex: Map<string, number> }> = ({ view, qIndex }) => {
  const specific = [...view.pre, ...view.transfer].flatMap((it) =>
    it.explanations.map((x) => `Q${it.presentationIndex + 1} (${it.role === 'pre' ? 'before teaching' : 'new question'}): ${x}`)
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        {RULES.map((r) => (
          <div key={r.title} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">{r.icon}{r.title}</p>
            <p className="text-xs text-slate-600">{r.text}</p>
          </div>
        ))}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-700">In this scenario</h4>
        <ul className="mt-1 list-disc pl-5 space-y-0.5 text-xs text-slate-700">
          {specific.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
          Events used ({view.eventsUsed.length}) and excluded from the snapshot ({view.eventsExcluded.length})
        </summary>
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 [&>*]:min-w-0">
          <div>
            <p className="text-xs font-bold text-slate-700 mb-1">Used for the frozen snapshot</p>
            <ol className="space-y-0.5">{view.eventsUsed.map((e) => <EventRow key={e.seq} e={e} qIndex={qIndex} />)}</ol>
          </div>
          <div>
            {view.boundaryEvent && (
              <p className="mb-2 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-900">
                #{view.boundaryEvent.seq} Evidence boundary — snapshot frozen here
              </p>
            )}
            <p className="text-xs font-bold text-slate-700 mb-1">After the boundary — outcomes only, never inputs</p>
            <ol className="space-y-0.5">{view.eventsExcluded.map((e) => <EventRow key={e.seq} e={e} qIndex={qIndex} />)}</ol>
          </div>
        </div>
      </details>
    </div>
  );
};

/* ---------------- Page ---------------- */

export const ImlrDemoTab: React.FC<{ demo?: ImlrDemoSection }> = ({ demo }) => {
  const [selected, setSelected] = useState(demo?.scenarios[0]?.id ?? '');
  const view = useMemo(() => (demo ? buildScenarioView(demo, selected) : null), [demo, selected]);
  const qIndex = useMemo(() => new Map((demo?.form.items ?? []).map((i) => [i.itemId, i.presentationIndex])), [demo]);

  if (!demo || demo.scenarios.length === 0) {
    return (
      <Panel title="IMLR prototype demonstration">
        <EmptyState title="No IMLR demonstration data in this snapshot">
          Regenerate the research snapshot with <code className="font-mono">python -m research_export.export_snapshot</code>.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <SyntheticBanner notice={demo.notice} status={demo.protocol.status} />

      <Panel
        title="IMLR learning-transfer probe — prototype demonstration"
        note="Can a learner solve new, comparable questions on their own after a short teaching step? This page shows how the evidence is collected and kept honest. It does not measure or predict anyone’s readiness."
      >
        <ScenarioSelector demo={demo} selected={selected} onSelect={setSelected} />
      </Panel>

      {view && (
        <>
          <Panel title="1. The assessment, step by step" note={`Selected: ${view.scenario.title} (synthetic)`}>
            <Timeline view={view} />
          </Panel>

          <Panel title="2. Before and after teaching" note="Descriptive evidence only: not a validated learning gain or readiness score, and the teaching is not claimed to cause any change.">
            <Summary view={view} />
          </Panel>

          <Panel title="3. The questions" note="Rendered from the prototype’s own form (seeded assignment of the synthetic item bank). Green border = group with the most (answer key); blue ring = first answer.">
            <div className="space-y-3">
              {[
                { label: 'Before teaching — answered alone', items: view.pre },
                { label: 'Teaching — guided examples', items: view.teaching },
                { label: 'New questions — answered alone (transfer)', items: view.transfer },
              ].map((g) => (
                <div key={g.label} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">{g.label}</h4>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3 [&>*]:min-w-0">
                    {g.items.map((it) => <QuestionCard key={it.itemId} item={it} />)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="4. What was frozen before the new questions" note="The input evidence and the later outcomes are stored separately.">
            <SnapshotPanel view={view} />
          </Panel>

          <Panel title="5. Why each answer is counted the way it is">
            <IntegrityPanel view={view} qIndex={qIndex} />
          </Panel>
        </>
      )}

      <Panel title="How to explain this demonstration">
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
          <li>Pick a scenario. Each one is a scripted, synthetic example: no child, no real answers.</li>
          <li>Step 1 shows what the learner did <strong>alone</strong> before any teaching.</li>
          <li>Step 2 is a short, standard teaching activity that <strong>every</strong> learner gets. Answers there are guided.</li>
          <li>Step 3 freezes everything known so far. Anything that happens afterwards cannot change it.</li>
          <li>Step 4 gives three <strong>new</strong> questions the learner has never seen. Only answers with a confirmed “no help” record count as independent.</li>
          <li>The result is a simple “k of n”, shown next to the chance of guessing (1 in 3). It is evidence to discuss, not a score or a diagnosis.</li>
        </ol>
      </Panel>

      {view && (
        <details className="rounded-2xl border border-slate-200 bg-white min-w-0">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-900">Technical details, limitations and approvals</summary>
          <div className="px-4 pb-4 space-y-3 text-xs text-slate-700 min-w-0 break-words">
            <Table
              columns={['field', 'value']}
              rows={[
                ['Protocol', `${demo.protocol.protocolId} ${demo.protocol.protocolVersion}`],
                ['Status', demo.protocol.status],
                ['Synthetic scenario', view.scenario.id],
                ['Form', `${demo.form.formId} (seed ${demo.form.seed})`],
                ['Item bank', `${demo.form.itemBankVersion} · family ${demo.itemBank.familyId} · expert review ${demo.itemBank.expertReview}`],
                ['Response format', `${demo.protocol.responseFormat} (chance ${(demo.protocol.chanceLevel * 100).toFixed(0)}%)`],
                ['Snapshot', `${demo.snapshotSchemaVersion} · ${view.scenario.inputs.snapshot.snapshotSha256}`],
                ['Outcome schema', demo.outcomeSchemaVersion],
              ]}
            />
            <Notice tone="warning">
              <strong>Limitations.</strong> Scripted synthetic events only; nothing here describes real learners or item difficulty. With
              every group drawn in the same space, larger groups look denser; the prototype varies the layout mode but does not remove that
              cue. With only two pre-teaching questions, the recomputed ELP-X estimate always reports insufficient evidence.
            </Notice>
            <div>
              <p className="font-bold">Not claimed</p>
              <ul className="list-disc pl-5">{demo.protocol.nonClaims.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <div>
              <p className="font-bold">Approvals still required</p>
              <ul className="list-disc pl-5">{demo.protocol.approvalsRequired.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

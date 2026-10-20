import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldCheck, Eye, X, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  adminApi,
  type AdminLearnerDetail,
  type AdminLearnerRow,
  type AdminOverview,
  type AdminResult,
  type AdminUser,
  type Json,
} from '../services/adminApi';

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'children' | 'parents' | 'teachers' | 'admins' | 'audit';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'children', label: 'Children' },
  { id: 'parents', label: 'Parents' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'admins', label: 'Admins' },
  { id: 'audit', label: 'Audit log' },
];

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
};
const date = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toLocaleString() : '—');
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

const Panel: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 min-w-0">
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
    </div>
    {children}
  </section>
);

const JsonBlock: React.FC<{ label: string; value: unknown; open?: boolean }> = ({ label, value, open }) => (
  <details open={open} className="rounded-xl border border-slate-200 bg-slate-50">
    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">{label}</summary>
    <pre className="px-3 pb-3 text-[11px] leading-snug text-slate-800 overflow-x-auto max-h-96">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  </details>
);

const Table: React.FC<{ columns: string[]; rows: React.ReactNode[][]; empty?: string }> = ({ columns, rows, empty }) =>
  rows.length === 0 ? (
    <p className="text-xs text-slate-500">{empty ?? 'No records.'}</p>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((cell, j) => <td key={j} className="px-3 py-1.5 font-mono text-slate-800">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

const ErrorLine: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{message}</p> : null;

const useLoad = <T,>(load: () => Promise<AdminResult<T>>, deps: unknown[]) => {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({ loading: true });
  const run = useCallback(async () => {
    setState({ loading: true });
    const res = await load();
    setState({ loading: false, data: res.data, error: res.ok ? undefined : res.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
};

/* ------------------------------------------------------------------ */
/* Child detail                                                        */
/* ------------------------------------------------------------------ */

const ObservationSummary: React.FC<{ o: Json }> = ({ o }) => (
  <span>
    first={fmt(o.idleTimeBeforeFirstActionMs)}ms taps={fmt(o.pointerDownCount)} bursts={arr(o.tapBursts).length} idle=
    {arr(o.idleIntervals).length} page={arr(o.pageEvents).length} hidden={fmt(o.hiddenDurationMs)}ms invalid=
    {fmt(o.invalidTapCount)}
  </span>
);

const AssessmentView: React.FC<{ a: Json; index: number }> = ({ a, index }) => {
  const evaluated = arr(a.evaluatedItems);
  const excluded = arr(a.excludedItems);
  return (
    <div className="space-y-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs text-slate-600">
        <span className="font-semibold">#{index + 1}</span> completed {date(a.completedAt)} • grade {fmt(a.grade)} • protocol{' '}
        {fmt(a.assessmentProtocolVersion)} • evidence ruleset {fmt(a.evidenceRulesetVersion)} • accuracy {fmt(a.accuracyPercentage)}%
      </p>
      <Table
        columns={['questionId', 'skill', 'role', 'answer', 'first', 'correct1st', 'independent', 'included', 'time s', 'support', 'flags', 'interaction observations']}
        rows={evaluated.map((it) => [
          fmt(it.questionId), fmt(it.skillId), fmt(it.probeRole), fmt(it.userAnswer), fmt(it.firstConfirmedResponse),
          fmt(it.correctFirstResponse), fmt(it.independentFirstResponse), fmt(it.includedInProficiencyEstimate),
          fmt(it.responseTimeSeconds), arr(it.supportEvents).map((s) => `L${fmt(s.level)}`).join(',') || '—',
          arr(it.qualityFlags).join(', ') || '—',
          it.interactionObservations ? <ObservationSummary o={obj(it.interactionObservations)} /> : '—',
        ])}
        empty="No evaluated items."
      />
      <Table
        columns={['excluded questionId', 'status', 'reason', 'flags']}
        rows={excluded.map((it) => [fmt(it.questionId), fmt(it.responseStatus), fmt(it.exclusionReason), arr(it.qualityFlags).join(', ') || '—'])}
        empty="No excluded items."
      />
      <div className="grid gap-2 md:grid-cols-2">
        <JsonBlock label="Evidence summary" value={a.evidenceSummary} />
        <JsonBlock label="IMPSA / IMLR (provisional)" value={{ impsa: a.impsaSummary, imlr: a.imlrSummary }} />
        <JsonBlock label="Child preferences" value={a.childPreferences} />
        <JsonBlock label="Stored ELP-X snapshot" value={a.elpxProfile} />
      </div>
      <JsonBlock label="Full assessment document" value={a} />
    </div>
  );
};

const OtherComponents: React.FC<{ parentId: string; learnerId: string }> = ({ parentId, learnerId }) => {
  const [state, setState] = useState<Awaited<ReturnType<typeof adminApi.otherComponents>> | null>(null);
  useEffect(() => {
    let alive = true;
    adminApi.otherComponents(parentId, learnerId).then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, [parentId, learnerId]);
  if (!state) return <p className="text-xs text-slate-500">Loading…</p>;
  const block = (label: string, r: AdminResult<Json>) =>
    r.ok ? <JsonBlock label={label} value={r.data} /> : <p className="text-xs text-slate-500">{label}: {r.error}</p>;
  return (
    <div className="space-y-2">
      {block('Student progress (stars, coins, BKT knowledge)', state.progress)}
      {block('Learner state (cognitive state, FSM)', state.learnerState)}
      {block('Recent interactions (last 50)', state.interactions)}
    </div>
  );
};

const ChildDetail: React.FC<{ learnerId: string; onClose: () => void }> = ({ learnerId, onClose }) => {
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const { loading, data, error } = useLoad(() => adminApi.learner(learnerId, includeSensitive), [learnerId, includeSensitive]);

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" />Loading child…</p>;
  if (error || !data) return <ErrorLine message={error ?? 'Not found.'} />;

  const d: AdminLearnerDetail = data;
  const l = d.learner;
  const elpx = obj(d.elpxProfile);
  const sens = d.sensitiveParentReports;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {fmt(l.firstName)} <span className="font-mono text-slate-500 text-base">{d.pseudonym}</span>
          </h2>
          <p className="text-xs text-slate-600">
            grade {fmt(l.grade)} • age {fmt(l.age)} • {fmt(l.onboardingStatus)} • {l.isArchived ? 'archived' : 'active'} • language{' '}
            {fmt(l.preferredLanguage)} • created {date(l.createdAt)}
          </p>
          <p className="text-xs text-slate-600">
            parent: {fmt(d.parent?.fullName)} ({fmt(d.parent?.email)}) • learnerId <span className="font-mono">{fmt(l.learnerId)}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 min-h-[36px] px-2">
          <X size={16} /> Close
        </button>
      </div>

      <Panel title="ELP-X profile (current)" note={`algorithm ${fmt(elpx.algorithmVersion)} • ruleset ${fmt(elpx.recommendationRulesetVersion)} • evidence ${fmt(elpx.evidenceStatus)} • distinct items ${fmt(elpx.totalDistinctQuestionsEvaluated)} • correct first ${fmt(elpx.totalCorrectFirstResponses)}`}>
        {elpx.unavailable ? (
          <p className="text-xs text-slate-500">{fmt(elpx.unavailable)}</p>
        ) : (
          <>
            <Table
              columns={['skillId', 'level', 'n', 'c', 'raw %', 'p %', '95% CI', 'α, β', 'sufficient']}
              rows={arr(elpx.skillEstimates).map((s) => {
                const ci = obj(s.credibleInterval);
                return [
                  fmt(s.skillId), fmt(s.provisionalSkillLevel), fmt(s.distinctQuestionsAssessed), fmt(s.correctFirstResponses),
                  fmt(s.rawAccuracyPercentage), fmt(s.estimatedProficiencyPercentage),
                  `[${fmt(Number(ci.lower) * 100)} – ${fmt(Number(ci.upper) * 100)}]`, `${fmt(s.posteriorAlpha)}, ${fmt(s.posteriorBeta)}`,
                  fmt(s.isEvidenceSufficient),
                ];
              })}
              empty="No skill estimates."
            />
            <Table
              columns={['strategyCode', 'skillId', 'reasonCodes', 'title (si)']}
              rows={arr(elpx.structuredRecommendations).map((r) => [
                fmt(r.strategyCode), fmt(r.skillId), arr(r.reasonCodes).join(', '), fmt(r.titleSi),
              ])}
              empty="No recommendations."
            />
            <JsonBlock label="Full ELP-X profile" value={elpx} />
          </>
        )}
      </Panel>

      <Panel title={`Assessments (${d.assessments.length})`}>
        {d.assessments.length === 0 ? (
          <p className="text-xs text-slate-500">No assessment submitted.</p>
        ) : (
          d.assessments.map((a, i) => <AssessmentView key={i} a={a} index={i} />)
        )}
      </Panel>

      <Panel title="Onboarding and parent questionnaires">
        <JsonBlock label="Onboarding progress" value={d.onboardingProgress} />
        <JsonBlock label="Learning preferences / social context" value={d.questionnaires} />
      </Panel>

      <Panel
        title="Sensitive parent reports (ADHD information, SNAP-IV)"
        note="Parent-reported, unverified, non-diagnostic. Opening these is recorded separately in the audit log."
      >
        {!sens.included ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-600">
              Available: ADHD information {sens.available.adhdInformation ? 'yes' : 'no'} • SNAP-IV{' '}
              {sens.available.snapIv ? 'yes' : 'no'}
            </p>
            {Object.values(sens.available).some(Boolean) && (
              <button
                type="button"
                onClick={() => setIncludeSensitive(true)}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <Eye size={14} /> Show sensitive details (logged)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <JsonBlock label="ADHD information" value={sens.adhdInformation} open />
            <JsonBlock label="SNAP-IV latest (responses and scores)" value={sens.snapIv} open />
            <JsonBlock label={`SNAP-IV history (${sens.snapIvHistory?.length ?? 0})`} value={sens.snapIvHistory} />
            <button type="button" onClick={() => setIncludeSensitive(false)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
              Hide sensitive details
            </button>
          </div>
        )}
      </Panel>

      <Panel title={`Gameplay evidence events (${d.gameplayEvents.total})`}>
        <JsonBlock label={`Most recent ${d.gameplayEvents.recent.length}`} value={d.gameplayEvents.recent} />
      </Panel>

      <Panel title="Other components (read-only)" note="Pedagogical engine telemetry, read from its existing endpoints. Not covered by the admin audit log.">
        <OtherComponents parentId={String(l.parentId ?? '')} learnerId={String(l.learnerId ?? learnerId)} />
      </Panel>

      <Panel title="Deletion requests and raw learner record">
        <JsonBlock label={`Deletion requests (${d.deletionRequests.length})`} value={d.deletionRequests} />
        <JsonBlock label="Learner document" value={l} />
      </Panel>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

const OverviewTab: React.FC = () => {
  const { loading, data, error } = useLoad(() => adminApi.overview(), []);
  if (loading) return <Loader2 className="animate-spin text-slate-500" />;
  if (error || !data) return <ErrorLine message={error} />;
  const o: AdminOverview = data;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Parents" value={o.usersByRole.parent ?? 0} />
        <Stat label="Teachers" value={o.usersByRole.teacher ?? 0} />
        <Stat label="Children" value={o.learnersTotal} />
        <Stat label="Archived children" value={o.learnersArchived} />
        <Stat label="Assessments" value={o.assessmentsTotal} />
        <Stat label="Gameplay events" value={o.gameplayEventsTotal} />
        <Stat label="Deletion requests" value={o.deletionRequestsTotal} />
        <Stat label="Admins" value={o.usersByRole.admin ?? 0} />
      </div>
      <Panel title="Children by onboarding status">
        <Table columns={['status', 'count']} rows={Object.entries(o.learnersByOnboardingStatus).map(([k, v]) => [k, v])} />
      </Panel>
    </div>
  );
};

const UsersTab: React.FC<{ role: string }> = ({ role }) => {
  const { loading, data, error } = useLoad(() => adminApi.users(role), [role]);
  if (loading) return <Loader2 className="animate-spin text-slate-500" />;
  if (error) return <ErrorLine message={error} />;
  const users: AdminUser[] = data ?? [];
  return (
    <Panel title={`${users.length} account(s)`} note="Credentials, password hashes and sessions are never returned.">
      <Table
        columns={role === 'parent' ? ['name', 'email', 'username', 'children', 'created', 'id'] : ['name', 'email', 'username', 'created', 'id']}
        rows={users.map((u) => [
          fmt(u.fullName), fmt(u.email), fmt(u.username),
          ...(role === 'parent' ? [fmt(u.childCount)] : []),
          date(u.createdAt), fmt(u.id),
        ])}
      />
    </Panel>
  );
};

const ChildrenTab: React.FC = () => {
  const { loading, data, error, reload } = useLoad(() => adminApi.learners(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  if (loading) return <Loader2 className="animate-spin text-slate-500" />;
  if (error) return <ErrorLine message={error} />;
  const q = query.trim().toLowerCase();
  const rows: AdminLearnerRow[] = (data ?? []).filter(
    (r) => !q || [r.pseudonym, r.firstName, r.parentName, r.parentEmail, r.onboardingStatus].some((v) => (v ?? '').toLowerCase().includes(q))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name, parent, status"
          aria-label="Search children"
          className="min-h-[40px] w-full sm:w-80 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <button type="button" onClick={reload} className="inline-flex items-center gap-1 min-h-[40px] px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <Panel title={`${rows.length} child profile(s)`} note="Children are listed by pseudonymous code. Opening a child is audit-logged.">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['code', 'first name', 'grade', 'status', 'assessment', 'archived', 'parent', 'created', ''].map((c) => (
                  <th key={c} className="px-3 py-2 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.learnerId} className={`border-t border-slate-100 ${selected === r.learnerId ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-1.5 font-mono">{r.pseudonym}</td>
                  <td className="px-3 py-1.5">{fmt(r.firstName)}</td>
                  <td className="px-3 py-1.5">{fmt(r.grade)}</td>
                  <td className="px-3 py-1.5">{fmt(r.onboardingStatus)}</td>
                  <td className="px-3 py-1.5">{r.hasAssessment ? 'yes' : 'no'}</td>
                  <td className="px-3 py-1.5">{r.isArchived ? 'yes' : 'no'}</td>
                  <td className="px-3 py-1.5">{fmt(r.parentName)} <span className="text-slate-500">{fmt(r.parentEmail)}</span></td>
                  <td className="px-3 py-1.5">{date(r.createdAt)}</td>
                  <td className="px-3 py-1.5">
                    <button type="button" onClick={() => setSelected(r.learnerId)} className="font-semibold text-blue-700 hover:underline min-h-[32px]">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && <ChildDetail key={selected} learnerId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const AuditTab: React.FC = () => {
  const { loading, data, error } = useLoad(() => adminApi.auditLog(200), []);
  if (loading) return <Loader2 className="animate-spin text-slate-500" />;
  if (error) return <ErrorLine message={error} />;
  return (
    <Panel title="Admin access log (latest 200)" note="Includes this view.">
      <Table
        columns={['when', 'admin', 'action', 'target', 'details']}
        rows={(data ?? []).map((e) => [date(e.at), fmt(e.adminEmail), fmt(e.action), fmt(e.target), fmt(e.details)])}
      />
    </Panel>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-700" />
            <Link to="/admin" className="font-bold">MathQuest Admin</Link>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">read-only</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>{user?.email}</span>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`shrink-0 min-h-[44px] px-3 text-sm font-semibold border-b-2 ${
                tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
          Every view on this dashboard is recorded in the admin audit log. Data is read-only. Parent-reported ADHD information and
          SNAP-IV answers are research context only and are not diagnoses.
        </p>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'children' && <ChildrenTab />}
        {tab === 'parents' && <UsersTab role="parent" />}
        {tab === 'teachers' && <UsersTab role="teacher" />}
        {tab === 'admins' && <UsersTab role="admin" />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
};

export default AdminDashboardPage;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ChevronRight,
  ClipboardCheck,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  History,
  LayoutDashboard,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  Baby,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { adminApi, type AdminLearnerRow, type AdminOverview, type AdminUser } from '../services/adminApi';
import { AdminShell, ErrorLine, Initials, Loading, Panel, Pill, Stat, TONES, fmt, navTabClass, shortDate, useLoad, type Tone } from '../components/ui';
import { BarList, DonutChart, ProgressRing } from '../components/adminCharts';
import { useResearchAccess } from '../research/useResearchAccess';
import { ChildDetail } from './ChildDetail';
import { ROLE, auditAction, humanize, onboardingStatus } from './labels';

type Tab = 'overview' | 'children' | 'accounts' | 'audit';
const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'children', label: 'Children', icon: <Baby size={16} /> },
  { id: 'accounts', label: 'Accounts', icon: <Users size={16} /> },
  { id: 'audit', label: 'Audit log', icon: <History size={16} /> },
];

const GRADE_TONES: Tone[] = ['sky', 'teal', 'violet', 'orange', 'rose'];

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

const OverviewTab: React.FC<{ onOpenChildren: () => void }> = ({ onOpenChildren }) => {
  const overview = useLoad(() => adminApi.overview(), []);
  const learners = useLoad(() => adminApi.learners(), []);
  if (overview.loading) return <Loading label="Loading overview…" />;
  if (overview.error || !overview.data) return <ErrorLine message={overview.error} />;
  const o: AdminOverview = overview.data;
  const rows: AdminLearnerRow[] = learners.data ?? [];
  const active = rows.filter((r) => !r.isArchived);
  const status = o.learnersByOnboardingStatus;
  const completed = status.COMPLETED ?? 0;
  const grades = [1, 2, 3, 4, 5].map((g, i) => ({ label: `Grade ${g}`, value: active.filter((r) => r.grade === g).length, tone: GRADE_TONES[i] }));

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-100 via-violet-100 to-rose-100 border border-indigo-100 text-slate-800 shadow-sm p-5 sm:p-6">
        <p className="text-sm text-slate-600">MathQuest at a glance</p>
        <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
          {o.learnersTotal} children • {o.usersByRole.parent ?? 0} parents • {o.assessmentsTotal} onboarding assessments
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {completed} of {o.learnersTotal} children have finished onboarding.{' '}
          <button type="button" onClick={onOpenChildren} className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
            See all children
          </button>
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Children" value={o.learnersTotal} icon={<Baby size={16} />} tone="violet" hint={`${o.learnersArchived} archived`} />
        <Stat label="Parents" value={o.usersByRole.parent ?? 0} icon={<UserRound size={16} />} tone="sky" />
        <Stat label="Teachers" value={o.usersByRole.teacher ?? 0} icon={<GraduationCap size={16} />} tone="teal" />
        <Stat label="Onboarding assessments" value={o.assessmentsTotal} icon={<ClipboardCheck size={16} />} tone="emerald" />
        <Stat label="Gameplay events" value={o.gameplayEventsTotal} icon={<Gamepad2 size={16} />} tone="orange" hint="evidence sent from games" />
        <Stat label="Deletion requests" value={o.deletionRequestsTotal} icon={<Trash2 size={16} />} tone="rose" />
        <Stat label="Archived children" value={o.learnersArchived} icon={<Archive size={16} />} tone="slate" />
        <Stat label="Admins" value={o.usersByRole.admin ?? 0} icon={<ShieldCheck size={16} />} tone="indigo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Onboarding progress" icon={<ClipboardCheck size={18} />} tone="emerald" note="Where each child is in the onboarding journey.">
          <DonutChart
            ariaLabel="Children by onboarding status"
            centerLabel="children"
            segments={[
              { label: 'Completed', value: status.COMPLETED ?? 0, tone: 'emerald' },
              { label: 'In progress', value: status.IN_PROGRESS ?? 0, tone: 'amber' },
              { label: 'Not started', value: status.NOT_STARTED ?? 0, tone: 'slate' },
            ]}
          />
        </Panel>
        <Panel title="Children by grade" icon={<GraduationCap size={18} />} tone="violet" note="Active (not archived) children.">
          {learners.loading ? <Loading /> : learners.error ? <ErrorLine message={learners.error} /> : <BarList ariaLabel="Children by grade" items={grades} />}
        </Panel>
        <Panel title="Coverage" icon={<Users size={18} />} tone="sky" note="How far the onboarding evidence reaches.">
          <div className="space-y-4">
            <ProgressRing value={completed} total={o.learnersTotal} tone="emerald" label="Finished onboarding" />
            <ProgressRing
              value={rows.filter((r) => r.hasAssessment).length}
              total={rows.length}
              tone="indigo"
              label="Have maths evidence"
              sub={`${rows.filter((r) => r.hasAssessment).length} of ${rows.length} children have an onboarding assessment`}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Accounts by role" icon={<Users size={18} />} tone="indigo">
        <BarList
          ariaLabel="Accounts by role"
          items={Object.entries(ROLE).map(([role, l]) => ({ label: l.text, value: o.usersByRole[role] ?? 0, tone: l.tone }))}
        />
      </Panel>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Children                                                            */
/* ------------------------------------------------------------------ */

type ChildFilter = 'all' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'archived';

const ChildrenTab: React.FC = () => {
  const { loading, data, error, reload } = useLoad(() => adminApi.learners(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ChildFilter>('all');
  const [grade, setGrade] = useState<number | 'all'>('all');

  if (selected) return <ChildDetail key={selected} learnerId={selected} onClose={() => setSelected(null)} />;
  if (loading) return <Loading label="Loading children…" />;
  if (error) return <ErrorLine message={error} />;

  const all: AdminLearnerRow[] = data ?? [];
  const matchesFilter = (r: AdminLearnerRow, f: ChildFilter) =>
    f === 'all' ? true : f === 'archived' ? r.isArchived : !r.isArchived && r.onboardingStatus === f;
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      matchesFilter(r, filter) &&
      (grade === 'all' || r.grade === grade) &&
      (!q || [r.pseudonym, r.firstName, r.parentName, r.parentEmail].some((v) => (v ?? '').toLowerCase().includes(q)))
  );
  const filters: Array<{ id: ChildFilter; label: string; tone: Tone }> = [
    { id: 'all', label: 'All', tone: 'indigo' },
    { id: 'COMPLETED', label: 'Completed', tone: 'emerald' },
    { id: 'IN_PROGRESS', label: 'In progress', tone: 'amber' },
    { id: 'NOT_STARTED', label: 'Not started', tone: 'slate' },
    { id: 'archived', label: 'Archived', tone: 'rose' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code or parent"
              aria-label="Search children"
              className="w-full min-h-[42px] rounded-full border border-slate-300 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            aria-label="Filter by grade"
            className="min-h-[42px] rounded-full border border-slate-300 px-3 text-sm"
          >
            <option value="all">All grades</option>
            {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by onboarding status">
          {filters.map((f) => {
            const count = all.filter((r) => matchesFilter(r, f.id)).length;
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-xs font-semibold ${
                  on ? `${TONES[f.tone].solid} text-white border-transparent` : `${TONES[f.tone].soft} ${TONES[f.tone].text} ${TONES[f.tone].ring}`
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 tabular-nums ${on ? 'bg-white/25' : 'bg-white'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Info size={13} /> Children are shown by code. Opening a profile is recorded in the audit log.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No children match these filters.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const st = onboardingStatus(r.onboardingStatus);
            return (
              <li key={r.learnerId}>
                <button
                  type="button"
                  onClick={() => setSelected(r.learnerId)}
                  className={`group w-full text-left rounded-2xl border bg-white shadow-sm p-4 hover:shadow-md hover:border-indigo-300 transition ${
                    r.isArchived ? 'border-rose-200 opacity-80' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Initials name={r.firstName} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{fmt(r.firstName)}</p>
                      <p className="text-xs font-mono text-slate-500">{r.pseudonym}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 shrink-0" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Pill tone={GRADE_TONES[((r.grade ?? 1) - 1) % GRADE_TONES.length]}>Grade {fmt(r.grade)}</Pill>
                    <Pill tone={st.tone}>{st.text}</Pill>
                    <Pill tone={r.hasAssessment ? 'emerald' : 'slate'}>{r.hasAssessment ? 'Has maths evidence' : 'No assessment yet'}</Pill>
                    {r.isArchived && <Pill tone="rose">Archived</Pill>}
                  </div>
                  <p className="mt-3 text-xs text-slate-500 truncate">
                    Parent: <span className="text-slate-700">{fmt(r.parentName)}</span> • added {shortDate(r.createdAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

const AccountsTab: React.FC = () => {
  const [role, setRole] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [query, setQuery] = useState('');
  const { loading, data, error } = useLoad(() => adminApi.users(role), [role]);
  const q = query.trim().toLowerCase();
  const users: AdminUser[] = (data ?? []).filter((u) => !q || [u.fullName, u.email, u.username].some((v) => (v ?? '').toLowerCase().includes(q)));
  const maxChildren = Math.max(1, ...users.map((u) => u.childCount ?? 0));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-slate-100 p-1" role="group" aria-label="Account type">
          {(Object.keys(ROLE) as Array<'parent' | 'teacher' | 'admin'>).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={`min-h-[36px] px-4 rounded-full text-sm font-semibold ${role === r ? `${TONES[ROLE[r].tone].solid} text-white shadow-sm` : 'text-slate-600'}`}
            >
              {ROLE[r].text}
            </button>
          ))}
        </div>
        <label className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search accounts"
            className="w-full min-h-[42px] rounded-full border border-slate-300 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Info size={13} /> Passwords, password hashes and sessions are never shown.
      </p>
      {loading ? (
        <Loading label="Loading accounts…" />
      ) : error ? (
        <ErrorLine message={error} />
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No accounts found.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Initials name={u.fullName || u.email} />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{fmt(u.fullName)}</p>
                  <p className="text-xs text-slate-500 truncate">{fmt(u.email)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Pill tone={ROLE[role].tone}>{humanize(role)}</Pill>
                {u.username && <Pill>@{u.username}</Pill>}
                <span className="text-xs text-slate-500">joined {shortDate(u.createdAt)}</span>
              </div>
              {role === 'parent' && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{u.childCount ?? 0}</span> {u.childCount === 1 ? 'child' : 'children'}
                  </p>
                  <span className="block h-2 rounded-full bg-slate-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-sky-500" style={{ width: `${((u.childCount ?? 0) / maxChildren) * 100}%` }} />
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

const AuditTab: React.FC = () => {
  const { loading, data, error } = useLoad(() => adminApi.auditLog(200), []);
  if (loading) return <Loading label="Loading audit log…" />;
  if (error) return <ErrorLine message={error} />;
  const entries = data ?? [];
  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    const day = typeof e.at === 'string' ? new Date(e.at).toDateString() : 'Unknown date';
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(String(e.action), (counts.get(String(e.action)) ?? 0) + 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Panel title="Admin activity" icon={<History size={18} />} tone="violet" note="Latest 200 views, newest first. This view is included.">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded.</p>
        ) : (
          <div className="space-y-4">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{day}</p>
                <ol className="relative border-l-2 border-slate-200 ml-2 space-y-2">
                  {list.map((e, i) => {
                    const a = auditAction(e.action);
                    return (
                      <li key={i} className="ml-4">
                        <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full border-2 border-white ${TONES[a.tone].solid}`} />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-semibold text-slate-900">{a.text}</span>
                          {e.target ? <Pill tone={a.tone}>{fmt(e.target)}</Pill> : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          {typeof e.at === 'string' ? new Date(e.at).toLocaleTimeString() : '—'} • {fmt(e.adminEmail)}
                          {e.details ? <> • {fmt(e.details)}</> : null}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="What was viewed" icon={<LayoutDashboard size={18} />} tone="indigo">
        <BarList
          stacked
          ariaLabel="Views by type"
          items={[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([action, n]) => ({ label: auditAction(action).text, value: n, tone: auditAction(action).tone }))}
        />
      </Panel>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const AdminDashboardPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  // The research link is shown only when the server confirms access (admin role + researchAnalyticsAccess)
  const researchAccess = useResearchAccess();

  return (
    <AdminShell
      nav={
        <>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined} className={navTabClass(tab === t.id)}>
              {t.icon}
              {t.label}
            </button>
          ))}
          {researchAccess === 'granted' && (
            <Link to="/admin/research" className={navTabClass(false)}>
              <FlaskConical size={16} /> Research &amp; Model Analytics
            </Link>
          )}
        </>
      }
    >
      <p className="flex items-start gap-2 text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-2xl px-3 py-2">
        <Info size={14} className="shrink-0 mt-px text-indigo-500" />
        Every view on this dashboard is recorded in the admin audit log, and nothing can be changed here. Parent-reported ADHD information and
        SNAP-IV answers are research context only and are not diagnoses.
      </p>
      {tab === 'overview' && <OverviewTab onOpenChildren={() => setTab('children')} />}
      {tab === 'children' && <ChildrenTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'audit' && <AuditTab />}
    </AdminShell>
  );
};

export default AdminDashboardPage;

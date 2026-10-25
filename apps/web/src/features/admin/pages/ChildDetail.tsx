import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Gamepad2,
  HandHelping,
  Lightbulb,
  ListChecks,
  MousePointerClick,
  Palette,
  RefreshCcw,
  Repeat,
  Shapes,
  ShieldAlert,
  Sparkles,
  Undo2,
  User,
  XCircle,
} from 'lucide-react';
import { adminApi, type AdminLearnerDetail, type AdminResult, type Json } from '../services/adminApi';
import {
  Disclosure,
  ErrorLine,
  JsonBlock,
  Loading,
  Panel,
  Pill,
  Stat,
  TONES,
  arr,
  fmt,
  obj,
  shortDate,
  useLoad,
  type Tone,
} from '../components/ui';
import { BarList, RangeBar, StackedBar } from '../components/adminCharts';
import { AVATAR_OPTIONS } from '../../learner-profile/types';
import { WORLDS } from '../../learner-profile/components/onboarding/journey/themes';
import {
  EXCLUSION_REASON,
  RESPONSE_STATUS,
  SUPPORT_LEVEL,
  humanize,
  imlrStatus,
  itemRole,
  onboardingStatus,
  representation,
  skillLevel,
} from './labels';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

const ProfileHeader: React.FC<{ d: AdminLearnerDetail; onClose: () => void }> = ({ d, onClose }) => {
  const l = d.learner;
  const childAvatar = typeof l.childAvatarId === 'string' ? l.childAvatarId : null;
  const avatar = AVATAR_OPTIONS.find((a) => a.id === (childAvatar ?? l.avatarId)) ?? AVATAR_OPTIONS[0];
  const status = onboardingStatus(l.onboardingStatus);
  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-100 via-violet-100 to-rose-100 border border-indigo-100 text-slate-800 shadow-sm p-5 sm:p-6">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full bg-white/80 border border-indigo-100 hover:bg-white text-xs font-semibold text-slate-700"
      >
        <ArrowLeft size={14} /> Back to all children
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-4xl shadow" aria-hidden="true">
          {avatar.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold leading-tight text-slate-900">{fmt(l.preferredName || l.firstName)}</h2>
          <p className="text-sm text-slate-600">
            Code <span className="font-mono font-semibold">{d.pseudonym}</span> • Parent {fmt(d.parent?.fullName)}{' '}
            <span className="text-slate-500">({fmt(d.parent?.email)})</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/80 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Grade {fmt(l.grade)}</span>
            <span className="rounded-full bg-white/80 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Age {fmt(l.age)}</span>
            <span className="rounded-full bg-white/80 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{fmt(l.preferredLanguage)}</span>
            <span className="rounded-full bg-white border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-slate-900">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${TONES[status.tone].solid}`} />
              Onboarding: {status.text}
            </span>
            {l.isArchived ? <span className="rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">Archived</span> : null}
            <span className="rounded-full bg-white/80 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {avatar.name} {childAvatar ? '(chosen by the child)' : '(chosen by the parent)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Maths skills (ELP-X)                                                */
/* ------------------------------------------------------------------ */

const SkillCard: React.FC<{ s: Json }> = ({ s }) => {
  const level = skillLevel(s.provisionalSkillLevel);
  const ci = obj(s.credibleInterval);
  const n = num(s.distinctQuestionsAssessed);
  const c = num(s.correctFirstResponses);
  const sufficient = s.isEvidenceSufficient === true;
  const estimate = num(s.estimatedProficiencyPercentage);
  return (
    <article className={`rounded-2xl border ${TONES[level.tone].ring} ${TONES[level.tone].soft} p-4 space-y-3 min-w-0`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900">{fmt(s.skillName ?? humanize(String(s.skillId)))}</h4>
          {typeof s.skillNameSi === 'string' && <p className="text-xs text-slate-600">{s.skillNameSi}</p>}
        </div>
        <Pill tone={level.tone} title={level.help}>{level.text}</Pill>
      </div>
      {sufficient ? (
        <>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {Math.round(estimate)}%<span className="ml-1 text-xs font-semibold text-slate-500">estimated</span>
          </p>
          <RangeBar
            estimate={estimate}
            lower={num(ci.lower) * 100}
            upper={num(ci.upper) * 100}
            tone={level.tone}
            label={fmt(s.skillName)}
          />
          <p className="text-xs text-slate-600">
            Likely between <strong>{Math.round(num(ci.lower) * 100)}%</strong> and <strong>{Math.round(num(ci.upper) * 100)}%</strong>. A
            wide range means more evidence is needed.
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-700">
          Needs at least 3 questions answered without help before an estimate is shown.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="indigo" icon={<ListChecks size={12} />}>{n} answered alone (min 3)</Pill>
        <Pill tone={c === n && n > 0 ? 'emerald' : 'sky'} icon={<CheckCircle2 size={12} />}>{c} right first time</Pill>
      </div>
    </article>
  );
};

const SkillsPanel: React.FC<{ elpx: Json }> = ({ elpx }) => {
  if (elpx.unavailable) {
    return (
      <Panel title="Maths skills" icon={<Brain size={18} />} tone="indigo">
        <p className="text-sm text-slate-600">{fmt(elpx.unavailable)}</p>
      </Panel>
    );
  }
  const skills = arr(elpx.skillEstimates);
  const recs = arr(elpx.structuredRecommendations);
  return (
    <>
      <Panel
        title="Maths skills"
        icon={<Brain size={18} />}
        tone="indigo"
        note="Estimated from questions answered alone (ELP-X). Guided answers are never counted. Provisional, not a grade."
      >
        {skills.length === 0 ? (
          <p className="text-sm text-slate-600">No skills assessed yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{skills.map((s, i) => <SkillCard key={i} s={s} />)}</div>
        )}
      </Panel>
      <Panel title="Suggested support" icon={<Lightbulb size={18} />} tone="amber" note="Teaching strategies chosen from the skill estimates and the parent's preferences (ELP-X-REC).">
        {recs.length === 0 ? (
          <p className="text-sm text-slate-600">No suggestions yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {recs.map((r, i) => (
              <li key={i} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <p className="text-sm font-bold text-slate-900">{fmt(r.titleEn ?? humanize(String(r.strategyCode)))}</p>
                </div>
                {typeof r.descriptionEn === 'string' && <p className="text-xs text-slate-700">{r.descriptionEn}</p>}
                {typeof r.skillId === 'string' && <Pill tone="indigo">{humanize(r.skillId)}</Pill>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Onboarding activities                                               */
/* ------------------------------------------------------------------ */

const ItemRow: React.FC<{ it: Json }> = ({ it }) => {
  const role = itemRole(it.probeRole);
  const rep = it.representation ? representation(it.representation) : null;
  const correct = it.correctFirstResponse;
  const support = arr(it.supportEvents);
  const revisions = arr(it.revisionEvents).length;
  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="mt-0.5 shrink-0">
        {correct === true ? (
          <CheckCircle2 size={20} className="text-emerald-600" aria-label="Right first time" />
        ) : correct === false ? (
          <XCircle size={20} className="text-rose-500" aria-label="Not right first time" />
        ) : (
          <span className="inline-block w-5 h-5 rounded-full border-2 border-slate-300" aria-label="Not scored" />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-slate-900">{humanize(String(it.questionId))}</p>
          {typeof it.skillName === 'string' && <span className="text-xs text-slate-500">{it.skillName}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={role.tone} title={role.help}>{role.text}</Pill>
          {rep && <Pill tone={rep.tone}>{rep.text}</Pill>}
          {it.includedInProficiencyEstimate === true && <Pill tone="emerald">Counted</Pill>}
          {support.length > 0 && (
            <Pill tone="amber" icon={<HandHelping size={12} />}>
              {support.map((s) => SUPPORT_LEVEL[num(s.level)] ?? `Level ${fmt(s.level)}`).join(' → ')}
              {it.supportBeforeFirstResponse === true ? ' (before answering)' : ''}
            </Pill>
          )}
          {revisions > 0 && <Pill tone="violet" icon={<Undo2 size={12} />}>Changed answer ×{revisions}</Pill>}
        </div>
        <p className="text-xs text-slate-500">
          Answer <span className="font-mono text-slate-700">{fmt(it.firstConfirmedResponse ?? it.userAnswer)}</span>
          {it.correctAnswer !== undefined && (
            <>
              {' '}• expected <span className="font-mono text-slate-700">{fmt(it.correctAnswer)}</span>
            </>
          )}
          {typeof it.responseTimeSeconds === 'number' && <> • {Math.round(it.responseTimeSeconds)} s</>}
        </p>
      </div>
    </li>
  );
};

const LearningSequence: React.FC<{ imlr: Json }> = ({ imlr }) => {
  const status = imlrStatus(imlr.status);
  const steps: Array<{ title: string; body: string; tone: Tone; icon: React.ReactNode }> = [
    {
      title: 'First try',
      body: imlr.preProbeCorrect ? 'Right without help' : 'Not right yet',
      tone: imlr.preProbeCorrect ? 'emerald' : 'amber',
      icon: imlr.preProbeCorrect ? <CheckCircle2 size={18} /> : <RefreshCcw size={18} />,
    },
    {
      title: 'Support',
      body: arr(imlr.supportDelivered).length ? arr(imlr.supportDelivered).map((s) => humanize(String(s))).join(', ') : 'Not needed',
      tone: 'sky',
      icon: <HandHelping size={18} />,
    },
    {
      title: 'New question',
      body: imlr.unassistedTransferCorrect ? 'Right without help' : 'Not right yet',
      tone: imlr.unassistedTransferCorrect ? 'emerald' : 'amber',
      icon: imlr.unassistedTransferCorrect ? <CheckCircle2 size={18} /> : <RefreshCcw size={18} />,
    },
  ];
  return (
    <div className="space-y-3">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className={`relative rounded-2xl border ${TONES[s.tone].ring} ${TONES[s.tone].soft} p-3`}>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${TONES[s.tone].text}`}>
              {s.icon} Step {i + 1}: {s.title}
            </span>
            <p className="mt-1 text-sm text-slate-800">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={status.tone}>{status.text}</Pill>
        <span className="text-xs text-slate-500">
          Concept: {humanize(String(imlr.conceptId ?? '—'))}. {fmt(imlr.uncertaintyNote)}
        </span>
      </div>
    </div>
  );
};

const DimensionCards: React.FC<{ dims: Json }> = ({ dims }) => {
  const ru = obj(dims.representationUnderstanding);
  const by = obj(ru.byRepresentation);
  const sc = obj(dims.selfCorrection);
  const ic = obj(dims.instructionComprehension);
  const cal = obj(ic.calibration);
  const ia = obj(dims.interactionAccessibility);
  const card = (title: string, code: string, tone: Tone, icon: React.ReactNode, body: React.ReactNode) => (
    <article className={`rounded-2xl border ${TONES[tone].ring} bg-white p-4 space-y-2 min-w-0`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${TONES[tone].soft} ${TONES[tone].text}`}>{icon}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-500">{code}</p>
        </div>
      </div>
      {body}
    </article>
  );
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {card('Different forms of the same idea', 'Representation understanding (RU)', 'violet', <Shapes size={16} />, (
        <ul className="space-y-1.5">
          {(['concrete', 'pictorial', 'symbolic'] as const).map((r) => {
            const v = obj(by[r]);
            const items = num(v.independentItems);
            const right = num(v.correctFirstResponses);
            return (
              <li key={r} className="grid grid-cols-[5rem_1fr_auto] items-center gap-2 text-sm">
                <span className="text-slate-700">{representation(r).text}</span>
                <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <span className={`block h-full ${TONES[representation(r).tone].solid}`} style={{ width: items ? `${(right / items) * 100}%` : '0%' }} />
                </span>
                <span className="text-xs tabular-nums text-slate-700">{items ? `${right} of ${items} right` : 'none'}</span>
              </li>
            );
          })}
        </ul>
      ))}
      {card('Changing answers before confirming', 'Self-correction (SC)', 'teal', <Undo2 size={16} />, (
        <>
          {fact('Questions where the answer was changed', `${num(sc.itemsWithRevisions)} of ${num(sc.itemsObserved)}`)}
          {fact('Total changes', num(sc.totalRevisions))}
          {fact('…then confirmed a right answer', num(sc.revisedItemsFirstConfirmedCorrect))}
        </>
      ))}
      {card('Following instructions', 'Instruction comprehension (IC)', 'sky', <BookOpen size={16} />, (
        <>
          {fact(
            'Instruction check',
            cal.presented ? (cal.firstAttemptOnTarget === true ? 'Right first time' : cal.firstAttemptOnTarget === false ? `Took ${fmt(cal.attempts)} tries` : 'Done') : 'Not shown'
          )}
          {fact('Questions where the instruction was replayed', `${num(ic.itemsWithInstructionReplay)} of ${num(ic.itemsObserved)}`)}
          {fact('Asked for help before answering', num(ic.helpRequestedBeforeFirstResponse))}
        </>
      ))}
      {card('How the child interacted', 'Interaction & accessibility (IA)', 'orange', <MousePointerClick size={16} />, (
        <>
          {fact('Answered / shown', `${num(ia.itemsAnswered)} / ${num(ia.itemsPresented)}`)}
          <BarList
            ariaLabel="Input methods"
            items={Object.entries(obj(ia.inputMethods)).map(([k, v], i) => ({
              label: humanize(k),
              value: num(v),
              tone: (['indigo', 'teal', 'orange'] as Tone[])[i % 3],
            }))}
          />
          {fact('Missed drags', ia.missedDrops == null ? 'not measured' : num(ia.missedDrops))}
          {fact('Left the page', num(ia.pageHiddenEvents))}
        </>
      ))}
    </div>
  );
};

const AssessmentCard: React.FC<{ a: Json; latest: boolean }> = ({ a, latest }) => {
  const evaluated = arr(a.evaluatedItems);
  const excluded = arr(a.excludedItems);
  const counted = evaluated.filter((i) => i.includedInProficiencyEstimate === true);
  const prefs = obj(a.childPreferences);
  const avatar = AVATAR_OPTIONS.find((x) => x.id === prefs.avatarId);
  const world = WORLDS.find((w) => w.id === prefs.theme);
  const imlr = a.imlrSummary ? obj(a.imlrSummary) : null;
  const dims = a.dimensionSummaries ? obj(a.dimensionSummaries) : null;

  const body = (
    <div className="space-y-4">
      <StackedBar
        ariaLabel="Question outcomes"
        segments={[
          { label: 'Answered alone, right first time', value: counted.filter((i) => i.correctFirstResponse === true).length, tone: 'emerald' },
          { label: 'Answered alone, not right', value: counted.filter((i) => i.correctFirstResponse !== true).length, tone: 'rose' },
          { label: 'Guided or helped (not counted)', value: evaluated.length - counted.length, tone: 'amber' },
          { label: 'Not scored', value: excluded.length, tone: 'slate' },
        ]}
      />

      {Object.keys(prefs).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-fuchsia-50 border border-fuchsia-200 px-3 py-2 text-sm">
          <Palette size={16} className="text-fuchsia-700" />
          <span className="font-semibold text-fuchsia-900">The child chose:</span>
          {avatar && <span>{avatar.icon} {avatar.name}</span>}
          {world && <span>• {world.icon} {humanize(world.id)}</span>}
          {typeof prefs.soundMode === 'string' && <span>• sound: {prefs.soundMode}</span>}
        </div>
      )}

      <div>
        <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Questions ({evaluated.length})</h5>
        <ul className="space-y-2">{evaluated.map((it, i) => <ItemRow key={i} it={it} />)}</ul>
      </div>

      {excluded.length > 0 && (
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Not scored ({excluded.length})</h5>
          <ul className="space-y-1">
            {excluded.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{humanize(String(it.questionId))}</span>
                <Pill>{RESPONSE_STATUS[String(it.responseStatus)] ?? humanize(String(it.responseStatus))}</Pill>
                <span>{EXCLUSION_REASON[String(it.exclusionReason)] ?? humanize(String(it.exclusionReason ?? ''))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {imlr && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">Learn and try again (IMLR, provisional)</h5>
          <LearningSequence imlr={imlr} />
        </div>
      )}

      {dims && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">Other things we noticed</h5>
            <Pill tone="amber">Descriptive counts • pending educator review</Pill>
          </div>
          <DimensionCards dims={dims} />
          <p className="text-[11px] text-slate-500">
            Counts from one short session, with no thresholds or labels. They are not a diagnosis and not an attention measure.
          </p>
        </div>
      )}

      <JsonBlock label="Full assessment record (technical)" value={a} />
    </div>
  );

  const title = `Onboarding activities • ${shortDate(a.completedAt)} • Grade ${fmt(a.grade)}`;
  return latest ? (
    <Panel title={title} icon={<ClipboardList size={18} />} tone="teal" note={`${counted.length} of ${evaluated.length} questions counted towards the skill estimates.`}>
      {body}
    </Panel>
  ) : (
    <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700">Earlier: {title}</summary>
      <div className="px-4 pb-4">{body}</div>
    </details>
  );
};

/* ------------------------------------------------------------------ */
/* Parent answers, sensitive reports, technical details                */
/* ------------------------------------------------------------------ */

const KeyValues: React.FC<{ data: Json }> = ({ data }) => {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object');
  if (entries.length === 0) return <p className="text-sm text-slate-500">Not answered.</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 pb-1 text-sm">
          <dt className="text-slate-600">{humanize(k)}</dt>
          <dd className="font-semibold text-slate-900 text-right">{humanize(String(v))}</dd>
        </div>
      ))}
    </dl>
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

export const ChildDetail: React.FC<{ learnerId: string; onClose: () => void }> = ({ learnerId, onClose }) => {
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const { loading, data, error } = useLoad(() => adminApi.learner(learnerId, includeSensitive), [learnerId, includeSensitive]);

  if (loading) return <Loading label="Loading child profile…" />;
  if (error || !data) return <ErrorLine message={error ?? 'Not found.'} />;

  const d: AdminLearnerDetail = data;
  const l = d.learner;
  const elpx = obj(d.elpxProfile);
  const sens = d.sensitiveParentReports;
  const q = d.questionnaires;
  const skills = arr(elpx.skillEstimates);
  const latest = d.assessments[0];
  const evaluated = latest ? arr(latest.evaluatedItems) : [];
  const counted = evaluated.filter((i) => i.includedInProficiencyEstimate === true);

  return (
    <div className="space-y-4">
      <ProfileHeader d={d} onClose={onClose} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Skills with enough evidence" value={`${skills.filter((s) => s.isEvidenceSufficient === true).length} / ${skills.length}`} icon={<Brain size={16} />} tone="indigo" />
        <Stat label="Answered alone" value={counted.length} icon={<User size={16} />} tone="violet" hint="in the latest onboarding" />
        <Stat
          label="Right first time"
          value={counted.filter((i) => i.correctFirstResponse === true).length}
          icon={<CheckCircle2 size={16} />}
          tone="emerald"
          hint={`of ${counted.length} answered alone`}
        />
        <Stat label="Gameplay events" value={d.gameplayEvents.total} icon={<Gamepad2 size={16} />} tone="orange" hint="sent to the profile so far" />
      </div>

      <SkillsPanel elpx={elpx} />

      {d.assessments.length === 0 ? (
        <Panel title="Onboarding activities" icon={<ClipboardList size={18} />} tone="teal">
          <p className="text-sm text-slate-600">The child has not finished the onboarding activities yet.</p>
        </Panel>
      ) : (
        d.assessments.map((a, i) => <AssessmentCard key={i} a={a} latest={i === 0} />)
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Parent's learning preferences" icon={<Repeat size={18} />} tone="sky">
          <KeyValues data={obj(q.learningPreferences)} />
        </Panel>
        <Panel title="Learning environment" icon={<User size={18} />} tone="teal">
          <KeyValues data={obj(q.socialContext)} />
        </Panel>
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rose-100 text-rose-700">
            <ShieldAlert size={18} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Sensitive parent reports (ADHD information, SNAP-IV)</h3>
            <p className="text-xs text-rose-900/80">
              Parent-reported, unverified and not a diagnosis. Never used for maths estimates. Opening them is recorded separately in the
              audit log.
            </p>
          </div>
        </div>
        {!sens.included ? (
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={sens.available.adhdInformation ? 'rose' : 'slate'}>ADHD information: {sens.available.adhdInformation ? 'given' : 'none'}</Pill>
            <Pill tone={sens.available.snapIv ? 'rose' : 'slate'}>SNAP-IV: {sens.available.snapIv ? 'given' : 'none'}</Pill>
            {Object.values(sens.available).some(Boolean) && (
              <button
                type="button"
                onClick={() => setIncludeSensitive(true)}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-rose-300 bg-white text-xs font-semibold text-rose-800 hover:bg-rose-100"
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
            <button
              type="button"
              onClick={() => setIncludeSensitive(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 hover:underline"
            >
              <EyeOff size={14} /> Hide sensitive details
            </button>
          </div>
        )}
      </section>

      <Disclosure title="Technical details" note="Raw records, gameplay events, other components' telemetry and deletion requests.">
        <JsonBlock label="Current ELP-X profile" value={elpx} />
        <JsonBlock label={`Gameplay evidence events (${d.gameplayEvents.total}; most recent ${d.gameplayEvents.recent.length})`} value={d.gameplayEvents.recent} />
        <JsonBlock label="Onboarding progress" value={d.onboardingProgress} />
        <JsonBlock label="Parent questionnaires" value={d.questionnaires} />
        <JsonBlock label={`Deletion requests (${d.deletionRequests.length})`} value={d.deletionRequests} />
        <JsonBlock label="Learner record" value={l} />
        <p className="text-xs font-semibold text-slate-600 pt-2">Other components (read-only; not covered by the admin audit log)</p>
        <OtherComponents parentId={String(l.parentId ?? '')} learnerId={String(l.learnerId ?? learnerId)} />
      </Disclosure>
    </div>
  );
};

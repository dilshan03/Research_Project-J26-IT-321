
import { useMemo, useState } from 'react';

// ==========================================
// TYPES
// ==========================================

type BehaviourKey =
  | 'distraction'
  | 'hesitation'
  | 'impulsive'
  | 'inactivity'
  | 'fast'
  | 'repeated_wrong'
  | 'answer_changes';

export type BehaviourSession = {
  sessionId: string;
  endedAt: string;
  cameraUsed: boolean;
  eventCounts: Partial<Record<BehaviourKey, number>>;
};

type Props = {
  learnerName: string;
  sessions: BehaviourSession[];
  onBack?: () => void;
};

// ==========================================
// STUDENT DETAILS - DEMO
// ==========================================

const demoStudent = {
  name: 'සහන්',
  age: 8,
  grade: 3,
};

// ==========================================
// HARDCODED GAMEPLAY SESSIONS
// ==========================================

const demoSessions: BehaviourSession[] = [
  {
    sessionId: 'MQ-SAHAN-101',
    endedAt: '2026-10-19T16:35:00',
    cameraUsed: true,
    eventCounts: {
      distraction: 2,
      hesitation: 3,
      impulsive: 1,
      inactivity: 1,
      fast: 4,
      repeated_wrong: 2,
      answer_changes: 3,
    },
  },
  {
    sessionId: 'MQ-SAHAN-102',
    endedAt: '2026-10-18T17:20:00',
    cameraUsed: false,
    eventCounts: {
      hesitation: 4,
      impulsive: 2,
      inactivity: 2,
      fast: 3,
      repeated_wrong: 3,
      answer_changes: 2,
    },
  },
  {
    sessionId: 'MQ-SAHAN-103',
    endedAt: '2026-10-17T15:45:00',
    cameraUsed: true,
    eventCounts: {
      distraction: 4,
      hesitation: 5,
      impulsive: 2,
      inactivity: 3,
      fast: 2,
      repeated_wrong: 4,
      answer_changes: 5,
    },
  },
  {
    sessionId: 'MQ-SAHAN-104',
    endedAt: '2026-10-15T16:10:00',
    cameraUsed: true,
    eventCounts: {
      distraction: 3,
      hesitation: 2,
      impulsive: 1,
      inactivity: 1,
      fast: 5,
      repeated_wrong: 1,
      answer_changes: 2,
    },
  },
  {
    sessionId: 'MQ-SAHAN-105',
    endedAt: '2026-10-13T17:05:00',
    cameraUsed: false,
    eventCounts: {
      hesitation: 3,
      impulsive: 1,
      inactivity: 2,
      fast: 4,
      repeated_wrong: 2,
      answer_changes: 3,
    },
  },
  {
    sessionId: 'MQ-SAHAN-106',
    endedAt: '2026-10-11T15:30:00',
    cameraUsed: true,
    eventCounts: {
      distraction: 5,
      hesitation: 4,
      impulsive: 3,
      inactivity: 3,
      fast: 2,
      repeated_wrong: 4,
      answer_changes: 4,
    },
  },
];

// ==========================================
// BEHAVIOUR LABELS
// ==========================================

const behaviourLabels: Record<BehaviourKey, string> = {
  distraction: 'අවධානය වෙනතකට යොමුවීම',
  hesitation: 'පිළිතුරු දීමට පැකිලීම',
  impulsive: 'හදිසි ප්‍රතිචාර',
  inactivity: 'දිගු විරාම',
  fast: 'ඉතා වේගවත් පිළිතුරු',
  repeated_wrong: 'නැවත නැවත වැරදි පිළිතුරු',
  answer_changes: 'පිළිතුරු වෙනස් කිරීම',
};

// ==========================================
// BEHAVIOUR EXPLANATIONS
// ==========================================

const behaviourDescriptions: Record<BehaviourKey, string> = {
  distraction:
    'ක්‍රීඩාව අතරතුර හිස වෙනත් දිශාවකට යොමු වූ බවට කැමරාවෙන් ලැබුණු අත්හදා බැලීමේ සංඥා. මෙය අවධානය අඩුවීමක් තහවුරු නොකරයි.',

  hesitation:
    'ප්‍රශ්නයකට පිළිතුරක් ලබාදීමට සාමාන්‍යයට වඩා වැඩි කාලයක් ගතවූ අවස්ථා.',

  impulsive:
    'ප්‍රශ්නය සම්පූර්ණයෙන් සලකා බැලීමට පෙර ඉතා ඉක්මනින් වැරදි පිළිතුරු ලබාදුන් රටා.',

  inactivity:
    'ක්‍රීඩාව සමඟ අන්තර්ක්‍රියා නොකර යම් කාලයක් ගතවූ අවස්ථා.',

  fast:
    'ප්‍රශ්නයකට ඉතා කෙටි කාලයකින් පිළිතුරු ලබාදුන් අවස්ථා.',

  repeated_wrong:
    'අඛණ්ඩව වැරදි පිළිතුරු ලබාදුන් අවස්ථා.',

  answer_changes:
    'පිළිතුර අවසන් කිරීමට පෙර තෝරාගත් පිළිතුර වෙනස් කළ අවස්ථා.',
};

const behaviourKeys = Object.keys(
  behaviourLabels
) as BehaviourKey[];

// ==========================================
// HELPERS
// ==========================================

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const months = [
    'ජනවාරි', 'පෙබරවාරි', 'මාර්තු',
    'අප්‍රේල්', 'මැයි', 'ජූනි',
    'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්',
    'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්',
  ];

  return `${date.getFullYear()} ${months[date.getMonth()]} ${date.getDate()}`;
}

function countSessionEvents(session: BehaviourSession) {
  return behaviourKeys.reduce(
    (total, key) =>
      total + (session.eventCounts[key] ?? 0),
    0
  );
}

// ==========================================
// SUMMARY CARD
// ==========================================

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-indigo-700">
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================


// Responsive SVG line chart: no additional charting dependency required.
function TrendChart({ points, color = '#0f766e', unit = '%' }: {
  points: { label: string; value: number | null }[];
  color?: string;
  unit?: string;
}) {
  const valid = points.filter((p): p is { label: string; value: number } => p.value !== null && Number.isFinite(p.value));
  if (!valid.length) return <p className="py-10 text-center text-sm text-slate-500">දත්ත නොමැත</p>;
  const w = 600, h = 200, left = 42, right = 15, top = 18, bottom = 42;
  const max = Math.max(1, ...valid.map(p => p.value));
  const min = Math.min(0, ...valid.map(p => p.value));
  const range = Math.max(1, max - min);
  const x = (i: number) => left + (valid.length === 1 ? (w-left-right)/2 : i * (w-left-right)/(valid.length-1));
  const y = (v: number) => top + (max-v)*(h-top-bottom)/range;
  return <div className="w-full overflow-x-auto"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="සැසි අනුව දත්ත ප්‍රවණතාව" className="w-full min-w-[380px]">
    {[0,1,2,3,4].map(i => { const v=min+range*i/4; const yy=y(v); return <g key={i}><line x1={left} x2={w-right} y1={yy} y2={yy} stroke="#e2e8f0"/><text x={left-7} y={yy+4} fontSize="11" textAnchor="end" fill="#64748b">{v.toFixed(v%1?1:0)}</text></g>; })}
    <polyline fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={valid.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')}/>
    {valid.map((p,i)=><g key={`${p.label}-${i}`}><circle cx={x(i)} cy={y(p.value)} r="5" fill={color}><title>{`${p.label}: ${p.value.toFixed(1)}${unit}`}</title></circle><text x={x(i)} y={h-17} fontSize="11" textAnchor="middle" fill="#475569">{p.label}</text></g>)}
  </svg></div>;
}

function ChartPanel({ title, subtitle, children }: {title:string; subtitle?:string; children: import('react').ReactNode}) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-800">{title}</h2>{subtitle && <p className="mt-1 mb-4 text-sm text-slate-500">{subtitle}</p>}{children}</section>;
}

export default function BehaviourDashboard({
  sessions,
  onBack,
}: Props) {
  const [selectedSession, setSelectedSession] =
    useState('all');

  const [expandedBehaviour, setExpandedBehaviour] =
    useState<BehaviourKey | null>(null);

  // Use real sessions when provided.
  // Otherwise display hardcoded demo sessions.
  const displaySessions =
    sessions.length > 0 ? sessions : demoSessions;

  const orderedSessions = useMemo(
    () =>
      [...displaySessions].sort((a, b) =>
        b.endedAt.localeCompare(a.endedAt)
      ),
    [displaySessions]
  );

  const filteredSessions =
    selectedSession === 'all'
      ? orderedSessions
      : orderedSessions.filter(
          (session) =>
            session.sessionId === selectedSession
        );

  // Calculate behaviour counts
  const behaviourTotals = Object.fromEntries(
    behaviourKeys.map((key) => [
      key,
      filteredSessions.reduce(
        (total, session) =>
          total + (session.eventCounts[key] ?? 0),
        0
      ),
    ])
  ) as Record<BehaviourKey, number>;

  const totalSignals = Object.values(
    behaviourTotals
  ).reduce(
    (total, count) => total + count,
    0
  );

  const detectedTypes = behaviourKeys.filter(
    (key) => behaviourTotals[key] > 0
  ).length;

  const maxCount = Math.max(
    1,
    ...Object.values(behaviourTotals)
  );

  const cameraSessions = filteredSessions.filter(
    (session) => session.cameraUsed
  ).length;

  // ========================================
  // UI
  // ========================================

  return (
    <main
      lang="si"
      className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800"
    >
      <div className="mx-auto max-w-6xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              MathQuest · දෙමාපිය පුවරුව
            </p>

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              හැසිරීම් විශ්ලේෂණය
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              ක්‍රීඩා අතරතුර ශිෂ්‍යයාගේ
              හැසිරීම් සංඥා නිරීක්ෂණය
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
            >
              ආපසු
            </button>
          )}
        </header>

        {sessions.length === 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">නිරූපණ දත්ත: මෙහි පෙන්වන්නේ සැබෑ ශිෂ්‍ය දත්ත නොව අත්හදා බැලීමේ සැසි වේ.</p>}

        {/* STUDENT INFORMATION */}

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="mb-4 text-lg font-bold text-indigo-900">
            ශිෂ්‍ය තොරතුරු
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                ශිෂ්‍යයාගේ නම
              </p>

              <p className="mt-1 text-lg font-semibold">
                {demoStudent.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                වයස
              </p>

              <p className="mt-1 text-lg font-semibold">
                අවුරුදු {demoStudent.age}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                ශ්‍රේණිය
              </p>

              <p className="mt-1 text-lg font-semibold">
                {demoStudent.grade} ශ්‍රේණිය
              </p>
            </div>
          </div>
        </section>

        

        {/* IMPORTANT NOTE */}

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-7 text-amber-950">
            මෙහි දැක්වෙන්නේ ක්‍රීඩා අතරතුර
            වාර්තා වූ අත්හදා බැලීමේ
            හැසිරීම් සංඥා පමණි.
            මේවා දරුවාගේ අවධානය,
            හැඟීම් හෝ වෛද්‍ය තත්ත්වය
            පිළිබඳ තහවුරු කළ නිගමන නොවේ.
          </p>
        </section>

        {/* SESSION FILTER */}

        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label
              htmlFor="behaviour-session"
              className="mb-2 block text-sm font-semibold"
            >
              ක්‍රීඩා සැසිය තෝරන්න
            </label>

            <select
              id="behaviour-session"
              value={selectedSession}
              onChange={(event) =>
                setSelectedSession(event.target.value)
              }
              className="min-w-64 rounded-xl border border-slate-300 bg-white p-3"
            >
              <option value="all">
                සියලුම සැසි
              </option>

              {orderedSessions.map((session) => (
                <option
                  key={session.sessionId}
                  value={session.sessionId}
                >
                  {formatDate(session.endedAt)}
                  {' - '}
                  {session.sessionId}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-slate-500">
            තෝරාගත් සැසි: {filteredSessions.length}
          </p>
        </section>

        {/* SUMMARY CARDS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="ක්‍රීඩා සැසි ගණන"
            value={String(filteredSessions.length)}
          />

          <SummaryCard
            title="මුළු හැසිරීම් සංඥා"
            value={String(totalSignals)}
          />

          <SummaryCard
            title="නිරීක්ෂණය වූ සංඥා වර්ග"
            value={String(detectedTypes)}
          />

          <SummaryCard
            title="කැමරාව භාවිතා කළ සැසි"
            value={String(cameraSessions)}
          />
        </section>

        {/* VISUAL ANALYTICS — use selected sessions, never invented values */}
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartPanel title="සැසි අනුව හැසිරීම් සංඥා" subtitle="පැරණි සැසියෙන් නවතම සැසිය දක්වා වාර්තා වූ මුළු සංඥා">
            <TrendChart color="#6366f1" unit=" සංඥා" points={[...filteredSessions].reverse().map((s,i)=>({label:`${i+1}`,value:countSessionEvents(s)}))}/>
          </ChartPanel>
          <ChartPanel title="කැමරා භාවිතය" subtitle="තෝරාගත් සැසිවල කැමරා භාවිත කළ සහ නොකළ සැසි">
            {filteredSessions.length > 0 ? <div className="flex flex-wrap items-center gap-6 py-4">
              <div role="img" aria-label={`කැමරා භාවිත කළ සැසි ${cameraSessions}`} className="relative h-40 w-40 shrink-0 rounded-full" style={{background:`conic-gradient(#6366f1 0 ${100*cameraSessions/filteredSessions.length}%, #cbd5e1 ${100*cameraSessions/filteredSessions.length}% 100%)`}}>
                <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-2xl font-bold text-indigo-800">{Math.round(100*cameraSessions/filteredSessions.length)}%</div>
              </div>
              <div className="space-y-3 text-sm"><p><span className="mr-2 inline-block h-3 w-3 rounded bg-indigo-500"/>කැමරාව සමඟ: <strong>{cameraSessions}</strong></p><p><span className="mr-2 inline-block h-3 w-3 rounded bg-slate-300"/>කැමරාව නොමැතිව: <strong>{filteredSessions.length-cameraSessions}</strong></p></div>
            </div> : <p className="py-12 text-center text-sm text-slate-500">සැසි දත්ත නොමැත</p>}
          </ChartPanel>
          <ChartPanel title="හැසිරීම් සංඥා සංසන්දනය" subtitle="සංඥා වර්ග හත සඳහා වාර්තා වූ වාර ගණන">
            <div className="space-y-3 pt-2">{behaviourKeys.map(key=><div key={key}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{behaviourLabels[key]}</span><strong>{key==='distraction'&&cameraSessions===0?'—':behaviourTotals[key]}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${key==='distraction'&&cameraSessions===0?0:100*behaviourTotals[key]/maxCount}%`}}/></div></div>)}</div>
          </ChartPanel>
          <ChartPanel title="සැසි අනුව කැමරා දත්ත ලබාගැනීම" subtitle="කැමරාව භාවිත කළ සැසි සහ ක්‍රීඩා-පමණක් සැසි">
            <div className="space-y-3 pt-2">{[...filteredSessions].reverse().map((s,i)=><div key={s.sessionId} className="flex items-center gap-3 text-sm"><span className="w-14 shrink-0 text-slate-500">සැසි {i+1}</span><div className="flex-1 rounded-full bg-slate-100"><div className={`h-5 rounded-full ${s.cameraUsed?'bg-indigo-500':'bg-slate-300'}`} style={{width:'100%'}}/></div><span className="w-28 text-right">{s.cameraUsed?'කැමරාව ඇත':'කැමරාව නැත'}</span></div>)}</div>
          </ChartPanel>
        </section>

        {/* BEHAVIOUR CHART */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            හැසිරීම් සංඥා සාරාංශය
          </h2>

          <p className="mb-6 mt-2 text-sm text-slate-500">
            එක් එක් හැසිරීම් සංඥාව
            වාර්තා වූ වාර ගණන.
            වැඩි විස්තර සඳහා
            අදාළ සංඥාව තෝරන්න.
          </p>

          <div className="space-y-6">
            {behaviourKeys.map((key) => {
              const count = behaviourTotals[key];

              // Camera-related indicator is unavailable
              // when no selected session used a camera.
              const unavailable =
                key === 'distraction' &&
                cameraSessions === 0;

              return (
                <div key={key}>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBehaviour(
                        expandedBehaviour === key
                          ? null
                          : key
                      )
                    }
                    aria-expanded={
                      expandedBehaviour === key
                    }
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="font-medium text-slate-800">
                      {behaviourLabels[key]}
                    </span>

                    <span className="whitespace-nowrap text-sm font-semibold text-indigo-700">
                      {unavailable
                        ? 'කැමරා දත්ත නොමැත'
                        : `${count} වාරයක්`}

                      {' '}

                      {expandedBehaviour === key
                        ? '−'
                        : '+'}
                    </span>
                  </button>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{
                        width: unavailable
                          ? '0%'
                          : `${
                              (count / maxCount) * 100
                            }%`,
                      }}
                    />
                  </div>

                  {expandedBehaviour === key && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4">
                      <p className="text-sm leading-7 text-slate-600">
                        {behaviourDescriptions[key]}
                      </p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            සටහන: මෙම තීරු සංඥා වාර ගණන
            සංසන්දනය කිරීම සඳහා පමණි.
            ඒවා හැසිරීම් බරපතළකම
            මැනීමක් නොවේ.
          </p>
        </section>

        {/* SESSION HISTORY */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">
            ක්‍රීඩා සැසි ඉතිහාසය
          </h2>

          <div className="space-y-3">
            {orderedSessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold">
                    {formatDate(session.endedAt)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    සැසි අංකය: {session.sessionId}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="font-medium">
                    සංඥා: {countSessionEvents(session)}
                  </p>

                  <p className="mt-1 text-slate-500">
                    {session.cameraUsed
                      ? 'කැමරාව භාවිතා කර ඇත'
                      : 'කැමරාව භාවිතා කර නැත'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSession(session.sessionId);

                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }}
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  විස්තර බලන්න
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

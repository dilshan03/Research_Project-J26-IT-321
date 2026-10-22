
import { useMemo, useState } from 'react';

// ==========================================
// TYPES
// ==========================================

export type InteractionSession = {
  sessionId: string;
  endedAt: string;
  durationMs: number;
  questionsAnswered: number;
  correctAnswers: number;
  totalAttempts: number;
  answerChanges: number;
  clickCount: number;
  totalInactivityMs: number;
  responseTimesMs: number[];

  // Additional interaction measurements
  repeatedMistakes?: number;
  skippedQuestions?: number;
  totalQuestions?: number;
  gameCompleted?: boolean;
  supportPrompts?: number;
  successfulReengagements?: number;
  breaksTaken?: number;
  breakDurationMs?: number;
};

type Props = {
  learnerName: string;
  sessions: InteractionSession[];
  onBack?: () => void;
};

// ==========================================
// STUDENT DETAILS
// ==========================================

const demoStudent = {
  name: 'සහන්',
  age: 8,
  grade: 3,
};

// ==========================================
// HARDCODED DEMONSTRATION DATA
// ==========================================

const demoSessions: InteractionSession[] = [
  {
    sessionId: 'MQ-SAHAN-101',
    endedAt: '2026-10-19T16:35:00',
    durationMs: 1080000,
    questionsAnswered: 7,
    correctAnswers: 6,
    totalAttempts: 9,
    answerChanges: 3,
    clickCount: 35,
    totalInactivityMs: 38000,
    responseTimesMs: [
      18000, 26000, 22000, 35000,
      19000, 29000, 24000,
    ],
    repeatedMistakes: 1,
    skippedQuestions: 0,
    totalQuestions: 7,
    gameCompleted: true,
    supportPrompts: 1,
    successfulReengagements: 1,
    breaksTaken: 0,
    breakDurationMs: 0,
  },
  {
    sessionId: 'MQ-SAHAN-102',
    endedAt: '2026-10-18T17:20:00',
    durationMs: 1320000,
    questionsAnswered: 8,
    correctAnswers: 6,
    totalAttempts: 11,
    answerChanges: 2,
    clickCount: 42,
    totalInactivityMs: 62000,
    responseTimesMs: [
      24000, 31000, 28000, 42000,
      21000, 37000, 29000, 34000,
    ],
    repeatedMistakes: 2,
    skippedQuestions: 1,
    totalQuestions: 9,
    gameCompleted: true,
    supportPrompts: 2,
    successfulReengagements: 1,
    breaksTaken: 1,
    breakDurationMs: 120000,
  },
  {
    sessionId: 'MQ-SAHAN-103',
    endedAt: '2026-10-17T15:45:00',
    durationMs: 1500000,
    questionsAnswered: 7,
    correctAnswers: 4,
    totalAttempts: 12,
    answerChanges: 5,
    clickCount: 48,
    totalInactivityMs: 95000,
    responseTimesMs: [
      32000, 45000, 38000, 52000,
      29000, 41000, 48000,
    ],
    repeatedMistakes: 3,
    skippedQuestions: 2,
    totalQuestions: 10,
    gameCompleted: false,
    supportPrompts: 3,
    successfulReengagements: 2,
    breaksTaken: 1,
    breakDurationMs: 180000,
  },
  {
    sessionId: 'MQ-SAHAN-104',
    endedAt: '2026-10-15T16:10:00',
    durationMs: 1020000,
    questionsAnswered: 6,
    correctAnswers: 5,
    totalAttempts: 8,
    answerChanges: 2,
    clickCount: 29,
    totalInactivityMs: 25000,
    responseTimesMs: [
      17000, 24000, 19000,
      28000, 21000, 26000,
    ],
    repeatedMistakes: 1,
    skippedQuestions: 0,
    totalQuestions: 6,
    gameCompleted: true,
    supportPrompts: 0,
    successfulReengagements: 0,
    breaksTaken: 0,
    breakDurationMs: 0,
  },
  {
    sessionId: 'MQ-SAHAN-105',
    endedAt: '2026-10-13T17:05:00',
    durationMs: 1260000,
    questionsAnswered: 8,
    correctAnswers: 6,
    totalAttempts: 11,
    answerChanges: 3,
    clickCount: 39,
    totalInactivityMs: 51000,
    responseTimesMs: [
      23000, 32000, 27000, 39000,
      25000, 35000, 29000, 33000,
    ],
    repeatedMistakes: 2,
    skippedQuestions: 1,
    totalQuestions: 9,
    gameCompleted: true,
    supportPrompts: 1,
    successfulReengagements: 1,
    breaksTaken: 1,
    breakDurationMs: 90000,
  },
  {
    sessionId: 'MQ-SAHAN-106',
    endedAt: '2026-10-11T15:30:00',
    durationMs: 1440000,
    questionsAnswered: 7,
    correctAnswers: 4,
    totalAttempts: 13,
    answerChanges: 4,
    clickCount: 51,
    totalInactivityMs: 110000,
    responseTimesMs: [
      35000, 49000, 41000, 57000,
      33000, 46000, 52000,
    ],
    repeatedMistakes: 3,
    skippedQuestions: 2,
    totalQuestions: 10,
    gameCompleted: false,
    supportPrompts: 3,
    successfulReengagements: 2,
    breaksTaken: 2,
    breakDurationMs: 240000,
  },
];

// ==========================================
// HELPERS
// ==========================================

const months = [
  'ජනවාරි',
  'පෙබරවාරි',
  'මාර්තු',
  'අප්‍රේල්',
  'මැයි',
  'ජූනි',
  'ජූලි',
  'අගෝස්තු',
  'සැප්තැම්බර්',
  'ඔක්තෝබර්',
  'නොවැම්බර්',
  'දෙසැම්බර්',
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()} ${
    months[date.getMonth()]
  } ${date.getDate()}`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes} මිනිත්තු ${seconds} තත්පර`;
}

function formatShortDuration(ms: number) {
  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)} තත්පර`;
  }

  return `${(seconds / 60).toFixed(1)} මිනිත්තු`;
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-teal-700">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 py-4 last:border-b-0">
      <div className="max-w-lg">
        <p className="font-medium text-slate-800">
          {label}
        </p>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <p className="font-semibold text-teal-700">
        {value}
      </p>
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

export default function InteractionDashboard({
  learnerName,
  sessions,
  onBack,
}: Props) {
  const [selectedSession, setSelectedSession] =
    useState('all');

  const [expandedSection, setExpandedSection] =
    useState<string | null>(null);

  const usingDemo = sessions.length === 0;

  const displaySessions = usingDemo
    ? demoSessions
    : sessions;

  const orderedSessions = useMemo(
    () =>
      [...displaySessions].sort((a, b) =>
        b.endedAt.localeCompare(a.endedAt)
      ),
    [displaySessions]
  );

  const selectedSessions =
    selectedSession === 'all'
      ? orderedSessions
      : orderedSessions.filter(
          (session) =>
            session.sessionId === selectedSession
        );

  // ========================================
  // CALCULATIONS
  // ========================================

  const sum = (
    key:
      | 'durationMs'
      | 'questionsAnswered'
      | 'correctAnswers'
      | 'totalAttempts'
      | 'answerChanges'
      | 'clickCount'
      | 'totalInactivityMs'
      | 'repeatedMistakes'
      | 'skippedQuestions'
      | 'supportPrompts'
      | 'successfulReengagements'
      | 'breaksTaken'
      | 'breakDurationMs'
  ) =>
    selectedSessions.reduce(
      (total, session) =>
        total + (session[key] ?? 0),
      0
    );

  const questionsAnswered = sum('questionsAnswered');
  const correctAnswers = sum('correctAnswers');
  const incorrectAnswers = Math.max(
    0,
    questionsAnswered - correctAnswers
  );

  const accuracy =
    questionsAnswered > 0
      ? Math.round(
          (correctAnswers / questionsAnswered) * 100
        )
      : null;

  const responseTimes = selectedSessions
    .flatMap((session) => session.responseTimesMs)
    .filter(
      (time) => Number.isFinite(time) && time >= 0
    );

  const averageResponse =
    responseTimes.length > 0
      ? responseTimes.reduce(
          (total, time) => total + time,
          0
        ) / responseTimes.length
      : null;

  const totalQuestions = selectedSessions.reduce(
    (total, session) =>
      total +
      (session.totalQuestions ??
        session.questionsAnswered),
    0
  );

  const completedSessions = selectedSessions.filter(
    (session) => session.gameCompleted === true
  ).length;

  const completionRate =
    selectedSessions.length > 0
      ? Math.round(
          (completedSessions /
            selectedSessions.length) *
            100
        )
      : 0;

  const reengagementRate =
    sum('supportPrompts') > 0
      ? Math.round(
          (sum('successfulReengagements') /
            sum('supportPrompts')) *
            100
        )
      : null;

  const toggleSection = (section: string) => {
    setExpandedSection(
      expandedSection === section ? null : section
    );
  };

  const sectionButton = (
    section: string,
    title: string
  ) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      aria-expanded={expandedSection === section}
      className="flex w-full items-center justify-between gap-3 text-left text-lg font-bold"
    >
      <span>{title}</span>
      <span className="text-teal-700">
        {expandedSection === section ? '−' : '+'}
      </span>
    </button>
  );

  return (
    <main
      lang="si"
      className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800"
    >
      <div className="mx-auto max-w-6xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              MathQuest · දෙමාපිය පුවරුව
            </p>

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              ක්‍රීඩා අන්තර්ක්‍රියා විශ්ලේෂණය
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              ක්‍රීඩා අතරතුර ශිෂ්‍යයාගේ
              ප්‍රතිචාර සහ ක්‍රියාකාරකම්
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

        {/* STUDENT INFORMATION */}

        <section className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <h2 className="mb-4 text-lg font-bold text-teal-900">
            ශිෂ්‍ය තොරතුරු
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                ශිෂ්‍යයාගේ නම
              </p>

              <p className="mt-1 text-lg font-semibold">
                {usingDemo
                  ? demoStudent.name
                  : learnerName}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                වයස
              </p>

              <p className="mt-1 text-lg font-semibold">
                {usingDemo
                  ? `අවුරුදු ${demoStudent.age}`
                  : 'දත්ත නොමැත'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                ශ්‍රේණිය
              </p>

              <p className="mt-1 text-lg font-semibold">
                {usingDemo
                  ? `${demoStudent.grade} ශ්‍රේණිය`
                  : 'දත්ත නොමැත'}
              </p>
            </div>
          </div>
        </section>

        

        {/* SESSION FILTER */}

        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label
              htmlFor="interaction-session"
              className="mb-2 block text-sm font-semibold"
            >
              ක්‍රීඩා සැසිය තෝරන්න
            </label>

            <select
              id="interaction-session"
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
            තෝරාගත් සැසි: {selectedSessions.length}
          </p>
        </section>

        {/* SUMMARY CARDS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="ක්‍රීඩා සැසි"
            value={String(selectedSessions.length)}
          />

          <MetricCard
            title="පිළිතුරු දුන් ප්‍රශ්න"
            value={String(questionsAnswered)}
          />

          <MetricCard
            title="නිවැරදි පිළිතුරු ප්‍රතිශතය"
            value={
              accuracy === null
                ? 'දත්ත නොමැත'
                : `${accuracy}%`
            }
          />

          <MetricCard
            title="මුළු ක්‍රීඩා කාලය"
            value={formatDuration(sum('durationMs'))}
          />
        </section>

        {/* SECTION 1 - ANSWERS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            ප්‍රශ්න සහ පිළිතුරු
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            නිවැරදි සහ වැරදි පිළිතුරු
            සංසන්දනය
          </p>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{
                width: `${accuracy ?? 0}%`,
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
            <span>
              නිවැරදි: <strong>{correctAnswers}</strong>
            </span>

            <span>
              වැරදි: <strong>{incorrectAnswers}</strong>
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="මුළු උත්සාහ ගණන"
              value={String(sum('totalAttempts'))}
            />

            <MetricCard
              title="පිළිතුරු වෙනස් කිරීම්"
              value={String(sum('answerChanges'))}
            />
          </div>

          <div className="mt-5">
            {sectionButton(
              'answers',
              'අමතර පිළිතුරු විස්තර'
            )}

            {expandedSection === 'answers' && (
              <div className="mt-3">
                <DetailRow
                  label="නැවත නැවත වැරදි උත්සාහ"
                  value={String(sum('repeatedMistakes'))}
                  description="එකම ප්‍රශ්නයට නැවත වැරදි පිළිතුරු ලබාදුන් අවස්ථා."
                />

                <DetailRow
                  label="මඟහැරුණු ප්‍රශ්න"
                  value={String(sum('skippedQuestions'))}
                  description="පිළිතුරු ලබා නොදී මඟහැරුණු ප්‍රශ්න."
                />

                <DetailRow
                  label="මුළු ප්‍රශ්න ගණන"
                  value={String(totalQuestions)}
                  description="තෝරාගත් සැසිවල ඇතුළත් ප්‍රශ්න."
                />
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2 - RESPONSE AND ACTIVITY */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            ප්‍රතිචාර කාලය සහ ක්‍රියාකාරකම්
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="සාමාන්‍ය පිළිතුරු කාලය"
              value={
                averageResponse === null
                  ? 'දත්ත නොමැත'
                  : formatShortDuration(averageResponse)
              }
            />

            <MetricCard
              title="ක්ලික් සහ ස්පර්ශ"
              value={String(sum('clickCount'))}
            />

            <MetricCard
              title="අන්තර්ක්‍රියා නොමැති කාලය"
              value={formatShortDuration(
                sum('totalInactivityMs')
              )}
            />
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-600">
            පිළිතුරු ලබාදීමට ගතවන කාලය
            සහ ක්‍රීඩාව සමඟ අන්තර්ක්‍රියා
            නොමැති කාලය පමණක් භාවිතා කර
            දරුවාගේ අවධානය පිළිබඳ
            නිගමන නොගන්න.
          </p>
        </section>

        {/* SECTION 3 - COMPLETION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            ක්‍රීඩා සම්පූර්ණ කිරීම
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="සම්පූර්ණ කළ සැසි"
              value={`${completedSessions} / ${selectedSessions.length}`}
            />

            <MetricCard
              title="සැසි සම්පූර්ණ කිරීමේ ප්‍රතිශතය"
              value={`${completionRate}%`}
            />
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{
                width: `${completionRate}%`,
              }}
            />
          </div>
        </section>

        {/* SECTION 4 - REENGAGEMENT */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            නැවත ක්‍රීඩාවට සම්බන්ධ වීම
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            සහාය පණිවිඩයකින් පසු දරුවා
            නැවත ක්‍රීඩාව සමඟ
            අන්තර්ක්‍රියා කළ අවස්ථා.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard
              title="සහාය පණිවිඩ"
              value={String(sum('supportPrompts'))}
            />

            <MetricCard
              title="නැවත සම්බන්ධ වූ අවස්ථා"
              value={String(
                sum('successfulReengagements')
              )}
            />

            <MetricCard
              title="නැවත සම්බන්ධ වීමේ ප්‍රතිශතය"
              value={
                reengagementRate === null
                  ? 'දත්ත නොමැත'
                  : `${reengagementRate}%`
              }
            />
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-500">
            නැවත අන්තර්ක්‍රියා කිරීම
            පණිවිඩය නිසාම සිදුවූ බව
            මෙම දත්තවලින් තහවුරු නොවේ.
          </p>
        </section>

        {/* SECTION 5 - BREAKS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            විවේක කාලය
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="ගත් විවේක ගණන"
              value={String(sum('breaksTaken'))}
            />

            <MetricCard
              title="මුළු විවේක කාලය"
              value={formatDuration(
                sum('breakDurationMs')
              )}
            />
          </div>
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
                  <p>
                    ප්‍රශ්න: {session.questionsAnswered}
                  </p>

                  <p className="mt-1 text-slate-500">
                    නිවැරදි: {session.correctAnswers}
                  </p>
                </div>

                <div className="text-sm">
                  <p>
                    {formatDuration(session.durationMs)}
                  </p>

                  <p className="mt-1 text-slate-500">
                    {session.gameCompleted === true
                      ? 'ක්‍රීඩාව සම්පූර්ණයි'
                      : session.gameCompleted === false
                        ? 'ක්‍රීඩාව සම්පූර්ණ කර නැත'
                        : 'සම්පූර්ණ කිරීමේ දත්ත නොමැත'}
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
                  className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
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

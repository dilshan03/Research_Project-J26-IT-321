import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  RefreshCw,
  Award,
} from 'lucide-react';
import type { InteractionEvent } from '../types/telemetry.types';
import { getActiveStudentProfile } from '../../learner-profile';

export interface DetailsForTeacherProps {
  parentId?: string;
  learnerId?: string;
  studentName?: string;
  grade?: number;
  className?: string;
}

interface StudentRosterOption {
  learnerId: string;
  parentId: string;
  studentName: string;
  grade: number;
}

interface QuestionRow {
  questionNo: string;
  isCorrect: boolean;
  selectedAnswer: string | number;
  hintsUsed: number;
  timeSpentSec: string;
  remainingTimeSec: string;
  noteSi: string;
}

interface SimpleTeacherData {
  hasData: boolean;
  studentId: string;
  studentName: string;
  grade: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  solvedAloneCount: number;
  solvedWithHintsCount: number;
  totalHintsUsed: number;
  rushedMistakesCount: number;
  skillScorePct: number;
  avgTimeSec: number;
  recentQuestions: QuestionRow[];
}

function summarizeForTeacher(
  logs: InteractionEvent[],
  savedProgress: Record<string, any> | null,
  student: StudentRosterOption
): SimpleTeacherData {
  const answers = logs.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  const hasLogs = answers.length > 0;
  const hasProgress =
    savedProgress &&
    ((Array.isArray(savedProgress.completedSteps) && savedProgress.completedSteps.length > 0) ||
      (typeof savedProgress.hintAwareKnowledge === 'number' && savedProgress.hintAwareKnowledge > 0.21));

  if (!hasLogs && !hasProgress) {
    return {
      hasData: false,
      studentId: student.learnerId,
      studentName: student.studentName,
      grade: student.grade,
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      solvedAloneCount: 0,
      solvedWithHintsCount: 0,
      totalHintsUsed: 0,
      rushedMistakesCount: 0,
      skillScorePct: 0,
      avgTimeSec: 0,
      recentQuestions: [],
    };
  }

  let correctCount = 0;
  let wrongCount = 0;
  let solvedAloneCount = 0;
  let solvedWithHintsCount = 0;
  let totalHintsUsed = 0;
  let rushedMistakesCount = 0;
  const rts: number[] = [];
  const recentQuestions: QuestionRow[] = [];

  const chronological = [...answers].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const ev of chronological) {
    const isCorrect = ev.isCorrect === true;
    const hintLvl = ev.hintLevelReached || 0;
    totalHintsUsed += ev.totalHintsRequested || (hintLvl > 0 ? 1 : 0);

    const rtMs =
      typeof ev.responseTimeMs === 'number' && ev.responseTimeMs > 0
        ? ev.responseTimeMs
        : typeof ev.timeLimitMs === 'number' && typeof ev.remainingTimeMs === 'number'
        ? Math.max(200, ev.timeLimitMs - ev.remainingTimeMs)
        : 5000;
    rts.push(rtMs);

    const remSec =
      typeof ev.remainingTimeMs === 'number'
        ? `${Math.round(ev.remainingTimeMs / 1000)}s`
        : '—';

    let noteSi = 'තනිවම නිවැරදි පිළිතුර දුන්නා';
    if (isCorrect) {
      correctCount++;
      if (hintLvl === 0) {
        solvedAloneCount++;
        noteSi = 'උදව් නැතිව තනිවම විසඳුවා';
      } else {
        solvedWithHintsCount++;
        noteSi = `හෝඩුවාව ${hintLvl} බලා විසඳුවා`;
      }
    } else {
      wrongCount++;
      if (rtMs < 1800) {
        rushedMistakesCount++;
        noteSi = 'තත්පර 2ට අඩු කාලයකදී හදිසියෙන් එබීමක්';
      } else if (ev.idleTimeBeforeFirstActionMs && ev.idleTimeBeforeFirstActionMs >= 12000) {
        rushedMistakesCount++;
        noteSi = 'අවධානය ගිලිහී ප්‍රමාද වී එබීමක්';
      } else {
        noteSi = 'පාඩමේ ගණනය කිරීමේ වැරැද්දක්';
      }
    }

    recentQuestions.push({
      questionNo: (ev.questionId || 'Q').replace('math_q_add_', 'ප්‍රශ්නය '),
      isCorrect,
      selectedAnswer: ev.selectedAnswer ?? '—',
      hintsUsed: hintLvl,
      timeSpentSec: `${(rtMs / 1000).toFixed(1)}s`,
      remainingTimeSec: remSec,
      noteSi,
    });
  }

  if (!hasLogs && savedProgress) {
    const completed = Array.isArray(savedProgress.completedSteps)
      ? savedProgress.completedSteps.length
      : 0;
    correctCount = completed;
    totalHintsUsed = savedProgress.totalHintsUsed || 0;
    solvedWithHintsCount = Math.min(completed, totalHintsUsed > 0 ? Math.ceil(totalHintsUsed / 2) : 0);
    solvedAloneCount = Math.max(0, completed - solvedWithHintsCount);
  }

  const totalAttempts = correctCount + wrongCount;
  const skillScorePct =
    typeof savedProgress?.hintAwareKnowledge === 'number' && savedProgress.hintAwareKnowledge > 0.2
      ? Math.round(savedProgress.hintAwareKnowledge * 100)
      : totalAttempts > 0
      ? Math.round((correctCount / totalAttempts) * 100)
      : 0;

  const avgTimeSec =
    rts.length > 0 ? Number((rts.reduce((a, b) => a + b, 0) / rts.length / 1000).toFixed(1)) : 0;

  return {
    hasData: true,
    studentId: student.learnerId,
    studentName: student.studentName,
    grade: student.grade,
    totalAttempts,
    correctCount,
    wrongCount,
    solvedAloneCount,
    solvedWithHintsCount,
    totalHintsUsed,
    rushedMistakesCount,
    skillScorePct,
    avgTimeSec,
    recentQuestions: recentQuestions.slice(-8).reverse(),
  };
}

export const DetailsForTeacher: React.FC<DetailsForTeacherProps> = ({
  parentId,
  learnerId,
  studentName,
  grade = 1,
  className = '',
}) => {
  const [roster, setRoster] = useState<StudentRosterOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterOption>({
    learnerId: learnerId || 'student_trial_01',
    parentId: parentId || 'parent_demo',
    studentName: studentName || 'ශිෂ්‍යයා',
    grade,
  });
  const [data, setData] = useState<SimpleTeacherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeProf = getActiveStudentProfile();
      const discoveredMap = new Map<string, StudentRosterOption>();

      if (learnerId) {
        discoveredMap.set(learnerId, {
          learnerId,
          parentId: parentId || 'parent_demo',
          studentName: studentName || learnerId,
          grade,
        });
      }

      if (activeProf && activeProf.learnerId) {
        discoveredMap.set(activeProf.learnerId, {
          learnerId: activeProf.learnerId,
          parentId: activeProf.parentId || 'parent_demo',
          studentName: activeProf.preferredName || activeProf.firstName || activeProf.learnerId,
          grade: activeProf.grade || 1,
        });
      }

      const allLogsRes = await fetch('/api/telemetry/interactions?limit=100').catch(() => null);
      let allLogs: InteractionEvent[] = [];
      if (allLogsRes && allLogsRes.ok) {
        const allJson = await allLogsRes.json();
        if (Array.isArray(allJson.logs)) {
          allLogs = allJson.logs;
          for (const item of allLogs) {
            const sid = item.studentId || item.learnerId;
            if (sid && !discoveredMap.has(sid)) {
              discoveredMap.set(sid, {
                learnerId: sid,
                parentId: item.parentId || 'parent_demo',
                studentName: item.studentName || (sid === 'student_trial_01' ? 'පුහුණු ශිෂ්‍යයා (Simulator)' : sid),
                grade: item.grade || 1,
              });
            }
          }
        }
      }

      if (discoveredMap.size === 0) {
        discoveredMap.set('student_trial_01', {
          learnerId: 'student_trial_01',
          parentId: 'parent_demo',
          studentName: 'පුහුණු ශිෂ්‍යයා',
          grade: 1,
        });
      }

      const rosterList = Array.from(discoveredMap.values());
      setRoster(rosterList);

      const targetStudent =
        rosterList.find((r) => r.learnerId === selectedStudent.learnerId) || rosterList[0];

      const studentLogs = allLogs.filter(
        (l) => l.studentId === targetStudent.learnerId || l.learnerId === targetStudent.learnerId
      );

      const progParams = new URLSearchParams({
        studentId: targetStudent.learnerId,
        learnerId: targetStudent.learnerId,
      });
      const progRes = await fetch(`/api/telemetry/student-progress?${progParams.toString()}`).catch(
        () => null
      );
      let savedProgress: Record<string, any> | null = null;
      if (progRes && progRes.ok) {
        const progJson = await progRes.json();
        if (progJson.success && progJson.progress) savedProgress = progJson.progress;
      }

      setData(summarizeForTeacher(studentLogs, savedProgress, targetStudent));
    } catch {
      setData(summarizeForTeacher([], null, selectedStudent));
    } finally {
      setIsLoading(false);
    }
  }, [learnerId, parentId, studentName, grade, selectedStudent.learnerId]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  if (isLoading || !data) {
    return (
      <section className={`bg-white rounded-3xl border border-mq-border p-5 shadow-sm ${className}`}>
        <div className="flex items-center gap-2 text-mq-text-muted text-sm font-semibold">
          <RefreshCw size={16} className="animate-spin text-mq-primary" />
          <span>ශිෂ්‍යයාගේ ක්‍රීඩා දත්ත ලබාගනිමින්...</span>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Student Gameplay Details for Teacher"
      className={`bg-white rounded-3xl border border-mq-border shadow-sm overflow-hidden ${className}`}
    >
      {/* Simple Teacher Header */}
      <div className="bg-mq-surface-blue/60 px-5 py-4 border-b border-mq-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-mq-primary text-white flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-mq-text-strong">
              📊 ශිෂ්‍යයාගේ ගණිත පුහුණු දත්ත වාර්තාව (Student Practice Details)
            </h3>
            <p className="text-xs sm:text-sm text-mq-text-muted">
              දරුවා ගණිත ප්‍රශ්න වලට පිළිතුරු දුන් කාලය, උත්සාහයන් සහ හෝඩුවාවන් භාවිතා කළ ආකාරය
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {roster.length > 1 && (
            <select
              aria-label="Select Student"
              value={selectedStudent.learnerId}
              onChange={(e) => {
                const found = roster.find((r) => r.learnerId === e.target.value);
                if (found) setSelectedStudent(found);
              }}
              className="text-xs font-bold text-mq-text-strong bg-white border border-mq-border rounded-full px-3 py-1.5"
            >
              {roster.map((st) => (
                <option key={st.learnerId} value={st.learnerId}>
                  👤 {st.studentName} (ශ්‍රේණිය {st.grade})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={loadTeacherData}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-mq-primary px-3 py-1.5 rounded-full bg-white border border-mq-border cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>යාවත්කාලීන කරන්න</span>
          </button>
        </div>
      </div>

      {!data.hasData ? (
        <div className="p-6 text-center text-sm text-mq-text-muted">
          මෙම ශිෂ්‍යයා තවමත් ගණිත පුහුණු ප්‍රශ්න වලට පිළිතුරු ලබා දී නොමැත.
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* 4 Simple Metric Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center">
              <Award size={20} className="mx-auto text-emerald-600" />
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{data.skillScorePct}%</p>
              <p className="text-xs font-bold text-emerald-950">පාඩමේ ලකුණු මට්ටම</p>
            </div>

            <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/50 p-3.5 text-center">
              <CheckCircle2 size={20} className="mx-auto text-sky-600" />
              <p className="text-2xl font-extrabold text-mq-text-strong mt-1">
                {data.correctCount} / {data.totalAttempts}
              </p>
              <p className="text-xs font-bold text-mq-text">
                හරි පිළිතුරු (වැරදි: {data.wrongCount})
              </p>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 text-center">
              <Lightbulb size={20} className="mx-auto text-purple-600" />
              <p className="text-2xl font-extrabold text-purple-700 mt-1">{data.totalHintsUsed}</p>
              <p className="text-xs font-bold text-purple-950">
                ලබාගත් මුළු හෝඩුවාවන් (Hints)
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-center">
              <Clock size={20} className="mx-auto text-amber-600" />
              <p className="text-2xl font-extrabold text-amber-800 mt-1">
                {data.avgTimeSec > 0 ? `${data.avgTimeSec}s` : '—'}
              </p>
              <p className="text-xs font-bold text-amber-950">
                ප්‍රශ්නයකට ගතවූ සාමාන්‍ය කාලය
              </p>
            </div>
          </div>

          {/* Simple Summary Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">තනිවම විසඳූ ප්‍රශ්න:</span>
              <span className="font-extrabold text-emerald-700">{data.solvedAloneCount}</span>
            </div>
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">හෝඩුවාවන් (Hints) බලා විසඳූ ප්‍රශ්න:</span>
              <span className="font-extrabold text-purple-700">{data.solvedWithHintsCount}</span>
            </div>
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">හදිසියෙන් / අවධානය ගිලිහී වැරදුණු වාර:</span>
              <span className="font-extrabold text-amber-700">{data.rushedMistakesCount}</span>
            </div>
          </div>

          {/* Question-by-Question Log Table */}
          {data.recentQuestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-mq-text-strong">
                ප්‍රශ්න අනුව පිළිතුරු දුන් ආකාරය (Question-by-Question Details)
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-mq-border">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-mq-surface-soft border-b border-mq-border text-mq-text-strong font-bold">
                      <th className="py-2.5 px-3">ප්‍රශ්නය</th>
                      <th className="py-2.5 px-3">ප්‍රතිඵලය</th>
                      <th className="py-2.5 px-3">ගතවූ කාලය</th>
                      <th className="py-2.5 px-3">ඉතිරි කාලය</th>
                      <th className="py-2.5 px-3">හෝඩුවා (Hints)</th>
                      <th className="py-2.5 px-3">විස්තරය</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mq-border/70">
                    {data.recentQuestions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-mq-surface-soft/40">
                        <td className="py-2.5 px-3 font-bold text-mq-text-strong">{q.questionNo}</td>
                        <td className="py-2.5 px-3">
                          {q.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 size={14} /> නිවැරදියි ({q.selectedAnswer})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <XCircle size={14} /> වැරදියි ({q.selectedAnswer})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-mq-text">{q.timeSpentSec}</td>
                        <td className="py-2.5 px-3 text-mq-text">{q.remainingTimeSec}</td>
                        <td className="py-2.5 px-3 text-mq-text">
                          {q.hintsUsed > 0 ? `හෝඩුවාව ${q.hintsUsed}` : 'නැත'}
                        </td>
                        <td className="py-2.5 px-3 text-mq-text">{q.noteSi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DetailsForTeacher;

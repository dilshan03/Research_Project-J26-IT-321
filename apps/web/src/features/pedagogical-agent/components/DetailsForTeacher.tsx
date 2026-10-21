import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  RefreshCw,
  Award,
  Brain,
  Zap,
  TrendingUp,
  AlertCircle,
  Check,
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
  sourceType: 'adventure' | 'practice';
  isCorrect: boolean;
  selectedAnswer: string | number;
  hintsUsed: number;
  timeSpentSec: string;
  remainingTimeSec: string;
  noteSi: string;
}

interface ConceptBreakdown {
  conceptKey: string;
  conceptNameSi: string;
  attempts: number;
  correct: number;
  accuracyPct: number;
  hintsUsed: number;
  masteryLevelSi: string;
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
  completedAdventuresCount: number;
  skillScorePct: number;
  hintAwareBktPct: number;
  standardBktPct: number;
  avgTimeSec: number;
  avgIdleDriftSec: number;
  attentionFocusPct: number;
  cognitiveStateSummary: {
    primaryStateSi: string;
    descriptionSi: string;
    impulsiveRatePct: number;
  };
  concepts: ConceptBreakdown[];
  allQuestions: QuestionRow[];
  recentQuestions: QuestionRow[];
}

function translateConcept(concept?: string): string {
  if (!concept) return 'මූලික ගණිතය (General Math)';
  const lower = concept.toLowerCase();
  if (lower.includes('money') || lower.includes('කාසි') || lower.includes('මුදල්')) return 'මුදල් හා කාසි ගණනය (Money)';
  if (lower.includes('count') || lower.includes('ගණන්')) return 'වස්තු ගණන් කිරීම (Counting)';
  if (lower.includes('add') || lower.includes('එකතු')) return 'තනි ඉලක්කම් එකතු කිරීම (Addition)';
  if (lower.includes('sub') || lower.includes('අඩු')) return 'අඩු කිරීම (Subtraction)';
  return concept;
}

function formatQuestionName(rawId: string = '', concept?: string): string {
  if (!rawId) return 'ප්‍රශ්නය';
  // e.g. math_q_add_01 -> පුහුණු ප්‍රශ්නය 01
  if (rawId.startsWith('math_q_add_')) {
    return rawId.replace('math_q_add_', 'පුහුණු ප්‍රශ්නය ');
  }
  // e.g. act_39a4a09424_step_2 -> ඉගෙනුම් චාරිකාව (පියවර 2)
  const actMatch = rawId.match(/act_.*_step_(\d+)/i) || rawId.match(/.*step_(\d+)/i);
  if (actMatch) {
    const stepNum = actMatch[1];
    return concept
      ? `ඉගෙනුම් චාරිකාව පියවර ${stepNum} (${concept})`
      : `ඉගෙනුම් චාරිකාව පියවර ${stepNum}`;
  }
  if (rawId.startsWith('adventure_step_')) {
    return `ඉගෙනුම් චාරිකාව පියවර ${rawId.replace('adventure_step_', '')}`;
  }
  return rawId;
}

function summarizeForTeacher(
  logs: InteractionEvent[],
  savedProgress: Record<string, any> | null,
  student: StudentRosterOption
): SimpleTeacherData {
  const answers = logs.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  const hasLogs = answers.length > 0;
  const completedAdventures = Array.isArray(savedProgress?.completedActivityIds)
    ? savedProgress!.completedActivityIds.length
    : 0;
  const hasProgress =
    savedProgress &&
    ((Array.isArray(savedProgress.completedSteps) && savedProgress.completedSteps.length > 0) ||
      completedAdventures > 0 ||
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
      completedAdventuresCount: 0,
      skillScorePct: 0,
      hintAwareBktPct: 0,
      standardBktPct: 0,
      avgTimeSec: 0,
      avgIdleDriftSec: 0,
      attentionFocusPct: 0,
      cognitiveStateSummary: {
        primaryStateSi: 'දත්ත නොමැත',
        descriptionSi: 'ශිෂ්‍යයා තවමත් පුහුණුව ආරම්භ කර නැත.',
        impulsiveRatePct: 0,
      },
      concepts: [],
      allQuestions: [],
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
  const idles: number[] = [];
  const recentQuestions: QuestionRow[] = [];

  // Group by concepts
  const conceptMap = new Map<string, { attempts: number; correct: number; hints: number }>();

  const chronological = [...answers].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const ev of chronological) {
    const isCorrect = ev.isCorrect === true;
    const hintLvl = ev.hintLevelReached || 0;
    totalHintsUsed += ev.totalHintsRequested || (hintLvl > 0 ? 1 : 0);

    const cKey = ev.concept || 'General Math';
    const existing = conceptMap.get(cKey) || { attempts: 0, correct: 0, hints: 0 };
    existing.attempts++;
    if (isCorrect) existing.correct++;
    existing.hints += ev.totalHintsRequested || (hintLvl > 0 ? 1 : 0);
    conceptMap.set(cKey, existing);

    const rtMs =
      typeof ev.responseTimeMs === 'number' && ev.responseTimeMs > 0
        ? ev.responseTimeMs
        : typeof ev.timeLimitMs === 'number' && typeof ev.remainingTimeMs === 'number'
        ? Math.max(200, ev.timeLimitMs - ev.remainingTimeMs)
        : 5000;
    rts.push(rtMs);

    if (typeof ev.idleTimeBeforeFirstActionMs === 'number' && ev.idleTimeBeforeFirstActionMs > 0) {
      idles.push(ev.idleTimeBeforeFirstActionMs);
    }

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

    const qId = ev.questionId || '';
    const isAdv = qId.startsWith('act_') || qId.startsWith('adventure_');

    recentQuestions.push({
      questionNo: formatQuestionName(qId, ev.concept),
      sourceType: isAdv ? 'adventure' : 'practice',
      isCorrect,
      selectedAnswer: ev.selectedAnswer ?? '—',
      hintsUsed: hintLvl,
      timeSpentSec: `${(rtMs / 1000).toFixed(1)}s`,
      remainingTimeSec: remSec,
      noteSi,
    });
  }

  if (!hasLogs && savedProgress) {
    const completed =
      (Array.isArray(savedProgress.completedSteps) ? savedProgress.completedSteps.length : 0) +
      completedAdventures * 3;
    correctCount = completed;
    totalHintsUsed = savedProgress.totalHintsUsed || 0;
    solvedWithHintsCount = Math.min(completed, totalHintsUsed > 0 ? Math.ceil(totalHintsUsed / 2) : 0);
    solvedAloneCount = Math.max(0, completed - solvedWithHintsCount);
  }

  const totalAttempts = correctCount + wrongCount;
  const hintAwareKnowledgeRaw =
    typeof savedProgress?.hintAwareKnowledge === 'number'
      ? savedProgress.hintAwareKnowledge
      : totalAttempts > 0
      ? correctCount / totalAttempts
      : 0.5;

  const standardKnowledgeRaw =
    typeof savedProgress?.standardKnowledge === 'number'
      ? savedProgress.standardKnowledge
      : hintAwareKnowledgeRaw * 0.85;

  const hintAwareBktPct = Math.round(hintAwareKnowledgeRaw * 100);
  const standardBktPct = Math.round(standardKnowledgeRaw * 100);
  const skillScorePct = hintAwareBktPct;

  const avgTimeSec =
    rts.length > 0 ? Number((rts.reduce((a, b) => a + b, 0) / rts.length / 1000).toFixed(1)) : 0;

  const avgIdleDriftSec =
    idles.length > 0 ? Number((idles.reduce((a, b) => a + b, 0) / idles.length / 1000).toFixed(1)) : 0;

  // ADHD Attention Calculation
  const impulsiveRatePct = totalAttempts > 0 ? Math.round((rushedMistakesCount / totalAttempts) * 100) : 0;
  const attentionFocusPct = Math.max(30, Math.min(100, Math.round(100 - impulsiveRatePct * 0.9 - (avgIdleDriftSec > 15 ? 15 : avgIdleDriftSec > 8 ? 8 : 0))));

  // Cognitive State classification
  let primaryStateSi = 'FOCUSED_FLOW (සන්සුන් අවධානය)';
  let descriptionSi = 'දරුවා මනා ඒකාග්‍රතාවයකින් සහ සන්සුන්ව ප්‍රශ්න වලට මුහුණ දී ඇත.';
  if (impulsiveRatePct > 25) {
    primaryStateSi = 'IMPULSIVE_GUESSING (නොසිතා ඉක්මන් වීම)';
    descriptionSi = 'තත්පර 2ට අඩු කාලයකදී නොසිතා ඉක්මනින් පිළිතුරු තේරීමේ නැඹුරුවක් ඇත. හෝඩුවාවන් බැලීමට දිරිමත් කළ යුතුය.';
  } else if (avgIdleDriftSec > 14) {
    primaryStateSi = 'INATTENTIVE_DRIFT (අවධානය ගිලිහීම)';
    descriptionSi = 'ප්‍රශ්නයක් අතරතුර ප්‍රතිචාර දැක්වීමට පෙර වැඩි වේලාවක් අක්‍රීයව සිටීමේ (Idle) ප්‍රවණතාවයක් ඇත.';
  } else if (totalHintsUsed >= 4 && skillScorePct >= 65) {
    primaryStateSi = 'PRODUCTIVE_STRUGGLE (උත්සාහවන්ත ඉගෙනුම)';
    descriptionSi = 'හෝඩුවාවන් උපයෝගී කරගනිමින් තනිවම වැරදි නිවැරදි කරගැනීමට සාර්ථකව උත්සාහ කරයි.';
  }

  // Format concepts list
  const concepts: ConceptBreakdown[] = Array.from(conceptMap.entries()).map(([cKey, val]) => {
    const acc = val.attempts > 0 ? Math.round((val.correct / val.attempts) * 100) : 0;
    let mastery = 'තව පුහුණු විය යුතුයි';
    if (acc >= 85) mastery = 'ඉහළ ප්‍රවීණතාවය (Mastered)';
    else if (acc >= 65) mastery = 'සාර්ථක අවබෝධය (Proficient)';
    else if (acc >= 40) mastery = 'වර්ධනය වෙමින් පවතී (Developing)';

    return {
      conceptKey: cKey,
      conceptNameSi: translateConcept(cKey),
      attempts: val.attempts,
      correct: val.correct,
      accuracyPct: acc,
      hintsUsed: val.hints,
      masteryLevelSi: mastery,
    };
  });

  const reversedAll = [...recentQuestions].reverse();

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
    completedAdventuresCount: completedAdventures,
    skillScorePct,
    hintAwareBktPct,
    standardBktPct,
    avgTimeSec,
    avgIdleDriftSec,
    attentionFocusPct,
    cognitiveStateSummary: {
      primaryStateSi,
      descriptionSi,
      impulsiveRatePct,
    },
    concepts,
    allQuestions: reversedAll,
    recentQuestions: reversedAll.slice(0, 15),
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
  const [filterType, setFilterType] = useState<'all' | 'adventure' | 'practice'>('all');
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

      const allLogsRes = await fetch('/api/telemetry/interactions?limit=250').catch(() => null);
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

      // Fetch dedicated logs for the target student to avoid missing adventure/practice events
      const studentLogsRes = await fetch(
        `/api/telemetry/interactions?studentId=${encodeURIComponent(targetStudent.learnerId)}&limit=250`
      ).catch(() => null);
      let studentLogs: InteractionEvent[] = [];
      if (studentLogsRes && studentLogsRes.ok) {
        const sJson = await studentLogsRes.json();
        if (Array.isArray(sJson.logs)) {
          studentLogs = sJson.logs;
        }
      }

      // Merge with any from allLogs if not present
      if (studentLogs.length === 0) {
        studentLogs = allLogs.filter(
          (l) => l.studentId === targetStudent.learnerId || l.learnerId === targetStudent.learnerId
        );
      }

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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">සම්පූර්ණ කළ ඉගෙනුම් චාරිකා:</span>
              <span className="font-extrabold text-blue-700">{data.completedAdventuresCount}</span>
            </div>
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">තනිවම විසඳූ ප්‍රශ්න:</span>
              <span className="font-extrabold text-emerald-700">{data.solvedAloneCount}</span>
            </div>
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">හෝඩුවාවන් (Hints) බලා විසඳූ ප්‍රශ්න:</span>
              <span className="font-extrabold text-purple-700">{data.solvedWithHintsCount}</span>
            </div>
            <div className="rounded-xl border border-mq-border p-3 flex items-center justify-between">
              <span className="text-mq-text">හදිසි/අවධානය ගිලිහුණු වැරදි:</span>
              <span className="font-extrabold text-amber-700">{data.rushedMistakesCount}</span>
            </div>
          </div>

          {/* ADHD Cognitive State & Knowledge Insights Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. ADHD Cognitive State */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-extrabold text-xs">
                <Brain size={16} className="text-sky-600" />
                <span>ADHD මානසික තත්ත්වය (Cognitive State)</span>
              </div>
              <p className="text-sm font-extrabold text-sky-950">
                {data.cognitiveStateSummary.primaryStateSi}
              </p>
              <p className="text-xs text-sky-800 leading-relaxed">
                {data.cognitiveStateSummary.descriptionSi}
              </p>
              <div className="pt-1.5 flex items-center justify-between text-xs font-bold text-sky-900 border-t border-sky-200/80">
                <span>නොසිතා එබීමේ ප්‍රතිශතය:</span>
                <span className="text-amber-700">{data.cognitiveStateSummary.impulsiveRatePct}%</span>
              </div>
            </div>

            {/* 2. Attention & Focus Meter */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                <Zap size={16} className="text-indigo-600" />
                <span>අවධානය සහ ඒකාග්‍රතාවය (Focus Index)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-700">{data.attentionFocusPct}%</span>
                <span className="text-xs font-bold text-indigo-900">
                  {data.attentionFocusPct >= 75 ? 'ඉතා හොඳයි' : data.attentionFocusPct >= 50 ? 'මධ්‍යස්ථයි' : 'අවධානය වෙනතක යාම් වැඩියි'}
                </span>
              </div>
              <div className="w-full bg-indigo-200/70 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.attentionFocusPct}%` }}
                />
              </div>
              <div className="pt-1.5 flex items-center justify-between text-xs font-bold text-indigo-900 border-t border-indigo-200/80">
                <span>ප්‍රතිචාර ප්‍රමාදය (Idle Drift):</span>
                <span>{data.avgIdleDriftSec > 0 ? `${data.avgIdleDriftSec}s` : 'සාමාන්‍යයි'}</span>
              </div>
            </div>

            {/* 3. Hint-Aware BKT vs Standard Knowledge */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                <TrendingUp size={16} className="text-emerald-600" />
                <span>AD-BKT දැනුම් මට්ටම (Knowledge Growth)</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-emerald-700">{data.hintAwareBktPct}%</span>
                  <p className="text-[11px] font-bold text-emerald-900">හෝඩුවා සහිත සැබෑ දැනුම</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-stone-600">{data.standardBktPct}%</span>
                  <p className="text-[11px] font-bold text-stone-600">සාම්ප්‍රදායික දැනුම</p>
                </div>
              </div>
              <p className="text-[11px] text-emerald-900 leading-tight pt-1">
                හෝඩුවාවන් (Hints) භාවිතය නිසා දරුවාගේ සැබෑ අවබෝධය සාම්ප්‍රදායික පරීක්ෂණයකට වඩා <b>+{Math.max(0, data.hintAwareBktPct - data.standardBktPct)}%</b> කින් ඉහළ ගොස් ඇත.
              </p>
            </div>
          </div>

          {/* Concepts Knowledge Breakdown */}
          {data.concepts.length > 0 && (
            <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-extrabold text-mq-text-strong flex items-center gap-2">
                  <span>📚 ගණිත සංකල්ප අනුව දරුවාගේ දැනුම (Concept Mastery Breakdown)</span>
                </h4>
                <span className="text-[11px] font-bold text-mq-text-muted">
                  සංකල්ප {data.concepts.length} ක් විශ්ලේෂණය විය
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.concepts.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-mq-border p-3 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-mq-text-strong truncate">
                        {c.conceptNameSi}
                      </span>
                      <span className="text-xs font-extrabold text-mq-primary">{c.accuracyPct}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.accuracyPct >= 80
                            ? 'bg-emerald-500'
                            : c.accuracyPct >= 60
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${c.accuracyPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-mq-text-muted pt-1">
                      <span>උත්සාහ: {c.attempts} (හරි: {c.correct})</span>
                      <span className="font-bold text-stone-700">{c.masteryLevelSi}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Log Table */}
          {data.allQuestions.length > 0 && (() => {
            const displayList = (
              filterType === 'all'
                ? data.allQuestions
                : data.allQuestions.filter((q) => q.sourceType === filterType)
            ).slice(0, 20);

            return (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-mq-text-strong">
                    ප්‍රශ්න අනුව පිළිතුරු දුන් ආකාරය (Question-by-Question Details)
                  </h4>
                  <div className="flex items-center gap-1.5 bg-mq-surface-soft p-1 rounded-xl border border-mq-border text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterType === 'all'
                          ? 'bg-white shadow-xs text-mq-primary font-extrabold'
                          : 'text-mq-text-muted hover:text-mq-text'
                      }`}
                    >
                      සියල්ල ({data.allQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('adventure')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterType === 'adventure'
                          ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                          : 'text-mq-text-muted hover:text-mq-text'
                      }`}
                    >
                      🗺️ ඉගෙනුම් චාරිකා ({data.allQuestions.filter((q) => q.sourceType === 'adventure').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('practice')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterType === 'practice'
                          ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                          : 'text-mq-text-muted hover:text-mq-text'
                      }`}
                    >
                      🎯 පුහුණුවීම් ({data.allQuestions.filter((q) => q.sourceType === 'practice').length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-mq-border">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-mq-surface-soft border-b border-mq-border text-mq-text-strong font-bold">
                        <th className="py-2.5 px-3">ප්‍රශ්නය / ඉගෙනුම් පියවර</th>
                        <th className="py-2.5 px-3">වර්ගය</th>
                        <th className="py-2.5 px-3">ප්‍රතිඵලය</th>
                        <th className="py-2.5 px-3">ගතවූ කාලය</th>
                        <th className="py-2.5 px-3">ඉතිරි කාලය</th>
                        <th className="py-2.5 px-3">හෝඩුවා (Hints)</th>
                        <th className="py-2.5 px-3">විස්තරය</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mq-border/70">
                      {displayList.map((q, idx) => (
                        <tr key={idx} className="hover:bg-mq-surface-soft/40">
                          <td className="py-2.5 px-3 font-bold text-mq-text-strong">{q.questionNo}</td>
                          <td className="py-2.5 px-3">
                            {q.sourceType === 'adventure' ? (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                ඉගෙනුම් චාරිකාව
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                පුහුණුව
                              </span>
                            )}
                          </td>
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
            );
          })()}
        </div>
      )}
    </section>
  );
};

export default DetailsForTeacher;

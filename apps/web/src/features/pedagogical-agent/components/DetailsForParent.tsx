import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Lightbulb,
  Clock,
  RefreshCw,
  Award,
  Sparkles,
} from 'lucide-react';
import type { InteractionEvent } from '../types/telemetry.types';

export interface DetailsForParentProps {
  parentId?: string;
  learnerId: string;
  studentName: string;
  grade?: number;
  className?: string;
}

interface SimpleParentData {
  hasData: boolean;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  solvedWithoutHelp: number;
  solvedWithHints: number;
  totalHintsUsed: number;
  carelessMistakesCount: number;
  skillScorePct: number;
  avgTimeSec: number;
  starsEarned: number;
  coinsEarned: number;
}

function summarizeForParent(
  logs: InteractionEvent[],
  savedProgress: Record<string, any> | null
): SimpleParentData {
  const answers = logs.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  const hasLogs = answers.length > 0;
  const hasProgress =
    savedProgress &&
    ((Array.isArray(savedProgress.completedSteps) && savedProgress.completedSteps.length > 0) ||
      (typeof savedProgress.hintAwareKnowledge === 'number' && savedProgress.hintAwareKnowledge > 0.21));

  if (!hasLogs && !hasProgress) {
    return {
      hasData: false,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      solvedWithoutHelp: 0,
      solvedWithHints: 0,
      totalHintsUsed: 0,
      carelessMistakesCount: 0,
      skillScorePct: 0,
      avgTimeSec: 0,
      starsEarned: savedProgress?.stars ?? 0,
      coinsEarned: savedProgress?.coins ?? 0,
    };
  }

  let correctAnswers = 0;
  let wrongAnswers = 0;
  let solvedWithoutHelp = 0;
  let solvedWithHints = 0;
  let totalHintsUsed = 0;
  let carelessMistakesCount = 0;
  const rts: number[] = [];

  for (const ev of answers) {
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

    if (isCorrect) {
      correctAnswers++;
      if (hintLvl === 0) solvedWithoutHelp++;
      else solvedWithHints++;
    } else {
      wrongAnswers++;
      if (rtMs < 1800 || (ev.idleTimeBeforeFirstActionMs && ev.idleTimeBeforeFirstActionMs >= 12000)) {
        carelessMistakesCount++;
      }
    }
  }

  if (!hasLogs && savedProgress) {
    const completed = Array.isArray(savedProgress.completedSteps)
      ? savedProgress.completedSteps.length
      : 0;
    correctAnswers = completed;
    totalHintsUsed = savedProgress.totalHintsUsed || 0;
    solvedWithHints = Math.min(completed, totalHintsUsed > 0 ? Math.ceil(totalHintsUsed / 2) : 0);
    solvedWithoutHelp = Math.max(0, completed - solvedWithHints);
  }

  const totalQuestions = correctAnswers + wrongAnswers;
  const rawMastery =
    typeof savedProgress?.hintAwareKnowledge === 'number' && savedProgress.hintAwareKnowledge > 0.2
      ? Math.round(savedProgress.hintAwareKnowledge * 100)
      : totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  const avgTimeSec =
    rts.length > 0 ? Number((rts.reduce((a, b) => a + b, 0) / rts.length / 1000).toFixed(1)) : 0;

  return {
    hasData: true,
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    solvedWithoutHelp,
    solvedWithHints,
    totalHintsUsed,
    carelessMistakesCount,
    skillScorePct: rawMastery,
    avgTimeSec,
    starsEarned: savedProgress?.stars ?? 100,
    coinsEarned: savedProgress?.coins ?? 50,
  };
}

export const DetailsForParent: React.FC<DetailsForParentProps> = ({
  parentId,
  learnerId,
  studentName,
  className = '',
}) => {
  const [data, setData] = useState<SimpleParentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!learnerId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        studentId: learnerId,
        learnerId,
        limit: '60',
      });
      if (parentId) params.set('parentId', parentId);

      const [logsRes, progRes] = await Promise.all([
        fetch(`/api/telemetry/interactions?${params.toString()}`).catch(() => null),
        fetch(`/api/telemetry/student-progress?${params.toString()}`).catch(() => null),
      ]);

      let logs: InteractionEvent[] = [];
      let savedProgress: Record<string, any> | null = null;

      if (logsRes && logsRes.ok) {
        const logsJson = await logsRes.json();
        if (Array.isArray(logsJson.logs)) logs = logsJson.logs;
      }

      if (progRes && progRes.ok) {
        const progJson = await progRes.json();
        if (progJson.success && progJson.progress) savedProgress = progJson.progress;
      }

      if (!savedProgress && typeof window !== 'undefined') {
        try {
          const localKey = `mq_student_progress_${parentId || 'parent_demo'}__${learnerId}`;
          const raw = localStorage.getItem(localKey);
          if (raw) savedProgress = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      setData(summarizeForParent(logs, savedProgress));
    } catch {
      setData(summarizeForParent([], null));
    } finally {
      setIsLoading(false);
    }
  }, [parentId, learnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <section className={`bg-white rounded-3xl border border-mq-border p-5 shadow-sm ${className}`}>
        <div className="flex items-center gap-2 text-mq-text-muted text-sm font-semibold">
          <RefreshCw size={16} className="animate-spin text-mq-primary" />
          <span>{studentName} ගේ ක්‍රීඩා තොරතුරු ලබාගනිමින්...</span>
        </div>
      </section>
    );
  }

  if (!data || !data.hasData) {
    return (
      <section className={`bg-white rounded-3xl border border-mq-border p-5 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-mq-text-strong">
              {studentName} ගේ ගණිත පුහුණු සාරාංශය
            </h3>
            <p className="text-sm text-mq-text-muted mt-1">
              {studentName} තවමත් ගණිත පුහුණු ක්‍රීඩාව ආරම්භ කර නැත. ක්‍රීඩා කළ පසු ලකුණු සහ ප්‍රශ්න විස්තර මෙහි පෙන්වයි.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-bold text-mq-primary hover:underline px-3 py-1.5 rounded-full bg-mq-surface-soft border border-mq-border cursor-pointer"
          >
            නැවත බලන්න
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Child Practice Details for Parent"
      className={`bg-white rounded-3xl border border-mq-border shadow-sm overflow-hidden ${className}`}
    >
      {/* Simple Header */}
      <div className="bg-mq-surface-blue/60 px-5 py-4 border-b border-mq-border flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-mq-text-strong">
            🎮 {studentName} ගේ ගණිත පුහුණු විස්තර (Practice Summary)
          </h3>
          <p className="text-xs sm:text-sm text-mq-text-muted">
            දරුවා ගණිත ක්‍රීඩාවේදී පිළිතුරු දුන් ආකාරය පිළිබඳ සරල සාරාංශය
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-mq-primary px-3 py-1.5 rounded-full bg-white border border-mq-border cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>යාවත්කාලීන කරන්න</span>
        </button>
      </div>

      {/* Clean, Easy-to-Understand Summary Grid */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Overall Score */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center">
            <Award size={22} className="mx-auto text-emerald-600" />
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{data.skillScorePct}%</p>
            <p className="text-xs font-bold text-emerald-950">පාඩමේ සාර්ථකත්වය</p>
          </div>

          {/* 2. Correct vs Wrong */}
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/50 p-3.5 text-center">
            <CheckCircle2 size={22} className="mx-auto text-sky-600" />
            <p className="text-2xl font-extrabold text-mq-text-strong mt-1">
              {data.correctAnswers} / {data.totalQuestions}
            </p>
            <p className="text-xs font-bold text-mq-text">නිවැරදි පිළිතුරු</p>
          </div>

          {/* 3. Solved Alone vs With Hints */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 text-center">
            <Lightbulb size={22} className="mx-auto text-purple-600" />
            <p className="text-2xl font-extrabold text-purple-700 mt-1">{data.solvedWithoutHelp}</p>
            <p className="text-xs font-bold text-purple-950">
              තනිවම විසඳූ ප්‍රශ්න (උදව්වෙන්: {data.solvedWithHints})
            </p>
          </div>

          {/* 4. Average Time per Question */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-center">
            <Clock size={22} className="mx-auto text-amber-600" />
            <p className="text-2xl font-extrabold text-amber-800 mt-1">
              {data.avgTimeSec > 0 ? `${data.avgTimeSec}s` : '—'}
            </p>
            <p className="text-xs font-bold text-amber-950">ප්‍රශ්නයකට ගතවූ සාමාන්‍ය කාලය</p>
          </div>
        </div>

        {/* Simple 3-row breakdown table */}
        <div className="rounded-2xl border border-mq-border divide-y divide-mq-border/70 text-sm">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-mq-text">උදව් (Hints) නොමැතිව තනිවම හරි උත්තර දුන් ප්‍රශ්න</span>
            <span className="font-extrabold text-emerald-700">{data.solvedWithoutHelp}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-mq-text">3D සහායකයාගේ හෝඩුවාවන් (Hints) බලා විසඳූ ප්‍රශ්න</span>
            <span className="font-extrabold text-purple-700">
              {data.solvedWithHints} (මුළු හෝඩුවාවන්: {data.totalHintsUsed})
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-mq-text">වැරදුණු උත්සාහයන් (ඉන් හදිසි/අවධානය ගිලිහුණු අවස්ථා)</span>
            <span className="font-extrabold text-amber-700">
              {data.wrongAnswers} (හදිසි එබීම්: {data.carelessMistakesCount})
            </span>
          </div>
        </div>

        {data.carelessMistakesCount > 0 && (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-xs sm:text-sm text-sky-950 flex items-center gap-2.5">
            <Sparkles size={18} className="text-sky-600 shrink-0" />
            <span>
              <b>විශේෂ සටහන:</b> දරුවා කලබලයෙන් හෝ අවධානය ගිලිහීමෙන් වැරදි ලෙස එබූ අවස්ථා{' '}
              <b>{data.carelessMistakesCount}ක්</b> තිබුණු අතර, ඒවා නිසා දරුවාගේ සැබෑ ලකුණු අඩු කර නැත.
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default DetailsForParent;

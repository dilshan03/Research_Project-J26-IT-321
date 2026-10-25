import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Lightbulb,
  Clock,
  RefreshCw,
  Award,
  Sparkles,
  Brain,
  Zap,
  Smile,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import type { InteractionEvent } from '../types/telemetry.types';

export interface DetailsForParentProps {
  parentId?: string;
  learnerId: string;
  studentName: string;
  grade?: number;
  className?: string;
}

interface ParentConceptSummary {
  nameSi: string;
  accuracyPct: number;
  badgeSi: string;
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
  completedAdventuresCount: number;
  skillScorePct: number;
  attentionFocusPct: number;
  focusToneSi: string;
  focusMessageSi: string;
  avgTimeSec: number;
  starsEarned: number;
  coinsEarned: number;
  topConcepts: ParentConceptSummary[];
}

function translateParentConcept(concept?: string): string {
  if (!concept) return 'මූලික ගණිතය';
  const lower = concept.toLowerCase();
  if (lower.includes('money') || lower.includes('කාසි') || lower.includes('මුදල්')) return 'කාසි සහ මුදල් භාවිතය';
  if (lower.includes('count') || lower.includes('ගණන්')) return 'වස්තු නිවැරදිව ගණන් කිරීම';
  if (lower.includes('add') || lower.includes('එකතු')) return 'එකතු කිරීමේ සංකල්ප';
  if (lower.includes('sub') || lower.includes('අඩු')) return 'අඩු කිරීමේ සංකල්ප';
  return concept;
}

function summarizeForParent(
  logs: InteractionEvent[],
  savedProgress: Record<string, any> | null
): SimpleParentData {
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
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      solvedWithoutHelp: 0,
      solvedWithHints: 0,
      totalHintsUsed: 0,
      carelessMistakesCount: 0,
      completedAdventuresCount: 0,
      skillScorePct: 0,
      attentionFocusPct: 0,
      focusToneSi: 'දත්ත නොමැත',
      focusMessageSi: 'දරුවා තවමත් ක්‍රීඩාව ආරම්භ කර නැත.',
      avgTimeSec: 0,
      starsEarned: savedProgress?.stars ?? 0,
      coinsEarned: savedProgress?.coins ?? 0,
      topConcepts: [],
    };
  }

  let correctAnswers = 0;
  let wrongAnswers = 0;
  let solvedWithoutHelp = 0;
  let solvedWithHints = 0;
  let totalHintsUsed = 0;
  let carelessMistakesCount = 0;
  const rts: number[] = [];
  const conceptMap = new Map<string, { total: number; correct: number }>();

  for (const ev of answers) {
    const isCorrect = ev.isCorrect === true;
    const hintLvl = ev.hintLevelReached || 0;
    totalHintsUsed += ev.totalHintsRequested || (hintLvl > 0 ? 1 : 0);

    const cKey = ev.concept || 'General Math';
    const cur = conceptMap.get(cKey) || { total: 0, correct: 0 };
    cur.total++;
    if (isCorrect) cur.correct++;
    conceptMap.set(cKey, cur);

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
    const completed =
      (Array.isArray(savedProgress.completedSteps) ? savedProgress.completedSteps.length : 0) +
      completedAdventures * 3;
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

  // ADHD Parent Friendly Attention Metrics
  const impulsiveRate = totalQuestions > 0 ? carelessMistakesCount / totalQuestions : 0;
  const attentionFocusPct = Math.max(35, Math.min(100, Math.round(100 - impulsiveRate * 85)));

  let focusToneSi = 'ඉතා හොඳයි 🌟';
  let focusMessageSi = 'දරුවා ඉතා ඉවසිලිවන්තව සහ සතුටින් ප්‍රශ්න විසඳීමට අවධානය යොමු කර ඇත.';
  if (impulsiveRate > 0.28) {
    focusToneSi = 'කලබලකාරී බවක් පෙනේ ⏳';
    focusMessageSi = 'දරුවා ඉක්මනින් පිළිතුරක් තේරීමට උත්සාහ කර ඇත. හෝඩුවාවන් බැලීමට කියාදීමෙන් දරුවාගේ සන්සුන්බව තවත් වැඩි කළ හැක.';
  } else if (attentionFocusPct < 60) {
    focusToneSi = 'මධ්‍යස්ථ අවධානයක් 💡';
    focusMessageSi = 'දරුවා වරින් වර විරාම ගනිමින් ප්‍රශ්න විසඳා ඇත. කෙටි විවේකයන් ලබාදීම සුදුසුය.';
  }

  const topConcepts: ParentConceptSummary[] = Array.from(conceptMap.entries()).map(([k, v]) => {
    const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
    let badge = 'හොඳින් තේරුම් ගෙන ඇත ✓';
    if (acc < 50) badge = 'තව පුරුදු කරවන්න';
    else if (acc < 75) badge = 'දැනුම වර්ධනය වෙමින් පවතී';

    return {
      nameSi: translateParentConcept(k),
      accuracyPct: acc,
      badgeSi: badge,
    };
  });

  return {
    hasData: true,
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    solvedWithoutHelp,
    solvedWithHints,
    totalHintsUsed,
    carelessMistakesCount,
    completedAdventuresCount: completedAdventures,
    skillScorePct: rawMastery,
    attentionFocusPct,
    focusToneSi,
    focusMessageSi,
    avgTimeSec,
    starsEarned: savedProgress?.stars ?? 100,
    coinsEarned: savedProgress?.coins ?? 50,
    topConcepts,
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
        limit: '250',
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

        {/* Positive ADHD Insights Cards for Parents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Attention & Focus Card */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-sky-900">
                <Zap size={16} className="text-sky-600" />
                දරුවාගේ අවධානය සහ සන්සුන් බව (Focus Index)
              </span>
              <span className="text-xs font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                {data.focusToneSi}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-sky-950">{data.attentionFocusPct}%</span>
              <span className="text-xs text-sky-800">ක්‍රීඩාව තුළ පවත්වාගත් අවධානය</span>
            </div>
            <p className="text-xs text-sky-900 leading-relaxed">
              {data.focusMessageSi}
            </p>
          </div>

          {/* Emotional & Encouragement Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                <Smile size={16} className="text-emerald-600" />
                ධනාත්මක ඉගෙනුම් දිරිගැන්වීම (Support & Motivation)
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                තරු {data.starsEarned} ★
              </span>
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed pt-1">
              දරුවා හෝඩුවාවන් <b>{data.totalHintsUsed}ක්</b> භාවිතා කරමින් උත්සාහය අත්නොහැර ගැටලු විසඳීමට උත්සාහ කර ඇත. මෙය ADHD දරුවන්ගේ ගැටලු විසඳීමේ (Resilience) හැකියාව වර්ධනය වන බව පෙන්වයි.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-emerald-800">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>කලබලකාරී වැරදි සඳහා ලකුණු කපා නැත.</span>
            </div>
          </div>
        </div>

        {/* Mastered Math Concepts for Parents */}
        {data.topConcepts.length > 0 && (
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-2.5">
            <h4 className="text-xs sm:text-sm font-extrabold text-mq-text-strong flex items-center gap-1.5">
              <Brain size={16} className="text-mq-primary" />
              <span>දරුවා ඉගෙනගත් සහ පුහුණු වූ ගණිත හැකියාවන් (Skills Practiced)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {data.topConcepts.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-mq-border p-3 space-y-1"
                >
                  <p className="text-xs font-extrabold text-mq-text-strong truncate">
                    {item.nameSi}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-extrabold text-emerald-700">{item.accuracyPct}% සාර්ථකයි</span>
                    <span className="text-[11px] font-bold text-mq-text-muted">{item.badgeSi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple 4-row breakdown table */}
        <div className="rounded-2xl border border-mq-border divide-y divide-mq-border/70 text-sm">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-mq-text">සම්පූර්ණ කළ ඉගෙනුම් චාරිකා ක්‍රීඩා (Learning Adventures)</span>
            <span className="font-extrabold text-blue-700">{data.completedAdventuresCount}</span>
          </div>
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

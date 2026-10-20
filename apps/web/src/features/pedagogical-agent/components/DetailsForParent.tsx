import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Brain,
  Clock,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  RefreshCw,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import type { InteractionEvent } from '../types/telemetry.types';

export interface DetailsForParentProps {
  parentId?: string;
  learnerId: string;
  studentName: string;
  grade?: number;
  className?: string;
}

interface ParentFriendlyReport {
  hasData: boolean;
  totalQuestionsAttempted: number;
  correctCount: number;
  wrongCount: number;
  independentSolves: number;
  hintAssistedSolves: number;
  totalHintsUsed: number;
  attentionSlipsProtected: number;
  trueConceptErrors: number;
  adBktMasteryPct: number;
  standardBktMasteryPct: number;
  savedMasteryPct: number;
  memoryStabilityDays: number;
  retentionPct: number;
  nextReviewDays: number;
  revisionDue: boolean;
  avgResponseTimeSec: number;
  optimalFocusWindowMin: number;
  lastCognitiveState: string;
  lastUpdatedAt: string | null;
}

/**
 * Translates raw database telemetry (`pedagogical_interactions` & `pedagogical_student_progress`)
 * into warm, non-technical Sinhala & English insights for Parents.
 */
function buildParentFriendlyReport(
  logs: InteractionEvent[],
  savedProgress: Record<string, any> | null
): ParentFriendlyReport {
  const answerEvents = logs.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  const hasLogs = answerEvents.length > 0;
  const hasSavedProgress =
    savedProgress &&
    ((Array.isArray(savedProgress.completedSteps) && savedProgress.completedSteps.length > 0) ||
      (typeof savedProgress.hintAwareKnowledge === 'number' && savedProgress.hintAwareKnowledge > 0.21));

  if (!hasLogs && !hasSavedProgress) {
    return {
      hasData: false,
      totalQuestionsAttempted: 0,
      correctCount: 0,
      wrongCount: 0,
      independentSolves: 0,
      hintAssistedSolves: 0,
      totalHintsUsed: 0,
      attentionSlipsProtected: 0,
      trueConceptErrors: 0,
      adBktMasteryPct: 20,
      standardBktMasteryPct: 20,
      savedMasteryPct: 0,
      memoryStabilityDays: 3.0,
      retentionPct: 100,
      nextReviewDays: 1,
      revisionDue: false,
      avgResponseTimeSec: 0,
      optimalFocusWindowMin: 8,
      lastCognitiveState: 'NORMAL',
      lastUpdatedAt: null,
    };
  }

  let p_ad = 0.2;
  let p_std = 0.2;
  let stability = 3.0;
  let independentSolves = 0;
  let hintAssistedSolves = 0;
  let attentionSlipsProtected = 0;
  let trueConceptErrors = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let totalHintsUsed = 0;
  const seenRts: number[] = [];

  // Process in chronological order
  const chronological = [...answerEvents].sort(
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

    let rtZ = 0;
    if (seenRts.length >= 3) {
      const logRts = seenRts.map((r) => Math.log(Math.max(100, r)));
      const meanLog = logRts.reduce((a, b) => a + b, 0) / logRts.length;
      const stdLog = Math.max(
        0.25,
        Math.sqrt(logRts.reduce((acc, v) => acc + Math.pow(v - meanLog, 2), 0) / logRts.length)
      );
      rtZ = (Math.log(Math.max(100, rtMs)) - meanLog) / stdLog;
    }
    seenRts.push(rtMs);

    const inatt = ev.idleTimeBeforeFirstActionMs
      ? Math.min(1, ev.idleTimeBeforeFirstActionMs / 20000)
      : 0.1;
    const isImpulsiveErr = !isCorrect && rtMs < 1800;
    const isAttentionSlip = !isCorrect && (isImpulsiveErr || Math.abs(rtZ) >= 1.5 || inatt >= 0.55);

    const effSlip = isAttentionSlip ? 0.62 : Math.max(0.18, Math.min(0.45, 0.18 + 0.22 * inatt));
    const hintFraction = Math.max(0, Math.min(1, hintLvl / 4));

    if (isCorrect) {
      correctCount++;
      if (hintLvl <= 1) independentSolves++;
      else hintAssistedSolves++;

      const effGuess = 0.25 + 0.85 * hintFraction * 0.75;
      const numAD = p_ad * (1 - effSlip);
      const denAD = numAD + (1 - p_ad) * effGuess;
      const postAD = denAD > 0 ? numAD / denAD : p_ad;
      p_ad = Math.max(p_ad, Math.min(1, postAD + (1 - postAD) * 0.15 * (1 - 0.3 * inatt)));

      const numStd = p_std * 0.82;
      const denStd = numStd + (1 - p_std) * 0.25;
      const postStd = denStd > 0 ? numStd / denStd : p_std;
      p_std = Math.max(p_std, Math.min(1, postStd + (1 - postStd) * 0.15));

      if (hintLvl === 0 && inatt < 0.6) {
        stability = Math.min(30, stability * (1 + 0.35 * (1 - inatt)));
      } else {
        stability = Math.min(30, stability * (1 + 0.1 * (1 - hintFraction)));
      }
    } else {
      wrongCount++;
      const numStd = p_std * 0.18;
      const denStd = numStd + (1 - p_std) * 0.75;
      p_std = Math.min(p_std * 0.95, denStd > 0 ? numStd / denStd : p_std);

      if (isAttentionSlip) {
        attentionSlipsProtected++;
        p_ad = Math.max(p_ad * 0.96, p_ad * 0.97);
      } else {
        trueConceptErrors++;
        const numAD = p_ad * effSlip;
        const denAD = numAD + (1 - p_ad) * 0.75;
        p_ad = Math.min(p_ad * 0.95, denAD > 0 ? numAD / denAD : p_ad);
        stability = Math.max(1.0, stability * 0.85);
      }
    }
  }

  // Fallback to savedProgress summary if interaction stream was empty
  if (!hasLogs && savedProgress) {
    const completedCount = Array.isArray(savedProgress.completedSteps)
      ? savedProgress.completedSteps.length
      : 0;
    correctCount = completedCount;
    totalHintsUsed = savedProgress.totalHintsUsed || 0;
    hintAssistedSolves = Math.min(completedCount, totalHintsUsed > 0 ? Math.ceil(totalHintsUsed / 2) : 0);
    independentSolves = Math.max(0, completedCount - hintAssistedSolves);
    p_ad = typeof savedProgress.hintAwareKnowledge === 'number' ? savedProgress.hintAwareKnowledge : 0.65;
    p_std = typeof savedProgress.standardKnowledge === 'number' ? savedProgress.standardKnowledge : 0.65;
    stability = Math.max(2.5, 2.0 + completedCount * 0.45);
  }

  const lastTimestamp =
    chronological.length > 0
      ? chronological[chronological.length - 1].timestamp
      : savedProgress?.updatedAt || null;

  const elapsedDays = lastTimestamp
    ? Math.max(0, (Date.now() - new Date(lastTimestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const retentionScore = elapsedDays > 0.05 ? Math.exp(-elapsedDays / stability) : 1.0;
  const nextReviewDays = Math.max(1, Math.round(-stability * Math.log(0.7)));
  const avgRtSec =
    seenRts.length > 0
      ? Number((seenRts.reduce((a, b) => a + b, 0) / seenRts.length / 1000).toFixed(1))
      : 5.2;

  const adPct = Math.round(p_ad * 100);
  const stdPct = Math.round(p_std * 100);

  return {
    hasData: true,
    totalQuestionsAttempted: correctCount + wrongCount,
    correctCount,
    wrongCount,
    independentSolves,
    hintAssistedSolves,
    totalHintsUsed,
    attentionSlipsProtected,
    trueConceptErrors,
    adBktMasteryPct: adPct,
    standardBktMasteryPct: stdPct,
    savedMasteryPct: Math.max(0, adPct - stdPct),
    memoryStabilityDays: Number(stability.toFixed(1)),
    retentionPct: Math.round(retentionScore * 100),
    nextReviewDays,
    revisionDue: retentionScore < 0.7,
    avgResponseTimeSec: avgRtSec,
    optimalFocusWindowMin: avgRtSec < 4 ? 6 : 10,
    lastCognitiveState: savedProgress?.lastCognitiveState || 'FOCUSED_FLOW',
    lastUpdatedAt: lastTimestamp,
  };
}

export const DetailsForParent: React.FC<DetailsForParentProps> = ({
  parentId,
  learnerId,
  studentName,
  className = '',
}) => {
  const [report, setReport] = useState<ParentFriendlyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchParentData = useCallback(async () => {
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
        if (Array.isArray(logsJson.logs)) {
          logs = logsJson.logs;
        }
      }

      if (progRes && progRes.ok) {
        const progJson = await progRes.json();
        if (progJson.success && progJson.progress) {
          savedProgress = progJson.progress;
        }
      }

      // Check localStorage fallback if backend had no saved progress yet
      if (!savedProgress && typeof window !== 'undefined') {
        try {
          const localKey = `mq_student_progress_${parentId || 'parent_demo'}__${learnerId}`;
          const raw = localStorage.getItem(localKey);
          if (raw) savedProgress = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      setReport(buildParentFriendlyReport(logs, savedProgress));
    } catch (err) {
      console.warn('[DetailsForParent] Error loading report:', err);
      setReport(buildParentFriendlyReport([], null));
    } finally {
      setIsLoading(false);
    }
  }, [parentId, learnerId]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  if (isLoading) {
    return (
      <section className={`bg-white rounded-3xl border border-mq-border p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 text-mq-text-muted text-sm font-semibold">
          <RefreshCw size={18} className="animate-spin text-mq-primary" />
          <span>{studentName} ගේ බුද්ධිමත් ඉගෙනුම් වාර්තාව සකසමින් පවතී...</span>
        </div>
      </section>
    );
  }

  // Provide realistic demo preview if child hasn't played yet, clearly labeled
  const isPreview = !report || !report.hasData;
  const activeReport: ParentFriendlyReport =
    report && report.hasData
      ? report
      : {
          hasData: false,
          totalQuestionsAttempted: 8,
          correctCount: 6,
          wrongCount: 2,
          independentSolves: 4,
          hintAssistedSolves: 2,
          totalHintsUsed: 3,
          attentionSlipsProtected: 1,
          trueConceptErrors: 1,
          adBktMasteryPct: 78,
          standardBktMasteryPct: 58,
          savedMasteryPct: 20,
          memoryStabilityDays: 4.2,
          retentionPct: 92,
          nextReviewDays: 2,
          revisionDue: false,
          avgResponseTimeSec: 5.4,
          optimalFocusWindowMin: 8,
          lastCognitiveState: 'FOCUSED_FLOW',
          lastUpdatedAt: null,
        };

  const skillStatus =
    activeReport.adBktMasteryPct >= 85
      ? {
          badge: '🏆 ඉතා හොඳින් ප්‍රගුණ කර ඇත (Mastered)',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          barColor: 'bg-emerald-500',
          desc: `${studentName} එකතු කිරීමේ ගණිත ක්‍රමය ඉතා හොඳින් තේරුම් ගෙන ඇත.`,
        }
      : activeReport.adBktMasteryPct >= 55
      ? {
          badge: '🌱 හොඳින් දියුණු වෙමින් පවතී (Developing Well)',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
          barColor: 'bg-sky-500',
          desc: `${studentName} පාඩම හොඳින් ඉගෙන ගනිමින් සිටියි. තව පොඩි පුහුණුවකින් සම්පූර්ණ ප්‍රගුණතාව ලබාගත හැක.`,
        }
      : {
          badge: '🤝 වැඩිදුර මඟපෙන්වීම අවශ්‍යයි (Needs Gentle Support)',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
          desc: `${studentName} හට මෙම පාඩම තවදුරටත් හෝඩුවාවන් සහ රූප සටහන් ආධාරයෙන් පැහැදිලි කර දෙන්න.`,
        };

  return (
    <section
      aria-label="Parent Pedagogical Insights"
      className={`bg-white rounded-3xl border border-mq-border shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-mq-surface-blue via-white to-emerald-50/70 px-5 sm:px-6 py-4 border-b border-mq-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-mq-primary text-white flex items-center justify-center shadow-xs shrink-0">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-mq-text-strong">
                දරුවාගේ ඉගෙනුම් සහ අවධාන වාර්තාව (Parent Insight Summary)
              </h3>
              {isPreview && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  නිදසුන් දත්ත · Sample Preview
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-mq-text-muted">
              3D ගුරු සහායකයා සහ AD-BKT බුද්ධිමත් පද්ධතිය මඟින් දෙමාපියන්ට තේරෙන සරල බසින් සකසන ලද වාර්තාව
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchParentData}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-mq-primary hover:underline px-3 py-1.5 rounded-full bg-white border border-mq-border cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>යාවත්කාලීන කරන්න</span>
        </button>
      </div>

      {/* Main 4 Simple Insight Cards for Parents */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: True Math Mastery & ADHD Slip Protection */}
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-mq-text-strong">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span>1. සැබෑ ගණිත හැකියාව (True Skill Mastery)</span>
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${skillStatus.color}`}>
                {activeReport.adBktMasteryPct}%
              </span>
            </div>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${skillStatus.barColor}`}
                style={{ width: `${activeReport.adBktMasteryPct}%` }}
              />
            </div>

            <p className="text-sm text-mq-text-strong font-medium leading-relaxed">{skillStatus.desc}</p>

            {activeReport.attentionSlipsProtected > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">අවධානය ගිලිහුණු අවස්ථා ආරක්ෂා කර ඇත: </span>
                  දරුවා පාඩම දැන සිටියත් හදිසි වීම නිසා සිදුවූ අතපසුවීම්{' '}
                  <b>{activeReport.attentionSlipsProtected}ක්</b> හඳුනාගෙන, දරුවාගේ ලකුණු අසාධාරණ ලෙස අඩු වීමෙන් වළක්වා ඇත.
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Why Mistakes Happened (Careless Slip vs Concept Difficulty) */}
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-mq-text-strong">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <span>2. වැරදීම් සිදුවූ ආකාරය (Why Mistakes Happened)</span>
              </span>
              <span className="text-xs font-bold text-mq-text-muted">
                මුළු ප්‍රශ්න: {activeReport.totalQuestionsAttempted}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                <p className="text-lg font-extrabold text-emerald-700">{activeReport.correctCount}</p>
                <p className="text-xs font-semibold text-emerald-900">නිවැරදි පිළිතුරු</p>
              </div>
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5">
                <p className="text-lg font-extrabold text-sky-700">{activeReport.attentionSlipsProtected}</p>
                <p className="text-xs font-semibold text-sky-900">හදිසි අතපසුවීම්</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
                <p className="text-lg font-extrabold text-amber-700">{activeReport.trueConceptErrors}</p>
                <p className="text-xs font-semibold text-amber-900">පාඩමේ අපහසුතා</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-mq-text leading-relaxed">
              {activeReport.attentionSlipsProtected >= activeReport.trueConceptErrors
                ? `💡 ${studentName} ට ගණිත ක්‍රමය හොඳින් පුළුවන්! වැරදුණු අවස්ථා බොහොමයක් සිදුවී ඇත්තේ ප්‍රශ්නය සම්පූර්ණයෙන් කියවීමට පෙර කලබලයෙන් පිළිතුරු එබීම නිසාය.`
                : `💡 ${studentName} හට සමහර ගණිත පියවර තනිවම මතක් කරගැනීමට අපහසු වූ නිසා 3D සහායකයා විසින් පියවරෙන් පියවර හෝඩුවාවන් ලබා දෙන ලදී.`}
            </p>
          </div>

          {/* Card 3: Independence vs Hint Support */}
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-mq-text-strong">
                <Lightbulb size={18} className="text-purple-600 shrink-0" />
                <span>3. තනිවම ගණන් හැදීමේ හැකියාව (Independence)</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                හෝඩුවාවන් {activeReport.totalHintsUsed}යි
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border border-mq-border p-3 flex items-center gap-3">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-lg font-extrabold text-mq-text-strong">{activeReport.independentSolves}</p>
                  <p className="text-xs text-mq-text-muted">උදව් නැතිව තනිවම විසඳූ ප්‍රශ්න</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-mq-border p-3 flex items-center gap-3">
                <Lightbulb size={22} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-lg font-extrabold text-mq-text-strong">{activeReport.hintAssistedSolves}</p>
                  <p className="text-xs text-mq-text-muted">හෝඩුවාවන් උදව්වෙන් විසඳූ ප්‍රශ්න</p>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-mq-text leading-relaxed">
              {activeReport.independentSolves >= activeReport.hintAssistedSolves
                ? `🌟 විශිෂ්ටයි! ${studentName} බොහෝ ප්‍රශ්න කිසිම උදව්වක් නැතිව තනිවම විසඳා ඇත.`
                : `🤝 ${studentName} 3D ගුරු සහායකයාගේ හෝඩුවාවන් (Hints) භාවිතා කරමින් උත්සාහය අත්නොහැර ප්‍රශ්න විසඳා ඇත.`}
            </p>
          </div>

          {/* Card 4: Memory Health & Next Practice Day (Step 4 Spaced Revision) */}
          <div className="rounded-2xl border border-mq-border bg-mq-surface-soft/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-mq-text-strong">
                <CalendarClock size={18} className="text-sky-600 shrink-0" />
                <span>4. මතකයේ රැඳීම සහ මීළඟ පුහුණුව (Memory & Schedule)</span>
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  activeReport.revisionDue
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                මතකය: {activeReport.retentionPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-white border border-mq-border p-2.5">
                <span className="text-mq-text-muted block">මීළඟ පුනරීක්ෂණය:</span>
                <span className="text-sm font-extrabold text-mq-primary">
                  {activeReport.revisionDue
                    ? '🔔 අදම විනාඩි 5ක් පුහුණු කරවන්න'
                    : `📅 තව දින ${activeReport.nextReviewDays}කින්`}
                </span>
              </div>
              <div className="rounded-xl bg-white border border-mq-border p-2.5">
                <span className="text-mq-text-muted block">හොඳම අවධාන කාලය:</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  ⏱️ වරකට විනාඩි {activeReport.optimalFocusWindowMin}ක්
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-mq-text leading-relaxed">
              {activeReport.revisionDue
                ? `🔔 අවසන් පුහුණුවෙන් පසු දින කිහිපයක් ගතවී ඇති නිසා අලුත් පාඩමකට යාමට පෙර අද විනාඩි 5ක කෙටි පුනරීක්ෂණයක් (Warm-up) කරවන්න.`
                : `✅ දරුවා උගත් කරුණු හොඳින් මතකයේ තබාගෙන සිටියි (මතක ශක්තිය දින ${activeReport.memoryStabilityDays}ක් පවතී).`}
            </p>
          </div>
        </div>

        {/* Actionable Parent Home Tips Box */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50/90 via-white to-sky-50/80 border border-amber-200/80 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-mq-text-strong">
            <HeartHandshake size={19} className="text-amber-600 shrink-0" />
            <span>දෙමාපියන් සඳහා නිවසේදී කළ හැකි සරල උපදෙස් (Actionable Home Tips for {studentName})</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-mq-text list-disc pl-5">
            <li>
              <b>කෙටි පුහුණු සැසි (Short Focus Bursts):</b> {studentName} ගේ හොඳම අවධානය පවතින්නේ මුල්{' '}
              <b>විනාඩි {activeReport.optimalFocusWindowMin}</b> තුළ බැවින්, එකදිගට දිගු වේලාවක් කරවීම වෙනුවට ප්‍රශ්න 5–8ක කෙටි සැසි ලබා දෙන්න.
            </li>
            <li>
              <b>හදිසි පිළිතුරු පාලනය (Impulse Pause):</b> දරුවාගේ සාමාන්‍ය පිළිතුරු දීමේ වේගය{' '}
              <b>තත්පර {activeReport.avgResponseTimeSec}ක්</b> පමණ වේ. පිළිතුර තේරීමට පෙර ප්‍රශ්නය හඬනඟා කියවීමට දරුවා දිරිමත් කරන්න.
            </li>
            <li>
              <b>උත්සාහය අගය කරන්න (Praise Effort):</b> හෝඩුවාවක් (Hint) බලා හෝ නිවැරදි උත්තරය සොයාගත් විට දරුවාගේ උත්සාහය අගය කරන්න.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default DetailsForParent;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  Compass,
  ClipboardList,
  Calculator,
  ArrowRight,
  TrendingUp,
  Brain,
  Info,
  ShieldCheck,
  Stethoscope,
  Pencil,
} from 'lucide-react';

import type { OnboardingFullSummary } from '../../types/onboarding';
import { ADHD_DIAGNOSIS_STATUS_OPTIONS, ADHD_PRESENTATION_OPTIONS } from '../../types/onboarding';
import { AnimatedCompanion } from './AnimatedCompanion';

interface Props {
  summary: OnboardingFullSummary;
  onEditAdhdInformation?: () => void;
  onCompleteSnapIv?: () => void;
}

export const OnboardingSummaryStep: React.FC<Props> = ({
  summary,
  onEditAdhdInformation,
  onCompleteSnapIv,
}) => {
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);
  const learner = summary.learner;

  const math = summary.mathSummary;
  const snap = summary.snapIvSummary;
  const pref = summary.learningPreferences;
  const elpx = math?.elpxProfile;
  const adhd = summary.adhdInformation;
  const adhdStatus = ADHD_DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === adhd?.diagnosisStatus);
  const adhdPresentation = ADHD_PRESENTATION_OPTIONS.find((o) => o.value === adhd?.reportedPresentation);

  return (
    <div className="space-y-6">
      {/* Success Celebration Card */}
      <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-7 shadow-sm space-y-5 animate-fade-in">
        {/* Top Header Row: Learner Title on Left, Action Buttons on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-mq-border/60 pb-5">
          <div className="flex items-center gap-4 min-w-0">
            <AnimatedCompanion
              avatarId={learner?.avatarId}
              state="success"
              size="md"
              showSpeechBubble={false}
            />
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-green text-mq-success border border-mq-success/20">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>ආරම්භක ඇගයීම් සාර්ථකව සම්පූර්ණයි (Onboarding Complete)</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-mq-text-strong font-sinhala leading-tight">
                {learner.firstName} ගේ පුද්ගලීකරණය කළ පැතිකඩ
              </h1>
              <p className="text-xs sm:text-sm text-mq-text-muted font-sinhala flex items-center gap-2 flex-wrap">
                <span>{learner.grade} වන ශ්‍රේණිය</span>
                <span className="text-mq-border">•</span>
                <span>වයස අවුරුදු {learner.age}</span>
                <span className="text-mq-border">•</span>
                <span>
                  {learner.preferredLanguage === 'Bilingual'
                    ? `දෙබසම (Bilingual${
                        learner.primaryInstructionLanguage
                          ? ` • ${learner.primaryInstructionLanguage}`
                          : ''
                      })`
                    : `${learner.preferredLanguage} මාධ්‍යය`}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
            <Link
              to="/learners"
              className="btn btn-secondary text-xs sm:text-sm py-2.5 px-4 rounded-full font-bold font-sinhala text-center inline-flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <span>මගේ දරුවන්ගේ ලැයිස්තුව (Learners Overview)</span>
            </Link>
            <a
              href="#/play"
              className="btn btn-primary text-xs sm:text-sm py-2.5 px-5 rounded-full font-bold font-sinhala inline-flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <span>අනුවර්තී ක්‍රීඩා අරඹමු (Start Adaptive Play)</span>
              <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" />
            </a>
          </div>
        </div>

        {/* Celebration Speech Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 rounded-2xl border border-emerald-200/80 p-4 sm:p-5 flex items-center gap-3.5">
          <div className="text-2xl sm:text-3xl shrink-0 p-2 rounded-xl bg-white/80 border border-emerald-100 shadow-xs">
            🎉
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="font-sinhala font-extrabold text-emerald-950 text-sm sm:text-base leading-snug">
              සුබ පැතුම්, {learner.firstName}! ඔබේ ආරම්භක පැතිකඩ සාර්ථකව සකස් විය!
            </p>
            <p className="text-xs sm:text-sm text-emerald-800/80 font-medium leading-tight">
              Congratulations, {learner.firstName}! Your personalized learning profile is ready!
            </p>
          </div>
        </div>
      </div>

      {/* Parent-Reported ADHD Information (kept separate from questionnaire and learning evidence) */}
      <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
              <Stethoscope size={18} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-mq-text-strong font-sinhala">
                  දෙමාපිය වාර්තා කළ ADHD තොරතුරු
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-soft text-mq-text-muted border border-mq-border">
                  Parent-reported • Not verified
                </span>
              </div>
              {adhd && adhdStatus ? (
                <div className="text-xs font-sinhala space-y-0.5">
                  <p className="text-mq-text">
                    <span className="text-mq-text-muted">වෘත්තිකයෙකු විසින් රෝග විනිශ්චය කර ඇත (Professionally diagnosed): </span>
                    <span className="font-bold text-mq-text-strong">
                      {adhdStatus.labelSi} ({adhdStatus.labelEn})
                    </span>
                  </p>
                  {adhdPresentation && (
                    <p className="text-mq-text">
                      <span className="text-mq-text-muted">වාර්තා කළ ස්වරූපය (Reported presentation): </span>
                      <span className="font-bold text-mq-text-strong">
                        {adhdPresentation.labelSi} ({adhdPresentation.labelEn})
                      </span>
                      {adhd.diagnosisReportedMonth && (
                        <span className="text-mq-text-muted"> • {adhd.diagnosisReportedMonth}</span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-mq-text-muted font-sinhala">
                  තොරතුරු ලබා දී නොමැත (Not provided). This is optional.
                </p>
              )}
              <p className="text-[10px] text-mq-text-muted leading-relaxed">
                Recorded as you reported it. MathQuest does not diagnose ADHD or change this information from questionnaires or gameplay.
              </p>
            </div>
          </div>
          {onEditAdhdInformation && (
            <button
              type="button"
              onClick={onEditAdhdInformation}
              className="btn btn-secondary text-xs py-2 px-4 rounded-full font-bold font-sinhala inline-flex items-center justify-center gap-1.5 shrink-0 self-start"
            >
              <Pencil size={13} />
              <span>{adhd ? 'යාවත්කාලීන කරන්න (Update)' : 'එකතු කරන්න (Add)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: 3 Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Learning Preferences */}
        <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-3">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-mq-text-strong font-sinhala">
                ඉගෙනුම් මනාපයන්
              </h3>
              <span className="text-[10px] text-mq-text-muted">Learning Preferences</span>
            </div>
          </div>

          {pref ? (
            <div className="space-y-2.5 text-xs font-sinhala">
              <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-mq-text-muted block text-[11px]">දෘශ්‍ය උපකාර:</span>
                <span className="font-bold text-mq-text-strong capitalize">
                  {pref.visualAssistance === 'always'
                    ? 'නිතරම රූප සමඟ (Rich Visuals)'
                    : pref.visualAssistance === 'sometimes'
                    ? 'අවශ්‍ය විට පමණක්'
                    : 'අවම දෘශ්‍ය භාවිතය'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-mq-text-muted block text-[11px]">ශ්‍රව්‍ය කියවීම් සහාය:</span>
                <span className="font-bold text-mq-text-strong capitalize">
                  {pref.audioAssistance === 'read_everything'
                    ? 'ස්වයංක්‍රීයව කියවීම (Auto-Read)'
                    : pref.audioAssistance === 'read_on_click'
                    ? 'ක්ලික් කළ විට කියවීම'
                    : 'නිහඬ ප්‍රකාරය'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-mq-text-muted block text-[11px]">වේගය හා කාර්ය ගලායාම:</span>
                <span className="font-bold text-mq-text-strong capitalize">
                  {pref.activityPace === 'calm_step_by_step'
                    ? 'සන්සුන්, පියවරෙන් පියවර'
                    : pref.activityPace === 'flexible'
                    ? 'නම්‍යශීලී විවේක සහිතව'
                    : 'සාමාන්‍ය වේගය'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-mq-text-muted font-sinhala">තොරතුරු ලබාගෙන නොමැත.</p>
          )}
        </div>

        {/* Card 2: SNAP-IV Parent Observation */}
        <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-3">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-green text-mq-success flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-mq-text-strong font-sinhala">
                SNAP-IV නිරීක්ෂණ ලකුණු
              </h3>
              <span className="text-[10px] text-mq-text-muted">Parent Behavioral Scale</span>
            </div>
          </div>

          {snap ? (
            <div className="space-y-3 font-sinhala">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 sm:p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60 min-w-0">
                  <span className="text-[11px] text-mq-text-muted block leading-tight break-words">අවධානය (Inattention):</span>
                  <span className="text-base sm:text-lg font-extrabold text-mq-primary block mt-0.5">
                    {snap.inattentionTotal} / 27
                  </span>
                  <span className="text-[10px] text-mq-text-muted block mt-0.5 leading-tight">
                    සාමාන්‍යය: {snap.inattentionAverage.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60 min-w-0">
                  <span className="text-[11px] text-mq-text-muted block leading-tight break-words">ක්‍රියාශීලීත්වය (Hyper):</span>
                  <span className="text-base sm:text-lg font-extrabold text-mq-success block mt-0.5">
                    {snap.hyperactivityTotal} / 27
                  </span>
                  <span className="text-[10px] text-mq-text-muted block mt-0.5 leading-tight">
                    සාමාන්‍යය: {snap.hyperactivityAverage.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-mq-surface-yellow border border-mq-warning/30 text-[10px] text-mq-text-muted leading-relaxed break-words">
                <strong>පර්යේෂණ දැන්වීම:</strong> {snap.disclaimer}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-mq-text-muted font-sinhala">
                {summary.snapIvStatus === 'SKIPPED'
                  ? 'මඟ හැර ඇත (Skipped). This questionnaire is optional.'
                  : 'තොරතුරු ලබාගෙන නොමැත (Not completed). This questionnaire is optional.'}
              </p>
              {onCompleteSnapIv && (
                <button
                  type="button"
                  onClick={onCompleteSnapIv}
                  className="btn btn-secondary text-xs py-2 px-4 rounded-full font-bold font-sinhala inline-flex items-center gap-1.5"
                >
                  <ClipboardList size={13} />
                  <span>දැන් සම්පූර්ණ කරන්න (Complete now)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 3: Math Baseline Accuracy & ELP-X Overview */}
        <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-3">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-yellow text-mq-warning flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-mq-text-strong font-sinhala">
                මූලික ගණිත තක්සේරුව
              </h3>
              <span className="text-[10px] text-mq-text-muted">Math Assessment & ELP-X v1.0</span>
            </div>
          </div>

          {math ? (
            <div className="space-y-3 font-sinhala text-center">
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-3xl font-extrabold text-mq-primary block">
                  {math.accuracyPercentage}%
                </span>
                <span className="text-xs font-bold text-mq-text-strong mt-1 block">
                  නිරීක්ෂිත නිවැරදි: {math.correctAnswers} / {math.totalQuestions}
                </span>
                <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border max-w-full text-center leading-tight ${
                      math.evidenceLevel === 'SUFFICIENT'
                        ? 'bg-mq-surface-green text-mq-success border-mq-success/20'
                        : 'bg-mq-surface-yellow text-mq-warning border-mq-warning/20'
                    }`}
                  >
                    සාක්ෂි තත්ත්වය: {math.evidenceLevel === 'SUFFICIENT' ? 'ප්‍රමාණවත් (Sufficient)' : 'අප්‍රමාණවත් (Insufficient)'}
                  </span>
                  {elpx && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20 shrink-0">
                      {elpx.algorithmVersion}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-mq-text-muted text-left leading-relaxed break-words">
                <strong>ප්‍රමිති දැන්වීම:</strong> පර්යේෂණාත්මක ආදර්ශන මිනුම් (Provisional Estimates). මෙම අගයන් සායනික හෝ රෝග විනිශ්චය සහතික නොවේ.
              </p>
            </div>
          ) : (
            <p className="text-xs text-mq-text-muted font-sinhala">තොරතුරු ලබාගෙන නොමැත.</p>
          )}
        </div>
      </div>

      {/* Skills Breakdown & ELP-X Estimates Card */}
      {math && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in font-sinhala">
          {/* Header & Distinction Note */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mq-border/70 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-mq-text-strong flex items-center gap-2">
                <TrendingUp size={20} className="text-mq-primary" />
                <span>කුසලතා අනුව විශ්ලේෂණය (ELP-X Skill Estimates)</span>
              </h3>
              <p className="text-xs text-mq-text-muted mt-0.5">
                නිරීක්ෂිත ප්‍රතිඵල (Observed Accuracy) සහ Bayesian Beta-Binomial ඇස්තමේන්තු සංසන්දනය:
              </p>
            </div>
            <button
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="text-xs font-bold text-mq-primary hover:text-mq-primary-hover inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-mq-surface-blue/50 border border-mq-primary/20 transition-all cursor-pointer"
            >
              <Info size={14} />
              <span>{showFormulaExplanation ? 'සූත්‍ර විස්තර සඟවන්න' : 'ELP-X ක්‍රමවේදය කුමක්ද?'}</span>
            </button>
          </div>

          {/* Collapsible Explainer Box */}
          {showFormulaExplanation && (
            <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-primary/30 text-xs text-mq-text space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-mq-primary font-bold">
                <ShieldCheck size={16} />
                <span>ELP-X v1.0 ක්‍රමවේද විස්තරය (Methodology & Safeguards):</span>
              </div>
              <p className="text-[11px] text-mq-text-muted leading-relaxed">
                1. <strong>සාක්ෂි ආරක්ෂණය (Evidence Safeguard):</strong> යම් කුසලතාවක් සඳහා ඇගයූ ප්‍රශ්න ගණන 3ට අඩු නම් (<span className="font-mono">n &lt; 3</span>), එකම හරි උත්තරයකින් දරුවා 'ප්‍රවීණ' යැයි වැරදි ලෙස වර්ගීකරණය නොකරයි (<span className="font-bold text-mq-warning">INSUFFICIENT_EVIDENCE</span>).
              </p>
              <p className="text-[11px] text-mq-text-muted leading-relaxed">
                2. <strong>Beta-Binomial ඇස්තමේන්තුව:</strong> කුඩා සාම්පල වලදී අහඹු උච්චාවචනයන් පාලනය කිරීමට Bayesian Laplace prior (<span className="font-mono">α₀=1, β₀=1</span>) යොදාගනී. ඇස්තමේන්තුගත නිපුණතාව <span className="font-mono">p = (1 + c) / (2 + n)</span> ලෙස ගණනය කෙරේ.
              </p>
              <p className="text-[11px] text-mq-text-muted leading-relaxed">
                3. <strong>95% Credible Interval:</strong> දත්ත ප්‍රමාණය මත පදනම් වූ සංඛ්‍යානමය අවිනිශ්චිතතාව (Uncertainty) පරාසයක් ලෙස නිරූපණය කරයි.
              </p>
            </div>
          )}

          {/* Skill Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {elpx?.skillEstimates ? (
              elpx.skillEstimates.map((s) => (
                <div
                  key={s.skillId}
                  className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 flex flex-col justify-between space-y-3.5 hover:border-mq-primary/40 transition-colors"
                >
                  {/* Skill Title & Provisional Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-mq-text-strong block min-w-0 break-words flex-1">
                        {s.skillNameSi}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          s.provisionalSkillLevel === 'PROFICIENT'
                            ? 'bg-mq-success-bg text-mq-success border border-mq-success/30'
                            : s.provisionalSkillLevel === 'DEVELOPING'
                            ? 'bg-mq-warning-bg text-mq-warning border border-mq-warning/30'
                            : s.provisionalSkillLevel === 'EMERGING'
                            ? 'bg-mq-danger-bg text-mq-danger border border-mq-danger/30'
                            : 'bg-mq-surface-yellow text-mq-warning border border-mq-warning/40'
                        }`}
                      >
                        {s.provisionalSkillLevel === 'INSUFFICIENT_EVIDENCE'
                          ? 'සාක්ෂි මදි (Insufficient)'
                          : `${s.provisionalSkillLevel} (තාවකාලික)`}
                      </span>
                    </div>
                    <span className="text-[11px] text-mq-text-muted block mt-0.5 break-words">
                      {s.skillName}
                    </span>
                  </div>

                  {/* Quantitative Metrics (Observed vs Estimated) */}
                  <div className="space-y-2 pt-1 border-t border-mq-border/60 text-xs">
                    {/* Observed Row */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[11px] text-mq-text-muted">නිරීක්ෂිත ලකුණු:</span>
                      <span className="font-mono font-bold text-mq-text-strong text-right">
                        {s.rawAccuracyPercentage}% ({s.correctFirstResponses}/{s.distinctQuestionsAssessed} ප්‍රශ්න)
                      </span>
                    </div>

                    {/* Bayesian Estimated Proficiency */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[11px] text-mq-text-muted">ELP-X ඇස්තමේන්තුව:</span>
                      <span className="font-mono font-extrabold text-mq-primary text-right">
                        {s.estimatedProficiencyPercentage}%
                      </span>
                    </div>

                    {/* 95% Bayesian Credible Interval */}
                    <div className="flex items-center justify-between gap-1 flex-wrap text-[10px] text-mq-text-muted">
                      <span>95% විශ්වාස පරාසය:</span>
                      <span className="font-mono font-semibold text-mq-text text-right">
                        [{(s.credibleInterval.lower * 100).toFixed(1)}% - {(s.credibleInterval.upper * 100).toFixed(1)}%]
                      </span>
                    </div>

                    {/* Uncertainty Progress Bar */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap text-[9px] text-mq-text-muted">
                        <span>අවිනිශ්චිතතා පළල: {(s.credibleIntervalWidth * 100).toFixed(1)}%</span>
                        <span>α={s.posteriorAlpha}, β={s.posteriorBeta}</span>
                      </div>
                      <div className="w-full bg-mq-border/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-mq-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, s.estimatedProficiencyPercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              /* Fallback to basic skills list if elpxProfile is pending */
              math.skills.map((s) => (
                <div
                  key={s.skillId}
                  className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/70 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-mq-text-strong block">
                      {s.skillNameSi}
                    </span>
                    <span className="text-[11px] text-mq-text-muted block">
                      {s.skillName}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-xs font-mono font-bold text-mq-primary">
                      {s.accuracyPercentage}% ({s.correctQuestions}/{s.totalQuestions})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-soft text-mq-text-muted border border-mq-border">
                      {s.proficiencyCategory}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Structured Pedagogical Recommendations */}
          <div className="border-t border-mq-border/70 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
                <Sparkles size={16} className="text-mq-primary" />
                <span>පුද්ගලීකරණය කළ පැහැදිලි නිර්දේශ (Explainable Recommendations):</span>
              </h4>
              {elpx && (
                <span className="text-[10px] font-mono text-mq-text-muted">
                  Ruleset: {elpx.recommendationRulesetVersion}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {elpx?.structuredRecommendations ? (
                elpx.structuredRecommendations.map((rec) => (
                  <div
                    key={rec.recommendationId}
                    className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 flex flex-col justify-between space-y-2.5 hover:border-mq-primary/40 transition-colors min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-mq-text-strong min-w-0 break-words">
                          {rec.titleSi || rec.titleEn}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20 shrink-0">
                          {rec.strategyCode}
                        </span>
                      </div>
                      <p className="text-xs text-mq-text mt-1 leading-relaxed break-words">
                        {rec.descriptionSi || rec.descriptionEn}
                      </p>
                    </div>

                    {/* Transparent Decision Reason Codes */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-mq-border/50">
                      <span className="text-[9px] text-mq-text-muted font-bold">හේතු කේත:</span>
                      {rec.reasonCodes.map((rc, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-mq-text-muted border border-mq-border/60"
                        >
                          {rc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback to simple recommendations if structured not present */
                math.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-mq-surface-blue/50 border border-mq-primary/20 text-xs text-mq-text leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-mq-primary font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Machine Learning Notice */}
          <div className="p-3.5 rounded-2xl bg-mq-surface-soft border border-mq-border/70 flex items-center gap-2.5 text-xs text-mq-text-muted">
            <Brain size={18} className="text-mq-primary shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>ඉදිරි AI ඒකාබද්ධතාව (ML & SHAP Notice):</strong> {math.mlPredictionNotice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

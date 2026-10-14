import React from 'react';
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
} from 'lucide-react';
import type { OnboardingFullSummary } from '../../types/onboarding';
import { AVATAR_OPTIONS } from '../../types';

interface Props {
  summary: OnboardingFullSummary;
}

export const OnboardingSummaryStep: React.FC<Props> = ({ summary }) => {
  const learner = summary.learner;
  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner?.avatarId) || AVATAR_OPTIONS[0];

  const math = summary.mathSummary;
  const snap = summary.snapIvSummary;
  const pref = summary.learningPreferences;

  return (
    <div className="space-y-6">
      {/* Success Celebration Card */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-fade-in">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-sm border ${avatar.bgColor} ${avatar.borderColor} shrink-0`}
          >
            <span>{avatar.icon}</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-green text-mq-success mb-1">
              <CheckCircle2 size={14} />
              <span>ආරම්භක ඇගයීම් සාර්ථකව සම්පූර්ණයි (Onboarding Complete)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong font-sinhala">
              {learner.firstName} ගේ පුද්ගලීකරණය කළ පැතිකඩ
            </h1>
            <p className="text-xs sm:text-sm text-mq-text-muted mt-0.5 font-sinhala">
              {learner.grade} වන ශ්‍රේණිය • වයස අවුරුදු {learner.age} • {learner.preferredLanguage} මාධ්‍යය
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <Link
            to="/learners"
            className="btn btn-secondary text-xs py-2 px-4 rounded-full font-bold font-sinhala text-center"
          >
            මගේ දරුවන් වෙත
          </Link>
          <a
            href="#/play"
            className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold font-sinhala inline-flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>ක්‍රීඩා අරඹමු</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </a>
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
                <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                  <span className="text-[11px] text-mq-text-muted block">අවධානය (Inattention):</span>
                  <span className="text-lg font-extrabold text-mq-primary block mt-0.5">
                    {snap.inattentionTotal} / 27
                  </span>
                  <span className="text-[10px] text-mq-text-muted">
                    සාමාන්‍යය: {snap.inattentionAverage.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                  <span className="text-[11px] text-mq-text-muted block">ක්‍රියාශීලීත්වය (Hyper):</span>
                  <span className="text-lg font-extrabold text-mq-success block mt-0.5">
                    {snap.hyperactivityTotal} / 27
                  </span>
                  <span className="text-[10px] text-mq-text-muted">
                    සාමාන්‍යය: {snap.hyperactivityAverage.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-mq-surface-yellow border border-mq-warning/30 text-[10px] text-mq-text-muted leading-relaxed">
                <strong>පර්යේෂණ දැන්වීම:</strong> {snap.disclaimer}
              </div>
            </div>
          ) : (
            <p className="text-xs text-mq-text-muted font-sinhala">තොරතුරු ලබාගෙන නොමැත.</p>
          )}
        </div>

        {/* Card 3: Math Baseline Accuracy */}
        <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-3">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-yellow text-mq-warning flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-mq-text-strong font-sinhala">
                මූලික ගණිත නිපුණතාව
              </h3>
              <span className="text-[10px] text-mq-text-muted">Math Baseline Score</span>
            </div>
          </div>

          {math ? (
            <div className="space-y-3 font-sinhala text-center">
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-3xl font-extrabold text-mq-primary block">
                  {math.accuracyPercentage}%
                </span>
                <span className="text-xs font-bold text-mq-text-strong mt-1 block">
                  නිවැරදි පිළිතුරු {math.correctAnswers} / {math.totalQuestions}
                </span>
                <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                  සාක්ෂි මට්ටම: {math.evidenceLevel}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-mq-text-muted font-sinhala">තොරතුරු ලබාගෙන නොමැත.</p>
          )}
        </div>
      </div>

      {/* Skills Breakdown & Recommendations Card */}
      {math && (
        <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in font-sinhala">
          {/* Skill Breakdown */}
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-mq-text-strong flex items-center gap-2">
              <TrendingUp size={20} className="text-mq-primary" />
              <span>කුසලතා අනුව විශ්ලේෂණය (Skill Competency Breakdown)</span>
            </h3>
            <p className="text-xs text-mq-text-muted mt-0.5">
              Grade {learner.grade} foundational mathematics competency areas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
              {math.skills.map((s) => (
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
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-mq-primary">
                      {s.accuracyPercentage}% ({s.correctQuestions}/{s.totalQuestions})
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.proficiencyCategory === 'Proficient'
                          ? 'bg-mq-success-bg text-mq-success'
                          : s.proficiencyCategory === 'Developing'
                          ? 'bg-mq-warning-bg text-mq-warning'
                          : 'bg-mq-danger-bg text-mq-danger'
                      }`}
                    >
                      {s.proficiencyCategory}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rule-Based Recommendations */}
          <div className="border-t border-mq-border/70 pt-5 space-y-3">
            <h4 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
              <Sparkles size={16} className="text-mq-primary" />
              <span>අනුවර්තී ඉගෙනුම් නිර්දේශ (Pedagogical Recommendations):</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {math.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-mq-surface-blue/50 border border-mq-primary/20 text-xs text-mq-text leading-relaxed flex items-start gap-2"
                >
                  <span className="text-mq-primary font-bold mt-0.5">•</span>
                  <span>{rec}</span>
                </div>
              ))}
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

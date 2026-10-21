import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Compass, ClipboardList, Calculator, ArrowRight, Stethoscope, Pencil } from 'lucide-react';

import type { OnboardingFullSummary } from '../../types/onboarding';
import { ADHD_DIAGNOSIS_STATUS_OPTIONS, ADHD_PRESENTATION_OPTIONS } from '../../types/onboarding';
import { mathResultCounts } from '../../utils/mathResultCounts';
import { AnimatedCompanion } from './AnimatedCompanion';
import { SkillEvidenceList } from '../parent/SkillEvidenceList';
import { RecommendationList, RecommendationResearchRows } from '../parent/RecommendationList';
import { ResearchDetails } from '../parent/ResearchDetails';
import { languageLabel, optionTitle } from '../parent/labels';
import { parentText } from '../../../../shared/i18n/parentText';

interface Props {
  summary: OnboardingFullSummary;
  onEditAdhdInformation?: () => void;
  onCompleteSnapIv?: () => void;
}

const t = parentText.summary;
const prefText = parentText.preferences;

const Card: React.FC<{ icon: React.ReactNode; tone: string; title: string; children: React.ReactNode }> = ({
  icon,
  tone,
  title,
  children,
}) => (
  <section className="bg-white rounded-3xl border border-mq-border p-4 shadow-xs space-y-2.5 min-w-0">
    <h3 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
      <span>{title}</span>
    </h3>
    {children}
  </section>
);

export const OnboardingSummaryStep: React.FC<Props> = ({
  summary,
  onEditAdhdInformation,
  onCompleteSnapIv,
}) => {
  const learner = summary.learner;
  const childName = learner.preferredName || learner.firstName;

  const math = summary.mathSummary;
  const snap = summary.snapIvSummary;
  const pref = summary.learningPreferences;
  const elpx = math?.elpxProfile;
  // Independent first responses vs guided/helped activities, from the server's per-item flags
  const counts = mathResultCounts(math?.evaluatedItems);
  const adhd = summary.adhdInformation;
  const adhdStatus = ADHD_DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === adhd?.diagnosisStatus);
  const adhdPresentation = ADHD_PRESENTATION_OPTIONS.find((o) => o.value === adhd?.reportedPresentation);

  return (
    <div className="space-y-5">
      {/* 1. Title and short summary */}
      <section className="bg-white rounded-3xl border border-mq-border px-5 py-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <AnimatedCompanion avatarId={learner?.avatarId} state="success" size="sm" showSpeechBubble={false} />
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-lg sm:text-xl font-bold text-mq-text-strong leading-snug break-words">
                {t.title(learner.firstName)}
              </h1>
              <p className="text-sm text-mq-text-muted">
                {parentText.common.gradeAndAge(learner.grade, learner.age)} •{' '}
                {parentText.onboarding.learningLanguage(languageLabel(learner.preferredLanguage))}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/learners" className="btn btn-secondary min-h-[40px] px-4 rounded-full text-sm inline-flex items-center justify-center">
              {t.backToChildren}
            </Link>
            <a href="#/play" className="btn btn-primary min-h-[40px] px-4 rounded-full text-sm inline-flex items-center justify-center gap-2">
              <span>{t.startPlay}</span>
              <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" />
            </a>
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-emerald-50/80 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-950">
          <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-mq-success" />
          <span>
            <strong className="font-semibold">{t.congrats(childName)}</strong> {t.congratsText}
          </span>
        </p>
      </section>

      {/* 2. Activity results: mathematics */}
      {math && (
        <section className="bg-white rounded-3xl border border-mq-border p-5 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-base font-bold text-mq-text-strong flex items-center gap-2">
              <Calculator size={18} className="text-mq-warning shrink-0" />
              <span>{t.mathTitle}</span>
            </h2>
            {counts ? (
              <span className="text-sm text-mq-text">
                {t.mathIndependent(counts.independentCorrect, counts.independentTotal)}
                {counts.notIndependent > 0 && (
                  <span className="block text-xs text-mq-text-muted">{t.mathNotIndependent(counts.notIndependent)}</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-mq-text">{t.mathCorrect(math.correctAnswers, math.totalQuestions)}</span>
            )}
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                math.evidenceLevel === 'SUFFICIENT'
                  ? 'bg-mq-success-bg text-mq-success border-mq-success/30'
                  : 'bg-mq-warning-bg text-mq-warning border-mq-warning/30'
              }`}
            >
              {math.evidenceLevel === 'SUFFICIENT' ? parentText.skills.overallReady : parentText.skills.overallNeedsMore}
            </span>
            <span className="basis-full text-xs text-mq-text-muted">{t.mathNote}</span>
          </div>

          <SkillEvidenceList profile={elpx ?? null} legacySkills={math.skills} showOverall={false}>
            <p className="font-mono break-words">
              baseline accuracy: {math.accuracyPercentage}% ({math.correctAnswers}/{math.totalQuestions}) • evidenceLevel:{' '}
              {math.evidenceLevel} • thresholdVersion: {math.thresholdVersion ?? '—'} • protocol:{' '}
              {math.assessmentProtocolVersion ?? 'onboarding-v1'}
            </p>
            {math.disclaimer && <p>{math.disclaimer}</p>}
            <p>{math.mlPredictionNotice}</p>
            {elpx?.structuredRecommendations?.length ? (
              <RecommendationResearchRows
                recommendations={elpx.structuredRecommendations}
                rulesetVersion={elpx.recommendationRulesetVersion}
              />
            ) : null}
          </SkillEvidenceList>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-mq-text-strong">{parentText.recommendations.title}</h3>
            {elpx?.structuredRecommendations?.length ? (
              <RecommendationList
                recommendations={elpx.structuredRecommendations}
                rulesetVersion={elpx.recommendationRulesetVersion}
                showResearchDetails={false}
              />
            ) : (
              <>
                <p className="text-sm text-mq-text-muted">{parentText.recommendations.none}</p>
                {math.recommendations.length > 0 && (
                  <ResearchDetails>
                    <ul className="list-disc pl-5 space-y-1">
                      {math.recommendations.map((rec) => (
                        <li key={rec}>{rec}</li>
                      ))}
                    </ul>
                  </ResearchDetails>
                )}
              </>
            )}
          </section>
        </section>
      )}

      {/* 3. Information the parent provided (kept separate from learning results) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card icon={<Stethoscope size={16} />} tone="bg-mq-surface-blue text-mq-primary" title={t.adhdTitle}>
          <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mq-surface-soft text-mq-text-muted border border-mq-border">
            {t.adhdBadge}
          </span>
          {adhd && adhdStatus ? (
            <dl className="text-sm space-y-1">
              <div>
                <dt className="text-xs text-mq-text-muted">{t.adhdDiagnosed}</dt>
                <dd className="font-semibold text-mq-text-strong">{adhdStatus.labelSi}</dd>
              </div>
              {adhdPresentation && (
                <div>
                  <dt className="text-xs text-mq-text-muted">{t.adhdType}</dt>
                  <dd className="font-semibold text-mq-text-strong">
                    {adhdPresentation.labelSi}
                    {adhd.diagnosisReportedMonth && (
                      <span className="font-normal text-mq-text-muted"> • {adhd.diagnosisReportedMonth}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-mq-text-muted">{t.adhdNotProvided}</p>
          )}
          <p className="text-xs text-mq-text-muted leading-relaxed">{t.adhdNote}</p>
          {onEditAdhdInformation && (
            <button
              type="button"
              onClick={onEditAdhdInformation}
              className="btn btn-secondary min-h-[40px] px-4 rounded-full text-sm inline-flex items-center gap-2"
            >
              <Pencil size={14} />
              <span>{adhd ? t.update : t.add}</span>
            </button>
          )}
        </Card>

        <Card icon={<ClipboardList size={16} />} tone="bg-mq-surface-green text-mq-success" title={t.snapTitle}>
          {snap ? (
            <>
              {/* Subscale scores are technical research values and are shown to admins only */}
              <p className="text-sm font-semibold text-mq-text-strong">{t.snapCompleted}</p>
              <p className="text-xs text-mq-text-muted leading-relaxed">{t.snapNote}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-mq-text-muted">
                {summary.snapIvStatus === 'SKIPPED' ? t.snapSkipped : t.snapNotDone}
              </p>
              {onCompleteSnapIv && (
                <button
                  type="button"
                  onClick={onCompleteSnapIv}
                  className="btn btn-secondary min-h-[40px] px-4 rounded-full text-sm inline-flex items-center gap-2"
                >
                  <ClipboardList size={14} />
                  <span>{t.completeNow}</span>
                </button>
              )}
            </>
          )}
        </Card>

        <Card icon={<Compass size={16} />} tone="bg-mq-surface-yellow text-mq-warning" title={parentText.profiles.preferencesTitle}>
          {pref ? (
            <dl className="text-sm divide-y divide-mq-border/60">
              {(['visualAssistance', 'audioAssistance', 'activityPace'] as const).map((field) => (
                <div key={field} className="py-1.5 first:pt-0">
                  <dt className="text-xs text-mq-text-muted">{prefText[field].question}</dt>
                  <dd className="font-semibold text-mq-text-strong">{optionTitle(prefText[field], pref[field])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-mq-text-muted">{t.notAvailable}</p>
          )}
        </Card>
      </div>
    </div>
  );
};

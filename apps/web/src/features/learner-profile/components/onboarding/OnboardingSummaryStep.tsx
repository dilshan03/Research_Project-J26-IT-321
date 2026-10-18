import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Compass, ClipboardList, Calculator, ArrowRight, Stethoscope, Pencil } from 'lucide-react';

import type { OnboardingFullSummary } from '../../types/onboarding';
import { ADHD_DIAGNOSIS_STATUS_OPTIONS, ADHD_PRESENTATION_OPTIONS } from '../../types/onboarding';
import { AnimatedCompanion } from './AnimatedCompanion';
import { SkillEvidenceList } from '../parent/SkillEvidenceList';
import { RecommendationList } from '../parent/RecommendationList';
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
  <section className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
    <h3 className="text-base font-bold text-mq-text-strong flex items-center gap-2.5">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
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
  const adhd = summary.adhdInformation;
  const adhdStatus = ADHD_DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === adhd?.diagnosisStatus);
  const adhdPresentation = ADHD_PRESENTATION_OPTIONS.find((o) => o.value === adhd?.reportedPresentation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white rounded-3xl border border-mq-border p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <AnimatedCompanion avatarId={learner?.avatarId} state="success" size="md" showSpeechBubble={false} />
            <div className="min-w-0 space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-green text-mq-success border border-mq-success/20">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{t.completeBadge}</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-mq-text-strong leading-snug break-words">
                {t.title(learner.firstName)}
              </h1>
              <p className="text-sm text-mq-text-muted">
                {parentText.common.gradeAndAge(learner.grade, learner.age)} •{' '}
                {parentText.onboarding.learningLanguage(languageLabel(learner.preferredLanguage))}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/learners" className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center">
              {t.backToChildren}
            </Link>
            <a href="#/play" className="btn btn-primary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2">
              <span>{t.startPlay}</span>
              <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">🎉</span>
          <div className="space-y-0.5">
            <p className="text-base font-semibold text-emerald-950">{t.congrats(childName)}</p>
            <p className="text-sm text-emerald-900/80">{t.congratsText}</p>
          </div>
        </div>
      </section>

      {/* Parent-reported ADHD information (separate from questionnaire and learning evidence) */}
      <section className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
              <Stethoscope size={18} />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-mq-text-strong">{t.adhdTitle}</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mq-surface-soft text-mq-text-muted border border-mq-border">
                  {t.adhdBadge}
                </span>
              </div>
              {adhd && adhdStatus ? (
                <dl className="text-sm space-y-1">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-mq-text-muted">{t.adhdDiagnosed}</dt>
                    <dd className="font-semibold text-mq-text-strong">{adhdStatus.labelSi}</dd>
                  </div>
                  {adhdPresentation && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-mq-text-muted">{t.adhdType}</dt>
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
            </div>
          </div>
          {onEditAdhdInformation && (
            <button
              type="button"
              onClick={onEditAdhdInformation}
              className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2 shrink-0 self-start"
            >
              <Pencil size={15} />
              <span>{adhd ? t.update : t.add}</span>
            </button>
          )}
        </div>
      </section>

      {/* Preferences, SNAP-IV, mathematics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card icon={<Compass size={18} />} tone="bg-mq-surface-blue text-mq-primary" title={parentText.profiles.preferencesTitle}>
          {pref ? (
            <dl className="space-y-2 text-sm">
              {(['visualAssistance', 'audioAssistance', 'activityPace'] as const).map((field) => (
                <div key={field} className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60">
                  <dt className="text-xs text-mq-text-muted">{prefText[field].question}</dt>
                  <dd className="font-semibold text-mq-text-strong">{optionTitle(prefText[field], pref[field])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-mq-text-muted">{t.notAvailable}</p>
          )}
        </Card>

        <Card icon={<ClipboardList size={18} />} tone="bg-mq-surface-green text-mq-success" title={t.snapTitle}>
          {snap ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60 min-w-0">
                  <span className="text-xs text-mq-text-muted block leading-snug">{t.snapInattention}</span>
                  <span className="text-lg font-bold text-mq-text-strong block mt-1">{t.snapScore(snap.inattentionTotal)}</span>
                </div>
                <div className="p-3 rounded-xl bg-mq-surface-soft border border-mq-border/60 min-w-0">
                  <span className="text-xs text-mq-text-muted block leading-snug">{t.snapHyperactivity}</span>
                  <span className="text-lg font-bold text-mq-text-strong block mt-1">{t.snapScore(snap.hyperactivityTotal)}</span>
                </div>
              </div>
              <p className="text-xs text-mq-text-muted leading-relaxed">{t.snapNote}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-mq-text-muted">
                {summary.snapIvStatus === 'SKIPPED' ? t.snapSkipped : t.snapNotDone}
              </p>
              {onCompleteSnapIv && (
                <button
                  type="button"
                  onClick={onCompleteSnapIv}
                  className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center gap-2"
                >
                  <ClipboardList size={15} />
                  <span>{t.completeNow}</span>
                </button>
              )}
            </div>
          )}
        </Card>

        <Card icon={<Calculator size={18} />} tone="bg-mq-surface-yellow text-mq-warning" title={t.mathTitle}>
          {math ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <p className="text-base font-semibold text-mq-text-strong">
                  {t.mathCorrect(math.correctAnswers, math.totalQuestions)}
                </p>
                <p className={`text-sm mt-1 ${math.evidenceLevel === 'SUFFICIENT' ? 'text-mq-success' : 'text-mq-warning'}`}>
                  {math.evidenceLevel === 'SUFFICIENT' ? parentText.skills.overallReady : parentText.skills.overallNeedsMore}
                </p>
              </div>
              <p className="text-xs text-mq-text-muted leading-relaxed">{t.mathNote}</p>
            </div>
          ) : (
            <p className="text-sm text-mq-text-muted">{t.notAvailable}</p>
          )}
        </Card>
      </div>

      {math && (
        <section className="bg-white rounded-3xl border border-mq-border p-5 sm:p-7 shadow-xs space-y-8">
          <SkillEvidenceList profile={elpx ?? null} legacySkills={math.skills} showOverall={false}>
            <p className="font-mono break-words">
              baseline accuracy: {math.accuracyPercentage}% ({math.correctAnswers}/{math.totalQuestions}) • evidenceLevel:{' '}
              {math.evidenceLevel} • thresholdVersion: {math.thresholdVersion ?? '—'} • protocol:{' '}
              {math.assessmentProtocolVersion ?? 'onboarding-v1'}
            </p>
            {math.disclaimer && <p>{math.disclaimer}</p>}
            <p>{math.mlPredictionNotice}</p>
          </SkillEvidenceList>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-mq-text-strong">{parentText.recommendations.title}</h3>
            {elpx?.structuredRecommendations?.length ? (
              <RecommendationList
                recommendations={elpx.structuredRecommendations}
                rulesetVersion={elpx.recommendationRulesetVersion}
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
    </div>
  );
};

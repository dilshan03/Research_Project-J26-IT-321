import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight, ChevronDown, Palette, Home, ClipboardList } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner, DeletionRequest } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile, OnboardingFullSummary } from '../types/onboarding';
import { PageHeader } from '../../../shared/components/PageHeader';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { SkillEvidenceList } from '../components/parent/SkillEvidenceList';
import { deletionStatusLabel, optionTitle } from '../components/parent/labels';
import { parentText } from '../../../shared/i18n/parentText';
import { DetailsForParent } from '../../pedagogical-agent';

const t = parentText.profiles;
const prefText = parentText.preferences;
const socialText = parentText.social;

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-mq-border/60 last:border-b-0">
    <dt className="text-sm text-mq-text-muted">{label}</dt>
    <dd className="text-sm font-semibold text-mq-text-strong text-right break-words min-w-0">{value || '—'}</dd>
  </div>
);

export const ParentLearnerProfilesPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ElpxProfile | null>(null);
  const [summary, setSummary] = useState<OnboardingFullSummary | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<Record<string, DeletionRequest>>({});

  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLearners = useCallback(async () => {
    setIsLoadingLearners(true);
    setErrorMessage(null);
    try {
      const [res, delRes] = await Promise.all([
        learnerApi.listLearners(false),
        learnerApi.listDeletionRequests(),
      ]);

      if (res.success && res.data) {
        setLearners(res.data);
        if (res.data.length > 0 && !selectedLearnerId) {
          setSelectedLearnerId(res.data[0].learnerId);
        }
      } else {
        setErrorMessage(t.loadError);
      }

      if (delRes.success && delRes.data) {
        const reqMap: Record<string, DeletionRequest> = {};
        delRes.data.forEach((r) => {
          reqMap[r.learnerId] = r;
        });
        setDeletionRequests(reqMap);
      }
    } catch {
      setErrorMessage(parentText.common.networkError);
    } finally {
      setIsLoadingLearners(false);
    }
  }, [selectedLearnerId]);

  useEffect(() => {
    loadLearners();
  }, [loadLearners]);

  // Load detailed profile and onboarding summary when selected child changes
  useEffect(() => {
    if (!selectedLearnerId) {
      setProfile(null);
      setSummary(null);
      return;
    }

    const child = learners.find((l) => l.learnerId === selectedLearnerId);
    // The consolidated summary only exists after onboarding is completed (the API returns 400
    // before that), and profile details are only shown for completed children.
    if (!child || child.onboardingStatus !== 'COMPLETED') {
      setProfile(null);
      setSummary(null);
      return;
    }

    let isMounted = true;
    const fetchFullDetails = async () => {
      setIsLoadingProfile(true);
      try {
        const [profileRes, summaryRes] = await Promise.all([
          profileApi.getProfile(selectedLearnerId),
          onboardingApi.getSummary(selectedLearnerId),
        ]);

        if (isMounted) {
          setProfile(profileRes.success && profileRes.data ? profileRes.data : null);
          setSummary(summaryRes.success && summaryRes.data ? summaryRes.data : null);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
          setSummary(null);
        }
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchFullDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedLearnerId, learners]);

  const selectedChild = learners.find((l) => l.learnerId === selectedLearnerId) || learners[0] || null;
  const avatar = selectedChild
    ? AVATAR_OPTIONS.find((a) => a.id === selectedChild.avatarId) || AVATAR_OPTIONS[0]
    : AVATAR_OPTIONS[0];

  if (isLoadingLearners) {
    return <LoadingState message={t.loading} />;
  }

  if (learners.length === 0) {
    return (
      <EmptyState
        title={t.noChildrenTitle}
        description={t.noChildrenText}
        action={
          <Link to="/learners" className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center text-sm">
            {t.goToChildren}
          </Link>
        }
      />
    );
  }

  const prefs = summary?.learningPreferences;
  const social = summary?.socialContext;
  const deletionRequest = selectedChild ? deletionRequests[selectedChild.learnerId] : undefined;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        role="parent"
        title={t.title}
        description={t.description}
        actions={
          <Link to="/learners" className="btn btn-secondary min-h-[44px] px-5 rounded-full inline-flex items-center text-sm">
            {parentText.nav.myChildren}
          </Link>
        }
      />

      {errorMessage && (
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={loadLearners} />
      )}

      <section className="space-y-3">
        <h3 className="text-base font-bold text-mq-text-strong">{parentText.overview.selectChild}</h3>
        <ChildSwitcher
          learners={learners}
          selectedId={selectedChild?.learnerId}
          onSelect={setSelectedLearnerId}
          showStatus
        />
      </section>

      {selectedChild && (
        <div className="space-y-4">
          {/* Child header */}
          <section className="bg-white rounded-3xl border border-mq-border px-5 py-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${avatar.bgColor} ${avatar.borderColor}`}
                aria-hidden="true"
              >
                {avatar.icon}
              </div>
              <div className="min-w-0 space-y-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-mq-text-strong break-words">
                  {selectedChild.firstName}
                  {selectedChild.preferredName && ` (${selectedChild.preferredName})`}
                </h2>
                <p className="text-sm text-mq-text-muted">
                  {parentText.common.gradeAndAge(selectedChild.grade, selectedChild.age)}
                </p>
                {deletionRequest && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                    {deletionStatusLabel(deletionRequest.status)}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {selectedChild.onboardingStatus !== 'COMPLETED' ? (
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center gap-2"
                >
                  <span>
                    {selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.resumeAssessment : t.startAssessment}
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-mq-success-bg text-mq-success border border-mq-success/30">
                  <CheckCircle2 size={16} />
                  <span>{t.completedBadge}</span>
                </span>
              )}
            </div>
          </section>

          {selectedChild.onboardingStatus !== 'COMPLETED' && (
            <section className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-3 max-w-xl mx-auto">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <ClipboardList size={26} />
              </div>
              <h3 className="text-lg font-bold text-mq-text-strong">{t.notCompletedTitle}</h3>
              <p className="text-sm text-mq-text-muted leading-relaxed">
                {t.notCompletedText(selectedChild.preferredName || selectedChild.firstName)}
              </p>
            </section>
          )}

          {selectedChild.onboardingStatus === 'COMPLETED' && (
            <>
              {isLoadingProfile && (
                <div className="flex items-center justify-center p-12 text-mq-primary gap-2 text-sm font-semibold">
                  <Loader2 size={22} className="animate-spin" />
                  <span>{t.loading}</span>
                </div>
              )}

              {!isLoadingProfile && profile && (
                <div className="space-y-4">
                  {/* Research-level Grade 1 evidence (dimensions, probes, IMPSA/IMLR) is admin-only */}
                  <section className="bg-white rounded-3xl border border-mq-border p-5 shadow-xs">
                    <SkillEvidenceList profile={profile} />
                  </section>

                  {/* Pedagogical Agent & AD-BKT Parent Friendly Insights for Selected Child */}
                  <DetailsForParent
                    parentId={selectedChild.parentId}
                    learnerId={selectedChild.learnerId}
                    studentName={selectedChild.preferredName || selectedChild.firstName}
                    grade={selectedChild.grade}
                  />

                  {summary && (
                    <details className="group bg-white rounded-3xl border border-mq-border shadow-xs">
                      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-2 px-5 py-3.5 text-sm font-semibold text-mq-text-strong hover:text-mq-primary">
                        <span>{t.parentInputTitle}</span>
                        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 px-5 pb-5">
                      <section className="space-y-1 min-w-0">
                        <h3 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
                          <Palette size={16} className="text-mq-primary shrink-0" />
                          <span>{t.preferencesTitle}</span>
                        </h3>
                        {prefs ? (
                          <dl>
                            <InfoRow label={prefText.visualAssistance.question} value={optionTitle(prefText.visualAssistance, prefs.visualAssistance)} />
                            <InfoRow label={prefText.audioAssistance.question} value={optionTitle(prefText.audioAssistance, prefs.audioAssistance)} />
                            <InfoRow label={prefText.activityPace.question} value={optionTitle(prefText.activityPace, prefs.activityPace)} />
                            <InfoRow label={prefText.hintStyle.question} value={optionTitle(prefText.hintStyle, prefs.hintStyle)} />
                            <InfoRow label={prefText.celebrationStyle.question} value={optionTitle(prefText.celebrationStyle, prefs.celebrationStyle)} />
                          </dl>
                        ) : (
                          <p className="text-sm text-mq-text-muted">{t.notRecorded}</p>
                        )}
                      </section>

                      <section className="space-y-1 min-w-0">
                        <h3 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
                          <Home size={16} className="text-mq-secondary shrink-0" />
                          <span>{t.socialTitle}</span>
                        </h3>
                        {social ? (
                          <dl>
                            <InfoRow label={socialText.learningEnvironment.question} value={optionTitle(socialText.learningEnvironment, social.learningEnvironment)} />
                            <InfoRow label={socialText.peerCollaboration.question} value={optionTitle(socialText.peerCollaboration, social.peerCollaboration)} />
                            <InfoRow label={socialText.parentInvolvement.question} value={optionTitle(socialText.parentInvolvement, social.parentInvolvement)} />
                            <InfoRow label={socialText.challengingTaskSupport.question} value={optionTitle(socialText.challengingTaskSupport, social.challengingTaskSupport)} />
                          </dl>
                        ) : (
                          <p className="text-sm text-mq-text-muted">{t.notRecorded}</p>
                        )}
                      </section>
                    </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentLearnerProfilesPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Lightbulb, AlertCircle, History, Users } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile } from '../types/onboarding';
import { LearnerModal } from '../components/LearnerModal';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import { SkillEvidenceList } from '../components/parent/SkillEvidenceList';
import { RecommendationResearchRows } from '../components/parent/RecommendationList';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.overview;

// Only the learner ID is remembered (per browser), never any learning data.
const SELECTED_CHILD_KEY = 'mathquest.parent.selectedLearnerId';
const readRememberedChild = (): string | null => {
  try {
    return window.localStorage.getItem(SELECTED_CHILD_KEY);
  } catch {
    return null;
  }
};
const rememberChild = (learnerId: string) => {
  try {
    window.localStorage.setItem(SELECTED_CHILD_KEY, learnerId);
  } catch {
    // Storage unavailable (private mode etc.): selection still works for this visit.
  }
};

const avatarOf = (child: Learner) => AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];

const card = 'bg-white rounded-3xl border border-mq-border shadow-xs';

export const ParentOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<ElpxProfile | null>(null);

  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const selectChild = (learnerId: string) => {
    setSelectedLearnerId(learnerId);
    rememberChild(learnerId);
  };

  // Fetch all registered children (does not depend on the current selection)
  const loadLearners = useCallback(async () => {
    setIsLoadingLearners(true);
    setErrorMessage(null);
    try {
      const res = await learnerApi.listLearners();
      if (res.success && res.data) {
        const list = res.data;
        setLearners(list);
        setSelectedLearnerId((current) => {
          if (current && list.some((l) => l.learnerId === current)) return current;
          const remembered = readRememberedChild();
          if (remembered && list.some((l) => l.learnerId === remembered)) return remembered;
          return list[0]?.learnerId ?? null;
        });
      } else {
        setErrorMessage(t.loadError);
      }
    } catch {
      setErrorMessage(parentText.common.networkError);
    } finally {
      setIsLoadingLearners(false);
    }
  }, []);

  useEffect(() => {
    loadLearners();
  }, [loadLearners]);

  // Fetch the ELP-X profile for the selected child once onboarding has started
  useEffect(() => {
    setProfileFailed(false);
    const currentChild = learners.find((l) => l.learnerId === selectedLearnerId);
    if (!selectedLearnerId || !currentChild || currentChild.onboardingStatus !== 'COMPLETED') {
      setLearnerProfile(null);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await profileApi.getProfile(selectedLearnerId);
        if (!isMounted) return;
        setLearnerProfile(res.success && res.data ? res.data : null);
        setProfileFailed(!(res.success && res.data));
      } catch {
        if (isMounted) {
          setLearnerProfile(null);
          setProfileFailed(true);
        }
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [selectedLearnerId, learners]);

  const handleCreateChild = async (data: CreateLearnerData | UpdateLearnerData) => {
    const res = await learnerApi.createLearner(data as CreateLearnerData);
    if (res.success && res.data) {
      setIsAddModalOpen(false);
      await loadLearners();
      selectChild(res.data.learnerId);
      return true;
    }
    return false;
  };

  const selectedChild = learners.find((l) => l.learnerId === selectedLearnerId) || learners[0] || null;
  const childName = selectedChild ? selectedChild.preferredName || selectedChild.firstName : '';
  const parentName = user?.fullName || parentText.shell.parentAccount;

  // Alert only when another child genuinely needs a parent action
  const otherNeedingAction = learners.find(
    (l) => l.learnerId !== selectedChild?.learnerId && l.onboardingStatus !== 'COMPLETED'
  );

  // Summary counts come only from backend ELP-X levels (no levels are inferred here)
  const skills = learnerProfile?.skillEstimates ?? [];
  const strong = skills.filter((s) => s.provisionalSkillLevel === 'PROFICIENT').length;
  const learning = skills.filter((s) => s.provisionalSkillLevel === 'DEVELOPING' || s.provisionalSkillLevel === 'EMERGING').length;
  const check = skills.filter((s) => s.provisionalSkillLevel === 'INSUFFICIENT_EVIDENCE').length;
  const topRecommendation = learnerProfile?.structuredRecommendations?.[0];

  const summaryText = (() => {
    if (!selectedChild) return '';
    if (selectedChild.onboardingStatus === 'NOT_STARTED') return t.summaryNotStarted(childName);
    if (selectedChild.onboardingStatus === 'IN_PROGRESS') return t.summaryInProgress;
    if (!learnerProfile) return '';
    if (skills.length === 0) return t.summaryNoSkills;
    const counts = t.summaryCompleted(strong, learning, check);
    return learnerProfile.isOverallEvidenceSufficient ? counts : `${counts} ${t.summaryEarly}`;
  })();

  return (
    <div className="space-y-5 animate-fade-in text-base">
      {/* 1. Greeting and child selection */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-mq-text-strong break-words">{t.welcome(parentName)}</h1>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-secondary min-h-[44px] px-4 rounded-full inline-flex items-center gap-2 text-base"
        >
          <Plus size={18} />
          <span>{t.addChild}</span>
        </button>
      </header>

      {learners.length > 1 && selectedChild && (
        <div
          role="radiogroup"
          aria-label={t.switcherLabel}
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible"
        >
          {learners.map((child) => {
            const isSelected = child.learnerId === selectedChild.learnerId;
            const avatar = avatarOf(child);
            return (
              <button
                key={child.learnerId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectChild(child.learnerId)}
                className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 min-h-[44px] pl-1.5 pr-4 rounded-full border text-base transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-mq-primary border-mq-primary text-white'
                    : 'bg-white border-mq-border text-mq-text-strong hover:border-mq-primary/50'
                }`}
              >
                <span aria-hidden="true" className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${avatar.bgColor}`}>
                  {avatar.icon}
                </span>
                <span className="font-semibold">{child.preferredName || child.firstName}</span>
                <span className={isSelected ? 'text-white/85' : 'text-mq-text-muted'}>{parentText.common.grade(child.grade)}</span>
              </button>
            );
          })}
        </div>
      )}

      {isLoadingLearners && <LoadingState message={parentText.children.loading} minHeightClass="min-h-[200px]" />}

      {errorMessage && (
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={loadLearners} />
      )}

      {!isLoadingLearners && !errorMessage && learners.length === 0 && (
        <EmptyState
          icon={<Users size={36} />}
          title={t.noChildrenTitle}
          description={t.noChildrenText}
          action={
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center gap-2 text-base"
            >
              <Plus size={18} />
              <span>{t.addFirstChild}</span>
            </button>
          }
        />
      )}

      {!isLoadingLearners && selectedChild && (
        <>
          {/* 2. Conditional alert: another child needs the parent's action */}
          {otherNeedingAction && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="flex items-start gap-2 text-base text-amber-950">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-700" />
                <span>{t.alertOtherChild(otherNeedingAction.preferredName || otherNeedingAction.firstName)}</span>
              </p>
              <Link
                to={`/learners/${otherNeedingAction.learnerId}/onboarding`}
                className="min-h-[44px] px-4 rounded-full inline-flex items-center gap-1.5 font-semibold text-amber-950 border border-amber-400 bg-white hover:bg-amber-100"
              >
                <span>{t.alertOtherChildAction}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {/* 3. Child summary */}
          <section className={`${card} p-5 flex items-start gap-4`} aria-live="polite">
            <span
              aria-hidden="true"
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border ${avatarOf(selectedChild).bgColor} ${avatarOf(selectedChild).borderColor}`}
            >
              {avatarOf(selectedChild).icon}
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-mq-text-strong break-words">{selectedChild.firstName}</h2>
                <span className="text-base text-mq-text-muted">{parentText.common.grade(selectedChild.grade)}</span>
                <OnboardingStatusBadge status={selectedChild.onboardingStatus} />
              </div>
              {isLoadingProfile ? (
                <p className="flex items-center gap-2 text-base text-mq-text-muted">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t.loadingProfile}</span>
                </p>
              ) : profileFailed ? (
                <p className="text-base text-mq-danger">{t.profileError}</p>
              ) : (
                summaryText && <p className="text-base text-mq-text leading-relaxed">{summaryText}</p>
              )}
            </div>
          </section>

          {/* 4. One primary next action */}
          <section className={`${card} p-5 border-mq-primary/30 bg-mq-surface-blue/40 space-y-3`}>
            <h2 className="text-lg font-bold text-mq-text-strong flex items-center gap-2">
              <Lightbulb size={20} className="text-mq-warning shrink-0" />
              <span>{t.nextTitle}</span>
            </h2>
            {selectedChild.onboardingStatus !== 'COMPLETED' ? (
              <>
                <p className="text-base text-mq-text leading-relaxed">
                  {selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.nextResume : t.nextStart}
                </p>
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary min-h-[48px] px-6 rounded-full inline-flex items-center gap-2 text-base"
                >
                  <span>{selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.resumeAssessment : t.startAssessment}</span>
                  <ArrowRight size={18} />
                </Link>
              </>
            ) : topRecommendation ? (
              <>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-mq-text-strong">{topRecommendation.titleSi || topRecommendation.titleEn}</p>
                  <p className="text-base text-mq-text leading-relaxed">
                    {topRecommendation.descriptionSi || topRecommendation.descriptionEn}
                  </p>
                </div>
                <Link
                  to="/parent/dashboard/recommendations"
                  className="btn btn-primary min-h-[48px] px-6 rounded-full inline-flex items-center gap-2 text-base"
                >
                  <span>{t.nextViewTips}</span>
                  <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <>
                <p className="text-base text-mq-text leading-relaxed">{t.nextNoTips}</p>
                <Link
                  to="/parent/dashboard/learner-profiles"
                  className="btn btn-primary min-h-[48px] px-6 rounded-full inline-flex items-center gap-2 text-base"
                >
                  <span>{t.nextViewProfile}</span>
                  <ArrowRight size={18} />
                </Link>
              </>
            )}
          </section>

          {/* 5. Skills (statuses from backend evidence; numbers in research details) */}
          <section className={`${card} p-5 space-y-3`}>
            <h2 className="text-lg font-bold text-mq-text-strong">{t.skillsTitle}</h2>
            {learnerProfile && skills.length > 0 ? (
              <>
                <p className="text-sm text-mq-text-muted">{t.statusLegend}</p>
                <SkillEvidenceList profile={learnerProfile} showOverall={false} hideCounts hideHeading>
                  {learnerProfile.structuredRecommendations?.length > 0 && (
                    <RecommendationResearchRows
                      recommendations={learnerProfile.structuredRecommendations}
                      rulesetVersion={learnerProfile.recommendationRulesetVersion}
                    />
                  )}
                </SkillEvidenceList>
              </>
            ) : (
              <p className="text-base text-mq-text-muted">{isLoadingProfile ? t.loadingProfile : t.skillsEmpty}</p>
            )}
          </section>

          {/* 6. Recent activity: no parent-facing activity history API exists yet */}
          <section className={`${card} p-5 space-y-2`}>
            <h2 className="text-lg font-bold text-mq-text-strong flex items-center gap-2">
              <History size={20} className="text-mq-primary shrink-0" />
              <span>{t.activityTitle}</span>
            </h2>
            <p className="text-base text-mq-text-muted leading-relaxed">{t.activityEmpty}</p>
          </section>
        </>
      )}

      <LearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateChild}
        editingLearner={null}
      />
    </div>
  );
};

export default ParentOverviewPage;

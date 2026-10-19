import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Brain,
  Loader2,
  ChevronRight,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile } from '../types/onboarding';
import { LearnerModal } from '../components/LearnerModal';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { SkillEvidenceList } from '../components/parent/SkillEvidenceList';
import { RecommendationList, RecommendationResearchRows } from '../components/parent/RecommendationList';
import { languageLabel } from '../components/parent/labels';
import { PageHeader } from '../../../shared/components/PageHeader';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.overview;

export const ParentOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<ElpxProfile | null>(null);

  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state for Add Child quick link
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch all registered children
  const loadLearners = useCallback(async () => {
    setIsLoadingLearners(true);
    setErrorMessage(null);
    try {
      const res = await learnerApi.listLearners();
      if (res.success && res.data) {
        setLearners(res.data);
        if (res.data.length > 0 && !selectedLearnerId) {
          setSelectedLearnerId(res.data[0].learnerId);
        }
      } else {
        setErrorMessage(t.loadError);
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

  // Fetch ELP-X profile for selected child if onboarding completed or in progress
  useEffect(() => {
    if (!selectedLearnerId) {
      setLearnerProfile(null);
      return;
    }

    const currentChild = learners.find((l) => l.learnerId === selectedLearnerId);
    if (!currentChild) return;

    if (currentChild.onboardingStatus === 'NOT_STARTED') {
      setLearnerProfile(null);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await profileApi.getProfile(selectedLearnerId);
        if (isMounted) {
          if (res.success && res.data) {
            setLearnerProfile(res.data);
          } else {
            setLearnerProfile(null);
          }
        }
      } catch {
        if (isMounted) setLearnerProfile(null);
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
      setSelectedLearnerId(res.data.learnerId);
      return true;
    }
    return false;
  };

  const selectedChild = learners.find((l) => l.learnerId === selectedLearnerId) || learners[0] || null;
  const totalChildren = learners.length;
  const completedOnboardingCount = learners.filter((l) => l.onboardingStatus === 'COMPLETED').length;
  const pendingOnboardingCount = totalChildren - completedOnboardingCount;

  const selectedAvatar = selectedChild
    ? AVATAR_OPTIONS.find((a) => a.id === selectedChild.avatarId) || AVATAR_OPTIONS[0]
    : AVATAR_OPTIONS[0];

  const stats = [
    { label: t.statChildren, value: totalChildren, Icon: Users, tone: 'text-mq-primary' },
    { label: t.statCompleted, value: completedOnboardingCount, Icon: CheckCircle2, tone: 'text-mq-success' },
    { label: t.statPending, value: pendingOnboardingCount, Icon: Clock, tone: 'text-mq-warning' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        role="parent"
        title={t.title}
        description={t.description}
        actions={
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary min-h-[44px] px-5 rounded-full inline-flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>{t.addChild}</span>
          </button>
        }
      />

      {/* Welcome and quick counts */}
      <section className="bg-white px-5 py-4 rounded-3xl border border-mq-border shadow-xs space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-mq-text-strong break-words">
            {t.welcome(user?.fullName || parentText.shell.parentAccount)}
          </h2>
          <p className="text-sm text-mq-text-muted">{t.welcomeText}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map(({ label, value, Icon, tone }) => (
            <div key={label} className="px-4 py-2.5 bg-mq-surface-soft rounded-2xl border border-mq-border/70 flex items-center gap-3">
              <Icon size={22} className={`${tone} shrink-0`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold text-mq-text-strong leading-none">{value}</p>
                <p className="text-sm text-mq-text-muted mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isLoadingLearners && <LoadingState message={parentText.children.loading} />}

      {errorMessage && (
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={loadLearners} />
      )}

      {!isLoadingLearners && totalChildren === 0 && (
        <EmptyState
          icon={<Users size={36} />}
          title={t.noChildrenTitle}
          description={t.noChildrenText}
          action={
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center gap-2 text-sm"
            >
              <Plus size={18} />
              <span>{t.addFirstChild}</span>
            </button>
          }
        />
      )}

      {!isLoadingLearners && totalChildren > 0 && selectedChild && (
        <div className="space-y-6">
          {/* Child selector */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-mq-text-strong">{t.selectChild}</h3>
              <Link
                to="/learners"
                className="text-sm font-semibold text-mq-primary hover:underline inline-flex items-center gap-1"
              >
                <span>{t.manageAll(totalChildren)}</span>
                <ChevronRight size={15} />
              </Link>
            </div>
            <ChildSwitcher learners={learners} selectedId={selectedChild.learnerId} onSelect={setSelectedLearnerId} />
          </section>

          {/* Selected child */}
          <section className="bg-white rounded-3xl border border-mq-border p-5 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-mq-border">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${selectedAvatar.bgColor} ${selectedAvatar.borderColor}`}
                  aria-hidden="true"
                >
                  {selectedAvatar.icon}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-mq-text-strong break-words">
                      {selectedChild.firstName}
                      {selectedChild.preferredName && ` (${selectedChild.preferredName})`}
                    </h3>
                    <OnboardingStatusBadge status={selectedChild.onboardingStatus} />
                  </div>
                  <p className="text-sm text-mq-text-muted">
                    {parentText.common.gradeAndAge(selectedChild.grade, selectedChild.age)} •{' '}
                    {t.learningLanguage(languageLabel(selectedChild.preferredLanguage))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {selectedChild.onboardingStatus === 'COMPLETED' ? (
                  <>
                    <Link
                      to="/parent/dashboard/learner-profiles"
                      className="btn btn-secondary min-h-[44px] px-4 rounded-full text-sm inline-flex items-center gap-2"
                    >
                      <Brain size={17} />
                      <span>{t.viewProfile}</span>
                    </Link>
                    <a
                      href="#/play"
                      className="btn btn-primary min-h-[44px] px-4 rounded-full text-sm inline-flex items-center gap-2"
                    >
                      <BookOpen size={17} />
                      <span>{t.playGames}</span>
                    </a>
                  </>
                ) : (
                  <Link
                    to={`/learners/${selectedChild.learnerId}/onboarding`}
                    className="btn btn-primary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center gap-2"
                  >
                    <span>
                      {selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.resumeAssessment : t.startAssessment}
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>

            {selectedChild.onboardingStatus !== 'COMPLETED' && (
              <div className="p-6 bg-mq-surface-soft rounded-2xl border border-mq-border text-center space-y-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${
                    selectedChild.onboardingStatus === 'IN_PROGRESS'
                      ? 'bg-mq-primary text-white'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedChild.onboardingStatus === 'IN_PROGRESS' ? <Clock size={22} /> : <ClipboardList size={22} />}
                </div>
                <h4 className="text-base font-bold text-mq-text-strong">
                  {selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.inProgressTitle : t.notStartedTitle}
                </h4>
                <p className="text-sm text-mq-text-muted max-w-lg mx-auto leading-relaxed">
                  {selectedChild.onboardingStatus === 'IN_PROGRESS'
                    ? t.inProgressText
                    : t.notStartedText(selectedChild.preferredName || selectedChild.firstName)}
                </p>
              </div>
            )}

            {selectedChild.onboardingStatus === 'COMPLETED' && (
              <div className="space-y-6">
                {isLoadingProfile && (
                  <div className="flex items-center justify-center p-8 text-mq-primary gap-2 text-sm font-semibold">
                    <Loader2 size={18} className="animate-spin" />
                    <span>{t.loadingProfile}</span>
                  </div>
                )}

                {!isLoadingProfile && learnerProfile && (
                  <>
                    <SkillEvidenceList profile={learnerProfile}>
                      {learnerProfile.structuredRecommendations?.length > 0 && (
                        <RecommendationResearchRows
                          recommendations={learnerProfile.structuredRecommendations.slice(0, 2)}
                          rulesetVersion={learnerProfile.recommendationRulesetVersion}
                        />
                      )}
                    </SkillEvidenceList>

                    {learnerProfile.structuredRecommendations?.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-bold text-mq-text-strong">{parentText.recommendations.title}</h3>
                          <Link
                            to="/parent/dashboard/recommendations"
                            className="text-sm font-semibold text-mq-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>{parentText.recommendations.viewAll}</span>
                            <ChevronRight size={15} />
                          </Link>
                        </div>
                        <RecommendationList
                          recommendations={learnerProfile.structuredRecommendations}
                          limit={2}
                          rulesetVersion={learnerProfile.recommendationRulesetVersion}
                          showResearchDetails={false}
                        />
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
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

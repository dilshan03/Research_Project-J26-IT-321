import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Lightbulb } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import type { Learner } from '../types';
import type { ElpxProfile } from '../types/onboarding';
import { PageHeader } from '../../../shared/components/PageHeader';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { RecommendationList } from '../components/parent/RecommendationList';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.recommendations;

export const ParentRecommendationsPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ElpxProfile | null>(null);

  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedLearnerId) {
      setProfile(null);
      return;
    }

    const child = learners.find((l) => l.learnerId === selectedLearnerId);
    if (!child || child.onboardingStatus !== 'COMPLETED') {
      setProfile(null);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await profileApi.getProfile(selectedLearnerId);
        if (isMounted) {
          setProfile(res.success && res.data ? res.data : null);
        }
      } catch {
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedLearnerId, learners]);

  const selectedChild = learners.find((l) => l.learnerId === selectedLearnerId) || learners[0] || null;
  const childName = selectedChild ? selectedChild.preferredName || selectedChild.firstName : '';

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader role="parent" title={t.title} description={t.description} />

      {errorMessage && (
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={loadLearners} />
      )}

      {isLoadingLearners ? (
        <LoadingState message={t.loading} />
      ) : learners.length === 0 ? (
        <EmptyState
          title={t.noChildrenTitle}
          description={t.noChildrenText}
          action={
            <Link to="/learners" className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center text-sm">
              {t.addChild}
            </Link>
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-base font-bold text-mq-text-strong">{parentText.overview.selectChild}</h3>
            <ChildSwitcher learners={learners} selectedId={selectedChild?.learnerId} onSelect={setSelectedLearnerId} />
          </section>

          {selectedChild && selectedChild.onboardingStatus !== 'COMPLETED' && (
            <section className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <Lightbulb size={26} />
              </div>
              <h3 className="text-lg font-bold text-mq-text-strong">{t.notCompletedTitle}</h3>
              <p className="text-sm text-mq-text-muted leading-relaxed">{t.notCompletedText(childName)}</p>
              <Link
                to={`/learners/${selectedChild.learnerId}/onboarding`}
                className="btn btn-primary min-h-[44px] px-5 rounded-full inline-flex items-center gap-2 text-sm"
              >
                <span>{t.completeAssessment}</span>
                <ArrowRight size={16} />
              </Link>
            </section>
          )}

          {selectedChild && selectedChild.onboardingStatus === 'COMPLETED' && (
            <>
              {isLoadingProfile && (
                <div className="flex items-center justify-center p-12 text-mq-primary gap-2 text-sm font-semibold">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t.loading}</span>
                </div>
              )}

              {!isLoadingProfile && profile && (
                <section className="bg-white rounded-3xl border border-mq-border p-5 sm:p-7 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-mq-text-strong flex items-center gap-2">
                    <Lightbulb size={18} className="text-mq-warning shrink-0" />
                    <span>{t.forChild(childName)}</span>
                  </h3>
                  <RecommendationList
                    recommendations={profile.structuredRecommendations ?? []}
                    rulesetVersion={profile.recommendationRulesetVersion}
                  />
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ParentRecommendationsPage;

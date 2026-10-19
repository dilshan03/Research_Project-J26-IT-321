import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import { PageHeader } from '../../../shared/components/PageHeader';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.assessments;
const STEP_LABELS = [t.steps.adhd, t.steps.snap, t.steps.preferences, t.steps.social, t.steps.handover, t.steps.math];

export const ParentAssessmentsPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLearners = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await learnerApi.listLearners();
      if (res.success && res.data) {
        setLearners(res.data);
      } else {
        setErrorMessage(t.loadError);
      }
    } catch {
      setErrorMessage(parentText.common.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

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
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={fetchLearners} />
      )}

      {isLoading ? (
        <LoadingState message={t.loading} />
      ) : learners.length === 0 ? (
        <EmptyState
          title={t.noChildrenTitle}
          description={t.noChildrenText}
          action={
            <Link to="/learners" className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center gap-2 text-sm">
              <Plus size={18} />
              <span>{t.goToChildren}</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {learners.map((child) => {
            const avatar = AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];

            return (
              <div
                key={child.learnerId}
                className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_2fr_auto] lg:items-center gap-5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${avatar.bgColor} ${avatar.borderColor}`}
                    aria-hidden="true"
                  >
                    {avatar.icon}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-bold text-mq-text-strong break-words">
                      {child.firstName}
                      {child.preferredName && ` (${child.preferredName})`}
                    </h3>
                    <p className="text-sm text-mq-text-muted">{parentText.common.grade(child.grade)}</p>
                    <OnboardingStatusBadge status={child.onboardingStatus} />
                  </div>
                </div>

                <ol aria-label={t.stepsLabel} className="flex flex-wrap gap-2">
                  {STEP_LABELS.map((label, idx) => (
                    <li
                      key={label}
                      className="px-3 py-1.5 rounded-lg bg-mq-surface-soft border border-mq-border text-xs text-mq-text-muted"
                    >
                      {idx + 1}. {label}
                    </li>
                  ))}
                </ol>

                <div className="lg:justify-self-end">
                  {child.onboardingStatus === 'COMPLETED' ? (
                    <Link
                      to="/parent/dashboard/learner-profiles"
                      className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center gap-2"
                    >
                      <span>{t.viewResults}</span>
                      <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <Link
                      to={`/learners/${child.learnerId}/onboarding`}
                      className="btn btn-primary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center gap-2"
                    >
                      <span>{child.onboardingStatus === 'IN_PROGRESS' ? t.resume : t.start}</span>
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParentAssessmentsPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import { PageHeader } from '../../../shared/components/PageHeader';
import {
  LoadingState,
  EmptyState,
  ErrorAlert,
} from '../../../shared/components/ui/StateViews';

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
        setErrorMessage(res.message || 'Failed to load children profiles.');
      }
    } catch {
      setErrorMessage('Network connection error while connecting to service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Standardized Page Header */}
      <PageHeader
        role="parent"
        title="Onboarding & Diagnostic Assessments"
        titleSi="ඇගයීම් සහ ප්‍රශ්නාවලි"
        description="The 5-step onboarding flow gathers child-friendly learning preferences, SNAP-IV ADHD support scales, social learning context, and establishes Grade-appropriate baseline mathematics levels."
        descriptionSi="ඉගෙනුම් මනාප, SNAP-IV ප්‍රශ්නාවලිය සහ ආරම්භක ගණිත ඇගයීම් සම්පූර්ණ කර දරුවාට ගැළපෙන ඉගෙනුම් මට්ටම තීරණය කරන්න."
        actions={
          <Link
            to="/learners"
            className="btn btn-secondary py-2 px-4 rounded-full text-xs sm:text-sm font-bold shadow-xs inline-flex items-center gap-1.5"
          >
            <span>Manage Children (මගේ දරුවන්)</span>
          </Link>
        }
      />

      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          messageSi="දරුවන්ගේ තොරතුරු ලබාගැනීමට නොහැකි විය."
          onRetry={fetchLearners}
        />
      )}

      {isLoading ? (
        <LoadingState
          message="Loading onboarding assessments..."
          messageSi="ඇගයීම් විස්තර පූරණය වෙමින් පවතී..."
        />
      ) : learners.length === 0 ? (
        <EmptyState
          title="No Child Profiles Found"
          titleSi="තවමත් දරුවන් ලියාපදිංචි කර නැත"
          description="Register a child profile first before initiating onboarding diagnostic assessments."
          descriptionSi="ඇගයීම් ආරම්භ කිරීමට පෙර කරුණාකර පළමුව දරුවාගේ තොරතුරු ඇතුළත් කරන්න."
          action={
            <Link
              to="/learners"
              className="btn btn-primary text-xs sm:text-sm py-2.5 px-6 rounded-full inline-flex items-center gap-2 font-bold shadow-xs"
            >
              <Plus size={16} />
              <span>Go to My Children (දරුවන් එක් කරන්න)</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {learners.map((child) => {
            const avatar =
              AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];

            return (
              <div
                key={child.learnerId}
                className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-mq-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${avatar.bgColor} border ${avatar.borderColor}`}
                  >
                    {avatar.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-mq-text-strong truncate">
                        {child.firstName} {child.preferredName && `(${child.preferredName})`}
                      </h3>
                      <span className="text-xs font-bold text-mq-text-muted">
                        Grade {child.grade}
                      </span>
                    </div>
                    <div className="mt-1">
                      <OnboardingStatusBadge status={child.onboardingStatus} />
                    </div>
                  </div>
                </div>

                {/* Steps Checklist Pills */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-mq-text-muted">
                  <span className="px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border">
                    1. Preferences
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border">
                    2. SNAP-IV
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border">
                    3. Social Context
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border">
                    4. Handover
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border">
                    5. Math Baseline
                  </span>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {child.onboardingStatus === 'COMPLETED' ? (
                    <Link
                      to="/parent/dashboard/learner-profiles"
                      className="btn btn-secondary text-xs py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5"
                    >
                      <span>View Results (ප්‍රතිඵල)</span>
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <Link
                      to={`/learners/${child.learnerId}/onboarding`}
                      className="btn btn-primary text-xs py-2 px-5 rounded-xl font-bold inline-flex items-center gap-2 shadow-xs"
                    >
                      <span>
                        {child.onboardingStatus === 'IN_PROGRESS'
                          ? 'Resume Onboarding'
                          : 'Start Onboarding'}
                      </span>
                      <ArrowRight size={14} />
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

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';

export const ParentAssessmentsPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLearners = async () => {
      setIsLoading(true);
      try {
        const res = await learnerApi.listLearners();
        if (res.success && res.data) {
          setLearners(res.data);
        } else {
          setErrorMessage(res.message || 'Failed to load children.');
        }
      } catch {
        setErrorMessage('Network connection error.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLearners();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-mq-primary gap-3">
        <Loader2 size={32} className="animate-spin" />
        <span className="font-semibold text-sm">Loading onboarding assessments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Intro Banner */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong flex items-center gap-2">
          <ClipboardCheck size={22} className="text-mq-primary" />
          <span>Diagnostic Assessments & Onboarding Tracker</span>
        </h2>
        <p className="text-xs sm:text-sm text-mq-text-muted max-w-2xl">
          The 5-step onboarding flow gathers child-friendly learning preferences, SNAP-IV ADHD support scales,
          social learning context, and establishes Grade-appropriate baseline mathematics levels.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 text-mq-danger text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {learners.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-mq-border p-12 text-center max-w-md mx-auto space-y-3">
          <p className="text-sm text-mq-text-muted">No child profiles found.</p>
          <Link to="/parent/dashboard/children" className="btn btn-primary text-xs py-2 px-5 rounded-full inline-block">
            Register Child First
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {learners.map((child) => {
            const avatar =
              AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];

            return (
              <div
                key={child.learnerId}
                className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${avatar.bgColor} border ${avatar.borderColor}`}
                  >
                    {avatar.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-mq-text-strong">
                        {child.firstName} {child.preferredName && `(${child.preferredName})`}
                      </h3>
                      <span className="text-xs font-bold text-mq-text-muted">
                        Grade {child.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {child.onboardingStatus === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-success-bg text-mq-success border border-mq-success/30">
                          <CheckCircle2 size={13} />
                          <span>Onboarding Completed (සම්පූර්ණයි)</span>
                        </span>
                      ) : child.onboardingStatus === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/30">
                          <Clock size={13} />
                          <span>In Progress (ක්‍රියාත්මකයි)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-warning-bg text-mq-warning border border-mq-warning/30">
                          <Sparkles size={13} />
                          <span>Not Started (ආරම්භ කිරීමට ඇත)</span>
                        </span>
                      )}
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
                      <span>View Results</span>
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <Link
                      to={`/learners/${child.learnerId}/onboarding`}
                      className="btn btn-primary text-xs py-2 px-5 rounded-xl font-bold inline-flex items-center gap-2 shadow-sm"
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

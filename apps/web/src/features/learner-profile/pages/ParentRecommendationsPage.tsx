import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Brain,
  Lightbulb,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile, ElpxStructuredRecommendation } from '../types/onboarding';

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
        setErrorMessage(res.message || 'Failed to load children.');
      }
    } catch {
      setErrorMessage('Network connection error.');
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
          if (res.success && res.data) {
            setProfile(res.data);
          } else {
            setProfile(null);
          }
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

  if (isLoadingLearners) {
    return (
      <div className="flex items-center justify-center p-16 text-mq-primary gap-3">
        <Loader2 size={32} className="animate-spin" />
        <span className="font-semibold text-sm">Loading recommendations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Child Switcher */}
      {learners.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-mq-text-muted mb-2.5">
            Select Child (දරුවා තෝරන්න)
          </h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {learners.map((child) => {
              const isSelected = child.learnerId === selectedChild?.learnerId;
              const avatar =
                AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];

              return (
                <button
                  key={child.learnerId}
                  type="button"
                  onClick={() => setSelectedLearnerId(child.learnerId)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all shrink-0 cursor-pointer text-left min-w-[200px] ${
                    isSelected
                      ? 'bg-mq-surface-blue border-mq-primary shadow-sm ring-2 ring-mq-primary/20'
                      : 'bg-white border-mq-border hover:border-mq-primary/40 hover:bg-mq-surface-soft/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${avatar.bgColor} border ${avatar.borderColor}`}
                  >
                    {avatar.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-mq-text-strong truncate">
                      {child.preferredName || child.firstName}
                    </p>
                    <p className="text-[11px] text-mq-text-muted">Grade {child.grade}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedChild && selectedChild.onboardingStatus !== 'COMPLETED' && (
        <div className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            💡
          </div>
          <h3 className="text-lg font-bold text-mq-text-strong">
            Recommendations Require Baseline Assessment
          </h3>
          <p className="text-xs sm:text-sm text-mq-text-muted max-w-md mx-auto">
            Personalized, explainable learning recommendations are derived from the learner’s diagnostic
            assessment and SNAP-IV profile. Complete onboarding for {selectedChild.firstName} to view strategies.
          </p>
          <Link
            to={`/learners/${selectedChild.learnerId}/onboarding`}
            className="btn btn-primary text-xs py-2 px-5 rounded-full inline-flex items-center gap-1.5 font-bold"
          >
            <span>Complete Onboarding</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {selectedChild && selectedChild.onboardingStatus === 'COMPLETED' && (
        <div className="space-y-6">
          {isLoadingProfile && (
            <div className="flex items-center justify-center p-12 text-mq-primary gap-2 text-xs font-semibold">
              <Loader2 size={18} className="animate-spin" />
              <span>Analyzing pedagogical recommendations...</span>
            </div>
          )}

          {!isLoadingProfile && profile && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-mq-border mb-4">
                  <Sparkles size={18} className="text-mq-accent-yellow" />
                  <h3 className="text-base font-extrabold text-mq-text-strong">
                    Personalized Pedagogical Strategies for {selectedChild.firstName}
                  </h3>
                </div>

                {profile.structuredRecommendations && profile.structuredRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.structuredRecommendations.map((rec: ElpxStructuredRecommendation) => (
                      <div
                        key={rec.recommendationId}
                        className="p-5 bg-mq-surface-soft/60 rounded-2xl border border-mq-border space-y-3 hover:border-mq-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-mq-primary">
                            {rec.titleEn}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-mq-border text-mq-text-muted">
                            {rec.strategyCode}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-mq-text-strong leading-relaxed font-sinhala">
                          {rec.titleSi}
                        </p>

                        <p className="text-xs text-mq-text-muted leading-relaxed">
                          {rec.descriptionSi || rec.descriptionEn}
                        </p>

                        {/* Explainable Decision Triggers */}
                        {rec.reasonCodes && rec.reasonCodes.length > 0 && (
                          <div className="pt-2 border-t border-mq-border/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-mq-text-muted">
                              Explainable Decision Triggers:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rec.reasonCodes.map((code, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-mq-surface-blue text-mq-primary"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-mq-text-muted">
                    No custom pedagogical strategies triggered. Learner demonstrated solid overall mastery.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentRecommendationsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
  Palette,
  Users2,
} from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile, ElpxSkillEstimate, OnboardingFullSummary } from '../types/onboarding';

export const ParentLearnerProfilesPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ElpxProfile | null>(null);
  const [summary, setSummary] = useState<OnboardingFullSummary | null>(null);

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
        setErrorMessage(res.message || 'Failed to retrieve learners.');
      }
    } catch {
      setErrorMessage('Network error while connecting to learner profile service.');
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
    if (!child || child.onboardingStatus === 'NOT_STARTED') {
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
          if (profileRes.success && profileRes.data) {
            setProfile(profileRes.data);
          } else {
            setProfile(null);
          }

          if (summaryRes.success && summaryRes.data) {
            setSummary(summaryRes.data);
          } else {
            setSummary(null);
          }
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
    return (
      <div className="flex items-center justify-center p-16 text-mq-primary gap-3">
        <Loader2 size={32} className="animate-spin" />
        <span className="font-semibold text-sm">Loading learner profiles...</span>
      </div>
    );
  }

  if (learners.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-mq-border p-8 sm:p-12 text-center max-w-lg mx-auto my-6 space-y-4">
        <div className="text-4xl">👶</div>
        <h3 className="text-xl font-extrabold text-mq-text-strong">No Child Profiles Found</h3>
        <p className="text-sm text-mq-text-muted">
          Add a child profile first to generate evidence-aware mathematics learner profiles.
        </p>
        <Link to="/parent/dashboard/children" className="btn btn-primary text-xs py-2 px-5 rounded-full inline-block">
          Go to My Children
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 text-mq-danger text-sm flex items-center gap-2 border border-red-200">
          <Info size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Child Switcher Tabs */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-mq-text-muted mb-2.5">
          Select Child Profile to Inspect
        </h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {learners.map((child) => {
            const isSelected = child.learnerId === selectedChild?.learnerId;
            const childAvatar =
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${childAvatar.bgColor} border ${childAvatar.borderColor}`}
                >
                  {childAvatar.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-mq-text-strong truncate">
                    {child.preferredName || child.firstName}
                  </p>
                  <p className="text-[11px] text-mq-text-muted">
                    Grade {child.grade} · {child.onboardingStatus}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedChild && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${avatar.bgColor} border ${avatar.borderColor}`}
              >
                {avatar.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
                    {selectedChild.firstName} {selectedChild.preferredName && `(${selectedChild.preferredName})`}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                    Grade {selectedChild.grade}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-mq-text-muted mt-0.5">
                  Learner ID: <code className="font-mono text-xs">{selectedChild.learnerId}</code> · Age {selectedChild.age}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {selectedChild.onboardingStatus !== 'COMPLETED' ? (
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary text-xs py-2.5 px-4 rounded-xl font-bold inline-flex items-center gap-1.5"
                >
                  <span>
                    {selectedChild.onboardingStatus === 'IN_PROGRESS'
                      ? 'Resume Assessment'
                      : 'Complete Onboarding'}
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-success-bg text-mq-success border border-mq-success/30">
                  <CheckCircle2 size={14} />
                  <span>Verified ELP-X Profile</span>
                </span>
              )}
            </div>
          </div>

          {/* If NOT_STARTED or IN_PROGRESS */}
          {selectedChild.onboardingStatus !== 'COMPLETED' && (
            <div className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4 max-w-xl mx-auto my-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <h3 className="text-lg font-bold text-mq-text-strong">
                Profile Awaiting Diagnostic Assessment
              </h3>
              <p className="text-xs sm:text-sm text-mq-text-muted max-w-md mx-auto">
                Evidence-aware mathematics proficiency levels and credible intervals are computed once the
                diagnostic assessment is completed.
              </p>
              <Link
                to={`/learners/${selectedChild.learnerId}/onboarding`}
                className="btn btn-primary text-xs py-2 px-5 rounded-full inline-flex items-center gap-1.5 font-bold"
              >
                <span>Launch Assessment Now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* If COMPLETED: Display Evidence-Aware Mathematical Profile */}
          {selectedChild.onboardingStatus === 'COMPLETED' && (
            <>
              {isLoadingProfile && (
                <div className="flex items-center justify-center p-12 text-mq-primary gap-2 text-sm font-semibold">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading Bayesian profile models...</span>
                </div>
              )}

              {!isLoadingProfile && profile && (
                <div className="space-y-6">
                  {/* Bayesian Proficiency & Credible Interval Estimates */}
                  <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-mq-border">
                      <div>
                        <h3 className="text-base font-extrabold text-mq-text-strong flex items-center gap-2">
                          <Brain size={18} className="text-mq-primary" />
                          <span>Bayesian Beta-Binomial Skill Estimates</span>
                        </h3>
                        <p className="text-xs text-mq-text-muted mt-0.5">
                          Calculated via ELP-X Engine with prior smoothing and 95% Credible Intervals.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-mq-surface-soft border border-mq-border self-start sm:self-auto">
                        Schema: {profile.profileVersion}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.skillEstimates?.map((skill: ElpxSkillEstimate) => (
                        <div
                          key={skill.skillId}
                          className="p-5 rounded-2xl bg-mq-surface-soft/60 border border-mq-border hover:border-mq-primary/40 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-mq-text-strong">
                                {skill.skillName}
                              </p>
                              <p className="text-xs text-mq-text-muted font-medium">
                                {skill.skillNameSi}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                skill.provisionalSkillLevel === 'PROFICIENT'
                                  ? 'bg-mq-success-bg text-mq-success border border-mq-success/20'
                                  : skill.provisionalSkillLevel === 'DEVELOPING'
                                  ? 'bg-mq-surface-blue text-mq-primary border border-mq-primary/20'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {skill.provisionalSkillLevel.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Proficiency gauge */}
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>Estimated Proficiency</span>
                              <span className="text-mq-primary font-bold">
                                {skill.estimatedProficiencyPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-mq-border/80">
                              <div
                                className="h-full bg-mq-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(5, skill.estimatedProficiencyPercentage))}%` }}
                              />
                            </div>
                          </div>

                          {/* Statistical Indicators Table */}
                          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] border-t border-mq-border/60">
                            <div>
                              <span className="text-mq-text-muted">Distinct Evaluated:</span>{' '}
                              <strong className="text-mq-text">{skill.distinctQuestionsAssessed} items</strong>
                            </div>
                            <div>
                              <span className="text-mq-text-muted">Raw Accuracy:</span>{' '}
                              <strong className="text-mq-text">
                                {skill.correctFirstResponses}/{skill.distinctQuestionsAssessed} ({skill.rawAccuracyPercentage.toFixed(0)}%)
                              </strong>
                            </div>
                            <div>
                              <span className="text-mq-text-muted">Posterior Beta (α, β):</span>{' '}
                              <strong className="font-mono text-mq-text">
                                ({skill.posteriorAlpha.toFixed(1)}, {skill.posteriorBeta.toFixed(1)})
                              </strong>
                            </div>
                            <div>
                              <span className="text-mq-text-muted">95% Credible Interval:</span>{' '}
                              <strong className="font-mono text-mq-text">
                                [{(skill.credibleInterval.lower * 100).toFixed(0)}% – {(skill.credibleInterval.upper * 100).toFixed(0)}%]
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Adaptive Preferences & Social Learning Profile (From Onboarding) */}
                  {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Learning Preferences */}
                      <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-mq-border">
                          <Palette size={18} className="text-mq-primary" />
                          <h3 className="text-sm font-extrabold text-mq-text-strong">
                            ADHD Learning Preferences (ඉගෙනුම් මනාප)
                          </h3>
                        </div>

                        {summary.learningPreferences ? (
                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Visual Assistance:</span>
                              <span className="font-bold text-mq-text capitalize">
                                {summary.learningPreferences.visualAssistance}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Audio Assistance:</span>
                              <span className="font-bold text-mq-text capitalize">
                                {summary.learningPreferences.audioAssistance.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Activity Pace:</span>
                              <span className="font-bold text-mq-text capitalize">
                                {summary.learningPreferences.activityPace.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Hint Style:</span>
                              <span className="font-bold text-mq-text capitalize">
                                {summary.learningPreferences.hintStyle.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span className="text-mq-text-muted">Celebration Style:</span>
                              <span className="font-bold text-mq-text capitalize">
                                {summary.learningPreferences.celebrationStyle.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-mq-text-muted">No custom preferences registered.</p>
                        )}
                      </div>

                      {/* Social Learning Context */}
                      <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-mq-border">
                          <Users2 size={18} className="text-mq-secondary" />
                          <h3 className="text-sm font-extrabold text-mq-text-strong">
                            Social Learning Context (සමාජයීය සන්දර්භය)
                          </h3>
                        </div>

                        {summary.socialContext ? (
                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Environment:</span>
                              <span className="font-bold text-mq-text">
                                {summary.socialContext.learningEnvironment}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Peer Collaboration:</span>
                              <span className="font-bold text-mq-text">
                                {summary.socialContext.peerCollaboration}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-mq-border/50">
                              <span className="text-mq-text-muted">Parent Involvement:</span>
                              <span className="font-bold text-mq-text">
                                {summary.socialContext.parentInvolvement}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span className="text-mq-text-muted">Task Challenge Support:</span>
                              <span className="font-bold text-mq-text">
                                {summary.socialContext.challengingTaskSupport}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-mq-text-muted">No social context responses saved.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Research Disclaimer */}
                  <div className="p-4 bg-mq-surface-soft rounded-2xl border border-mq-border text-xs text-mq-text-muted flex items-start gap-2.5">
                    <Info size={16} className="text-mq-primary shrink-0 mt-0.5" />
                    <span>{profile.disclaimer || 'MathQuest research profile generated for educational adaptation purposes.'}</span>
                  </div>
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

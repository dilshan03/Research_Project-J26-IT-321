import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  ArrowRight,
  Brain,
  AlertCircle,
  Loader2,
  GraduationCap,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile, ElpxSkillEstimate } from '../types/onboarding';
import { LearnerModal } from '../components/LearnerModal';

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
        setErrorMessage(res.message || 'Failed to load children profiles.');
      }
    } catch {
      setErrorMessage('Network connection error while loading children.');
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ========================================================= */}
      {/* 1. Personalized Parent Welcome & Quick Stat Highlights    */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-mq-primary/10 via-mq-surface-blue to-white p-6 sm:p-8 rounded-3xl border border-mq-primary/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-mq-primary flex items-center gap-1.5">
              <Sparkles size={14} className="text-mq-accent-yellow" />
              <span>ආයුබෝවන් · Welcome Back</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong">
              Hello, {user?.fullName || 'Parent'}!
            </h2>
            <p className="text-sm text-mq-text-muted max-w-xl">
              Track your child’s ADHD-tailored math journey, review evidence-aware skill levels,
              and explore explainable learning recommendations.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:shadow"
            >
              <Plus size={16} />
              <span>Add Child Profile</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-mq-border/70">
          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-text-muted">
              <Users size={15} className="text-mq-primary" />
              <span>Registered Children</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              {totalChildren}
            </p>
          </div>

          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-success">
              <CheckCircle2 size={15} />
              <span>Onboarding Ready</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              {completedOnboardingCount}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-warning">
              <Clock size={15} />
              <span>Pending Profiling</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              {pendingOnboardingCount}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Loading & Error States                                 */}
      {/* ========================================================= */}
      {isLoadingLearners && (
        <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-mq-border text-mq-primary gap-3 font-semibold text-sm">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading children profiles...</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-mq-danger text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. Empty State: No Registered Children                    */}
      {/* ========================================================= */}
      {!isLoadingLearners && totalChildren === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-mq-border-strong p-8 sm:p-14 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-mq-surface-blue text-mq-primary rounded-3xl flex items-center justify-center mx-auto text-3xl">
            👶
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
            No Children Registered Yet
          </h3>
          <p className="text-sm text-mq-text-muted max-w-md mx-auto">
            Get started by registering your child’s profile. Once added, you will complete the 5-step
            Sinhala onboarding assessment to discover their tailored mathematics level.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2 py-2.5 px-6 rounded-full text-sm font-bold shadow-sm"
            >
              <Plus size={16} />
              <span>Register Your First Child</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. Active Child Selection & Deep Dive Overview            */}
      {/* ========================================================= */}
      {!isLoadingLearners && totalChildren > 0 && selectedChild && (
        <div className="space-y-6">
          {/* Child Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mq-text-muted">
                Select Child (දරුවා තෝරන්න)
              </h3>
              <Link
                to="/parent/dashboard/children"
                className="text-xs font-bold text-mq-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Manage all ({totalChildren})</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {learners.map((child) => {
                const isSelected = child.learnerId === selectedChild.learnerId;
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
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${avatar.bgColor} border ${avatar.borderColor}`}
                    >
                      {avatar.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-mq-text-strong truncate">
                        {child.preferredName || child.firstName}
                      </p>
                      <p className="text-xs text-mq-text-muted">
                        Grade {child.grade} · {child.age} yrs
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Child Status Banner & Actions */}
          <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-mq-border/80">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${selectedAvatar.bgColor} border ${selectedAvatar.borderColor} shadow-xs`}
                >
                  {selectedAvatar.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-extrabold text-mq-text-strong">
                      {selectedChild.firstName}{' '}
                      {selectedChild.preferredName && `(${selectedChild.preferredName})`}
                    </h3>
                    {selectedChild.onboardingStatus === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-success-bg text-mq-success border border-mq-success/30">
                        <CheckCircle2 size={13} />
                        <span>Ready (සම්පූර්ණයි)</span>
                      </span>
                    ) : selectedChild.onboardingStatus === 'IN_PROGRESS' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/30">
                        <Clock size={13} />
                        <span>In Progress (ක්‍රියාත්මකයි)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mq-warning-bg text-mq-warning border border-mq-warning/30">
                        <Sparkles size={13} />
                        <span>Needs Profiling (ආරම්භ කිරීමට ඇත)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-mq-text-muted mt-0.5">
                    Grade {selectedChild.grade} · Age {selectedChild.age} · Preferred Language:{' '}
                    {selectedChild.preferredLanguage || 'Sinhala'}
                  </p>
                </div>
              </div>

              {/* Contextual Quick Links */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {selectedChild.onboardingStatus === 'COMPLETED' ? (
                  <>
                    <Link
                      to="/parent/dashboard/learner-profiles"
                      className="btn btn-secondary text-xs py-2 px-3.5 rounded-xl font-bold inline-flex items-center gap-1.5"
                    >
                      <Brain size={15} />
                      <span>View Learner Profile</span>
                    </Link>
                    <a
                      href="#/play"
                      className="btn btn-primary text-xs py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5"
                    >
                      <BookOpen size={15} />
                      <span>Play Math Games</span>
                    </a>
                  </>
                ) : (
                  <Link
                    to={`/learners/${selectedChild.learnerId}/onboarding`}
                    className="btn btn-primary text-xs py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <span>
                      {selectedChild.onboardingStatus === 'IN_PROGRESS'
                        ? 'Resume Onboarding'
                        : 'Start Initial Assessment'}
                    </span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>

            {/* Assessment State Body */}
            {selectedChild.onboardingStatus === 'NOT_STARTED' && (
              <div className="p-6 bg-mq-surface-soft rounded-2xl border border-mq-border/80 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center mx-auto text-xl">
                  📝
                </div>
                <h4 className="text-base font-bold text-mq-text-strong">
                  Initial Mathematics Assessment Pending
                </h4>
                <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto">
                  To view evidence-aware skill estimates, Bayesian credible intervals, and recommendations,
                  complete the initial Sinhala math onboarding assessment for {selectedChild.firstName}.
                </p>
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2 mt-2"
                >
                  <span>Start Assessment (ප්‍රශ්නාවලිය ආරම්භ කරන්න)</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* In-Progress Notice */}
            {selectedChild.onboardingStatus === 'IN_PROGRESS' && (
              <div className="p-6 bg-mq-surface-blue/50 rounded-2xl border border-mq-primary/20 text-center space-y-3">
                <div className="w-12 h-12 bg-mq-primary text-white rounded-xl flex items-center justify-center mx-auto">
                  <Clock size={22} />
                </div>
                <h4 className="text-base font-bold text-mq-text-strong">
                  Onboarding Is Currently In Progress
                </h4>
                <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto">
                  Some steps have been saved. Complete all 5 steps (Preferences, SNAP-IV, Social Context,
                  Handover, and Grade {selectedChild.grade} Math Assessment) to unlock full ELP-X mathematics analytics.
                </p>
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2"
                >
                  <span>Continue Where You Left Off</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Completed Onboarding: Real ELP-X Data Display */}
            {selectedChild.onboardingStatus === 'COMPLETED' && (
              <div className="space-y-6">
                {isLoadingProfile && (
                  <div className="flex items-center justify-center p-8 text-mq-primary gap-2 text-xs font-semibold">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading mathematical profile analytics...</span>
                  </div>
                )}

                {!isLoadingProfile && learnerProfile && (
                  <>
                    {/* Overall Evidence & Distinct Questions Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-mq-surface-soft rounded-2xl border border-mq-border/70">
                        <span className="text-xs text-mq-text-muted font-medium">Evidence Status</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              learnerProfile.isOverallEvidenceSufficient
                                ? 'bg-mq-success'
                                : 'bg-mq-warning'
                            }`}
                          />
                          <p className="text-base font-extrabold text-mq-text-strong">
                            {learnerProfile.evidenceStatus === 'SUFFICIENT'
                              ? 'Sufficient Evidence'
                              : 'Provisional (Gathering)'}
                          </p>
                        </div>
                        <p className="text-[11px] text-mq-text-muted mt-1">
                          {learnerProfile.totalDistinctQuestionsEvaluated} distinct items evaluated
                        </p>
                      </div>

                      <div className="p-4 bg-mq-surface-soft rounded-2xl border border-mq-border/70">
                        <span className="text-xs text-mq-text-muted font-medium">Overall Accuracy</span>
                        <p className="text-2xl font-extrabold text-mq-text-strong mt-1">
                          {(learnerProfile.rawOverallAccuracy * 100).toFixed(1)}%
                        </p>
                        <p className="text-[11px] text-mq-text-muted mt-0.5">
                          {learnerProfile.totalCorrectFirstResponses} /{' '}
                          {learnerProfile.totalDistinctQuestionsEvaluated} correct first try
                        </p>
                      </div>

                      <div className="p-4 bg-mq-surface-soft rounded-2xl border border-mq-border/70">
                        <span className="text-xs text-mq-text-muted font-medium">Algorithm Engine</span>
                        <p className="text-base font-extrabold text-mq-primary mt-1">
                          {learnerProfile.algorithmVersion || 'ELP-X-v1.0'}
                        </p>
                        <p className="text-[11px] text-mq-text-muted mt-1">
                          Beta-Binomial Bayesian Estimator
                        </p>
                      </div>
                    </div>

                    {/* Skill Estimates Grid */}
                    {learnerProfile.skillEstimates && learnerProfile.skillEstimates.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
                            <GraduationCap size={16} className="text-mq-primary" />
                            <span>Mathematics Skill Mastery (ගණිත නිපුණතා මට්ටම්)</span>
                          </h4>
                          <span className="text-xs text-mq-text-muted">
                            Bayesian Estimated Proficiency
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {learnerProfile.skillEstimates.map((skill: ElpxSkillEstimate) => (
                            <div
                              key={skill.skillId}
                              className="p-4 bg-white rounded-2xl border border-mq-border shadow-xs hover:border-mq-primary/40 transition-all space-y-2.5"
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

                              {/* Progress Bar with Credible Interval indicator */}
                              <div>
                                <div className="flex justify-between text-xs font-semibold text-mq-text mb-1">
                                  <span>Estimated Proficiency</span>
                                  <span>{skill.estimatedProficiencyPercentage.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-mq-surface-soft h-2.5 rounded-full overflow-hidden relative">
                                  <div
                                    className="h-full bg-mq-primary rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(5, skill.estimatedProficiencyPercentage)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-mq-text-muted pt-1">
                                <span>
                                  Raw: {skill.correctFirstResponses}/{skill.distinctQuestionsAssessed}{' '}
                                  ({skill.rawAccuracyPercentage.toFixed(0)}%)
                                </span>
                                <span>
                                  95% CI: [{(skill.credibleInterval.lower * 100).toFixed(0)}% –{' '}
                                  {(skill.credibleInterval.upper * 100).toFixed(0)}%]
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explainable Pedagogical Recommendations Preview */}
                    {learnerProfile.structuredRecommendations &&
                      learnerProfile.structuredRecommendations.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-mq-text-strong flex items-center gap-2">
                              <Sparkles size={16} className="text-mq-accent-yellow" />
                              <span>Personalized Recommendations (පුද්ගලාරෝපිත උපදෙස්)</span>
                            </h4>
                            <Link
                              to="/parent/dashboard/recommendations"
                              className="text-xs font-bold text-mq-primary hover:underline"
                            >
                              View all
                            </Link>
                          </div>

                          <div className="space-y-2">
                            {learnerProfile.structuredRecommendations
                              .slice(0, 2)
                              .map((rec) => (
                                <div
                                  key={rec.recommendationId}
                                  className="p-3.5 bg-mq-surface-blue/40 border border-mq-primary/20 rounded-2xl"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-mq-primary">
                                      {rec.titleEn}
                                    </span>
                                    <span className="text-[10px] font-semibold text-mq-text-muted">
                                      ({rec.strategyCode})
                                    </span>
                                  </div>
                                  <p className="text-xs text-mq-text-strong leading-relaxed">
                                    {rec.descriptionSi || rec.descriptionEn}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Quick Adding Child Profile */}
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

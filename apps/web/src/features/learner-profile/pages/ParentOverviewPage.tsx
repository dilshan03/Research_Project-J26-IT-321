import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Users, CheckCircle2, Star, Coins, Gamepad2, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import { profileApi } from '../services/profileApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type { ElpxProfile, SnapIvStatus } from '../types/onboarding';
import { LearnerModal } from '../components/LearnerModal';
import { setActiveStudentProfile } from '../utils/activeStudentStorage';
import { readRememberedChild, rememberChild } from '../utils/rememberedChild';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.overview;
const levelText = parentText.skills.level;


const avatarOf = (child: Learner) => AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];
const nameOf = (child: Learner) => child.preferredName || child.firstName;

type Level = keyof typeof levelText;
const LEVEL_DOT: Record<Level, string> = {
  PROFICIENT: 'bg-mq-success',
  DEVELOPING: 'bg-mq-primary',
  EMERGING: 'bg-mq-primary',
  INSUFFICIENT_EVIDENCE: 'bg-mq-text-muted/50',
};
const LEVEL_CHIP: Record<Level, string> = {
  PROFICIENT: 'bg-mq-success-bg text-mq-success',
  DEVELOPING: 'bg-mq-surface-blue text-mq-primary',
  EMERGING: 'bg-mq-surface-blue text-mq-primary',
  INSUFFICIENT_EVIDENCE: 'bg-mq-surface-soft text-mq-text',
};
const SKILLS_ON_HOME = 4;

interface ChildRewards {
  stars: number;
  coins: number;
  sessionsCompleted: number | null;
}

/**
 * Reads the child's saved rewards from the student dashboard's progress store.
 * Only values actually stored are shown; nothing is defaulted, so a child with no
 * saved progress shows the empty state instead of invented numbers.
 */
const fetchChildRewards = async (parentId: string, learnerId: string): Promise<ChildRewards | null> => {
  try {
    const params = new URLSearchParams({ parentId, studentId: learnerId, learnerId });
    const res = await fetch(`/api/telemetry/student-progress?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.success ? data.progress : null;
    if (!p || typeof p.stars !== 'number' || typeof p.coins !== 'number') return null;
    return {
      stars: p.stars,
      coins: p.coins,
      sessionsCompleted: typeof p.sessionsCompleted === 'number' ? p.sessionsCompleted : null,
    };
  } catch {
    return null;
  }
};

export const ParentOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const savedToast = (location.state as { toast?: string } | null)?.toast;

  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<ElpxProfile | null>(null);
  const [snapIvStatus, setSnapIvStatus] = useState<SnapIvStatus | null>(null);
  const [rewards, setRewards] = useState<ChildRewards | null>(null);

  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const selectChild = (learnerId: string) => {
    setSelectedLearnerId(learnerId);
    rememberChild(learnerId);
  };

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

  const selectedChild = learners.find((l) => l.learnerId === selectedLearnerId) || learners[0] || null;
  const isCompleted = selectedChild?.onboardingStatus === 'COMPLETED';

  // ELP-X profile, SNAP-IV status and rewards for the selected child
  useEffect(() => {
    setProfileFailed(false);
    setLearnerProfile(null);
    setSnapIvStatus(null);
    setRewards(null);
    if (!selectedChild) return;

    let isMounted = true;
    const { learnerId, onboardingStatus, parentId } = selectedChild;

    // Reading progress for a NOT_STARTED child would create an onboarding record, so skip it.
    if (onboardingStatus !== 'NOT_STARTED') {
      onboardingApi
        .getProgress(learnerId)
        .then((res) => isMounted && setSnapIvStatus(res.success && res.data ? res.data.snapIvStatus ?? null : null))
        .catch(() => undefined);
    }

    if (onboardingStatus === 'COMPLETED') {
      setIsLoadingProfile(true);
      profileApi
        .getProfile(learnerId)
        .then((res) => {
          if (!isMounted) return;
          setLearnerProfile(res.success && res.data ? res.data : null);
          setProfileFailed(!(res.success && res.data));
        })
        .catch(() => isMounted && setProfileFailed(true))
        .finally(() => isMounted && setIsLoadingProfile(false));

      fetchChildRewards(parentId || user?.id || '', learnerId).then((r) => isMounted && setRewards(r));
    }

    return () => {
      isMounted = false;
    };
  }, [selectedChild, user?.id]);

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

  // Opens the child's own dashboard (stars, coins, games) for the selected child
  const openChildWorld = (child: Learner) => {
    setActiveStudentProfile(child);
    navigate(`/student/dashboard/${child.learnerId}`);
  };

  const parentName = user?.fullName || parentText.shell.parentAccount;
  const skills = learnerProfile?.skillEstimates ?? [];
  const hiddenSkillCount = Math.max(0, skills.length - SKILLS_ON_HOME);

  return (
    <div className="space-y-5 animate-fade-in text-base">
      {/* Greeting */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-mq-text-strong break-words">{t.welcome(parentName)}</h1>
          <p className="text-base text-mq-text-muted">{t.homeSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-secondary min-h-[44px] px-4 rounded-full inline-flex items-center gap-2 text-base"
        >
          <Plus size={18} />
          <span>{t.addChild}</span>
        </button>
      </header>

      {savedToast && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-mq-success/30 bg-mq-success-bg px-4 py-3 text-base text-mq-text-strong">
          <CheckCircle2 size={20} className="shrink-0 text-mq-success" />
          <span>{savedToast}</span>
        </p>
      )}

      {/* Child selection: a small amber dot marks children who still need to start */}
      {learners.length > 1 && selectedChild && (
        <div
          role="radiogroup"
          aria-label={t.switcherLabel}
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible"
        >
          {learners.map((child) => {
            const isSelected = child.learnerId === selectedChild.learnerId;
            const needsAction = child.onboardingStatus !== 'COMPLETED';
            const avatar = avatarOf(child);
            return (
              <button
                key={child.learnerId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectChild(child.learnerId)}
                className={`relative shrink-0 whitespace-nowrap inline-flex items-center gap-2 min-h-[48px] pl-1.5 pr-4 rounded-full border-2 text-base font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-mq-primary border-mq-primary text-white shadow-sm'
                    : 'bg-white border-mq-border text-mq-text-strong hover:border-mq-primary/50'
                }`}
              >
                <span aria-hidden="true" className={`w-9 h-9 rounded-full flex items-center justify-center text-xl ${avatar.bgColor}`}>
                  {avatar.icon}
                </span>
                <span>{nameOf(child)}</span>
                {needsAction && (
                  <>
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                    <span className="sr-only">({t.needsStart})</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isLoadingLearners && <LoadingState message={parentText.children.loading} minHeightClass="min-h-[200px]" />}

      {errorMessage && <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={loadLearners} />}

      {!isLoadingLearners && !errorMessage && learners.length === 0 && (
        <EmptyState
          icon={<Users size={36} />}
          title={t.noChildrenTitle}
          description={t.noChildrenText}
          action={
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary min-h-[48px] px-6 rounded-full inline-flex items-center gap-2 text-base"
            >
              <Plus size={18} />
              <span>{t.addFirstChild}</span>
            </button>
          }
        />
      )}

      {!isLoadingLearners && selectedChild && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          {/* The one focused child card */}
          <section aria-live="polite" className="bg-white rounded-3xl border border-mq-border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-mq-surface-blue via-white to-mq-success-bg/60 px-5 sm:px-6 pt-6 pb-5 flex items-center gap-4">
              <span
                aria-hidden="true"
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shrink-0 border-2 border-white shadow-sm ${avatarOf(selectedChild).bgColor}`}
              >
                {avatarOf(selectedChild).icon}
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-mq-text-strong break-words">{nameOf(selectedChild)}</h2>
                <p className="text-base text-mq-text-muted">{parentText.common.grade(selectedChild.grade)}</p>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-5">
              <p className="text-lg text-mq-text-strong leading-relaxed">
                {selectedChild.onboardingStatus === 'NOT_STARTED'
                  ? t.heroNotStarted(nameOf(selectedChild))
                  : selectedChild.onboardingStatus === 'IN_PROGRESS'
                  ? t.heroInProgress(nameOf(selectedChild))
                  : t.heroCompleted(nameOf(selectedChild))}
              </p>

              {/* Simple skill strip (statuses come only from backend ELP-X levels) */}
              {isCompleted &&
                (isLoadingProfile ? (
                  <p className="flex items-center gap-2 text-base text-mq-text-muted">
                    <Loader2 size={18} className="animate-spin" />
                    <span>{t.loadingProfile}</span>
                  </p>
                ) : profileFailed ? (
                  <p className="text-base text-mq-danger">{t.profileError}</p>
                ) : skills.length > 0 ? (
                  <div className="space-y-2">
                    <ul className="divide-y divide-mq-border/70 rounded-2xl border border-mq-border">
                      {skills.slice(0, SKILLS_ON_HOME).map((s) => {
                        const level = (s.provisionalSkillLevel in levelText ? s.provisionalSkillLevel : 'INSUFFICIENT_EVIDENCE') as Level;
                        return (
                          <li key={s.skillId} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="flex items-center gap-3 min-w-0">
                              <span aria-hidden="true" className={`w-3 h-3 rounded-full shrink-0 ${LEVEL_DOT[level]}`} />
                              <span className="text-base font-semibold text-mq-text-strong break-words">{s.skillNameSi || s.skillName}</span>
                            </span>
                            <span className={`shrink-0 text-sm font-semibold px-3 py-1 rounded-full ${LEVEL_CHIP[level]}`}>
                              {levelText[level]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {hiddenSkillCount > 0 && (
                      <Link to="/parent/dashboard/learner-profiles" className="inline-flex min-h-[44px] items-center text-base font-semibold text-mq-primary hover:underline">
                        {t.moreSkills(hiddenSkillCount)}
                      </Link>
                    )}
                    {learnerProfile && !learnerProfile.isOverallEvidenceSufficient && (
                      <p className="text-sm text-mq-text-muted">{t.heroEarly}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-mq-text-muted">{t.summaryNoSkills}</p>
                ))}

              {/* One big primary action */}
              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => openChildWorld(selectedChild)}
                  className="btn btn-primary w-full sm:w-auto min-h-[52px] px-7 rounded-full inline-flex items-center justify-center gap-2 text-lg shadow-md cursor-pointer"
                >
                  <Gamepad2 size={22} />
                  <span>{t.ctaPlay(nameOf(selectedChild))}</span>
                </button>
              ) : (
                <Link
                  to={`/learners/${selectedChild.learnerId}/onboarding`}
                  className="btn btn-primary w-full sm:w-auto min-h-[52px] px-7 rounded-full inline-flex items-center justify-center gap-2 text-lg shadow-md"
                >
                  <span>{selectedChild.onboardingStatus === 'IN_PROGRESS' ? t.resumeAssessment : t.startAssessment}</span>
                  <ArrowRight size={20} />
                </Link>
              )}
            </div>

            {/* Small secondary links instead of extra cards */}
            {(isCompleted || snapIvStatus) && (
              <nav className="border-t border-mq-border/70 px-3 sm:px-4 py-2 flex flex-wrap gap-x-1">
                {isCompleted && (
                  <>
                    <Link to="/parent/dashboard/learner-profiles" className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-base font-semibold text-mq-primary hover:bg-mq-surface-soft">
                      <span>{t.linkProgress}</span>
                      <ChevronRight size={16} />
                    </Link>
                    <Link to="/parent/dashboard/recommendations" className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-base font-semibold text-mq-primary hover:bg-mq-surface-soft">
                      <span>{t.linkTips}</span>
                      <ChevronRight size={16} />
                    </Link>
                  </>
                )}
                {snapIvStatus && (
                  <Link to="/parent/dashboard/support-info" className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-base font-semibold text-mq-text hover:bg-mq-surface-soft">
                    <span>{parentText.nav.supportInfo}</span>
                    <ChevronRight size={16} />
                  </Link>
                )}
              </nav>
            )}
          </section>

          {/* Link to the child's own dashboard: rewards earned there */}
          <aside className="bg-white rounded-3xl border border-mq-border shadow-sm p-5 space-y-4">
            <h2 className="text-lg font-bold text-mq-text-strong">{t.rewardsTitle(nameOf(selectedChild))}</h2>
            {!isCompleted ? (
              <p className="text-base text-mq-text-muted leading-relaxed">{t.rewardsLocked}</p>
            ) : rewards ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <Star size={26} className="mx-auto text-amber-500 fill-amber-400" aria-hidden="true" />
                  <p className="text-2xl font-bold text-mq-text-strong mt-1">{rewards.stars}</p>
                  <p className="text-sm text-mq-text">{t.stars}</p>
                </div>
                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3 text-center">
                  <Coins size={26} className="mx-auto text-orange-500" aria-hidden="true" />
                  <p className="text-2xl font-bold text-mq-text-strong mt-1">{rewards.coins}</p>
                  <p className="text-sm text-mq-text">{t.coins}</p>
                </div>
                {rewards.sessionsCompleted !== null && (
                  <p className="col-span-2 text-sm text-mq-text text-center">
                    {t.sessions}: <span className="font-bold">{rewards.sessionsCompleted}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-base text-mq-text-muted leading-relaxed">{t.rewardsEmpty(nameOf(selectedChild))}</p>
            )}
            {isCompleted && (
              <button
                type="button"
                onClick={() => openChildWorld(selectedChild)}
                className="btn btn-secondary w-full min-h-[48px] rounded-full inline-flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span>{t.openWorld}</span>
                <ArrowRight size={18} />
              </button>
            )}
          </aside>
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

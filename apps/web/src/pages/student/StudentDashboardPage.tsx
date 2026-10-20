import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import {
  Home,
  Compass,
  Dumbbell,
  Calendar,
  Award,
  User,
  Settings,
  Star,
  Coins,
  Volume2,
  VolumeX,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Users,
  GraduationCap,
  Languages,
  Castle,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { PedagogicalPracticeArena } from '../../features/pedagogical-agent';
import {
  learnerApi,
  getActiveStudentProfile,
  setActiveStudentProfile,
  getLearnerAvatar,
  getLocalStudentProgress,
  fetchBackendStudentProgress,
  saveStudentProgress,
} from '../../features/learner-profile';
import type { Learner, StudentSavedProgress } from '../../features/learner-profile';

type StudentNavId =
  | 'home'
  | 'adventure'
  | 'practice'
  | 'daily-challenge'
  | 'rewards'
  | 'progress'
  | 'profile'
  | 'settings'
  | 'castle';

interface StudentNavItem {
  id: StudentNavId;
  label: string;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
}

const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'adventure', label: 'Learning Adventure', icon: Compass },
  { id: 'practice', label: 'Practice', icon: Dumbbell },
  { id: 'daily-challenge', label: 'Daily Challenge', icon: Calendar },
  { id: 'rewards', label: 'Rewards', icon: Award },
];

const GRADE_SI_LABELS: Record<number, string> = {
  1: '1 වන ශ්‍රේණිය',
  2: '2 වන ශ්‍රේණිය',
  3: '3 වන ශ්‍රේණිය',
  4: '4 වන ශ්‍රේණිය',
  5: '5 වන ශ්‍රේණිය',
};

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { learnerId: routeLearnerId } = useParams<{ learnerId?: string }>();

  const queryLearnerId = searchParams.get('learnerId') || routeLearnerId || undefined;
  const queryParentId = searchParams.get('parentId') || undefined;

  // Initialize active learner immediately from localStorage cache if available
  const [activeLearner, setActiveLearner] = useState<Learner | null>(() => {
    const cached = getActiveStudentProfile();
    if (cached && (!queryLearnerId || cached.learnerId === queryLearnerId)) {
      return cached;
    }
    return cached;
  });

  // Default to 'practice' where the Game + Pedagogical Agent component is linked
  const [activeNav, setActiveNav] = useState<StudentNavId>('practice');
  const [isPracticePlaying, setIsPracticePlaying] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResearchHUD, setShowResearchHUD] = useState(false);

  // Resolved Parent ID & Child Learner ID for saving all data specifically to this child
  const resolvedParentId =
    activeLearner?.parentId || queryParentId || user?.id || 'parent_default';
  const resolvedLearnerId =
    activeLearner?.learnerId || queryLearnerId || 'student_default';
  const studentDisplayName =
    activeLearner?.preferredName ||
    activeLearner?.firstName ||
    user?.fullName?.split(' ')[0] ||
    'Student';
  const studentFullName = activeLearner?.firstName || studentDisplayName;
  const studentGrade = activeLearner?.grade || 1;
  const studentAge = activeLearner?.age || 7;
  const studentLanguage = activeLearner?.preferredLanguage || 'Sinhala';
  const avatar = getLearnerAvatar(activeLearner?.avatarId);

  // Per-(parentId, learnerId) gamification & BKT mastery state
  const [savedProgress, setSavedProgress] = useState<StudentSavedProgress>(() =>
    getLocalStudentProgress(
      resolvedParentId,
      resolvedLearnerId,
      studentDisplayName,
      studentGrade
    )
  );

  const progressRef = useRef<StudentSavedProgress>(savedProgress);
  useEffect(() => {
    progressRef.current = savedProgress;
  }, [savedProgress]);

  // 1. Fetch active child profile from Learner Profile Service API
  useEffect(() => {
    let isMounted = true;

    const syncChildProfile = async () => {
      if (queryLearnerId) {
        const res = await learnerApi.getLearner(queryLearnerId);
        if (isMounted && res.success && res.data) {
          setActiveLearner(res.data);
          setActiveStudentProfile(res.data);
          return;
        }
      }

      // If no specific learnerId or getLearner failed, try listing parent's children
      const listRes = await learnerApi.listLearners();
      if (isMounted && listRes.success && listRes.data && listRes.data.length > 0) {
        const matched =
          (queryLearnerId && listRes.data.find((l) => l.learnerId === queryLearnerId)) ||
          (activeLearner && listRes.data.find((l) => l.learnerId === activeLearner.learnerId)) ||
          listRes.data[0];

        setActiveLearner(matched);
        setActiveStudentProfile(matched);
      }
    };

    syncChildProfile();

    return () => {
      isMounted = false;
    };
  }, [queryLearnerId]);

  // 2. Load saved progress for this specific (parentId, learnerId) from local cache + backend
  useEffect(() => {
    let isMounted = true;
    const localData = getLocalStudentProgress(
      resolvedParentId,
      resolvedLearnerId,
      studentDisplayName,
      studentGrade
    );
    setSavedProgress(localData);

    fetchBackendStudentProgress(resolvedParentId, resolvedLearnerId).then((remote) => {
      if (isMounted && remote) {
        setSavedProgress({
          ...remote,
          studentName: studentDisplayName,
          grade: studentGrade,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedParentId, resolvedLearnerId, studentDisplayName, studentGrade]);

  // Sidebar automatically shrinks to the left while the Practice Game is actively playing
  const isSidebarShrunk = activeNav === 'practice' && isPracticePlaying;

  const handleRewardEarned = useCallback(
    (starsDelta: number, coinsDelta: number) => {
      setSavedProgress((prev) => {
        const next: StudentSavedProgress = {
          ...prev,
          parentId: resolvedParentId,
          learnerId: resolvedLearnerId,
          studentName: studentDisplayName,
          grade: studentGrade,
          stars: prev.stars + starsDelta,
          coins: prev.coins + coinsDelta,
          updatedAt: new Date().toISOString(),
        };
        saveStudentProgress(next);
        return next;
      });
    },
    [resolvedParentId, resolvedLearnerId, studentDisplayName, studentGrade]
  );

  const handleProgressUpdate = useCallback(
    (progressPercent: number) => {
      setSavedProgress((prev) => {
        if (prev.learningProgressPct === progressPercent) return prev;
        const next: StudentSavedProgress = {
          ...prev,
          parentId: resolvedParentId,
          learnerId: resolvedLearnerId,
          studentName: studentDisplayName,
          grade: studentGrade,
          learningProgressPct: progressPercent,
          updatedAt: new Date().toISOString(),
        };
        saveStudentProgress(next);
        return next;
      });
    },
    [resolvedParentId, resolvedLearnerId, studentDisplayName, studentGrade]
  );

  const handleSessionDataSync = useCallback(
    (summary: {
      completedSteps: number[];
      hintAwareKnowledge: number;
      standardKnowledge: number;
      totalHintsUsed: number;
      cognitiveState?: string;
      fsmState?: string;
      sessionComplete?: boolean;
    }) => {
      setSavedProgress((prev) => {
        const next: StudentSavedProgress = {
          ...prev,
          parentId: resolvedParentId,
          learnerId: resolvedLearnerId,
          studentName: studentDisplayName,
          grade: studentGrade,
          completedSteps: summary.completedSteps,
          hintAwareKnowledge: summary.hintAwareKnowledge,
          standardKnowledge: summary.standardKnowledge,
          totalHintsUsed: summary.totalHintsUsed,
          lastCognitiveState: summary.cognitiveState,
          lastFsmState: summary.fsmState,
          sessionsCompleted: summary.sessionComplete
            ? Math.max(prev.sessionsCompleted, 1)
            : prev.sessionsCompleted,
          updatedAt: new Date().toISOString(),
        };
        saveStudentProgress(next);
        return next;
      });
    },
    [resolvedParentId, resolvedLearnerId, studentDisplayName, studentGrade]
  );

  // =========================================================
  // Sidebar Content (Supports Expanded & Shrunk Rail Modes)
  // =========================================================
  const renderSidebarContent = (shrunk = false) => {
    if (shrunk) {
      return (
        <div className="flex flex-col items-center h-full py-5 px-2.5 space-y-4 overflow-y-auto">
          {/* Expand Sidebar / Exit Game Button */}
          <button
            type="button"
            onClick={() => setIsPracticePlaying(false)}
            title="Expand Sidebar / Exit Practice Game"
            className="w-11 h-11 rounded-2xl bg-mq-surface-blue text-mq-primary hover:bg-mq-primary hover:text-white border border-mq-primary/25 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          {/* Compact Nav Icons */}
          <div className="flex flex-col items-center space-y-2.5 w-full pt-3 border-t border-mq-border/70">
            {STUDENT_NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    setActiveNav(item.id);
                    setIsPracticePlaying(false);
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    active
                      ? 'bg-mq-primary text-white shadow-md shadow-mq-primary/30 ring-2 ring-mq-primary/20'
                      : 'text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <Icon size={21} strokeWidth={2.3} />
                </button>
              );
            })}
          </div>

          {/* Compact Castle Icon */}
          <div className="mt-auto pt-3 border-t border-mq-border/70 w-full flex justify-center">
            <button
              type="button"
              title="My Castle (මගේ මාළිගාව)"
              onClick={() => {
                setActiveNav('castle');
                setIsPracticePlaying(false);
              }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                activeNav === 'castle'
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40'
                  : 'text-amber-600 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-700'
              }`}
            >
              <Castle size={22} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
        {/* Navigation Items (Direct, Clean & Large for ADHD kids - No dropdown category titles) */}
        <nav className="space-y-2.5">
          {STUDENT_NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveNav(item.id);
                  setIsPracticePlaying(false);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98] ${
                  active
                    ? 'bg-mq-primary text-white shadow-md shadow-mq-primary/25 ring-2 ring-mq-primary/20'
                    : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary bg-stone-50/70'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={2.3}
                  className={`shrink-0 transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-mq-text-muted group-hover:text-mq-primary'
                  }`}
                />
                <span className="truncate flex-1 text-sm font-extrabold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. My Castle (මගේ මාළිගාව) Gamified Image Button - Extra Rounded & Friendly */}
        <div className="mt-auto pt-3 border-t border-mq-border/70">
          <button
            type="button"
            onClick={() => {
              setActiveNav('castle');
              setIsPracticePlaying(false);
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full group relative overflow-hidden rounded-3xl p-3 border-2 transition-all duration-300 text-left cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
              activeNav === 'castle'
                ? 'border-amber-400 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 ring-4 ring-amber-400/30'
                : 'border-amber-200/90 hover:border-amber-400 bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-indigo-50/60 hover:from-amber-100 hover:to-orange-100'
            }`}
            title="Explore My Castle & Math Kingdom (මගේ මාළිගාව)"
          >
            <div className="flex items-center gap-3">
              {/* Castle Island Artwork Thumbnail */}
              <div className="relative w-13 h-13 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-300 shadow-sm bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src="/floating-island.png"
                  alt="My Castle"
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <Castle size={22} className="absolute text-amber-200 drop-shadow-md pointer-events-none" />
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-wide text-amber-950 font-display">
                    MY CASTLE
                  </span>
                  <Sparkles size={14} className="text-amber-500 animate-pulse shrink-0" />
                </div>
                <p className="text-xs font-bold text-amber-850 truncate sinhala leading-tight mt-0.5">
                  මගේ මාළිගාව
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[11px] font-black text-mq-primary bg-white/95 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                    Level {studentGrade} Kingdom
                  </span>
                </div>
              </div>

              <ChevronRight
                size={18}
                strokeWidth={2.5}
                className="text-amber-600/70 group-hover:text-amber-700 group-hover:translate-x-1 transition-all shrink-0"
              />
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-mq-bg text-mq-text">
      {/* ========================================================= */}
      {/* 1. TOP PORTAL HEADER (Simple, High-Contrast & Kid-Attractive) */}
      {/* ========================================================= */}
      <header
        className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs border-b border-mq-border h-18 sm:h-20"
        aria-label="Student Portal Header"
      >
        <div className="w-full max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Trigger + Cheerful Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              className="lg:hidden p-2.5 rounded-2xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-colors shrink-0 cursor-pointer"
              aria-label="Open navigation sidebar"
            >
              <Menu size={22} />
            </button>

            <Link
              to="/student/dashboard"
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-2xl p-1 shrink-0 transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-2xl sm:text-3xl font-black tracking-tight flex items-center drop-shadow-xs">
                <span className="text-mq-primary-dark">Math</span>
                <span className="text-mq-secondary">Quest</span>
                <span className="text-amber-400 ml-0.5 text-3xl leading-none -mt-2 animate-bounce">
                  ★
                </span>
              </span>
            </Link>
          </div>

          {/* Center: Kid Rewards Pill (Stars & Coins) - Bold, Friendly, Chunky */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Stars Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-amber-50 border-2 border-amber-300/80 text-sm sm:text-base font-black text-amber-950 shadow-2xs">
              <Star size={18} className="text-amber-500 fill-amber-400 shrink-0 animate-pulse" />
              <span>{savedProgress.stars.toLocaleString()} <span className="hidden sm:inline text-xs font-extrabold text-amber-800">Stars</span></span>
            </div>

            {/* Coins Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-yellow-50 border-2 border-yellow-300/80 text-sm sm:text-base font-black text-yellow-950 shadow-2xs">
              <Coins size={18} className="text-yellow-600 shrink-0" />
              <span>{savedProgress.coins} <span className="hidden sm:inline text-xs font-extrabold text-yellow-800">Coins</span></span>
            </div>
          </div>

          {/* Right: Sound Toggle + Cheerful Child Profile Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Student Account Pill with Child's Avatar, Name & Grade */}
            <button
              type="button"
              onClick={() => {
                setActiveNav('castle');
                setIsPracticePlaying(false);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200/90 rounded-2xl shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={`${studentFullName} (Grade ${studentGrade})`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-xs border ${avatar.bgColor} ${avatar.borderColor}`}
              >
                {avatar.icon}
              </div>
              <div className="flex flex-col text-left overflow-hidden max-w-[120px] sm:max-w-[150px]">
                <span className="text-sm font-black text-mq-text-strong leading-tight truncate">
                  {studentDisplayName}
                </span>
                <span className="text-[11px] font-extrabold text-mq-primary leading-none mt-0.5 truncate">
                  Grade {studentGrade} · {studentAge} Yrs
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. BODY SHELL (Sidebar + Main Content Area)               */}
      {/* ========================================================= */}
      <div className="flex-1 flex w-full relative">
        {/* Desktop Persistent Sidebar (Floats with margin and rounded-[28px] for kid-friendly UI) */}
        <aside
          className={`hidden lg:flex flex-col bg-white border border-mq-border/80 rounded-[28px] shadow-xs shrink-0 sticky top-22 sm:top-24 h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7.2rem)] my-3.5 ml-3.5 sm:my-4 sm:ml-4 z-30 transition-all duration-300 ease-in-out overflow-hidden ${
            isSidebarShrunk ? 'w-18' : 'w-64 xl:w-72'
          }`}
          aria-label="Student Dashboard Navigation"
        >
          {renderSidebarContent(isSidebarShrunk)}
        </aside>

        {/* Mobile Drawer */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-mq-text-strong/40 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="fixed top-3.5 bottom-3.5 left-3.5 w-72 max-w-[85vw] bg-white z-50 shadow-2xl border border-mq-border/80 rounded-[28px] flex flex-col lg:hidden overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-mq-border bg-mq-surface-soft/60">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base">
                    <span className="text-mq-primary-dark">Math</span>
                    <span className="text-mq-secondary">Quest</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{renderSidebarContent(false)}</div>
            </div>
          </>
        )}

        {/* Main Workspace Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl mx-auto w-full">
            {activeNav === 'practice' ? (
              /* ======================================================= */
              /* PRACTICE TAB: Linked Game + MathBot 3000 3D Agent       */
              /* Keyed by (parentId, learnerId) for this specific child  */
              /* ======================================================= */
              <PedagogicalPracticeArena
                studentId={resolvedLearnerId}
                parentId={resolvedParentId}
                studentName={studentDisplayName}
                studentGrade={studentGrade}
                studentAvatar={avatar.icon}
                showResearchHUD={showResearchHUD}
                isGameActive={isPracticePlaying}
                onStartGame={() => setIsPracticePlaying(true)}
                onExitGame={() => setIsPracticePlaying(false)}
                onRewardEarned={handleRewardEarned}
                onProgressUpdate={handleProgressUpdate}
                onSessionDataSync={handleSessionDataSync}
              />
            ) : activeNav === 'profile' || activeNav === 'progress' ? (
              /* ======================================================= */
              /* CHILD PROFILE & SAVED PROGRESS TAB                      */
              /* ======================================================= */
              <div className="space-y-6 py-2 animate-fade-in">
                <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-mq-border/70">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border shadow-xs ${avatar.bgColor} ${avatar.borderColor}`}
                      >
                        {avatar.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-2xl font-extrabold text-mq-text-strong">
                            {studentFullName}
                          </h1>
                          {activeLearner?.preferredName && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-mq-surface-soft border border-mq-border text-mq-text-muted">
                              "{activeLearner.preferredName}"
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                            Grade {studentGrade} ({GRADE_SI_LABELS[studentGrade] || `${studentGrade} ශ්‍රේණිය`})
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-mq-text-muted mt-1 sinhala">
                          {avatar.nameSi} ({avatar.name}) · වයස අවුරුදු {studentAge} ({studentAge} Years)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to="/learners"
                        className="btn btn-secondary py-2 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 sinhala"
                      >
                        <Users size={14} />
                        <span>වෙනත් දරුවෙකු තෝරන්න (Switch Child)</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveNav('practice')}
                        className="btn btn-primary py-2 px-5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer sinhala"
                      >
                        <Dumbbell size={14} />
                        <span>පුහුණුවට යන්න (Practice)</span>
                      </button>
                    </div>
                  </div>

                  {/* Child Identity & Saved Mastery Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <GraduationCap size={15} className="text-mq-primary" />
                        <span>Child Learner ID</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-mq-text-strong mt-1.5 break-all">
                        {resolvedLearnerId}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <ShieldCheck size={15} className="text-mq-secondary" />
                        <span>Parent Account ID</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-mq-text-strong mt-1.5 break-all">
                        {resolvedParentId}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-green border border-mq-secondary/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <TrendingUp size={15} className="text-mq-success" />
                        <span>Hint-Aware BKT P(L)</span>
                      </div>
                      <p className="text-2xl font-extrabold text-mq-success mt-1">
                        {Math.round(savedProgress.hintAwareKnowledge * 100)}%
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-blue border border-mq-primary/25">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <Languages size={15} className="text-mq-primary" />
                        <span>Preferred Language</span>
                      </div>
                      <p className="text-base font-extrabold text-mq-primary-dark mt-1">
                        {studentLanguage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeNav === 'castle' ? (
              /* ======================================================= */
              /* MY CASTLE REALM TAB: Gamified Castle for ADHD Learner   */
              /* ======================================================= */
              <div className="space-y-6 py-2 animate-fade-in">
                {/* Hero Realm Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-br from-indigo-900 via-purple-900 to-amber-900 p-6 sm:p-8 text-white shadow-lg">
                  {/* Background Castle Island graphic */}
                  <img
                    src="/floating-island.png"
                    alt="Castle Realm"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-64 sm:w-96 object-contain opacity-25 sm:opacity-40 pointer-events-none mix-blend-screen"
                  />
                  <div className="relative z-10 max-w-xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-extrabold backdrop-blur-xs">
                      <Crown size={14} />
                      <span className="sinhala">රාජකීය මාළිගාව · Royal Math Kingdom</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-amber-100">
                      {studentDisplayName}&apos;s Castle 🏰
                    </h1>

                    <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed sinhala">
                      සාදරයෙන් පිළිගන්නවා! ඔයා ගණිත අභ්‍යාස ජයගන්නා විට ඔයාගේ මාළිගාව තරු සහ රන් කාසි වලින් පිරී යයි!
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav('practice');
                          setIsPracticePlaying(true);
                        }}
                        className="btn bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 font-black text-sm px-5 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer sinhala"
                      >
                        <Dumbbell size={16} />
                        <span>ක්‍රීඩා පුහුණුව අරඹන්න (Start Practice)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveNav('adventure')}
                        className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl backdrop-blur-xs transition-all inline-flex items-center gap-2 cursor-pointer sinhala"
                      >
                        <Compass size={15} />
                        <span>ත්‍රාසජනක ගමන (Adventure)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kingdom Realm Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Star Treasury */}
                  <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-xs hover:border-amber-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                      <Star size={24} className="fill-amber-400 text-amber-500" />
                    </div>
                    <p className="text-xs font-bold text-mq-text-muted uppercase tracking-wider">
                      Treasury Stars
                    </p>
                    <p className="text-3xl font-black text-amber-950 mt-1">
                      {savedProgress.stars.toLocaleString()}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1 sinhala">
                      එකතු කළ මුළු තරු ප්‍රමාණය
                    </p>
                  </div>

                  {/* Gold Coins */}
                  <div className="p-5 rounded-3xl bg-white border border-yellow-200 shadow-xs hover:border-yellow-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-600 mb-3">
                      <Coins size={24} className="text-yellow-600" />
                    </div>
                    <p className="text-xs font-bold text-mq-text-muted uppercase tracking-wider">
                      Kingdom Gold
                    </p>
                    <p className="text-3xl font-black text-yellow-950 mt-1">
                      {savedProgress.coins.toLocaleString()}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1 sinhala">
                      මාළිගාවේ ඇති රන් කාසි
                    </p>
                  </div>

                  {/* Kingdom Rank */}
                  <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-xs hover:border-purple-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 mb-3">
                      <Crown size={24} className="text-purple-600" />
                    </div>
                    <p className="text-xs font-bold text-mq-text-muted uppercase tracking-wider">
                      Castle Level
                    </p>
                    <p className="text-3xl font-black text-purple-950 mt-1">
                      Grade {studentGrade}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1 sinhala">
                      {GRADE_SI_LABELS[studentGrade] || `${studentGrade} ශ්‍රේණිය`}
                    </p>
                  </div>
                </div>
              </div>
            ) : activeNav === 'adventure' ? (
              /* ======================================================= */
              /* LEARNING ADVENTURE TAB: Kept Empty as requested         */
              /* ======================================================= */
              <div className="min-h-[60vh] rounded-3xl border-2 border-dashed border-mq-border bg-white/60 flex items-center justify-center p-8 text-center animate-fade-in">
                <div className="max-w-md space-y-2">
                  <p className="text-sm font-bold text-mq-text-muted uppercase tracking-wider">
                    Learning Adventure
                  </p>
                  <p className="text-xs text-mq-text-muted">
                    This section is currently empty and reserved for the Learning Adventure module.
                  </p>
                </div>
              </div>
            ) : (
              /* ======================================================= */
              /* OTHER SIDEBAR TABS: Clean Empty Placeholder             */
              /* ======================================================= */
              <div className="min-h-[60vh] rounded-3xl border-2 border-dashed border-mq-border bg-white/60 flex items-center justify-center p-8 text-center animate-fade-in">
                <div className="max-w-md space-y-3">
                  <div className="text-3xl">{avatar.icon}</div>
                  <p className="text-sm font-bold text-mq-text-strong capitalize">
                    {studentDisplayName} · {activeNav.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-mq-text-muted">
                    Switch to the <strong>Practice</strong> tab to access {studentDisplayName}&apos;s
                    interactive math practice game and <strong>MathBot 3000</strong> pedagogical
                    companion.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveNav('practice')}
                    className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Dumbbell size={14} />
                    <span>Go to Practice</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;

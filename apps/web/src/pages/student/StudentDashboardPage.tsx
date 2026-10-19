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
  Activity,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Globe,
  TrendingUp,
  Users,
  GraduationCap,
  Languages,
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
  | 'settings';

interface StudentNavGroup {
  id: string;
  title: string;
  items: {
    id: StudentNavId;
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    badge?: string;
  }[];
}

const STUDENT_NAV_GROUPS: StudentNavGroup[] = [
  {
    id: 'student-learning',
    title: 'LEARNING & ADVENTURE',
    items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'adventure', label: 'Learning Adventure', icon: Compass },
      { id: 'practice', label: 'Practice', icon: Dumbbell },
      { id: 'daily-challenge', label: 'Daily Challenge', icon: Calendar },
    ],
  },
  {
    id: 'student-rewards',
    title: 'PROGRESS & REWARDS',
    items: [
      { id: 'rewards', label: 'Rewards', icon: Award },
      { id: 'progress', label: 'My Progress', icon: TrendingUp },
    ],
  },
  {
    id: 'student-account',
    title: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

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
        <div className="flex flex-col items-center h-full py-4 px-2 space-y-4 overflow-y-auto">
          {/* Expand Sidebar / Exit Game Button */}
          <button
            type="button"
            onClick={() => setIsPracticePlaying(false)}
            title="Expand Sidebar / Exit Practice Game"
            className="w-10 h-10 rounded-xl bg-mq-surface-blue text-mq-primary hover:bg-mq-primary hover:text-white border border-mq-primary/25 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ChevronRight size={18} />
          </button>

          {/* Compact Nav Icons */}
          <div className="flex flex-col items-center space-y-2 w-full pt-2 border-t border-mq-border/70">
            {STUDENT_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    active
                      ? 'bg-mq-primary text-white shadow-sm shadow-mq-primary/25'
                      : 'text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto px-4 py-4 space-y-5">
        {/* 1. Active Child Learner Profile Card */}
        <div className="p-3.5 bg-mq-surface-blue/70 border border-mq-primary/20 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 border ${avatar.bgColor} ${avatar.borderColor}`}
              title={avatar.name}
            >
              {avatar.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold text-mq-text-strong truncate">
                  {studentFullName}
                </p>
                {activeLearner?.preferredName && (
                  <span className="text-[10px] font-bold text-mq-primary bg-white px-1.5 py-0.5 rounded-full border border-mq-primary/20 truncate">
                    "{activeLearner.preferredName}"
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-mq-text-muted truncate sinhala">
                {avatar.nameSi} ({avatar.name})
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-mq-success" />
                <span className="text-[11px] font-bold text-mq-primary">
                  Grade {studentGrade} · {studentAge} Yrs
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/learners"
            className="w-full py-1.5 px-3 rounded-xl bg-white/90 hover:bg-white text-mq-primary-dark border border-mq-border/80 hover:border-mq-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs sinhala"
          >
            <Users size={13} />
            <span>දරුවා මාරු කරන්න · Switch Child</span>
          </Link>
        </div>

        {/* 2. Collapsible Navigation Groups (Exact match with DashboardSidebar.tsx) */}
        <div className="space-y-5">
          {STUDENT_NAV_GROUPS.map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];

            return (
              <div key={group.id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-mq-text-muted hover:text-mq-primary transition-colors cursor-pointer"
                  aria-expanded={!isCollapsed}
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
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
                          className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left ${
                            active
                              ? 'bg-mq-primary text-white shadow-sm shadow-mq-primary/25 font-bold'
                              : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
                          }`}
                        >
                          <Icon
                            size={17}
                            className={`shrink-0 transition-colors ${
                              active
                                ? 'text-white'
                                : 'text-mq-text-muted group-hover:text-mq-primary'
                            }`}
                          />
                          <span className="truncate flex-1">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. Research Component Info Footer */}
        <div className="mt-auto pt-4 border-t border-mq-border/80 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveNav('practice');
              setShowResearchHUD((prev) => !prev);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              showResearchHUD
                ? 'bg-mq-primary text-white border-mq-primary shadow-xs'
                : 'bg-mq-surface-blue/60 text-mq-primary-dark border-mq-primary/20 hover:border-mq-primary/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity size={14} />
              <span>BKT & FSM Inspector</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-mq-primary font-extrabold">
              {showResearchHUD ? 'HIDE' : 'LIVE'}
            </span>
          </button>

          <div className="p-3 bg-mq-surface-soft rounded-2xl border border-mq-border/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mq-primary-dark mb-1">
              <ShieldCheck size={14} className="text-mq-secondary" />
              <span>Child Session Synced</span>
            </div>
            <p className="text-[10px] text-mq-text-muted leading-tight font-mono truncate">
              Child: {resolvedLearnerId}
            </p>
            <p className="text-[10px] text-mq-text-muted leading-tight font-mono truncate">
              Parent: {resolvedParentId}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-mq-bg text-mq-text">
      {/* ========================================================= */}
      {/* 1. TOP PORTAL HEADER (Synced with Active Child Profile)   */}
      {/* ========================================================= */}
      <header
        className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs border-b border-mq-border h-16"
        aria-label="Student Portal Header"
      >
        <div className="w-full max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Trigger + MathQuest* Logo + STUDENT PORTAL Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-colors shrink-0 cursor-pointer"
              aria-label="Open navigation sidebar"
            >
              <Menu size={20} />
            </button>

            <Link
              to="/student/dashboard"
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-lg p-0.5 shrink-0"
            >
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center">
                <span className="text-mq-primary-dark">Math</span>
                <span className="text-mq-secondary">Quest</span>
                <span className="text-mq-accent-yellow ml-0.5 text-2xl leading-none -mt-2">
                  *
                </span>
              </span>

              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                Student Portal
              </span>
            </Link>
          </div>

          {/* Center: Student Stars, Coins & Learning Progress (Saved per Child) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Stars Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mq-surface-yellow border border-mq-warning/30 text-xs font-extrabold text-mq-text-strong">
              <Star size={14} className="text-mq-warning fill-mq-accent-yellow shrink-0" />
              <span>{savedProgress.stars.toLocaleString()} Stars</span>
            </div>

            {/* Coins Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mq-surface-soft border border-mq-border text-xs font-extrabold text-mq-text-strong">
              <Coins size={14} className="text-mq-warning shrink-0" />
              <span>{savedProgress.coins} Coins</span>
            </div>

            {/* Learning Progress Bar */}
            <div className="hidden xl:flex items-center gap-2.5 pl-2">
              <span className="text-xs font-bold text-mq-text-muted">Learning Progress</span>
              <div className="w-28 h-2 bg-mq-surface-soft rounded-full overflow-hidden border border-mq-border">
                <div
                  className="h-full bg-mq-primary rounded-full transition-all duration-500"
                  style={{ width: `${savedProgress.learningProgressPct}%` }}
                />
              </div>
              <span className="text-xs font-extrabold text-mq-primary">
                {savedProgress.learningProgressPct}%
              </span>
            </div>
          </div>

          {/* Right: Sound + Switch Child + Active Child Profile Pill */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-full text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/60 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <Link
              to="/learners"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft px-3 py-1.5 rounded-full border border-mq-border/60 transition-colors sinhala"
              title="Back to Parent Dashboard (My Children)"
            >
              <Users size={14} />
              <span>මගේ දරුවන්</span>
            </Link>

            <Link
              to="/"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft px-3 py-1.5 rounded-full border border-mq-border/60 transition-colors"
            >
              <Globe size={14} />
              <span>Public Website</span>
            </Link>

            {/* Student Account Pill with Child's Avatar, Name & Grade */}
            <button
              type="button"
              onClick={() => {
                setActiveNav('profile');
                setIsPracticePlaying(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-mq-surface-blue hover:bg-[#dcebff] border border-mq-border rounded-full shadow-xs transition-colors cursor-pointer"
              title={`${studentFullName} (Grade ${studentGrade})`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 shadow-xs border ${avatar.bgColor} ${avatar.borderColor}`}
              >
                {avatar.icon}
              </div>
              <div className="flex flex-col text-left overflow-hidden max-w-[140px]">
                <span className="text-xs font-bold text-mq-text-strong leading-tight truncate">
                  {studentDisplayName}
                </span>
                <span className="text-[10px] font-semibold text-mq-primary leading-none mt-0.5 truncate">
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
        {/* Desktop Persistent Sidebar (Shrinks to left rail while playing Practice Game) */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-mq-border shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30 transition-all duration-300 ease-in-out ${
            isSidebarShrunk ? 'w-16' : 'w-64 xl:w-72'
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
            <div className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl border-r border-mq-border flex flex-col lg:hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-mq-border bg-mq-surface-soft/60">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base">
                    <span className="text-mq-primary-dark">Math</span>
                    <span className="text-mq-secondary">Quest</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary">
                    Student Portal
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

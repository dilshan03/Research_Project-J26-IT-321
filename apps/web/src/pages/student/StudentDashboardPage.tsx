import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Dumbbell,
  Calendar,
  Award,
  Star,
  Coins,
  Volume2,
  VolumeX,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Users,
  GraduationCap,
  Languages,
  Castle,
  Sparkles,
  Crown,
  Gamepad2,
  Play,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { PedagogicalPracticeArena } from '../../features/pedagogical-agent';
import { contentAdaptationApi } from '../../features/content-adaptation/api';
import type { BlueprintEnvelope, GameTheme } from '../../features/content-adaptation/types';
import { GamePlayer } from '../../features/content-adaptation/game/GamePlayer';
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
  labelEn: string;
  labelSi: string;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
}

const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  { id: 'home', labelEn: 'Home', labelSi: 'මුල් පිටුව', icon: Home },
  { id: 'adventure', labelEn: 'Learning Adventure', labelSi: 'ඉගෙනුම් චාරිකාව', icon: Compass },
  { id: 'practice', labelEn: 'Practice', labelSi: 'පුහුණුවීම්', icon: Dumbbell },
  { id: 'daily-challenge', labelEn: 'Daily Challenge', labelSi: 'දෛනික අභියෝගය', icon: Calendar },
  { id: 'rewards', labelEn: 'Rewards', labelSi: 'ත්‍යාග සහ කුසලාන', icon: Award },
];

const GRADE_SI_LABELS: Record<number, string> = {
  1: '1 වන ශ්‍රේණිය',
  2: '2 වන ශ්‍රේණිය',
  3: '3 වන ශ්‍රේණිය',
  4: '4 වන ශ්‍රේණිය',
  5: '5 වන ශ්‍රේණිය',
};

const ADAPTATION_THEMES: Record<
  GameTheme,
  { name_si: string; name_en: string; mascotBg: string; mascotBorder: string; cardHover: string; badge: string; mascot: string }
> = {
  VILLAGE_MARKET: {
    name_si: 'ගමේ පොළ',
    name_en: 'Village Market',
    mascotBg: 'bg-amber-50',
    mascotBorder: 'border-amber-200/80',
    cardHover: 'hover:border-amber-300 hover:shadow-amber-100/50',
    badge: 'text-amber-800 bg-amber-50 border-amber-200/70',
    mascot: '🧺',
  },
  JUNGLE_ADVENTURE: {
    name_si: 'වනාන්තර චාරිකාව',
    name_en: 'Jungle Adventure',
    mascotBg: 'bg-emerald-50',
    mascotBorder: 'border-emerald-200/80',
    cardHover: 'hover:border-emerald-300 hover:shadow-emerald-100/50',
    badge: 'text-emerald-800 bg-emerald-50 border-emerald-200/70',
    mascot: '🐘',
  },
  SPACE_QUEST: {
    name_si: 'අභ්‍යවකාශ ගමන',
    name_en: 'Space Quest',
    mascotBg: 'bg-sky-50',
    mascotBorder: 'border-sky-200/80',
    cardHover: 'hover:border-sky-300 hover:shadow-sky-100/50',
    badge: 'text-sky-800 bg-sky-50 border-sky-200/70',
    mascot: '🚀',
  },
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

  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStudentLogout = () => {
    setIsProfileDropdownOpen(false);
    // Navigate back to the parent learners dashboard where the child card was selected
    navigate('/learners');
  };

  // Default to 'practice' where the Game + Pedagogical Agent component is linked
  const [activeNav, setActiveNav] = useState<StudentNavId>('practice');
  const [isPracticePlaying, setIsPracticePlaying] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResearchHUD] = useState(false);

  // Content-Adaptation Teacher-Approved Games State
  const [approvedGames, setApprovedGames] = useState<BlueprintEnvelope[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [activeApprovedGame, setActiveApprovedGame] = useState<BlueprintEnvelope | null>(null);

  const fetchApprovedGames = useCallback(async () => {
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const list = await contentAdaptationApi.list('approved');
      setApprovedGames(list || []);
    } catch (err: any) {
      console.warn('Failed to load approved games from content-adaptation-service:', err);
      setGamesError(err?.message || 'ක්‍රීඩා ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovedGames();
  }, [fetchApprovedGames]);

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
  const studentLanguage =
    activeLearner?.primaryInstructionLanguage ||
    activeLearner?.preferredLanguage ||
    'Sinhala';
  const isSinhala =
    studentLanguage.toLowerCase().includes('sinhala') ||
    studentLanguage.includes('සිංහල') ||
    (activeLearner?.preferredLanguage === 'Bilingual' &&
      activeLearner?.primaryInstructionLanguage !== 'English');
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

  // Track completed activities for this specific learner
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>(() => {
    const local = getLocalStudentProgress(
      resolvedParentId,
      resolvedLearnerId,
      studentDisplayName,
      studentGrade
    );
    const backupKey = `mq_completed_acts_${resolvedLearnerId}`;
    try {
      const backupRaw = localStorage.getItem(backupKey);
      const backupList = backupRaw ? JSON.parse(backupRaw) : [];
      return Array.from(new Set([...(local.completedActivityIds || []), ...backupList]));
    } catch {
      return local.completedActivityIds || [];
    }
  });

  // Keep completedActivityIds synced with savedProgress when it loads/updates
  useEffect(() => {
    if (savedProgress.completedActivityIds && savedProgress.completedActivityIds.length > 0) {
      setCompletedActivityIds((prev) =>
        Array.from(new Set([...prev, ...savedProgress.completedActivityIds!]))
      );
    }
  }, [savedProgress.completedActivityIds]);

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

  // Sidebar automatically shrinks to the left while either Practice Game or Approved Adventure Game is playing
  const isSidebarShrunk =
    (activeNav === 'practice' && isPracticePlaying) ||
    (activeNav === 'adventure' && Boolean(activeApprovedGame));

  // Filter and prioritize approved games for this specific child
  const studentApprovedGames = React.useMemo(() => {
    if (!approvedGames || approvedGames.length === 0) return [];

    // 1. Specifically targeted to this child (target_learner_id or matching name)
    const childSpecific = approvedGames.filter(
      (env) =>
        (env.blueprint.target_learner_id && env.blueprint.target_learner_id === resolvedLearnerId) ||
        (env.blueprint.student_name &&
          env.blueprint.student_name.toLowerCase().trim() === studentDisplayName.toLowerCase().trim())
    );

    // 2. Approved for this student's grade (without a target_learner_id reserved for another child)
    const gradeMatching = approvedGames.filter(
      (env) =>
        Number(env.blueprint.grade) === Number(studentGrade) &&
        !childSpecific.some((cs) => cs.blueprint.activity_id === env.blueprint.activity_id) &&
        (!env.blueprint.target_learner_id || env.blueprint.target_learner_id === resolvedLearnerId)
    );

    // 3. Any other teacher-approved games available for exploration
    const otherApproved = approvedGames.filter(
      (env) =>
        !childSpecific.some((cs) => cs.blueprint.activity_id === env.blueprint.activity_id) &&
        !gradeMatching.some((gm) => gm.blueprint.activity_id === env.blueprint.activity_id) &&
        (!env.blueprint.target_learner_id || env.blueprint.target_learner_id === resolvedLearnerId)
    );

    const allGames = [...childSpecific, ...gradeMatching, ...otherApproved];

    // Move completed games to the very end of the cards list (agatama yana vidiyata)
    return allGames.sort((a, b) => {
      const aDone = completedActivityIds.includes(a.blueprint.activity_id);
      const bDone = completedActivityIds.includes(b.blueprint.activity_id);
      if (aDone && !bDone) return 1;  // a is completed -> push to end
      if (!aDone && bDone) return -1; // b is completed -> a comes first
      return 0;
    });
  }, [approvedGames, completedActivityIds, resolvedLearnerId, studentDisplayName, studentGrade]);

  const handleGameComplete = useCallback(
    ({
      activityId,
      starsEarned,
      coinsEarned,
    }: {
      activityId: string;
      starsEarned: number;
      coinsEarned: number;
    }) => {
      // 1. Mark as completed in local state & backup
      setCompletedActivityIds((prev) => {
        if (prev.includes(activityId)) return prev;
        const next = [...prev, activityId];
        try {
          localStorage.setItem(`mq_completed_acts_${resolvedLearnerId}`, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Add stars & coins to student progress and save
      setSavedProgress((prev) => {
        const existing = prev.completedActivityIds || [];
        const nextActs = existing.includes(activityId) ? existing : [...existing, activityId];
        const next: StudentSavedProgress = {
          ...prev,
          parentId: resolvedParentId,
          learnerId: resolvedLearnerId,
          studentName: studentDisplayName,
          grade: studentGrade,
          stars: (prev.stars || 0) + starsEarned,
          coins: (prev.coins || 0) + coinsEarned,
          completedActivityIds: nextActs,
          updatedAt: new Date().toISOString(),
        };
        saveStudentProgress(next);
        return next;
      });
    },
    [resolvedParentId, resolvedLearnerId, studentDisplayName, studentGrade]
  );

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
            onClick={() => {
              setIsPracticePlaying(false);
              setActiveApprovedGame(null);
            }}
            title="Expand Sidebar / Exit Game"
            className="w-11 h-11 rounded-2xl bg-mq-surface-blue text-mq-primary hover:bg-mq-primary hover:text-white border border-mq-primary/25 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          {/* Compact Nav Icons */}
          <div className="flex flex-col items-center space-y-2.5 w-full pt-3 border-t border-mq-border/70">
            {STUDENT_NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              const Icon = item.icon;
              const label = isSinhala ? item.labelSi : item.labelEn;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  onClick={() => {
                    setActiveNav(item.id);
                    setIsPracticePlaying(false);
                    setActiveApprovedGame(null);
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 relative ${
                    active
                      ? 'bg-mq-primary text-white shadow-md shadow-mq-primary/30 ring-2 ring-mq-primary/20'
                      : 'text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <Icon size={21} strokeWidth={2.3} />
                  {item.id === 'adventure' && studentApprovedGames.length > 0 && !active && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Castle Icon */}
          <div className="mt-auto pt-3 border-t border-mq-border/70 w-full flex justify-center">
            <button
              type="button"
              title={isSinhala ? 'මගේ මාළිගාව' : 'My Castle'}
              onClick={() => {
                setActiveNav('castle');
                setIsPracticePlaying(false);
                setActiveApprovedGame(null);
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
        {/* Navigation Items (Direct, Clean & Large for ADHD kids - Dynamic Sinhala/English based on learning language) */}
        <nav className="space-y-2.5">
          {STUDENT_NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            const Icon = item.icon;
            const label = isSinhala ? item.labelSi : item.labelEn;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveNav(item.id);
                  setIsPracticePlaying(false);
                  setActiveApprovedGame(null);
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
                <span className="truncate flex-1 text-sm font-extrabold">{label}</span>
                {item.id === 'adventure' && studentApprovedGames.length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                      active
                        ? 'bg-white text-mq-primary'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {studentApprovedGames.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 3. My Castle (මගේ මාළිගාව) Gamified Image Button - Dynamic Sinhala/English */}
        <div className="mt-auto pt-3 border-t border-mq-border/70">
          <button
            type="button"
            onClick={() => {
              setActiveNav('castle');
              setIsPracticePlaying(false);
              setActiveApprovedGame(null);
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full group relative overflow-hidden rounded-3xl p-3 border-2 transition-all duration-300 text-left cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
              activeNav === 'castle'
                ? 'border-amber-400 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 ring-4 ring-amber-400/30'
                : 'border-amber-200/90 hover:border-amber-400 bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-indigo-50/60 hover:from-amber-100 hover:to-orange-100'
            }`}
            title={isSinhala ? 'මගේ මාළිගාව (රාජකීය ගණිත මාළිගාව)' : 'Explore My Castle & Math Kingdom'}
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
                    {isSinhala ? 'මගේ මාළිගාව' : 'MY CASTLE'}
                  </span>
                  <Sparkles size={14} className="text-amber-500 animate-pulse shrink-0" />
                </div>
                <p className="text-xs font-bold text-amber-850 truncate leading-tight mt-0.5">
                  {isSinhala ? 'රාජකීය ගණිත මාළිගාව' : 'Royal Math Kingdom'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[11px] font-black text-mq-primary bg-white/95 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                    {isSinhala
                      ? `${GRADE_SI_LABELS[studentGrade] || `${studentGrade} වන ශ්‍රේණිය`} රාජධානිය`
                      : `Grade ${studentGrade} Kingdom`}
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

  // Full-Screen Focus Mode for Teacher-Approved Adventure Games:
  // When a game is started, the entire dashboard header and navigation sidebar
  // are completely hidden, opening the game full-screen with only Stars & Coins in the top corner.
  if (activeNav === 'adventure' && activeApprovedGame) {
    return (
      <div className="min-h-screen w-full bg-mq-bg overflow-x-hidden animate-fade-in">
        <GamePlayer
          envelope={activeApprovedGame}
          learnerId={resolvedLearnerId}
          totalStars={savedProgress.stars}
          totalCoins={savedProgress.coins}
          onComplete={handleGameComplete}
          onExit={() => {
            setActiveApprovedGame(null);
          }}
        />
      </div>
    );
  }

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
              <span>{savedProgress.stars.toLocaleString()} <span className="hidden sm:inline text-xs font-extrabold text-amber-800">{isSinhala ? 'තරු' : 'Stars'}</span></span>
            </div>

            {/* Coins Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-yellow-50 border-2 border-yellow-300/80 text-sm sm:text-base font-black text-yellow-950 shadow-2xs">
              <Coins size={18} className="text-yellow-600 shrink-0" />
              <span>{savedProgress.coins} <span className="hidden sm:inline text-xs font-extrabold text-yellow-800">{isSinhala ? 'කාසි' : 'Coins'}</span></span>
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

            {/* Student Account Pill with Dropdown (Logout to Parent Dashboard) */}
            <div className="relative shrink-0" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 rounded-2xl shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isProfileDropdownOpen
                    ? 'border-mq-primary ring-2 ring-mq-primary/20'
                    : 'border-blue-200/90'
                }`}
                aria-haspopup="true"
                aria-expanded={isProfileDropdownOpen}
                title={`${studentFullName} (${isSinhala ? `${GRADE_SI_LABELS[studentGrade] || `${studentGrade} වන ශ්‍රේණිය`}` : `Grade ${studentGrade}`}) - Account menu`}
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
                    {isSinhala
                      ? `${GRADE_SI_LABELS[studentGrade] || `${studentGrade} වන ශ්‍රේණිය`} · අවු. ${studentAge}`
                      : `Grade ${studentGrade} · ${studentAge} Yrs`}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  className={`text-mq-primary transition-transform duration-200 ${
                    isProfileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl border-2 border-mq-border/90 shadow-xl p-2.5 z-50 animate-fade-in">
                  {/* Child Profile Info Banner */}
                  <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100/80 mb-2 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${avatar.bgColor} ${avatar.borderColor}`}
                    >
                      {avatar.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-mq-text-strong truncate">
                        {studentFullName}
                      </p>
                      <p className="text-xs font-bold text-mq-primary">
                        {isSinhala
                          ? `${GRADE_SI_LABELS[studentGrade] || `${studentGrade} වන ශ්‍රේණිය`}`
                          : `Grade ${studentGrade}`}
                      </p>
                    </div>
                  </div>

                  {/* My Castle Quick Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setActiveNav('castle');
                      setIsPracticePlaying(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-mq-text-strong hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer text-left"
                  >
                    <Castle size={16} className="text-amber-600 shrink-0" />
                    <span className="truncate flex-1">{isSinhala ? 'මගේ මාළිගාව' : 'My Castle'}</span>
                  </button>

                  <div className="my-1.5 border-t border-mq-border/70" />

                  {/* Logout / Exit to Parent Dashboard */}
                  <button
                    type="button"
                    onClick={handleStudentLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={16} className="shrink-0 text-red-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="leading-tight">{isSinhala ? 'ඉවත් වන්න' : 'Logout'}</span>
                      <span className="text-[10px] font-semibold text-red-400 leading-tight mt-0.5">
                        {isSinhala ? 'දෙමාපිය පුවරුවට' : 'To Parent Dashboard'}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
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
                            {isSinhala
                              ? `${GRADE_SI_LABELS[studentGrade] || `${studentGrade} වන ශ්‍රේණිය`}`
                              : `Grade ${studentGrade}`}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-mq-text-muted mt-1">
                          {isSinhala
                            ? `${avatar.nameSi} · වයස අවුරුදු ${studentAge}`
                            : `${avatar.name} · ${studentAge} Years Old`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to="/learners"
                        className="btn btn-secondary py-2 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Users size={14} />
                        <span>{isSinhala ? 'වෙනත් දරුවෙකු තෝරන්න' : 'Switch Child'}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveNav('practice')}
                        className="btn btn-primary py-2 px-5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Dumbbell size={14} />
                        <span>{isSinhala ? 'පුහුණුවට යන්න' : 'Go to Practice'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Child Identity & Saved Mastery Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <GraduationCap size={15} className="text-mq-primary" />
                        <span>{isSinhala ? 'දරුවාගේ හැඳුනුම් අංකය' : 'Child Learner ID'}</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-mq-text-strong mt-1.5 break-all">
                        {resolvedLearnerId}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <ShieldCheck size={15} className="text-mq-secondary" />
                        <span>{isSinhala ? 'දෙමාපිය ගිණුම් අංකය' : 'Parent Account ID'}</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-mq-text-strong mt-1.5 break-all">
                        {resolvedParentId}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-green border border-mq-secondary/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <TrendingUp size={15} className="text-mq-success" />
                        <span>{isSinhala ? 'දැනුම් මට්ටම (BKT)' : 'Hint-Aware BKT P(L)'}</span>
                      </div>
                      <p className="text-2xl font-extrabold text-mq-success mt-1">
                        {Math.round(savedProgress.hintAwareKnowledge * 100)}%
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-mq-surface-blue border border-mq-primary/25">
                      <div className="flex items-center gap-2 text-xs font-bold text-mq-text-muted uppercase">
                        <Languages size={15} className="text-mq-primary" />
                        <span>{isSinhala ? 'ඉගෙනුම් භාෂාව' : 'Instruction Language'}</span>
                      </div>
                      <p className="text-base font-extrabold text-mq-primary-dark mt-1">
                        {isSinhala ? (studentLanguage === 'Sinhala' ? 'සිංහල' : studentLanguage) : (studentLanguage === 'Sinhala' ? 'Sinhala' : studentLanguage)}
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
                      <span>{isSinhala ? 'රාජකීය මාළිගාව' : 'Royal Math Kingdom'}</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-amber-100">
                      {isSinhala
                        ? `${studentDisplayName}ගේ මාළිගාව 🏰`
                        : `${studentDisplayName}'s Castle 🏰`}
                    </h1>

                    <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
                      {isSinhala
                        ? 'සාදරයෙන් පිළිගන්නවා! ඔයා ගණිත අභ්‍යාස ජයගන්නා විට ඔයාගේ මාළිගාව තරු සහ රන් කාසි වලින් පිරී යයි!'
                        : 'Welcome! As you solve math challenges, your castle fills up with stars and gold coins!'}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav('practice');
                          setIsPracticePlaying(true);
                        }}
                        className="btn bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 font-black text-sm px-5 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Dumbbell size={16} />
                        <span>{isSinhala ? 'ක්‍රීඩා පුහුණුව අරඹන්න' : 'Start Practice'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveNav('adventure')}
                        className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl backdrop-blur-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Compass size={15} />
                        <span>{isSinhala ? 'ත්‍රාසජනක ගමන' : 'Adventure'}</span>
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
                      {isSinhala ? 'මුළු තරු' : 'Treasury Stars'}
                    </p>
                    <p className="text-3xl font-black text-amber-950 mt-1">
                      {savedProgress.stars.toLocaleString()}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1">
                      {isSinhala ? 'එකතු කළ මුළු තරු ප්‍රමාණය' : 'Total stars collected'}
                    </p>
                  </div>

                  {/* Gold Coins */}
                  <div className="p-5 rounded-3xl bg-white border border-yellow-200 shadow-xs hover:border-yellow-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-600 mb-3">
                      <Coins size={24} className="text-yellow-600" />
                    </div>
                    <p className="text-xs font-bold text-mq-text-muted uppercase tracking-wider">
                      {isSinhala ? 'රන් කාසි' : 'Kingdom Gold'}
                    </p>
                    <p className="text-3xl font-black text-yellow-950 mt-1">
                      {savedProgress.coins.toLocaleString()}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1">
                      {isSinhala ? 'මාළිගාවේ ඇති රන් කාසි' : 'Gold coins in the castle'}
                    </p>
                  </div>

                  {/* Kingdom Rank */}
                  <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-xs hover:border-purple-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 mb-3">
                      <Crown size={24} className="text-purple-600" />
                    </div>
                    <p className="text-xs font-bold text-mq-text-muted uppercase tracking-wider">
                      {isSinhala ? 'මාළිගා මට්ටම' : 'Castle Level'}
                    </p>
                    <p className="text-3xl font-black text-purple-950 mt-1">
                      {isSinhala
                        ? (GRADE_SI_LABELS[studentGrade] || `${studentGrade} ශ්‍රේණිය`)
                        : `Grade ${studentGrade}`}
                    </p>
                    <p className="text-xs text-mq-text-muted mt-1">
                      {isSinhala ? 'වත්මන් ඉගෙනුම් ශ්‍රේණිය' : 'Current learning grade'}
                    </p>
                  </div>
                </div>
              </div>
            ) : activeNav === 'adventure' ? (
              /* ======================================================= */
              /* LEARNING ADVENTURE TAB: Teacher-Approved Games Hub      */
              /* ======================================================= */
              <div className="space-y-6 py-2 animate-fade-in">
                  {/* Hero Banner for Adventure (Calm, Soft Theme Matching MathQuest) */}
                  <div className="relative overflow-hidden rounded-3xl border border-mq-border bg-white shadow-xs p-6 sm:p-7">
                    {/* Top Accent Strip */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-mq-primary via-mq-secondary to-amber-400" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                      <div className="space-y-2 max-w-2xl">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mq-surface-blue border border-mq-primary/25 text-xs font-black text-mq-primary-dark">
                            <Compass size={14} className="text-mq-primary" />
                            <span>{isSinhala ? 'ඉගෙනුම් චාරිකාව' : 'Learning Adventure'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-xs font-black text-amber-950">
                            <Sparkles size={12} className="text-amber-500 fill-amber-400" />
                            <span>
                              {studentApprovedGames.length} {isSinhala ? 'ක්‍රීඩා' : 'Games'}
                              {studentApprovedGames.filter((env) =>
                                completedActivityIds.includes(env.blueprint.activity_id)
                              ).length > 0 &&
                                ` · ${
                                  studentApprovedGames.filter((env) =>
                                    completedActivityIds.includes(env.blueprint.activity_id)
                                  ).length
                                } ක් ${isSinhala ? 'සම්පූර්ණයි ✓' : 'Completed ✓'}`}
                            </span>
                          </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-xl sm:text-2xl font-black text-mq-text-strong tracking-tight">
                          {isSinhala
                            ? `${studentDisplayName} වෙනුවෙන් ගුරුතුමා අනුමත කළ ක්‍රීඩා 🎯`
                            : `Teacher-Approved Adventure Games for ${studentDisplayName} 🎯`}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed">
                          {isSinhala
                            ? 'ගුරුතුමා විසින් ඔබේ ඉගෙනුම් අවශ්‍යතාවලට ගැළපෙන පරිදි අනුමත කරන ලද ගණිත ක්‍රීඩා මෙහි ඇත. ක්‍රීඩා කර තරු සහ කාසි දිනාගන්න!'
                            : 'Fun math games approved by your teacher specifically adapted for your learning pace. Play and earn stars & coins!'}
                        </p>
                      </div>

                      {/* Refresh Button */}
                      <div className="shrink-0 self-start md:self-center">
                        <button
                          type="button"
                          onClick={() => fetchApprovedGames()}
                          disabled={isLoadingGames}
                          className="btn bg-mq-surface-soft hover:bg-mq-surface-blue text-mq-primary-dark border border-mq-border-strong text-xs font-extrabold px-4 py-2 rounded-2xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={`text-mq-primary ${isLoadingGames ? 'animate-spin' : ''}`} />
                          <span>{isSinhala ? 'නැවත පූරණය කරන්න' : 'Refresh Games'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingGames && (
                    <div className="min-h-[40vh] rounded-3xl border border-mq-border bg-white p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full border-4 border-mq-primary/30 border-t-mq-primary animate-spin" />
                      <p className="text-sm font-extrabold text-mq-text-strong">
                        {isSinhala ? 'අනුමත ක්‍රීඩා පූරණය වෙමින් පවතී...' : 'Loading approved games...'}
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {!isLoadingGames && gamesError && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs font-bold">
                      <span>{gamesError}</span>
                      <button
                        type="button"
                        onClick={() => fetchApprovedGames()}
                        className="btn btn-secondary py-1 px-3 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {isSinhala ? 'නැවත උත්සාහ කරන්න' : 'Try Again'}
                      </button>
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoadingGames && !gamesError && studentApprovedGames.length === 0 && (
                    <div className="min-h-[45vh] rounded-3xl border-2 border-dashed border-mq-border bg-white p-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                      <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center text-3xl">
                        🎮
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-base font-extrabold text-mq-text-strong">
                          {isSinhala
                            ? 'තවමත් අනුමත කරන ලද ක්‍රීඩා නොමැත'
                            : 'No Teacher-Approved Games Yet'}
                        </h3>
                        <p className="text-xs text-mq-text-muted leading-relaxed">
                          {isSinhala
                            ? 'ගුරුතුමා විසින් Content Adaptation Studio මඟින් ඔබ වෙනුවෙන් ක්‍රීඩා අනුමත කළ විගස ඒවා මෙහි දිස්වනු ඇත.'
                            : 'Once your teacher reviews and approves games in the Adaptation Studio, they will appear right here.'}
                        </p>
                      </div>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => fetchApprovedGames()}
                          className="btn btn-secondary py-2 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          <span>{isSinhala ? 'නැවත බලන්න' : 'Check Again'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNav('practice')}
                          className="btn btn-primary py-2 px-5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Dumbbell size={14} />
                          <span>{isSinhala ? 'පුහුණුවීම් වෙත යන්න' : 'Go to Practice'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Approved Games Grid */}
                  {!isLoadingGames && studentApprovedGames.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-black text-mq-text-strong flex items-center gap-2">
                          <Gamepad2 size={20} className="text-mq-primary" />
                          <span>
                            {isSinhala
                              ? `ක්‍රීඩා කිරීමට සූදානම් (${studentApprovedGames.length})`
                              : `Ready to Play (${studentApprovedGames.length})`}
                          </span>
                        </h2>
                        <span className="text-xs font-extrabold text-mq-text-muted">
                          {isSinhala ? 'ඔබට කැමති ක්‍රීඩාවක් තෝරන්න' : 'Pick a game to start'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {studentApprovedGames.map((env, idx) => {
                          const bp = env.blueprint;
                          const isCompleted = completedActivityIds.includes(bp.activity_id);
                          const themeKey = (bp.game_theme || 'VILLAGE_MARKET') as GameTheme;
                          const themeInfo =
                            ADAPTATION_THEMES[themeKey] || ADAPTATION_THEMES.VILLAGE_MARKET;
                          const isTargetChild =
                            (bp.target_learner_id &&
                              bp.target_learner_id === resolvedLearnerId) ||
                            (bp.student_name &&
                              bp.student_name.toLowerCase().trim() ===
                                studentDisplayName.toLowerCase().trim());
                          const stepsCount = bp.micro_steps?.length || 3;
                          const questionText =
                            bp.story_narrative?.title_si ||
                            bp.raw_sinhala_question ||
                            env.raw_sinhala_question ||
                            'ගණිත ගැටලුව විසඳන්න';

                          return (
                            <div
                              key={bp.activity_id || idx}
                              className={`group relative rounded-3xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between ${
                                isCompleted
                                  ? 'bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/40 border-2 border-emerald-400/80 shadow-emerald-50 hover:shadow-md hover:border-emerald-500'
                                  : `bg-white border-2 border-mq-border ${themeInfo.cardHover} hover:shadow-md hover:-translate-y-1`
                              }`}
                            >
                              {/* Top Row: Mascot + Badges */}
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="relative">
                                    <div
                                      className={`w-13 h-13 rounded-2xl ${
                                        isCompleted
                                          ? 'bg-emerald-100 border-2 border-emerald-300'
                                          : `${themeInfo.mascotBg} border ${themeInfo.mascotBorder}`
                                      } flex items-center justify-center text-3xl shadow-2xs group-hover:scale-105 transition-transform`}
                                    >
                                      {themeInfo.mascot}
                                    </div>
                                    {isCompleted && (
                                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs ring-2 ring-white">
                                        ✓
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    {isCompleted ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                                        <CheckCircle2 size={12} className="stroke-[3]" />
                                        <span>{isSinhala ? 'සම්පූර්ණයි ✓' : 'Completed ✓'}</span>
                                      </span>
                                    ) : isTargetChild ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-2xs">
                                        <Sparkles size={11} /> {isSinhala ? 'ඔබ වෙනුවෙන්මයි' : 'For You'}
                                      </span>
                                    ) : null}

                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary-dark border border-mq-primary/25">
                                        {GRADE_SI_LABELS[bp.grade] || `Grade ${bp.grade}`}
                                      </span>
                                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-mq-surface-soft text-mq-text-strong border border-mq-border-strong">
                                        {bp.topic}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Theme Title */}
                                <p className="text-xs font-bold text-mq-text-muted">
                                  {isSinhala ? themeInfo.name_si : themeInfo.name_en}
                                </p>

                                {/* Problem Text */}
                                <h3 className="text-sm sm:text-base font-extrabold text-mq-text-strong line-clamp-3 mt-1.5 leading-snug">
                                  {questionText}
                                </h3>

                                {/* Extra features / Microsteps pill */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-mq-border/70">
                                  <span className="text-[11px] font-bold text-mq-text-muted bg-mq-surface-soft px-2.5 py-0.5 rounded-lg border border-mq-border/60">
                                    {isSinhala ? `පියවර ${stepsCount} ක්` : `${stepsCount} steps`}
                                  </span>
                                  {bp.adhd_game_settings?.stimulus_density === 'LOW' && (
                                    <span className="text-[11px] font-bold text-mq-success bg-mq-surface-green border border-mq-secondary/35 px-2.5 py-0.5 rounded-lg">
                                      {isSinhala ? 'සන්සුන් පරිසරය' : 'Calm view'}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                                      isCompleted
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'text-amber-900 bg-amber-50 border border-amber-200/90'
                                    }`}
                                  >
                                    <Star size={11} className={`fill-amber-400 ${isCompleted ? 'text-amber-600' : 'text-amber-500'}`} />
                                    <span>
                                      {isCompleted
                                        ? (isSinhala ? 'තරු 3ක් ලැබුණා ✓' : '3 Stars Earned ✓')
                                        : `3 ${isSinhala ? 'තරු' : 'Stars'}`}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Play / Replay Button */}
                              <div className="mt-4 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveApprovedGame(env)}
                                  className={`w-full font-extrabold text-sm py-2.5 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                    isCompleted
                                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-200/50'
                                      : 'btn bg-mq-primary hover:bg-mq-primary-hover active:bg-mq-primary-dark text-white hover:shadow-md'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <>
                                      <RotateCcw size={15} className="stroke-[2.5]" />
                                      <span>{isSinhala ? 'නැවත සෙල්ලම් කරන්න' : 'Play Again'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={16} className="fill-white" />
                                      <span>{isSinhala ? 'සෙල්ලම් කරන්න' : 'Play Game'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
            ) : (
              /* ======================================================= */
              /* OTHER SIDEBAR TABS: Clean Empty Placeholder             */
              /* ======================================================= */
              <div className="min-h-[60vh] rounded-3xl border-2 border-dashed border-mq-border bg-white/60 flex items-center justify-center p-8 text-center animate-fade-in">
                <div className="max-w-md space-y-3">
                  <div className="text-3xl">{avatar.icon}</div>
                  <p className="text-sm font-bold text-mq-text-strong capitalize">
                    {studentDisplayName} · {isSinhala
                      ? (STUDENT_NAV_ITEMS.find((n) => n.id === activeNav)?.labelSi || activeNav)
                      : (STUDENT_NAV_ITEMS.find((n) => n.id === activeNav)?.labelEn || activeNav)}
                  </p>
                  <p className="text-xs text-mq-text-muted">
                    {isSinhala
                      ? 'ගණිත අභ්‍යාස ක්‍රීඩාව සහ MathBot 3000 සහායකයා භාවිතා කිරීමට පුහුණුව ටැබ් එක තෝරන්න.'
                      : `Switch to the Practice tab to access ${studentDisplayName}'s interactive math practice game and MathBot 3000 companion.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveNav('practice')}
                    className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Dumbbell size={14} />
                    <span>{isSinhala ? 'පුහුණුවට යන්න' : 'Go to Practice'}</span>
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

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { PedagogicalPracticeArena } from '../../features/pedagogical-agent';

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

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Default to 'practice' where the Game + Pedagogical Agent component is linked
  const [activeNav, setActiveNav] = useState<StudentNavId>('practice');
  const [isPracticePlaying, setIsPracticePlaying] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResearchHUD, setShowResearchHUD] = useState(false);

  // Header gamification state synchronized with PedagogicalPracticeArena
  const [stars, setStars] = useState<number>(1250);
  const [coins, setCoins] = useState<number>(350);
  const [learningProgressPct, setLearningProgressPct] = useState<number>(65);

  const studentDisplayName = user?.fullName?.split(' ')[0] || 'Nethmi';
  const studentInitial = studentDisplayName.charAt(0).toUpperCase();

  // Sidebar automatically shrinks to the left while the Practice Game is actively playing
  const isSidebarShrunk = activeNav === 'practice' && isPracticePlaying;

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleRewardEarned = useCallback((starsDelta: number, coinsDelta: number) => {
    setStars((prev) => prev + starsDelta);
    setCoins((prev) => prev + coinsDelta);
  }, []);

  const handleProgressUpdate = useCallback((progressPercent: number) => {
    setLearningProgressPct(progressPercent);
  }, []);

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
      <div className="flex flex-col h-full overflow-y-auto px-4 py-4 space-y-6">
        {/* 1. Role & Student Indicator Card (Matches Teacher Account card in DashboardSidebar.tsx) */}
        <div className="p-3.5 bg-mq-surface-blue/70 border border-mq-primary/20 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-mq-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              👧🏽
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-mq-text-strong truncate">
                {studentDisplayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-mq-success" />
                <span className="text-[11px] font-semibold text-mq-primary">
                  Student Portal Active
                </span>
              </div>
            </div>
          </div>
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

        {/* 3. Research Component Info Footer (Exact match with DashboardSidebar.tsx) */}
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
              <span>MathQuest Research</span>
            </div>
            <p className="text-[11px] text-mq-text-muted leading-tight">
              Adaptive Sinhala math learning platform for children with ADHD support needs.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-mq-bg text-mq-text">
      {/* ========================================================= */}
      {/* 1. TOP PORTAL HEADER (Exact match with PortalHeader.tsx)  */}
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

          {/* Center: Student Stars, Coins & Learning Progress */}
          <div className="hidden md:flex items-center gap-3">
            {/* Stars Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mq-surface-yellow border border-mq-warning/30 text-xs font-extrabold text-mq-text-strong">
              <Star size={14} className="text-mq-warning fill-mq-accent-yellow shrink-0" />
              <span>{stars.toLocaleString()} Stars</span>
            </div>

            {/* Coins Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mq-surface-soft border border-mq-border text-xs font-extrabold text-mq-text-strong">
              <Coins size={14} className="text-mq-warning shrink-0" />
              <span>{coins} Coins</span>
            </div>

            {/* Learning Progress Bar */}
            <div className="hidden xl:flex items-center gap-2.5 pl-2">
              <span className="text-xs font-bold text-mq-text-muted">Learning Progress</span>
              <div className="w-28 h-2 bg-mq-surface-soft rounded-full overflow-hidden border border-mq-border">
                <div
                  className="h-full bg-mq-primary rounded-full transition-all duration-500"
                  style={{ width: `${learningProgressPct}%` }}
                />
              </div>
              <span className="text-xs font-extrabold text-mq-primary">
                {learningProgressPct}%
              </span>
            </div>
          </div>

          {/* Right: Sound + Public Website + Student UserMenu Pill */}
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
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft px-3 py-1.5 rounded-full border border-mq-border/60 transition-colors"
            >
              <Globe size={14} />
              <span>Public Website</span>
            </Link>

            {/* Student Account Pill matching UserMenu.tsx */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-mq-surface-blue border border-mq-border rounded-full shadow-xs">
              <div className="w-7 h-7 bg-mq-primary text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {studentInitial}
              </div>
              <div className="flex flex-col text-left overflow-hidden max-w-[120px]">
                <span className="text-xs font-bold text-mq-text-strong leading-tight truncate">
                  {studentDisplayName}
                </span>
                <span className="text-[10px] font-semibold text-mq-primary leading-none mt-0.5">
                  Grade 3 · Student
                </span>
              </div>
            </div>
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
              /* Extracted in features/pedagogical-agent/components/     */
              /* ======================================================= */
              <PedagogicalPracticeArena
                studentId={user?.id || 'student_nethmi_g3'}
                studentName={studentDisplayName}
                showResearchHUD={showResearchHUD}
                isGameActive={isPracticePlaying}
                onStartGame={() => setIsPracticePlaying(true)}
                onExitGame={() => setIsPracticePlaying(false)}
                onRewardEarned={handleRewardEarned}
                onProgressUpdate={handleProgressUpdate}
              />
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
                  <p className="text-sm font-bold text-mq-text-strong capitalize">
                    {activeNav.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-mq-text-muted">
                    Switch to the <strong>Practice</strong> tab to access the interactive math
                    practice game and <strong>MathBot 3000</strong> pedagogical companion.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveNav('practice')}
                    className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2"
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

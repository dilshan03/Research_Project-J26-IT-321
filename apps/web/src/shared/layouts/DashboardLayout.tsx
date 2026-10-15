import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  Menu,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { DashboardBreadcrumb } from '../components/DashboardBreadcrumb';
import { useAuth } from '../../features/auth/hooks/useAuth';

export interface DashboardLayoutProps {
  role: 'parent' | 'teacher';
  title?: string;
  description?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  title,
  description,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Derive dynamic header info if not supplied
  const getRouteHeader = () => {
    const rootPath = `/${role}/dashboard`;
    const pathAfterRoot = location.pathname.replace(rootPath, '').replace(/^\//, '');

    const headers: Record<string, { title: string; desc: string; titleSi?: string }> = {
      '': {
        title: role === 'parent' ? 'Parent Dashboard Overview' : 'Teacher Dashboard Overview',
        desc:
          role === 'parent'
            ? 'Monitor your children’s math progress, assessment baselines, and personalized support.'
            : 'Classroom curriculum progress, adaptive learning activities, and pedagogical recommendations.',
        titleSi: role === 'parent' ? 'දෙමාපිය පාලක පුවරුව' : 'ගුරු පාලක පුවරුව',
      },
      children: {
        title: 'My Children (මගේ දරුවන්)',
        desc: 'Register and manage your child profiles for personalized mathematics learning.',
      },
      learners: {
        title: 'Assigned Learners (පන්තියේ ඉගෙනුම්කරුවන්)',
        desc: 'Review assigned student profiles, assessment statuses, and learning requirements.',
      },
      'learner-profiles': {
        title: 'Learner Profiles & Evidence Levels',
        desc: 'Evidence-aware mathematics proficiencies, Bayesian credible intervals, and skill levels.',
      },
      assessments: {
        title: 'Onboarding & Diagnostic Assessments',
        desc: 'Learning style preferences, SNAP-IV questionnaire, and Grade-specific math baselines.',
      },
      progress: {
        title: role === 'parent' ? 'Mathematics Learning Progress' : 'Class Curriculum Progress',
        desc: 'Track skill mastery, curriculum progress, and developmental milestones.',
      },
      recommendations: {
        title: role === 'parent' ? 'Personalized Learning Recommendations' : 'Teaching & Pedagogical Recommendations',
        desc: 'Explainable, data-backed pedagogical interventions tailored to specific skill gaps.',
      },
      activities: {
        title: 'Adaptive Learning Activities',
        desc: 'Interactive Sinhala math games tailored to engagement, working memory, and pacing.',
      },
      behaviour: {
        title: 'Behaviour & Engagement Insights',
        desc: 'ADHD-informed engagement indicators, focus duration, and session pacing observations.',
      },
      reports: {
        title: 'Diagnostic & Progress Reports',
        desc: 'Generate exportable mathematics summaries and learner development records.',
      },
      settings: {
        title: 'Account Settings & Preferences',
        desc: 'Manage your profile credentials, notification settings, and session security.',
      },
    };

    return headers[pathAfterRoot] || {
      title: title || (role === 'parent' ? 'Parent Dashboard' : 'Teacher Dashboard'),
      desc: description || 'MathQuest adaptive mathematics learning platform.',
    };
  };

  const routeHeader = getRouteHeader();
  const currentTitle = title || routeHeader.title;
  const currentDesc = description || routeHeader.desc;

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-mq-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-mq-border shadow-sm text-mq-primary font-semibold text-sm">
            <Loader2 size={36} className="animate-spin text-mq-primary" />
            <span>Loading dashboard workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Strict Safety Fallback)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-mq-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-mq-border p-8 shadow-sm text-center animate-fade-in">
            <div className="w-16 h-16 bg-mq-surface-blue text-mq-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-mq-text-strong mb-2">
              Authentication Required
            </h2>
            <p className="text-sm text-mq-text-muted mb-6">
              You must sign in with your verified {role} account to access this dashboard.
            </p>
            <Link
              to="/sign-in"
              className="btn btn-primary w-full justify-center py-2.5 rounded-full text-sm font-bold"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Access Denied State: Role Mismatch
  if (user.role !== role) {
    const targetDashboard = user.role === 'parent' ? '/parent/dashboard' : '/teacher/dashboard';
    const targetRoleName = user.role === 'parent' ? 'Parent' : 'Teacher';

    return (
      <div className="min-h-screen flex flex-col bg-mq-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-mq-danger/30 p-8 shadow-sm text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-50 text-mq-danger rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-mq-text-strong mb-2">
              Access Restricted
            </h2>
            <p className="text-sm text-mq-text-muted mb-4">
              You are signed in as a <strong className="capitalize text-mq-text">{user.role}</strong>.
              This area is restricted strictly to verified <strong>{role}</strong> accounts.
            </p>
            <p className="text-xs text-mq-text-muted bg-mq-surface-soft p-3 rounded-xl mb-6">
              Role isolation ensures child privacy, GDPR/FERPA adherence, and research component security boundaries.
            </p>
            <Link
              to={targetDashboard}
              className="btn btn-primary w-full justify-center py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2"
            >
              <span>Go to {targetRoleName} Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Standard Dashboard Shell
  return (
    <div className="min-h-screen flex flex-col bg-mq-bg text-mq-text">
      {/* MathQuest Global Navbar */}
      <Navbar />

      <div className="flex-1 flex w-full relative">
        {/* Reusable Role-aware Sidebar */}
        <DashboardSidebar
          role={role}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Dashboard Sub-Header / Control Bar */}
          <div className="bg-white border-b border-mq-border px-4 sm:px-6 lg:px-8 py-3.5 sticky top-[61px] z-20 backdrop-blur-md bg-white/95">
            <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
              {/* Breadcrumbs & Mobile Menu Trigger */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border transition-colors shrink-0"
                  aria-label="Open sidebar navigation"
                >
                  <Menu size={18} />
                </button>
                <DashboardBreadcrumb role={role} />
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-mq-primary animate-pulse" />
                  <span className="capitalize">{role} Portal Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Page Title & Description Banner */}
          <div className="bg-white/60 border-b border-mq-border/60 px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <div className="max-w-7xl mx-auto w-full">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-mq-text-strong tracking-tight">
                {currentTitle}
              </h1>
              {currentDesc && (
                <p className="text-xs sm:text-sm text-mq-text-muted mt-1 max-w-3xl">
                  {currentDesc}
                </p>
              )}
            </div>
          </div>

          {/* Main Dashboard Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

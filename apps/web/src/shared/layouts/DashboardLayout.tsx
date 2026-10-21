import React, { useState, useCallback } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { PortalHeader } from '../components/portal/PortalHeader';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ParentBottomNav } from '../components/portal/ParentBottomNav';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { dashboardNameFor, dashboardPathFor } from '../../features/auth/roleRoutes';
import { parentText } from '../i18n/parentText';

export interface DashboardLayoutProps {
  role: 'parent' | 'teacher';
  title?: string;
  description?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isParent = role === 'parent';
  // Parent portal content is Sinhala; the class pairs Lexend (Latin) with Noto Sans Sinhala.
  const rootLang = isParent ? 'si' : undefined;
  const rootClass = isParent ? 'parent-portal' : '';

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleToggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((prev) => !prev);
  }, []);

  // 1. Loading State
  if (isLoading) {
    return (
      <div lang={rootLang} className={`min-h-screen flex flex-col bg-mq-bg ${rootClass}`}>
        <PortalHeader role={role} onToggleMobileSidebar={handleToggleMobileSidebar} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-mq-border shadow-xs text-mq-primary font-semibold text-sm">
            <Loader2 size={36} className="animate-spin text-mq-primary" />
            <span>{isParent ? parentText.shell.loading : 'Loading dashboard workspace...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Strict Safety Fallback)
  if (!isAuthenticated || !user) {
    return (
      <div lang={rootLang} className={`min-h-screen flex flex-col bg-mq-bg ${rootClass}`}>
        <PortalHeader role={role} onToggleMobileSidebar={handleToggleMobileSidebar} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-mq-border p-8 shadow-xs text-center animate-fade-in">
            <div className="w-16 h-16 bg-mq-surface-blue text-mq-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-mq-text-strong mb-2">
              {isParent ? parentText.shell.signInRequiredTitle : 'Authentication Required'}
            </h2>
            <p className="text-sm text-mq-text-muted mb-6">
              {isParent
                ? parentText.shell.signInRequiredText
                : `You must sign in with your verified ${role} account to access this dashboard.`}
            </p>
            <Link
              to="/sign-in"
              className="btn btn-primary w-full justify-center py-2.5 rounded-full text-sm font-bold"
            >
              {isParent ? parentText.shell.signIn : 'Sign In to Continue'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Access Denied State: Role Mismatch
  if (user.role !== role) {
    const targetDashboard = dashboardPathFor(user.role);
    const targetRoleName = dashboardNameFor(user.role);

    return (
      <div className="min-h-screen flex flex-col bg-mq-bg">
        <PortalHeader role={role} onToggleMobileSidebar={handleToggleMobileSidebar} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-mq-danger/30 p-8 shadow-xs text-center animate-fade-in">
            <div className="w-16 h-16 bg-mq-danger-bg text-mq-danger rounded-2xl flex items-center justify-center mx-auto mb-4 border border-mq-danger/20">
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
    <div lang={rootLang} className={`min-h-screen flex flex-col bg-mq-bg text-mq-text ${rootClass}`}>
      {/* Standard Portal Top Header */}
      <PortalHeader
        role={role}
        onToggleMobileSidebar={handleToggleMobileSidebar}
      />

      <div className="flex-1 flex w-full relative">
        {/* Reusable Role-aware Sidebar */}
        <DashboardSidebar
          role={role}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={handleCloseMobileSidebar}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Main Dashboard Content Area */}
          {/* Parent pages use a narrower centred column so cards do not stretch across wide screens */}
          <main
            className={`flex-1 mx-auto w-full ${
              isParent
                ? 'max-w-[1100px] px-4 sm:px-6 pt-5 sm:pt-6 pb-28 lg:pb-6 space-y-5'
                : 'p-4 sm:p-6 lg:p-8 max-w-7xl space-y-6'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Parent-only bottom navigation on mobile/tablet; "More" opens the full menu drawer */}
      {isParent && <ParentBottomNav onOpenMore={handleToggleMobileSidebar} />}
    </div>
  );
};

export default DashboardLayout;

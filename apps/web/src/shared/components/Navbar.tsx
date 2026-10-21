import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Home,
  Sparkles,
  Route,
  Info,
  Mail,
  Users,
  LineChart,
  Lightbulb,
  UserCircle,
  IdCard,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { dashboardNameFor, dashboardPathFor } from '../../features/auth/roleRoutes';
import { UserMenu } from './UserMenu';
import { STUDENT_ACCESS_NOTE, isNavItemActive, navItemsFor, type NavIcon } from './navConfig';

const ICONS: Record<NavIcon, React.ReactNode> = {
  home: <Home size={16} />,
  features: <Sparkles size={16} />,
  how: <Route size={16} />,
  about: <Info size={16} />,
  contact: <Mail size={16} />,
  dashboard: <LayoutDashboard size={16} />,
  children: <Users size={16} />,
  progress: <LineChart size={16} />,
  recommendations: <Lightbulb size={16} />,
  profile: <UserCircle size={16} />,
  profiles: <IdCard size={16} />,
};

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menus on route/hash changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const signedIn = Boolean(isAuthenticated && user);
  // Parents and teachers see their own sections; visitors and admins see the public website links.
  const navItems = navItemsFor(user?.role, signedIn);
  const hasRoleNav = signedIn && (user?.role === 'parent' || user?.role === 'teacher');
  const dashboardLink = dashboardPathFor(user?.role);
  const dashboardLabel = `${dashboardNameFor(user?.role)} Dashboard`;
  const isActive = (to: (typeof navItems)[number]) => isNavItemActive(to, location.pathname, location.hash);

  const handleSignOut = () => {
    setIsMobileMenuOpen(false);
    logout();
  };

  return (
    <nav
      className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs border-b border-mq-border h-16"
      aria-label={hasRoleNav ? `${dashboardNameFor(user?.role)} Navigation` : 'Main Public Navigation'}
    >
      <div className="w-full max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* ========================================================= */}
        {/* 1. Left: Branding & Logo                                  */}
        {/* ========================================================= */}
        <Link
          to="/"
          className="flex flex-col shrink-0 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-lg p-0.5"
          aria-label="MathQuest Home"
        >
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center">
            <span className="text-mq-primary-dark">Math</span>
            <span className="text-mq-secondary">Quest</span>
            <span className="text-mq-accent-yellow ml-0.5 sm:ml-1 text-2xl leading-none -mt-2">
              *
            </span>
          </span>
          <span className="text-mq-text-muted text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase mt-0.5 whitespace-nowrap">
            Small Steps Big Progress
          </span>
        </Link>

        {/* ========================================================= */}
        {/* 2. Center: Role-based Navigation Links (Desktop)          */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-3 font-semibold text-xs xl:text-sm">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`py-1.5 px-3 rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'text-mq-primary font-bold'
                    : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 3. Right: Contextual Portal CTA & Profile / Sign In       */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {signedIn ? (
            <div className="flex items-center gap-3">
              {/* Parents and teachers already have "Dashboard" in their links; admins keep the button */}
              {!hasRoleNav && (
                <Link
                  to={dashboardLink}
                  className="btn btn-primary text-xs py-2 px-4 rounded-full whitespace-nowrap inline-flex items-center gap-1.5 shadow-xs"
                >
                  <LayoutDashboard size={14} />
                  <span>{dashboardLabel}</span>
                  <ArrowRight size={13} strokeWidth={2.5} />
                </Link>
              )}

              <UserMenu />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/sign-in"
                className="btn btn-secondary text-xs py-1.5 px-4 rounded-full whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                title="Create a parent or teacher account"
                className="btn btn-primary text-xs py-1.5 px-4 rounded-full whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. Mobile Navigation Menu Toggle                          */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          {signedIn && (
            <Link
              to={dashboardLink}
              className="btn btn-primary text-xs py-1.5 px-3 rounded-full inline-flex items-center gap-1"
            >
              <span>Dashboard</span>
              <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary border border-mq-border/60"
            aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. Mobile & Tablet Collapsible Menu Drawer                */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="lg:hidden border-t border-mq-border bg-white px-5 py-4 space-y-4 animate-fade-in shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          {/* Signed-in summary */}
          {signedIn && user && (
            <div className="flex items-center gap-3 rounded-2xl bg-mq-surface-blue border border-mq-border px-3 py-2.5">
              <span className="w-9 h-9 bg-mq-primary text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-mq-text-strong truncate">{user.fullName || user.email}</p>
                <p className="text-[11px] font-semibold text-mq-primary capitalize">{user.role}</p>
              </div>
            </div>
          )}

          {/* Role-based or public links */}
          <div className="flex flex-col space-y-1 font-semibold text-mq-text text-sm">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-2 px-3 rounded-xl transition-colors inline-flex items-center gap-2.5 ${
                    active
                      ? 'bg-mq-surface-blue text-mq-primary font-bold'
                      : 'hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <span className={active ? 'text-mq-primary' : 'text-mq-text-muted'}>{ICONS[item.icon]}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Profile & Actions Section */}
          <div className="pt-3 border-t border-mq-border flex flex-col gap-2.5">
            {signedIn && user ? (
              <>
                {!hasRoleNav && (
                  <Link
                    to={dashboardLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-primary w-full justify-center gap-2 text-xs py-2.5 rounded-xl font-bold"
                  >
                    <LayoutDashboard size={15} />
                    <span>Go to {dashboardLabel}</span>
                  </Link>
                )}
                {hasRoleNav && (
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-xl text-sm font-semibold text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary inline-flex items-center gap-2.5"
                  >
                    <Home size={16} /> Public Website
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn btn-secondary w-full justify-center gap-2 text-xs py-2 rounded-xl text-mq-danger hover:bg-mq-danger-bg border-mq-border"
                >
                  <LogOut size={15} />
                  <span>Sign Out ({user.email})</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/sign-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn btn-secondary w-full justify-center text-xs py-2.5 rounded-full font-bold"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn btn-primary w-full justify-center text-xs py-2.5 rounded-full font-bold inline-flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
                <p className="text-xs text-mq-text-muted leading-relaxed pt-1">{STUDENT_ACCESS_NOTE}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

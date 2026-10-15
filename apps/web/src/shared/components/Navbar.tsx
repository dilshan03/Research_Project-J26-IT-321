import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Users,
  ChevronDown,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Active route checks
  const isHome = location.pathname === '/';
  const isLearners = location.pathname.startsWith('/learners');
  const isProfile = location.pathname.startsWith('/profile');
  const isParentDashboard = location.pathname.startsWith('/parent/dashboard');
  const isTeacherDashboard = location.pathname.startsWith('/teacher/dashboard');
  const isTeacherStudio = window.location.hash.startsWith('#/adapt');

  // Close menus on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Click outside and keyboard (Escape) listeners for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOut = () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  };

  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'User');
  const userInitial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <nav
      className="w-full bg-mq-surface/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-mq-border"
      aria-label="Main Navigation"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* ========================================================= */}
        {/* 1. Left: Branding & Logo                                  */}
        {/* ========================================================= */}
        <Link
          to="/"
          className="flex flex-col shrink-0 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-lg p-0.5"
          aria-label="MathQuest Home"
        >
          <h1 className="text-xl sm:text-2xl xl:text-3xl font-extrabold tracking-tight flex items-center">
            <span className="text-mq-primary-dark">Math</span>
            <span className="text-mq-secondary">Quest</span>
            <span className="text-mq-accent-yellow ml-0.5 sm:ml-1 text-2xl sm:text-3xl xl:text-4xl leading-none -mt-2 sm:-mt-2.5 xl:-mt-3">
              *
            </span>
          </h1>
          <span className="text-mq-text-muted text-[9px] sm:text-[10px] xl:text-xs font-semibold tracking-wider xl:tracking-widest uppercase mt-0.5 whitespace-nowrap">
            Small Steps Big Progress
          </span>
        </Link>

        {/* ========================================================= */}
        {/* 2. Center: Primary Navigation Links (Desktop 1024px+)     */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2.5 2xl:gap-4 font-semibold text-xs xl:text-[14px] 2xl:text-[15px]">
          {/* Home Link */}
          <Link
            to="/"
            className={`relative py-1.5 px-2.5 rounded-lg transition-colors whitespace-nowrap ${
              isHome
                ? 'text-mq-primary font-bold'
                : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60'
            }`}
          >
            Home
            {isHome && (
              <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-mq-primary rounded-full" />
            )}
          </Link>

          {/* Role-Specific Navigation: Parent -> Dashboard & My Children */}
          {isAuthenticated && user?.role === 'parent' && (
            <>
              <Link
                to="/parent/dashboard"
                className={`relative py-1.5 px-2.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isParentDashboard
                    ? 'text-mq-primary font-bold'
                    : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60'
                }`}
              >
                <LayoutDashboard size={15} className={isParentDashboard ? 'text-mq-primary' : 'text-mq-primary-dark'} />
                <span>Dashboard</span>
                {isParentDashboard && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-mq-primary rounded-full" />
                )}
              </Link>
              <Link
                to="/learners"
                className={`relative py-1.5 px-2.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isLearners
                    ? 'text-mq-primary font-bold'
                    : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60'
                }`}
              >
                <Users size={15} className={isLearners ? 'text-mq-primary' : 'text-mq-primary-dark'} />
                <span>My Children</span>
                {isLearners && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-mq-primary rounded-full" />
                )}
              </Link>
            </>
          )}

          {/* Role-Specific Navigation: Teacher -> Dashboard & Studio */}
          {isAuthenticated && user?.role === 'teacher' && (
            <>
              <Link
                to="/teacher/dashboard"
                className={`relative py-1.5 px-2.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isTeacherDashboard
                    ? 'text-mq-primary font-bold'
                    : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60'
                }`}
              >
                <LayoutDashboard size={15} className="text-mq-primary" />
                <span>Dashboard</span>
                {isTeacherDashboard && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-mq-primary rounded-full" />
                )}
              </Link>
              <a
                href="#/adapt"
                className={`relative py-1.5 px-2.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isTeacherStudio
                    ? 'text-mq-primary font-bold'
                    : 'text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60'
                }`}
              >
                <BookOpen size={15} className="text-mq-primary" />
                <span>Teacher Studio</span>
                {isTeacherStudio && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-mq-primary rounded-full" />
                )}
              </a>
            </>
          )}

          {/* Informational Public Links */}
          <a
            href="/#features"
            className="py-1.5 px-2.5 text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60 rounded-lg transition-colors whitespace-nowrap"
          >
            Features
          </a>
          <a
            href="/#for-parents-teachers"
            className="py-1.5 px-2.5 text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60 rounded-lg transition-colors whitespace-nowrap"
          >
            For Parents & Teachers
          </a>
          <a
            href="/#about"
            className="py-1.5 px-2.5 text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60 rounded-lg transition-colors whitespace-nowrap"
          >
            About
          </a>
          <a
            href="/#contact"
            className="py-1.5 px-2.5 text-mq-text hover:text-mq-primary hover:bg-mq-surface-soft/60 rounded-lg transition-colors whitespace-nowrap"
          >
            Contact
          </a>
        </div>

        {/* ========================================================= */}
        {/* 3. Right: User Profile & Contextual Actions (Desktop)     */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Contextual CTA when on Home page */}
              {isHome && (
                <Link
                  to={user.role === 'parent' ? '/parent/dashboard' : '/teacher/dashboard'}
                  className="btn btn-primary text-xs xl:text-sm py-1.5 px-3.5 rounded-full whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
                >
                  <span>{user.role === 'parent' ? 'Open Dashboard' : 'Open Teacher Dashboard'}</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              )}

              {/* Accessible Profile Menu Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  id="user-profile-button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-mq-surface-blue border border-mq-border hover:border-mq-primary/60 hover:bg-mq-surface-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary rounded-full shadow-sm transition-all cursor-pointer group"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="user-profile-menu"
                  aria-label="User account menu"
                >
                  {/* User Initial Avatar */}
                  <div className="w-6 h-6 xl:w-7 xl:h-7 bg-mq-primary group-hover:bg-mq-primary-hover text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-xs">
                    {userInitial}
                  </div>

                  {/* Name and Role Label */}
                  <div className="flex flex-col text-left overflow-hidden max-w-[110px] xl:max-w-[150px]">
                    <span className="text-xs xl:text-[13px] font-bold text-mq-text-strong group-hover:text-mq-primary leading-tight truncate transition-colors">
                      {displayName}
                    </span>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-mq-primary capitalize leading-none mt-0.5">
                      {user.role}
                    </span>
                  </div>

                  {/* Dropdown Chevron Indicator */}
                  <ChevronDown
                    size={14}
                    className={`text-mq-text-muted group-hover:text-mq-primary transition-transform duration-200 shrink-0 ${
                      isProfileMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Flyout */}
                {isProfileMenuOpen && (
                  <div
                    id="user-profile-menu"
                    role="menu"
                    aria-labelledby="user-profile-button"
                    className="absolute right-0 top-full mt-2 w-64 bg-white border border-mq-border rounded-2xl shadow-xl py-2 z-50 animate-fade-in origin-top-right focus:outline-none"
                  >
                    {/* User Summary Header */}
                    <div className="px-4 py-2.5 border-b border-mq-border/70 mb-1">
                      <p className="text-xs text-mq-text-muted font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-mq-text-strong truncate mt-0.5">
                        {displayName}
                      </p>
                      <p className="text-xs text-mq-text-muted truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                          {user.role} Account
                        </span>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="px-1.5 py-1 space-y-0.5">
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isProfile
                            ? 'bg-mq-surface-blue text-mq-primary font-bold'
                            : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
                        }`}
                      >
                        <UserIcon size={15} className="text-mq-primary shrink-0" />
                        <span>My Profile</span>
                      </Link>

                      {user.role === 'parent' && (
                        <>
                          <Link
                            to="/parent/dashboard"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isParentDashboard
                                ? 'bg-mq-surface-blue text-mq-primary font-bold'
                                : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
                            }`}
                          >
                            <LayoutDashboard size={15} className="text-mq-primary shrink-0" />
                            <span>Parent Dashboard</span>
                          </Link>
                          <Link
                            to="/learners"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isLearners
                                ? 'bg-mq-surface-blue text-mq-primary font-bold'
                                : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
                            }`}
                          >
                            <Users size={15} className="text-mq-primary shrink-0" />
                            <span>My Children (මගේ දරුවන්)</span>
                          </Link>
                        </>
                      )}

                      {user.role === 'teacher' && (
                        <>
                          <Link
                            to="/teacher/dashboard"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isTeacherDashboard
                                ? 'bg-mq-surface-blue text-mq-primary font-bold'
                                : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
                            }`}
                          >
                            <LayoutDashboard size={15} className="text-mq-primary shrink-0" />
                            <span>Teacher Dashboard</span>
                          </Link>
                          <a
                            href="#/adapt"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                          >
                            <BookOpen size={15} className="text-mq-primary shrink-0" />
                            <span>Teacher Adaptation Studio</span>
                          </a>
                        </>
                      )}
                    </div>

                    {/* Divider & Sign Out */}
                    <div className="border-t border-mq-border/70 mt-1 pt-1 px-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-danger hover:bg-mq-danger-bg transition-colors cursor-pointer"
                      >
                        <LogOut size={15} className="shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Unauthenticated Visitor Actions */
            <div className="flex items-center gap-2">
              <Link
                to="/sign-in"
                className="btn btn-secondary text-xs xl:text-sm py-1.5 px-3 xl:px-4 rounded-full whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="btn btn-primary text-xs xl:text-sm py-1.5 px-3 xl:px-4 rounded-full whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span>Start Learning</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. Mobile & Tablet Navigation Toggle                      */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          {/* Quick Contextual CTA on Tablets */}
          {!isAuthenticated ? (
            <Link
              to="/sign-up"
              className="hidden sm:inline-flex btn btn-primary text-xs py-1.5 px-3 whitespace-nowrap rounded-full items-center gap-1"
            >
              <span>Start Learning</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          ) : (
            isHome && (
              <Link
                to={user?.role === 'parent' ? '/learners' : '#/adapt'}
                className="hidden sm:inline-flex btn btn-primary text-xs py-1.5 px-3 whitespace-nowrap rounded-full items-center gap-1"
              >
                <span>{user?.role === 'parent' ? 'Dashboard' : 'Studio'}</span>
                <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            )
          )}

          {/* Hamburger Menu Toggle Button */}
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
          className="lg:hidden border-t border-mq-border bg-mq-surface px-5 py-4 space-y-4 animate-fade-in shadow-lg"
        >
          {/* Mobile Primary Links */}
          <div className="flex flex-col space-y-1 font-semibold text-mq-text text-sm">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                isHome
                  ? 'bg-mq-surface-blue text-mq-primary font-bold'
                  : 'hover:bg-mq-surface-soft hover:text-mq-primary'
              }`}
            >
              Home
            </Link>

            {isAuthenticated && user?.role === 'parent' && (
              <>
                <Link
                  to="/parent/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
                    isParentDashboard
                      ? 'bg-mq-surface-blue text-mq-primary font-bold'
                      : 'hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <LayoutDashboard size={16} className="text-mq-primary" />
                  <span>Parent Dashboard</span>
                </Link>
                <Link
                  to="/learners"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
                    isLearners
                      ? 'bg-mq-surface-blue text-mq-primary font-bold'
                      : 'hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <Users size={16} className="text-mq-primary" />
                  <span>My Children (මගේ දරුවන්)</span>
                </Link>
              </>
            )}

            {isAuthenticated && user?.role === 'teacher' && (
              <>
                <Link
                  to="/teacher/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
                    isTeacherDashboard
                      ? 'bg-mq-surface-blue text-mq-primary font-bold'
                      : 'hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <LayoutDashboard size={16} className="text-mq-primary" />
                  <span>Teacher Dashboard</span>
                </Link>
                <a
                  href="#/adapt"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
                    isTeacherStudio
                      ? 'bg-mq-surface-blue text-mq-primary font-bold'
                      : 'hover:bg-mq-surface-soft hover:text-mq-primary'
                  }`}
                >
                  <BookOpen size={16} className="text-mq-primary" />
                  <span>Teacher Studio</span>
                </a>
              </>
            )}

            <a
              href="/#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
            >
              Features
            </a>
            <a
              href="/#for-parents-teachers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
            >
              For Parents & Teachers
            </a>
            <a
              href="/#about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
            >
              About
            </a>
            <a
              href="/#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Mobile Profile & Actions Section */}
          <div className="pt-3 border-t border-mq-border flex flex-col gap-2.5">
            {isAuthenticated && user ? (
              <>
                {/* Profile Banner */}
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    isProfile
                      ? 'bg-mq-surface-blue border-mq-primary/60'
                      : 'bg-mq-surface-soft/60 border-mq-border hover:border-mq-primary/40'
                  }`}
                >
                  <div className="w-10 h-10 bg-mq-primary text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex flex-col text-left overflow-hidden min-w-0">
                    <span className="text-sm font-bold text-mq-text-strong truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-mq-text-muted truncate">{user.email}</span>
                    <span className="text-[10px] font-bold text-mq-primary capitalize mt-0.5">
                      {user.role} Account
                    </span>
                  </div>
                </Link>

                {/* Profile Links */}
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn btn-secondary w-full justify-center gap-2 text-xs py-2 rounded-xl"
                >
                  <UserIcon size={15} />
                  <span>View Full Profile</span>
                </Link>

                {user.role === 'parent' && (
                  <Link
                    to="/learners"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-secondary w-full justify-center gap-2 text-xs py-2 rounded-xl text-mq-primary font-bold border-mq-primary/40 hover:bg-mq-surface-soft"
                  >
                    <Users size={15} />
                    <span>My Children (මගේ දරුවන්)</span>
                  </Link>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn btn-secondary w-full justify-center gap-2 text-xs py-2 rounded-xl text-mq-danger hover:bg-mq-danger-bg border-mq-border"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              /* Unauthenticated Mobile Actions */
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
                  <span>Start Learning</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};


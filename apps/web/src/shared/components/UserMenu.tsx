import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogOut,
  ChevronDown,
  Users,
  LayoutDashboard,
  BookOpen,
  Settings,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

export interface UserMenuProps {
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on location change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.hash]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const displayName = user.fullName || (user.email ? user.email.split('@')[0] : 'User');
  const userInitial = user.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : (user.email ? user.email.charAt(0).toUpperCase() : 'U');

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
  };

  const isParent = user.role === 'parent';
  const isTeacher = user.role === 'teacher';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        id="user-profile-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-mq-surface-blue border border-mq-border hover:border-mq-primary/60 hover:bg-mq-surface-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary rounded-full shadow-xs transition-all cursor-pointer group"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="user-profile-menu"
        aria-label="User account menu"
      >
        {/* User Initial Avatar */}
        <div className="w-7 h-7 bg-mq-primary group-hover:bg-mq-primary-hover text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-xs">
          {userInitial}
        </div>

        {/* Name and Role Label */}
        <div className="flex flex-col text-left overflow-hidden max-w-[120px] sm:max-w-[160px]">
          <span className="text-xs font-bold text-mq-text-strong group-hover:text-mq-primary leading-tight truncate transition-colors">
            {displayName}
          </span>
          <span className="text-[10px] font-semibold text-mq-primary capitalize leading-none mt-0.5">
            {user.role}
          </span>
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          size={14}
          className={`text-mq-text-muted group-hover:text-mq-primary transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Flyout */}
      {isOpen && (
        <div
          id="user-profile-menu"
          role="menu"
          aria-labelledby="user-profile-button"
          className="absolute right-0 top-full mt-2 w-64 bg-white border border-mq-border rounded-2xl shadow-xl py-2 z-50 animate-fade-in origin-top-right focus:outline-none"
        >
          {/* User Summary Header */}
          <div className="px-4 py-2.5 border-b border-mq-border/70 mb-1">
            <p className="text-[11px] text-mq-text-muted font-medium">Signed in as</p>
            <p className="text-sm font-bold text-mq-text-strong truncate mt-0.5">
              {displayName}
            </p>
            <p className="text-xs text-mq-text-muted truncate">{user.email}</p>
            <div className="mt-1.5">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
                {user.role} Portal Active
              </span>
            </div>
          </div>

          {/* Menu Options */}
          <div className="px-1.5 py-1 space-y-0.5">
            {isParent && (
              <>
                <Link
                  to="/parent/dashboard"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <LayoutDashboard size={15} className="text-mq-primary shrink-0" />
                  <span>Parent Dashboard</span>
                </Link>
                <Link
                  to="/learners"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <Users size={15} className="text-mq-primary shrink-0" />
                  <span>My Children</span>
                </Link>
                <Link
                  to="/parent/dashboard/settings"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <Settings size={15} className="text-mq-primary shrink-0" />
                  <span>Account Settings</span>
                </Link>
              </>
            )}

            {isTeacher && (
              <>
                <Link
                  to="/teacher/dashboard"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <LayoutDashboard size={15} className="text-mq-primary shrink-0" />
                  <span>Teacher Dashboard</span>
                </Link>
                <a
                  href="#/adapt"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <BookOpen size={15} className="text-mq-primary shrink-0" />
                  <span>Teacher Studio</span>
                </a>
                <Link
                  to="/teacher/dashboard/settings"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary transition-colors"
                >
                  <Settings size={15} className="text-mq-primary shrink-0" />
                  <span>Account Settings</span>
                </Link>
              </>
            )}

            {/* Public Website Link */}
            <Link
              to="/"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary transition-colors border-t border-mq-border/50 mt-1 pt-1.5"
            >
              <Globe size={15} className="text-mq-text-muted shrink-0" />
              <span>Public Website</span>
            </Link>
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
  );
};

export default UserMenu;

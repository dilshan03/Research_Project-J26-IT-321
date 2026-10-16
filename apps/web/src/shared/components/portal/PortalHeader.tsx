import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Globe } from 'lucide-react';
import { UserMenu } from '../UserMenu';

export interface PortalHeaderProps {
  role: 'parent' | 'teacher';
  onToggleMobileSidebar?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  role,
  onToggleMobileSidebar,
}) => {
  const homeLink = role === 'parent' ? '/parent/dashboard' : '/teacher/dashboard';

  return (
    <header
      className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs border-b border-mq-border h-16"
      aria-label={`${role === 'parent' ? 'Parent' : 'Teacher'} Portal Header`}
    >
      <div className="w-full max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Drawer Trigger + Brand Logo */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-colors shrink-0 cursor-pointer"
              aria-label="Open navigation sidebar"
            >
              <Menu size={20} />
            </button>
          )}

          <Link
            to={homeLink}
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-lg p-0.5 shrink-0"
            aria-label="MathQuest Portal Dashboard"
          >
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center">
              <span className="text-mq-primary-dark">Math</span>
              <span className="text-mq-secondary">Quest</span>
              <span className="text-mq-accent-yellow ml-0.5 text-2xl leading-none -mt-2">
                *
              </span>
            </span>

            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-mq-surface-blue text-mq-primary border border-mq-primary/20">
              {role === 'parent' ? 'Parent Portal' : 'Teacher Portal'}
            </span>
          </Link>
        </div>

        {/* Right: Actions + Profile Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft px-3 py-1.5 rounded-full border border-mq-border/60 transition-colors"
            title="View public website"
          >
            <Globe size={14} />
            <span>Public Website</span>
          </Link>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;

import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Globe } from 'lucide-react';
import { UserMenu } from '../UserMenu';
import { parentText } from '../../i18n/parentText';
import { teacherText } from '../../i18n/teacherText';
import { LanguageSwitch } from '../LanguageSwitch';

export interface PortalHeaderProps {
  role: 'parent' | 'teacher';
  onToggleMobileSidebar?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  role,
  onToggleMobileSidebar,
}) => {
  const isParent = role === 'parent';
  const homeLink = isParent ? '/parent/dashboard' : '/teacher/dashboard';
  const portalLabel = isParent ? parentText.nav.portal : teacherText.portal.label;

  return (
    <header
      className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs border-b border-mq-border h-16"
      aria-label={isParent ? parentText.nav.portal : teacherText.portal.headerAria}
    >
      {/* Parent header spans the full width so the logo aligns with the sidebar */}
      <div
        className={`w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 ${
          isParent ? '' : 'max-w-7xl mx-auto'
        }`}
      >
        {/* Left: Mobile Drawer Trigger + Brand Logo */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-colors shrink-0 cursor-pointer"
              aria-label={isParent ? parentText.shell.openMenu : teacherText.portal.openNav}
            >
              <Menu size={20} />
            </button>
          )}

          <Link
            to={homeLink}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary/40 rounded-lg p-0.5 min-w-0"
            aria-label={isParent ? parentText.shell.home : teacherText.portal.homeAria}
          >
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center shrink-0">
              <span className="text-mq-primary-dark">Math</span>
              <span className="text-mq-secondary">Quest</span>
              <span className="text-mq-accent-yellow ml-0.5 text-2xl leading-none -mt-2">
                *
              </span>
            </span>

            <span
              className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/20 whitespace-nowrap ${
                isParent ? 'text-xs' : 'text-[11px] uppercase tracking-wider'
              }`}
            >
              {portalLabel}
            </span>
          </Link>
        </div>

        {/* Right: Actions + Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitch compact className="hidden sm:inline-flex" />
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft px-3 py-1.5 rounded-full border border-mq-border/60 transition-colors whitespace-nowrap"
          >
            <Globe size={14} />
            <span>{isParent ? parentText.shell.publicWebsite : teacherText.portal.publicWebsite}</span>
          </Link>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;

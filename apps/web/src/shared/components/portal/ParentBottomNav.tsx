import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, TrendingUp, Lightbulb, Menu, type LucideIcon } from 'lucide-react';
import { parentText } from '../../i18n/parentText';
import { PARENT_BOTTOM_NAV } from '../../i18n/parentNav';

const ICONS: Record<string, LucideIcon> = {
  '/parent/dashboard': Home,
  '/learners': Users,
  '/parent/dashboard/learner-profiles': TrendingUp,
  '/parent/dashboard/recommendations': Lightbulb,
};

interface ParentBottomNavProps {
  /** Opens the full parent menu (existing mobile drawer) for all other pages. */
  onOpenMore: () => void;
}

/** Parent-only mobile/tablet bottom navigation. Hidden on desktop, where the sidebar is shown. */
export const ParentBottomNav: React.FC<ParentBottomNavProps> = ({ onOpenMore }) => {
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === '/parent/dashboard' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  const itemClass = (active: boolean) =>
    `flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl text-xs font-semibold transition-colors ${
      active ? 'text-mq-primary bg-mq-surface-blue' : 'text-mq-text hover:text-mq-primary'
    }`;

  return (
    <nav
      aria-label={parentText.shell.navigation}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-mq-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-[600px] mx-auto flex items-stretch gap-1 px-2 py-1.5">
        {PARENT_BOTTOM_NAV.map((item) => {
          const active = isActive(item.path);
          const Icon = ICONS[item.path] ?? Home;
          return (
            <NavLink key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
              <Icon size={22} aria-hidden="true" />
              <span className="truncate max-w-full">{item.label}</span>
            </NavLink>
          );
        })}
        <button type="button" onClick={onOpenMore} className={`${itemClass(false)} cursor-pointer`}>
          <Menu size={22} aria-hidden="true" />
          <span>{parentText.nav.more}</span>
        </button>
      </div>
    </nav>
  );
};

export default ParentBottomNav;

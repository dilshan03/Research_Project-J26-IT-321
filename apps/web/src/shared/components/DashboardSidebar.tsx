import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X, ShieldCheck } from 'lucide-react';
import {
  PARENT_NAV_GROUPS,
  TEACHER_NAV_GROUPS,
  type NavGroupConfig,
  type NavItemConfig,
} from './sidebar/sidebarConfig';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { parentText } from '../i18n/parentText';
import { PARENT_GROUP_TITLES, PARENT_PRIMARY_PATHS, PARENT_ROUTE_LABELS } from '../i18n/parentNav';

interface DashboardSidebarProps {
  role: 'parent' | 'teacher';
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  role,
  isOpenMobile,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const isParent = role === 'parent';
  const groups: NavGroupConfig[] = isParent ? PARENT_NAV_GROUPS : TEACHER_NAV_GROUPS;
  // Parent portal is Sinhala-first; teacher labels are unchanged.
  const groupTitle = (group: NavGroupConfig) => (isParent ? PARENT_GROUP_TITLES[group.id] ?? group.title : group.title);
  const itemLabel = (item: NavItemConfig) => (isParent ? PARENT_ROUTE_LABELS[item.path] ?? item.label : item.label);
  const portalLabel = isParent ? parentText.nav.portal : 'Teacher Portal';

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Close mobile drawer strictly when pathname changes
  useEffect(() => {
    onCloseMobile();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key & focus management when mobile drawer opens
  useEffect(() => {
    if (!isOpenMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling while drawer is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpenMobile, onCloseMobile]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (item: NavItemConfig): boolean => {
    const current = location.pathname;

    // Check specific matchPaths if defined
    if (item.matchPaths && item.matchPaths.length > 0) {
      return item.matchPaths.some((p) => {
        if (p === `/${role}/dashboard`) {
          return current === p;
        }
        return current === p || current.startsWith(`${p}/`);
      });
    }

    if (item.path === `/${role}/dashboard`) {
      return current === item.path;
    }
    return current === item.path || current.startsWith(`${item.path}/`);
  };

  const renderNavItem = (item: NavItemConfig) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    return (
      <NavLink
        key={item.id}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 px-3 rounded-2xl font-semibold transition-all duration-150 ${
          isParent ? 'min-h-[44px] py-2 text-base' : 'py-2.5 text-xs'
        } ${
          active
            ? 'bg-mq-primary text-white shadow-sm shadow-mq-primary/25 font-bold'
            : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
        }`}
      >
        <Icon
          size={isParent ? 19 : 17}
          className={`shrink-0 transition-colors ${
            active ? 'text-white' : 'text-mq-text-muted group-hover:text-mq-primary'
          }`}
        />
        <span className={`flex-1 ${isParent ? 'leading-snug' : 'truncate'}`}>{itemLabel(item)}</span>

        {item.badge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              active ? 'bg-white/20 text-white' : 'bg-mq-surface-blue text-mq-primary'
            }`}
          >
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  // Parent menu: five main destinations, every other existing page kept under "More".
  const parentItems = groups.flatMap((g) => g.items);
  const parentPrimary = PARENT_PRIMARY_PATHS.map((p) => parentItems.find((i) => i.path === p)).filter(
    (i): i is NavItemConfig => Boolean(i)
  );
  const parentMore = parentItems.filter((i) => !PARENT_PRIMARY_PATHS.includes(i.path));
  const moreHasActive = parentMore.some(isItemActive);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const renderParentNav = () => (
    <nav aria-label={parentText.shell.navigation} className="space-y-1">
      {parentPrimary.map(renderNavItem)}
      <button
        type="button"
        onClick={() => setIsMoreOpen((open) => !open)}
        aria-expanded={isMoreOpen || moreHasActive}
        className="w-full flex items-center justify-between gap-3 px-3 min-h-[44px] rounded-2xl text-base font-semibold text-mq-text-muted hover:bg-mq-surface-soft hover:text-mq-primary cursor-pointer"
      >
        <span>{parentText.nav.more}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isMoreOpen || moreHasActive ? 'rotate-180' : ''}`}
        />
      </button>
      {(isMoreOpen || moreHasActive) && <div className="space-y-1 pl-2">{parentMore.map(renderNavItem)}</div>}
    </nav>
  );

  const renderNavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-4 space-y-6">
      {/* Role & User Indicator Card */}
      <div className="p-3.5 bg-mq-surface-blue/70 border border-mq-primary/20 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-mq-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {role === 'parent' ? '👨‍👧' : '👩‍🏫'}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`${isParent ? 'text-sm' : 'text-xs'} font-bold text-mq-text-strong truncate`}>
              {user?.fullName || (isParent ? parentText.shell.parentAccount : 'Teacher Account')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-mq-success shrink-0" />
              <span className={`${isParent ? 'text-xs' : 'text-[11px] capitalize'} font-semibold text-mq-primary`}>
                {isParent ? parentText.shell.signedIn : `${role} Portal Active`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      {isParent ? renderParentNav() : (
      <div className="space-y-5">
        {groups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.id];

          return (
            <div key={group.id} className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-2 py-1 font-bold text-mq-text-muted hover:text-mq-primary transition-colors cursor-pointer ${
                  isParent ? 'text-xs' : 'text-[11px] uppercase tracking-wider'
                }`}
                aria-expanded={!isCollapsed}
              >
                <span>{groupTitle(group)}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {!isCollapsed && (
                <div className="space-y-1">
                  {group.items.map(renderNavItem)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Research Component Info Footer */}
      <div className="mt-auto pt-4 border-t border-mq-border/80">
        <div className="p-3 bg-mq-surface-soft rounded-2xl border border-mq-border/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-mq-primary-dark mb-1">
            <ShieldCheck size={14} className="text-mq-secondary" />
            <span>{isParent ? parentText.shell.footerTitle : 'MathQuest Research'}</span>
          </div>
          <p className={`${isParent ? 'text-xs leading-relaxed' : 'text-[11px] leading-tight'} text-mq-text-muted`}>
            {isParent
              ? parentText.shell.footerText
              : 'Adaptive Sinhala math learning platform for children with ADHD support needs.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================= */}
      {/* 1. Desktop Persistent Sidebar                             */}
      {/* ========================================================= */}
      <aside
        className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-mq-border shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30"
        aria-label={isParent ? parentText.shell.navigation : 'Teacher Dashboard Navigation'}
      >
        {renderNavContent()}
      </aside>

      {/* ========================================================= */}
      {/* 2. Mobile & Tablet Slide-over Drawer Backdrop             */}
      {/* ========================================================= */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-mq-text-strong/40 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ========================================================= */}
      {/* 3. Mobile & Tablet Slide-over Drawer                      */}
      {/* ========================================================= */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl border-r border-mq-border flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={isParent ? parentText.shell.navigation : 'Teacher Navigation Drawer'}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-mq-border bg-mq-surface-soft/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base">
              <span className="text-mq-primary-dark">Math</span>
              <span className="text-mq-secondary">Quest</span>
            </span>
            <span
              className={`${isParent ? 'text-xs' : 'text-[10px] uppercase tracking-wider'} font-bold px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary`}
            >
              {portalLabel}
            </span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface transition-colors cursor-pointer"
            aria-label={isParent ? parentText.shell.closeMenu : 'Close navigation sidebar'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-hidden">{renderNavContent()}</div>
      </div>
    </>
  );
};

export default DashboardSidebar;

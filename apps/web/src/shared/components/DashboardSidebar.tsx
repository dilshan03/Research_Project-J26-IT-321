import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  PARENT_NAV_GROUPS,
  TEACHER_NAV_GROUPS,
  type NavGroupConfig,
  type NavItemConfig,
} from './sidebar/sidebarConfig';
import { useAuth } from '../../features/auth/hooks/useAuth';

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
  const groups: NavGroupConfig[] =
    role === 'parent' ? PARENT_NAV_GROUPS : TEACHER_NAV_GROUPS;

  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Close mobile drawer on route change
  useEffect(() => {
    onCloseMobile();
  }, [location.pathname, onCloseMobile]);

  // Handle escape key on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (item: NavItemConfig) => {
    if (item.path === `/${role}/dashboard`) {
      return location.pathname === item.path;
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-4 space-y-6">
      {/* Role & User Indicator Card */}
      <div className="p-3.5 bg-mq-surface-blue/70 border border-mq-primary/20 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-mq-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {role === 'parent' ? '👨‍👧' : '👩‍🏫'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-mq-text-strong truncate">
              {user?.fullName || (role === 'parent' ? 'Parent Account' : 'Teacher Account')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-mq-success"></span>
              <span className="text-[11px] font-semibold text-mq-primary capitalize">
                {role} Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="space-y-5">
        {groups.map((group) => {
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
                    const active = isItemActive(item);
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 ${
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

                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-mq-surface-blue text-mq-primary'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Research Component Info Footer */}
      <div className="mt-auto pt-4 border-t border-mq-border/80">
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

  return (
    <>
      {/* ========================================================= */}
      {/* 1. Desktop Persistent Sidebar                             */}
      {/* ========================================================= */}
      <aside
        className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-mq-border shrink-0 sticky top-[61px] h-[calc(100vh-61px)] z-30"
        aria-label={`${role === 'parent' ? 'Parent' : 'Teacher'} Dashboard Navigation`}
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
        aria-label={`${role === 'parent' ? 'Parent' : 'Teacher'} Navigation Drawer`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-mq-border bg-mq-surface-soft/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base">
              <span className="text-mq-primary-dark">Math</span>
              <span className="text-mq-secondary">Quest</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary">
              {role}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface transition-colors"
            aria-label="Close navigation sidebar"
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

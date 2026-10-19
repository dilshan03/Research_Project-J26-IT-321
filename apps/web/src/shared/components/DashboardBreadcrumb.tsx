import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getRouteMeta } from './sidebar/sidebarConfig';
import { parentText } from '../i18n/parentText';
import { PARENT_ROUTE_LABELS } from '../i18n/parentNav';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface DashboardBreadcrumbProps {
  role: 'parent' | 'teacher';
  items?: BreadcrumbItem[];
}

export const DashboardBreadcrumb: React.FC<DashboardBreadcrumbProps> = ({ role, items }) => {
  const location = useLocation();

  const getAutoItems = (): BreadcrumbItem[] => {
    const rootPath = `/${role}/dashboard`;
    const isParent = role === 'parent';
    const rootLabel = isParent ? parentText.nav.portal : 'Teacher Dashboard';

    // Special handling for canonical /learners
    if (role === 'parent' && (location.pathname === '/learners' || location.pathname.startsWith('/parent/dashboard/children'))) {
      return [
        { label: rootLabel, path: rootPath },
        { label: parentText.nav.myChildren },
      ];
    }

    // Special handling for onboarding
    if (role === 'parent' && location.pathname.includes('/onboarding')) {
      return [
        { label: rootLabel, path: rootPath },
        { label: parentText.nav.myChildren, path: '/learners' },
        { label: parentText.nav.onboarding },
      ];
    }

    const pathAfterRoot = location.pathname.replace(rootPath, '').replace(/^\//, '');

    const autoItems: BreadcrumbItem[] = [
      { label: rootLabel, path: pathAfterRoot ? rootPath : undefined },
    ];

    if (!pathAfterRoot) {
      return autoItems;
    }

    const segments = pathAfterRoot.split('/');
    let accumulatedPath = rootPath;

    segments.forEach((seg, idx) => {
      accumulatedPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const meta = getRouteMeta(role, accumulatedPath);
      const title =
        (isParent && PARENT_ROUTE_LABELS[accumulatedPath]) ||
        meta.breadcrumbLabel ||
        meta.title ||
        seg.charAt(0).toUpperCase() + seg.slice(1);

      autoItems.push({
        label: title,
        path: isLast ? undefined : accumulatedPath,
      });
    });

    return autoItems;
  };

  const breadcrumbs = items || getAutoItems();

  return (
    <nav
      aria-label={role === 'parent' ? parentText.shell.breadcrumb : 'Dashboard Breadcrumb'}
      className={`py-1 px-0.5 text-mq-text-muted ${role === 'parent' ? 'text-sm' : 'text-xs'}`}
    >
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
        <li className="inline-flex items-center">
          <Link
            to={role === 'parent' ? '/parent/dashboard' : '/teacher/dashboard'}
            className="inline-flex items-center gap-1 text-mq-text-muted hover:text-mq-primary transition-colors"
            title={role === 'parent' ? parentText.shell.home : 'Dashboard Home'}
          >
            <Home size={14} />
            <span className="sr-only">{role === 'parent' ? parentText.shell.home : 'Home'}</span>
          </Link>
        </li>

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-1.5 sm:gap-2">
              <ChevronRight size={12} className="text-mq-border-strong shrink-0" />
              {crumb.path && !isLast ? (
                <Link
                  to={crumb.path}
                  className="hover:text-mq-primary font-medium transition-colors truncate max-w-[140px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-bold text-mq-text truncate max-w-[180px] sm:max-w-none">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default DashboardBreadcrumb;

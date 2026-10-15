import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface DashboardBreadcrumbProps {
  role: 'parent' | 'teacher';
  items?: BreadcrumbItem[];
}

export const DashboardBreadcrumb: React.FC<DashboardBreadcrumbProps> = ({ role, items }) => {
  const location = useLocation();

  const getAutoItems = (): BreadcrumbItem[] => {
    const rootPath = `/${role}/dashboard`;
    const rootLabel = role === 'parent' ? 'Parent Dashboard' : 'Teacher Dashboard';

    const pathAfterRoot = location.pathname.replace(rootPath, '').replace(/^\//, '');

    const autoItems: BreadcrumbItem[] = [
      { label: rootLabel, path: pathAfterRoot ? rootPath : undefined },
    ];

    if (!pathAfterRoot) {
      return autoItems;
    }

    const segments = pathAfterRoot.split('/');
    const routeTitles: Record<string, string> = {
      children: 'My Children',
      learners: 'My Learners',
      'learner-profiles': 'Learner Profiles',
      assessments: 'Onboarding & Assessments',
      progress: role === 'parent' ? 'Learning Progress' : 'Class Progress',
      recommendations: role === 'parent' ? 'Personalized Recommendations' : 'Teaching Recommendations',
      activities: 'Learning Activities',
      behaviour: 'Behaviour Insights',
      reports: 'Reports',
      settings: 'Settings',
    };

    let accumulatedPath = rootPath;
    segments.forEach((seg, idx) => {
      accumulatedPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const title = routeTitles[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      autoItems.push({
        label: title,
        path: isLast ? undefined : accumulatedPath,
      });
    });

    return autoItems;
  };

  const breadcrumbs = items || getAutoItems();

  return (
    <nav aria-label="Dashboard Breadcrumb" className="py-2 px-1 text-xs sm:text-sm text-mq-text-muted">
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
        <li className="inline-flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-mq-text-muted hover:text-mq-primary transition-colors"
          >
            <Home size={14} />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-1.5 sm:gap-2">
              <ChevronRight size={13} className="text-mq-border-strong shrink-0" />
              {crumb.path && !isLast ? (
                <Link
                  to={crumb.path}
                  className="hover:text-mq-primary font-medium transition-colors truncate max-w-[150px] sm:max-w-none"
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

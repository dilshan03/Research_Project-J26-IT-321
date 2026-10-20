import { parentText } from './parentText';

/** Parent-portal labels keyed by route path (sidebar items and breadcrumbs). */
export const PARENT_ROUTE_LABELS: Record<string, string> = {
  '/parent/dashboard': parentText.nav.overview,
  '/learners': parentText.nav.myChildren,
  '/parent/dashboard/children': parentText.nav.myChildren,
  '/parent/dashboard/learner-profiles': parentText.nav.learnerProfiles,
  '/parent/dashboard/assessments': parentText.nav.assessments,
  '/parent/dashboard/progress': parentText.nav.progress,
  '/parent/dashboard/recommendations': parentText.nav.recommendations,
  '/parent/dashboard/activities': parentText.nav.activities,
  '/parent/dashboard/behaviour': parentText.nav.behaviour,
  '/parent/dashboard/support-info': parentText.nav.supportInfo,
  '/parent/dashboard/settings': parentText.nav.settings,
};

/** Parent-portal sidebar group titles keyed by group id. */
export const PARENT_GROUP_TITLES: Record<string, string> = {
  'parent-main': parentText.nav.groupMain,
  'parent-analytics': parentText.nav.groupLearning,
  'parent-settings': parentText.nav.groupAccount,
};

/**
 * The five main parent destinations. All other existing parent pages stay reachable
 * under "More" in the sidebar and the mobile menu; no route is removed.
 */
export const PARENT_PRIMARY_PATHS = [
  '/parent/dashboard',
  '/learners',
  '/parent/dashboard/learner-profiles',
  '/parent/dashboard/recommendations',
  '/parent/dashboard/settings',
];

/** Mobile bottom navigation (four destinations plus "More", which opens the full menu). */
export const PARENT_BOTTOM_NAV = [
  { path: '/parent/dashboard', label: parentText.nav.short.home },
  { path: '/learners', label: parentText.nav.short.children },
  { path: '/parent/dashboard/learner-profiles', label: parentText.nav.short.profiles },
  { path: '/parent/dashboard/recommendations', label: parentText.nav.short.tips },
];

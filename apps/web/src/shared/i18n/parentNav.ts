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
  '/parent/dashboard/settings': parentText.nav.settings,
};

/** Parent-portal sidebar group titles keyed by group id. */
export const PARENT_GROUP_TITLES: Record<string, string> = {
  'parent-main': parentText.nav.groupMain,
  'parent-analytics': parentText.nav.groupLearning,
  'parent-settings': parentText.nav.groupAccount,
};

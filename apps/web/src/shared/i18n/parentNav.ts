import { parentText } from './parentText';

/*
 * Labels are getters so they are read at render time and follow the global language switch
 * (a plain value would be fixed to the language active when this module loaded).
 */

/** Parent-portal labels keyed by route path (sidebar items and breadcrumbs). */
export const PARENT_ROUTE_LABELS: Record<string, string> = {
  get '/parent/dashboard'() { return parentText.nav.overview; },
  get '/learners'() { return parentText.nav.myChildren; },
  get '/parent/dashboard/children'() { return parentText.nav.myChildren; },
  get '/parent/dashboard/learner-profiles'() { return parentText.nav.learnerProfiles; },
  get '/parent/dashboard/assessments'() { return parentText.nav.assessments; },
  get '/parent/dashboard/progress'() { return parentText.nav.progress; },
  get '/parent/dashboard/recommendations'() { return parentText.nav.recommendations; },
  get '/parent/dashboard/activities'() { return parentText.nav.activities; },
  get '/parent/dashboard/behaviour'() { return parentText.nav.behaviour; },
  get '/parent/dashboard/support-info'() { return parentText.nav.supportInfo; },
  get '/parent/dashboard/settings'() { return parentText.nav.settings; },
};

/** Parent-portal sidebar group titles keyed by group id. */
export const PARENT_GROUP_TITLES: Record<string, string> = {
  get 'parent-main'() { return parentText.nav.groupMain; },
  get 'parent-analytics'() { return parentText.nav.groupLearning; },
  get 'parent-settings'() { return parentText.nav.groupAccount; },
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
export const PARENT_BOTTOM_NAV: Array<{ path: string; readonly label: string }> = [
  { path: '/parent/dashboard', get label() { return parentText.nav.short.home; } },
  { path: '/learners', get label() { return parentText.nav.short.children; } },
  { path: '/parent/dashboard/learner-profiles', get label() { return parentText.nav.short.profiles; } },
  { path: '/parent/dashboard/recommendations', get label() { return parentText.nav.short.tips; } },
];

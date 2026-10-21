import type { UserRole } from '../../features/auth/types';

/**
 * Role-based navigation for the public navbar, its mobile menu and the profile dropdown.
 * Paths are the existing routes in App.tsx; nothing here adds or removes a route.
 *
 * Students have no account: children play through a signed-in parent's or teacher's account
 * (e.g. a parent opens the child's dashboard from "My Children").
 */

export type NavIcon = 'home' | 'features' | 'how' | 'about' | 'contact' | 'dashboard' | 'children' | 'progress' | 'recommendations' | 'profile' | 'profiles';

export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
  /** Extra path prefixes that should also highlight this item. */
  activePrefixes?: string[];
  /** Exact match only (dashboard home pages). */
  exact?: boolean;
}

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Home', to: '/', icon: 'home', exact: true },
  { label: 'Features', to: '/#features', icon: 'features' },
  { label: 'How It Works', to: '/#how-it-works', icon: 'how' },
  { label: 'About', to: '/#about', icon: 'about' },
  { label: 'Contact', to: '/#contact', icon: 'contact' },
];

export const PARENT_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/parent/dashboard', icon: 'dashboard', exact: true },
  { label: 'My Children', to: '/learners', icon: 'children', activePrefixes: ['/parent/dashboard/children'] },
  { label: 'Progress', to: '/parent/dashboard/progress', icon: 'progress' },
  { label: 'Recommendations', to: '/parent/dashboard/recommendations', icon: 'recommendations' },
  { label: 'Profile', to: '/parent/dashboard/settings', icon: 'profile', activePrefixes: ['/profile'] },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/teacher/dashboard', icon: 'dashboard', exact: true },
  { label: 'My Students', to: '/teacher/dashboard/learners', icon: 'children' },
  { label: 'Learner Profiles', to: '/teacher/dashboard/learner-profiles', icon: 'profiles' },
  { label: 'Progress', to: '/teacher/dashboard/progress', icon: 'progress' },
  { label: 'Profile', to: '/teacher/dashboard/settings', icon: 'profile', activePrefixes: ['/profile'] },
];

/** Links for the navbar: role links for parents and teachers; public links for visitors and admins. */
export const navItemsFor = (role: UserRole | undefined, isAuthenticated: boolean): NavItem[] => {
  if (isAuthenticated && role === 'parent') return PARENT_NAV;
  if (isAuthenticated && role === 'teacher') return TEACHER_NAV;
  return PUBLIC_NAV;
};

/** Whether a nav item matches the current location (hash links match only on the home page with that hash). */
export const isNavItemActive = (item: NavItem, pathname: string, hash: string): boolean => {
  const [path, anchor] = item.to.split('#');
  if (anchor !== undefined) return pathname === (path || '/') && hash === `#${anchor}`;
  if (item.exact) return pathname === item.to && (item.to !== '/' || !hash);
  return [item.to, ...(item.activePrefixes ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

/** Shown wherever visitors might look for a student login. */
export const STUDENT_ACCESS_NOTE =
  'Students do not need their own login. Children play MathQuest through a parent or teacher account.';

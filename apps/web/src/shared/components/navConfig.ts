import type { UserRole } from '../../features/auth/types';
import { publicText } from '../i18n/publicText';

/**
 * Role-based navigation for the public navbar, its mobile menu and the profile dropdown.
 * Paths are the existing routes in App.tsx; nothing here adds or removes a route.
 *
 * Students have no account: children play through a signed-in parent's or teacher's account
 * (e.g. a parent opens the child's dashboard from "My Children").
 */

export type NavIcon = 'home' | 'features' | 'how' | 'about' | 'contact' | 'dashboard' | 'children' | 'progress' | 'recommendations' | 'profile' | 'profiles';

export interface NavItem {
  /** Read at render time (follows the global language switch). */
  readonly label: string;
  to: string;
  icon: NavIcon;
  /** Extra path prefixes that should also highlight this item. */
  activePrefixes?: string[];
  /** Exact match only (dashboard home pages). */
  exact?: boolean;
}

export const PUBLIC_NAV: NavItem[] = [
  { get label() { return publicText.nav.home; }, to: '/', icon: 'home', exact: true },
  { get label() { return publicText.nav.features; }, to: '/#features', icon: 'features' },
  { get label() { return publicText.nav.howItWorks; }, to: '/#how-it-works', icon: 'how' },
  { get label() { return publicText.nav.about; }, to: '/#about', icon: 'about' },
  { get label() { return publicText.nav.contact; }, to: '/#contact', icon: 'contact' },
];

export const PARENT_NAV: NavItem[] = [
  { get label() { return publicText.nav.dashboard; }, to: '/parent/dashboard', icon: 'dashboard', exact: true },
  { get label() { return publicText.nav.myChildren; }, to: '/learners', icon: 'children', activePrefixes: ['/parent/dashboard/children'] },
  { get label() { return publicText.nav.progress; }, to: '/parent/dashboard/progress', icon: 'progress' },
  { get label() { return publicText.nav.recommendations; }, to: '/parent/dashboard/recommendations', icon: 'recommendations' },
  { get label() { return publicText.nav.profile; }, to: '/parent/dashboard/settings', icon: 'profile', activePrefixes: ['/profile'] },
];

export const TEACHER_NAV: NavItem[] = [
  { get label() { return publicText.nav.dashboard; }, to: '/teacher/dashboard', icon: 'dashboard', exact: true },
  { get label() { return publicText.nav.myStudents; }, to: '/teacher/dashboard/learners', icon: 'children' },
  { get label() { return publicText.nav.learnerProfiles; }, to: '/teacher/dashboard/learner-profiles', icon: 'profiles' },
  { get label() { return publicText.nav.progress; }, to: '/teacher/dashboard/progress', icon: 'progress' },
  { get label() { return publicText.nav.profile; }, to: '/teacher/dashboard/settings', icon: 'profile', activePrefixes: ['/profile'] },
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

/** Shown wherever visitors might look for a student login (current language). */
export const studentAccessNote = (): string => publicText.studentNote;

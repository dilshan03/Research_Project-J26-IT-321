import type { UserRole } from './types';

/** Home dashboard for each role. */
export const dashboardPathFor = (role: UserRole | undefined): string =>
  role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard';

export const dashboardNameFor = (role: UserRole | undefined): string =>
  role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Parent';

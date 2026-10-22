/**
 * Read-only admin API (learner-profile-service /api/v1/admin). Every call is audit-logged
 * server-side; requests from non-admin accounts are refused with 403.
 */
const API_BASE_URL =
  (import.meta.env.VITE_LEARNER_PROFILE_API_URL as string | undefined) || 'http://localhost:5001';
const ADMIN = `${API_BASE_URL}/api/v1/admin`;

export type Json = Record<string, unknown>;

export interface AdminResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const get = async <T>(url: string, withCredentials = true): Promise<AdminResult<T>> => {
  try {
    const res = await fetch(url, { credentials: withCredentials ? 'include' : 'omit' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.detail || body.message || `Request failed (${res.status})` };
    return { ok: true, data: (body.data ?? body) as T };
  } catch {
    return { ok: false, error: 'Service unavailable.' };
  }
};

export interface AdminOverview {
  usersByRole: Record<string, number>;
  learnersTotal: number;
  learnersArchived: number;
  learnersByOnboardingStatus: Record<string, number>;
  assessmentsTotal: number;
  gameplayEventsTotal: number;
  deletionRequestsTotal: number;
}

export interface AdminUser {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  username?: string;
  createdAt?: string;
  childCount?: number;
}

export interface AdminLearnerRow {
  learnerId: string;
  pseudonym: string;
  firstName?: string;
  grade?: number;
  age?: number;
  onboardingStatus?: string;
  isArchived: boolean;
  createdAt?: string;
  parentId: string;
  parentName?: string;
  parentEmail?: string;
  hasAssessment: boolean;
}

export interface AdminLearnerDetail {
  pseudonym: string;
  learner: Json;
  parent: AdminUser | null;
  onboardingProgress: Json | null;
  questionnaires: Json;
  sensitiveParentReports: {
    available: Record<string, boolean>;
    included: boolean;
    adhdInformation?: Json | null;
    snapIv?: Json | null;
    snapIvHistory?: Json[] | null;
  };
  assessments: Json[];
  elpxProfile: Json | null;
  gameplayEvents: { total: number; recent: Json[] };
  deletionRequests: Json[];
}

export const adminApi = {
  overview: () => get<AdminOverview>(`${ADMIN}/overview`),
  users: (role?: string) => get<AdminUser[]>(`${ADMIN}/users${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  learners: () => get<AdminLearnerRow[]>(`${ADMIN}/learners`),
  learner: (learnerId: string, includeSensitive = false) =>
    get<AdminLearnerDetail>(
      `${ADMIN}/learners/${encodeURIComponent(learnerId)}${includeSensitive ? '?include_sensitive=true' : ''}`
    ),
  auditLog: (limit = 100) => get<Json[]>(`${ADMIN}/audit-log?limit=${limit}`),

  /**
   * Other components' existing read endpoints (pedagogical engine telemetry), read-only.
   * These are served by a teammate's service and are not covered by the admin audit log.
   */
  otherComponents: async (parentId: string, learnerId: string) => {
    const q = new URLSearchParams({ parentId, studentId: learnerId, learnerId });
    const [progress, learnerState, interactions] = await Promise.all([
      get<Json>(`/api/telemetry/student-progress?${q}`, false),
      get<Json>(`/api/telemetry/learner-state?${q}`, false),
      get<Json>(`/api/telemetry/interactions?${q}&limit=50`, false),
    ]);
    return { progress, learnerState, interactions };
  },
};

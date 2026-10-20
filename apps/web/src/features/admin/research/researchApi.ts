/**
 * Read-only research analytics API (learner-profile-service /api/v1/admin/research).
 * The server enforces the admin role AND researchAnalyticsAccess on every call; data reads are audit-logged.
 * There is deliberately no prediction call here.
 */
import type { AdminResult } from '../services/adminApi';
import type { LiveSummary, ResearchComponentDetail, ResearchComponentSummary } from './types';

const API_BASE_URL =
  (import.meta.env.VITE_LEARNER_PROFILE_API_URL as string | undefined) || 'http://localhost:5001';
const RESEARCH = `${API_BASE_URL}/api/v1/admin/research`;

export interface ResearchResult<T> extends AdminResult<T> {
  status?: number;
}

const get = async <T>(url: string): Promise<ResearchResult<T>> => {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: body.detail || body.message || `Request failed (${res.status})` };
    return { ok: true, status: res.status, data: (body.data ?? body) as T };
  } catch {
    return { ok: false, error: 'Service unavailable.' };
  }
};

export const researchApi = {
  access: () => get<{ granted: boolean }>(`${RESEARCH}/access`),
  components: () => get<ResearchComponentSummary[]>(`${RESEARCH}/components`),
  component: (id: string) => get<ResearchComponentDetail>(`${RESEARCH}/components/${encodeURIComponent(id)}`),
  learnerProfileLiveSummary: () => get<LiveSummary>(`${RESEARCH}/learner-profile/live-summary`),
};

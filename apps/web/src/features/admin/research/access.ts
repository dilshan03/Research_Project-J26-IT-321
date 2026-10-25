/**
 * Pure access and routing helpers for Research & Model Analytics (unit-tested in tests/admin-research).
 * Frontend checks are for usability only; the server enforces admin role + researchAnalyticsAccess.
 */

export type ResearchAccess = 'loading' | 'granted' | 'denied' | 'unavailable';

/** Maps the /admin/research/access response to an access state. Only HTTP 200 with granted=true grants access. */
export const accessFromResponse = (res: { ok: boolean; status?: number; data?: { granted?: unknown } }): ResearchAccess => {
  if (res.ok && res.data?.granted === true) return 'granted';
  if (res.status === 401 || res.status === 403 || res.ok) return 'denied';
  return 'unavailable';
};

/** Admins only ask the server; any other role is denied without a request. */
export const shouldCheckResearchAccess = (role: string | undefined): boolean => role === 'admin';

export const LEARNER_PROFILE_TABS = ['overview', 'models', 'explainability', 'recommendations', 'evaluation', 'imlr-demo'] as const;
export type LearnerProfileTab = (typeof LEARNER_PROFILE_TABS)[number];

export const TAB_LABELS: Record<LearnerProfileTab, string> = {
  overview: 'Overview',
  models: 'Models & Predictions',
  explainability: 'Explainability',
  recommendations: 'Recommendations',
  evaluation: 'Evaluation',
  'imlr-demo': 'IMLR Prototype Demo',
};

/** Unknown or missing tab segments fall back to the overview. */
export const parseTab = (tab: string | undefined): LearnerProfileTab =>
  (LEARNER_PROFILE_TABS as readonly string[]).includes(tab ?? '') ? (tab as LearnerProfileTab) : 'overview';

export const researchPath = (componentId?: string, tab?: string): string =>
  componentId ? `/admin/research/${encodeURIComponent(componentId)}${tab && tab !== 'overview' ? `/${tab}` : ''}` : '/admin/research';

import type {
  BlueprintEnvelope, BlueprintStatus, GenerateBlueprintRequest, SampleQuestion,
} from './types';

const BASE =
  (import.meta.env.VITE_CONTENT_API_URL as string | undefined) ?? 'http://localhost:8003';
const API = `${BASE}/api/v1/adaptations`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const contentAdaptationApi = {
  sampleQuestions: () => request<SampleQuestion[]>('/sample-questions'),
  generate: (body: GenerateBlueprintRequest) =>
    request<BlueprintEnvelope>('/blueprints', { method: 'POST', body: JSON.stringify(body) }),
  list: (status?: BlueprintStatus) =>
    request<BlueprintEnvelope[]>(`/blueprints${status ? `?status=${status}` : ''}`),
  get: (id: string) => request<BlueprintEnvelope>(`/blueprints/${id}`),
  setStatus: (id: string, status: BlueprintStatus) =>
    request<BlueprintEnvelope>(`/blueprints/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
};

import type {
  AdaptProblemRequest,
  BlueprintEnvelope,
  BlueprintStatus,
  CognitiveLoadPreviewResponse,
  CurriculumProblem,
  DocumentUploadResponse,
  GenerateBlueprintRequest,
  SampleQuestion,
  SeedSyllabiResponse,
  SyllabusDocument,
  TuneBlueprintRequest,
} from './types';

const BASE =
  (import.meta.env.VITE_CONTENT_API_URL as string | undefined) ?? 'http://localhost:8003';
const ADAPTATIONS_API = `${BASE}/api/v1/adaptations`;
const SYLLABUS_API = `${BASE}/api/v1/syllabus`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
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
  // Legacy / Direct Adaptation endpoints
  sampleQuestions: () => request<SampleQuestion[]>(`${ADAPTATIONS_API}/sample-questions`),
  generate: (body: GenerateBlueprintRequest) =>
    request<BlueprintEnvelope>(`${ADAPTATIONS_API}/blueprints`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  list: (status?: BlueprintStatus) =>
    request<BlueprintEnvelope[]>(`${ADAPTATIONS_API}/blueprints${status ? `?status=${status}` : ''}`),
  get: (id: string) => request<BlueprintEnvelope>(`${ADAPTATIONS_API}/blueprints/${id}`),
  setStatus: (id: string, status: BlueprintStatus) =>
    request<BlueprintEnvelope>(`${ADAPTATIONS_API}/blueprints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Multi-Grade Syllabus Ingestion and Extraction Endpoints
  uploadSyllabus: async (
    file: File,
    grade: number,
    subject: string = 'Mathematics',
    year: number = 2024,
    language: string = 'si',
  ): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('grade', String(grade));
    formData.append('subject', subject);
    formData.append('year', String(year));
    formData.append('language', language);

    const res = await fetch(`${SYLLABUS_API}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = typeof body.detail === 'string' ? body.detail : `Upload failed (${res.status})`;
      throw new Error(detail);
    }
    return res.json();
  },

  listDocuments: (grade?: number) =>
    request<SyllabusDocument[]>(`${SYLLABUS_API}/documents${grade ? `?grade=${grade}` : ''}`),

  getDocument: (docId: string) =>
    request<SyllabusDocument>(`${SYLLABUS_API}/documents/${docId}`),

  /** Starts background extraction; poll `getDocument`/`listDocuments` for progress. */
  extractProblems: (docId: string) =>
    request<SyllabusDocument>(`${SYLLABUS_API}/documents/${docId}/extract`, {
      method: 'POST',
    }),

  listProblems: (params?: { grade?: number; topic?: string; doc_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.grade) sp.append('grade', String(params.grade));
    if (params?.topic) sp.append('topic', params.topic);
    if (params?.doc_id) sp.append('doc_id', params.doc_id);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<CurriculumProblem[]>(`${SYLLABUS_API}/problems${qs}`);
  },

  getProblem: (problemId: string) =>
    request<CurriculumProblem>(`${SYLLABUS_API}/problems/${problemId}`),

  adaptProblem: (problemId: string, body: AdaptProblemRequest) =>
    request<BlueprintEnvelope>(`${SYLLABUS_API}/problems/${problemId}/adapt`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  tuneBlueprint: (activityId: string, body: TuneBlueprintRequest) =>
    request<BlueprintEnvelope>(`${SYLLABUS_API}/blueprints/${activityId}/tune`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  previewCognitiveLoad: (rawSinhalaText: string, customSettings?: any, behaviorProfile?: any) =>
    request<CognitiveLoadPreviewResponse>(`${SYLLABUS_API}/cognitive-load/preview`, {
      method: 'POST',
      body: JSON.stringify({
        raw_sinhala_text: rawSinhalaText,
        custom_settings: customSettings,
        behavior_profile: behaviorProfile,
      }),
    }),

  seedLocalSyllabi: () =>
    request<SeedSyllabiResponse>(`${SYLLABUS_API}/seed-local`, {
      method: 'POST',
    }),
};

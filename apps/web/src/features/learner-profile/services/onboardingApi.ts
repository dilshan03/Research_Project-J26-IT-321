import type {
  OnboardingProgress,
  AdhdInformationData,
  AdhdInformationRecord,
  SnapIvStatus,
  LearningPreferencesData,
  SnapIvItemAnswer,
  SnapIvScoreSummary,
  SocialContextData,
  MathQuestion,
  MathItemAnswer,
  MathAssessmentSummary,
  OnboardingFullSummary,
} from '../types/onboarding';

const API_BASE_URL =
  (import.meta.env.VITE_LEARNER_PROFILE_API_URL as string | undefined) ||
  'http://localhost:5001';

export interface OnboardingApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const onboardingApi = {
  /**
   * Retrieves or initializes the resumable onboarding state for a child.
   */
  async getProgress(learnerId: string): Promise<OnboardingApiResponse<OnboardingProgress>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to load progress', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Could not connect to onboarding service.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Saves child-friendly learning preferences (Step 1).
   */
  async savePreferences(
    learnerId: string,
    payload: LearningPreferencesData
  ): Promise<OnboardingApiResponse<{ nextStep: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/preferences`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to save preferences', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while saving preferences.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Saves the parent's answer about a professional ADHD diagnosis (Step 1).
   * Stored as unverified parent-reported information.
   */
  async saveAdhdInformation(
    learnerId: string,
    payload: AdhdInformationData
  ): Promise<OnboardingApiResponse<{ adhdInformation: AdhdInformationRecord; nextStep: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/adhd-information`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : 'Please check your answers.';
        return { success: false, message: detail, error: detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while saving ADHD information.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Skips the optional SNAP-IV questionnaire for now. Previously saved responses are kept.
   */
  async skipSnapIv(
    learnerId: string
  ): Promise<OnboardingApiResponse<{ snapIvStatus: SnapIvStatus; nextStep: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/snap-iv/skip`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to skip SNAP-IV', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while skipping SNAP-IV.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Submits the optional 18-item SNAP-IV questionnaire (Step 2).
   */
  async submitSnapIv(
    learnerId: string,
    responses: SnapIvItemAnswer[]
  ): Promise<OnboardingApiResponse<SnapIvScoreSummary>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/snap-iv`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'SNAP-IV-18-v1.0',
          responses,
          respondentRelation: 'parent',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to submit SNAP-IV', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while submitting SNAP-IV.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Saves optional social learning context (Step 3).
   */
  async saveSocialContext(
    learnerId: string,
    payload: SocialContextData
  ): Promise<OnboardingApiResponse<{ nextStep: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/social-context`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to save social context', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while saving social context.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Fetches grade-specific math questions for the child.
   */
  async getMathQuestions(learnerId: string): Promise<OnboardingApiResponse<MathQuestion[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/math-questions`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to load math questions', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while loading math questions.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Submits math baseline assessment answers (Step 5).
   */
  async submitMathAssessment(
    learnerId: string,
    grade: number,
    answers: MathItemAnswer[]
  ): Promise<OnboardingApiResponse<MathAssessmentSummary>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/math-assessment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'MATH-QB-v1.0',
          grade,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to submit math assessment', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while submitting assessment.', error: 'NETWORK_ERROR' };
    }
  },

  /**
   * Retrieves complete consolidated onboarding profile summary.
   */
  async getSummary(learnerId: string): Promise<OnboardingApiResponse<OnboardingFullSummary>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/learners/${learnerId}/onboarding/summary`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Failed to load onboarding summary', error: data.detail };
      }
      return data;
    } catch {
      return { success: false, message: 'Network error while loading summary.', error: 'NETWORK_ERROR' };
    }
  },
};

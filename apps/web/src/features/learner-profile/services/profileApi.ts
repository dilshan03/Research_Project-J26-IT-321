import type { ElpxProfile } from '../types/onboarding';

const API_BASE_URL =
  (import.meta.env.VITE_LEARNER_PROFILE_API_URL as string | undefined) ||
  'http://localhost:5001';

export interface ProfileApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const profileApi = {
  /**
   * Retrieves the versioned ELP-X learner profile including Beta-Binomial
   * estimated proficiencies, Bayesian credible intervals, and explainable recommendations.
   */
  async getProfile(
    learnerId: string,
    sanitized: boolean = false
  ): Promise<ProfileApiResponse<ElpxProfile>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/learners/${learnerId}/profile?sanitized=${sanitized}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to retrieve ELP-X learner profile.',
          error: data.detail,
        };
      }

      // The endpoint returns ElpxLearnerProfile directly as JSON
      return {
        success: true,
        message: 'Profile retrieved successfully.',
        data: data as ElpxProfile,
      };
    } catch {
      return {
        success: false,
        message: 'Could not connect to the Learner Profile Service.',
        error: 'SERVICE_UNAVAILABLE',
      };
    }
  },
};

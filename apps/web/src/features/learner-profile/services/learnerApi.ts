import type {
  Learner,
  CreateLearnerData,
  UpdateLearnerData,
  LearnerApiResponse,
} from '../types';

const API_BASE_URL =
  (import.meta.env.VITE_LEARNER_PROFILE_API_URL as string | undefined) ||
  'http://localhost:5001';

const LEARNERS_ENDPOINT = `${API_BASE_URL}/api/v1/learners`;

/**
 * Service for communicating with the FastAPI Learner Profile Service.
 * Automatically forwards HttpOnly session cookies via credentials: 'include'.
 */
export const learnerApi = {
  /**
   * Fetches all child learner profiles belonging to the authenticated parent.
   */
  async listLearners(): Promise<LearnerApiResponse<Learner[]>> {
    try {
      const response = await fetch(LEARNERS_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to retrieve learner profiles.',
          error: data.detail,
        };
      }
      return data;
    } catch {
      return {
        success: false,
        message: 'Could not connect to the Learner Profile Service. Please check if the service is running.',
        error: 'SERVICE_UNAVAILABLE',
      };
    }
  },

  /**
   * Retrieves a single child learner profile by learnerId.
   */
  async getLearner(learnerId: string): Promise<LearnerApiResponse<Learner>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to fetch learner details.',
          error: data.detail,
        };
      }
      return data;
    } catch {
      return {
        success: false,
        message: 'Could not connect to the Learner Profile Service.',
        error: 'SERVICE_UNAVAILABLE',
      };
    }
  },

  /**
   * Registers a new child learner under the authenticated parent.
   */
  async createLearner(
    payload: CreateLearnerData
  ): Promise<LearnerApiResponse<Learner>> {
    try {
      const response = await fetch(LEARNERS_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorDetail = data.detail;
        if (Array.isArray(data.detail)) {
          errorDetail = data.detail.map((d: { msg: string }) => d.msg).join(', ');
        }
        return {
          success: false,
          message: errorDetail || 'Failed to create child profile.',
          error: errorDetail,
        };
      }
      return data;
    } catch {
      return {
        success: false,
        message: 'Could not connect to the Learner Profile Service.',
        error: 'SERVICE_UNAVAILABLE',
      };
    }
  },

  /**
   * Updates an existing child profile.
   */
  async updateLearner(
    learnerId: string,
    payload: UpdateLearnerData
  ): Promise<LearnerApiResponse<Learner>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorDetail = data.detail;
        if (Array.isArray(data.detail)) {
          errorDetail = data.detail.map((d: { msg: string }) => d.msg).join(', ');
        }
        return {
          success: false,
          message: errorDetail || 'Failed to update child profile.',
          error: errorDetail,
        };
      }
      return data;
    } catch {
      return {
        success: false,
        message: 'Could not connect to the Learner Profile Service.',
        error: 'SERVICE_UNAVAILABLE',
      };
    }
  },
};

import type {
  Learner,
  CreateLearnerData,
  UpdateLearnerData,
  LearnerApiResponse,
  DeletionRequest,
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
   * Fetches child learner profiles belonging to the authenticated parent,
   * with optional filtering for active or archived status.
   */
  async listLearners(
    isArchived?: boolean,
    includeArchived?: boolean
  ): Promise<LearnerApiResponse<Learner[]>> {
    try {
      const params = new URLSearchParams();
      if (isArchived !== undefined) {
        params.append('is_archived', String(isArchived));
      }
      if (includeArchived !== undefined) {
        params.append('include_archived', String(includeArchived));
      }
      const queryString = params.toString();
      const url = queryString ? `${LEARNERS_ENDPOINT}?${queryString}` : LEARNERS_ENDPOINT;

      const response = await fetch(url, {
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

  /**
   * Safely archives an active child learner profile.
   */
  async archiveLearner(learnerId: string): Promise<LearnerApiResponse<Learner>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}/archive`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to archive learner profile.',
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
   * Restores an archived child learner profile back to active status.
   */
  async restoreLearner(learnerId: string): Promise<LearnerApiResponse<Learner>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to restore learner profile.',
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
   * Submits a formal request for permanent deletion review.
   */
  async requestPermanentDeletion(
    learnerId: string,
    reason?: string
  ): Promise<LearnerApiResponse<DeletionRequest>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}/deletion-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to submit deletion request.',
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
   * Retrieves deletion request status for a specific learner.
   */
  async getDeletionRequest(
    learnerId: string
  ): Promise<LearnerApiResponse<DeletionRequest>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/${learnerId}/deletion-request`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to retrieve deletion request status.',
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
   * Lists all deletion requests submitted by the authenticated parent.
   */
  async listDeletionRequests(): Promise<LearnerApiResponse<DeletionRequest[]>> {
    try {
      const response = await fetch(`${LEARNERS_ENDPOINT}/deletion-requests`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to retrieve deletion requests.',
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
};


import type { SignInCredentials, SignUpData, ForgotPasswordRequest, AuthResponse, User, UpdateProfileData } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '';

export const AUTH_API_ENDPOINTS = {
  SIGN_IN: `${API_BASE_URL}/api/auth/sign-in`,
  SIGN_UP: `${API_BASE_URL}/api/auth/sign-up`,
  SESSION: `${API_BASE_URL}/api/auth/session`,
  SIGN_OUT: `${API_BASE_URL}/api/auth/sign-out`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/auth/profile`,
};

/**
 * Service handling real Authentication API calls with MongoDB Atlas backend.
 * Uses credentials: 'include' for secure HTTP-only cookie session handling.
 */
export const authService = {
  /**
   * Authenticates user against MongoDB Atlas backend.
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse<{ user: User }>> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SIGN_IN, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || 'Sign in successful.',
          data: data.data || data,
        };
      }

      const errorData = await response.json().catch(() => ({
        message: `Authentication failed (HTTP ${response.status}).`,
      }));

      return {
        success: false,
        message: errorData.message || errorData.error?.message || 'Authentication failed.',
        error: errorData.error || { message: errorData.message || 'Authentication failed.' },
      };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to the authentication server. Please ensure the backend is running.',
        error: { message: 'Connection to authentication service failed.' },
      };
    }
  },

  /**
   * Registers a new account in MongoDB Atlas.
   */
  async signUp(data: SignUpData): Promise<AuthResponse<{ user: User }>> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SIGN_UP, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: data.role,
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          acceptedTerms: data.acceptedTerms,
        }),
      });

      if (response.ok) {
        const resultData = await response.json();
        return {
          success: true,
          message: resultData.message || 'Account created successfully.',
          data: resultData.data || resultData,
        };
      }

      const errorData = await response.json().catch(() => ({
        message: `Registration failed (HTTP ${response.status}).`,
      }));

      return {
        success: false,
        message: errorData.message || errorData.error?.message || 'Registration failed.',
        error: errorData.error || { message: errorData.message || 'Registration failed.' },
      };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to the authentication server. Please ensure the backend is running.',
        error: { message: 'Connection to authentication service failed.' },
      };
    }
  },

  /**
   * Verifies existing active session with MongoDB Atlas using HttpOnly session cookie.
   */
  async getSession(): Promise<AuthResponse<{ user: User }>> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SESSION, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || 'Session verified.',
          data: data.data || data,
        };
      }

      return {
        success: false,
        message: 'No active session.',
      };
    } catch {
      return {
        success: false,
        message: 'Unable to verify session with authentication server.',
      };
    }
  },

  /**
   * Signs out from the backend by invalidating session in MongoDB and clearing cookies.
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SIGN_OUT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: data.message || 'Signed out successfully.',
        };
      }
    } catch {
      // Offline fallback: client state will still be cleared
    }

    return {
      success: true,
      message: 'Signed out.',
    };
  },

  /**
   * Requests password reset link. Returns accurate error state if endpoint is unavailable.
   */
  async requestPasswordReset(data: ForgotPasswordRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        return { success: true, message: 'Password reset instructions sent.' };
      }

      if (response.status === 404) {
        return {
          success: false,
          message: 'Backend password reset service (/api/auth/forgot-password) is not currently implemented on the server.',
        };
      }

      const errorData = await response.json().catch(() => ({ message: 'Password reset request failed.' }));
      return { success: false, message: errorData.message || 'Password reset request failed.' };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to the authentication server.',
      };
    }
  },

  /**
   * Updates user profile on the backend.
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<AuthResponse<User>> {
    try {
      const response = await fetch(AUTH_API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: 'Profile updated successfully.',
          data: result.user || result.data || result,
        };
      }

      if (response.status !== 404) {
        const errorData = await response.json().catch(() => ({
          message: `Profile update failed (HTTP ${response.status}).`,
        }));
        return {
          success: false,
          message: errorData.message || 'Profile update failed.',
        };
      }
    } catch {
      // Backend microservice offline or network unreachable
    }

    return {
      success: false,
      message: 'Backend profile update endpoint (/api/auth/profile) is not currently available or offline. Profile changes could not be persisted to the server.',
    };
  },
};

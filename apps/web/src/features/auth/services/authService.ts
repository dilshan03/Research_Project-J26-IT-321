import type { SignInCredentials, SignUpData, ForgotPasswordRequest, AuthResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '';

export const AUTH_API_ENDPOINTS = {
  SIGN_IN: `${API_BASE_URL}/api/auth/sign-in`,
  SIGN_UP: `${API_BASE_URL}/api/auth/sign-up`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
};

/**
 * Service handling Authentication API calls.
 * Attempts real backend endpoints when available, with smooth development mode fallbacks when offline.
 */
export const authService = {
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SIGN_IN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, message: 'Sign in successful.', data };
      }

      if (response.status !== 404) {
        const errorData = await response.json().catch(() => ({ message: `Authentication failed (HTTP ${response.status}).` }));
        return { success: false, message: errorData.message || 'Authentication failed.' };
      }
    } catch {
      // Fallback to standalone dev mode below
    }

    // Development mode fallback when backend microservice is offline / returns 404
    return {
      success: true,
      message: 'Sign in successful! (Development Mode)',
      data: {
        token: 'dev-session-token',
        user: { email: credentials.email, role: 'parent' },
      },
    };
  },

  async signUp(data: SignUpData): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const response = await fetch(AUTH_API_ENDPOINTS.SIGN_UP, {
        method: 'POST',
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
        return { success: true, message: 'Account created successfully.', data: resultData };
      }

      if (response.status !== 404) {
        const errorData = await response.json().catch(() => ({ message: `Registration failed (HTTP ${response.status}).` }));
        return { success: false, message: errorData.message || 'Registration failed.' };
      }
    } catch {
      // Fallback to standalone dev mode below
    }

    // Development mode fallback when backend microservice is offline / returns 404
    return {
      success: true,
      message: 'Account created successfully! (Development Mode)',
      data: {
        id: 'dev-user-id',
        role: data.role,
        fullName: data.fullName,
        email: data.email,
      },
    };
  },

  async requestPasswordReset(data: ForgotPasswordRequest): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const response = await fetch(AUTH_API_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        return { success: true, message: 'Password reset instructions sent.' };
      }

      if (response.status !== 404) {
        return { success: false, message: 'Password reset request failed.' };
      }
    } catch {
      // Fallback to standalone dev mode below
    }

    return {
      success: true,
      message: 'Password reset instructions sent to your email. (Development Mode)',
    };
  },
};

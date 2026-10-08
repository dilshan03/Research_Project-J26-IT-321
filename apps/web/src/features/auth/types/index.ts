export type UserRole = 'parent' | 'teacher';

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignUpData {
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: AuthError;
}

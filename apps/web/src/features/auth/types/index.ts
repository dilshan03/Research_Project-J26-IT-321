/** 'admin' exists only when set manually on a user document; it cannot be self-registered. */
export type UserRole = 'parent' | 'teacher' | 'admin';

/** Roles available on the public sign-up form. */
export type RegistrableRole = Exclude<UserRole, 'admin'>;

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  username?: string;
}

export interface UpdateProfileData {
  fullName: string;
  email: string;
  role?: UserRole;
  username?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignUpData {
  role: RegistrableRole;
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

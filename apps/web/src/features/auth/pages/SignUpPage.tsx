import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User as UserIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { RoleSelector } from '../components/RoleSelector';
import type { UserRole } from '../types';
import { authService } from '../services/authService';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('parent');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter a valid full name.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the Terms of Service & Privacy Policy.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    if (!validate() || isLoading) return;

    setIsLoading(true);

    const response = await authService.signUp({
      role,
      fullName,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });

    setIsLoading(false);

    if (response.success) {
      setSuccessMessage(response.message || 'Account created successfully! Redirecting to Sign In...');
      setTimeout(() => {
        navigate('/sign-in');
      }, 1500);
    } else {
      setGlobalError(
        response.error?.message || response.message || 'Registration failed. Please try again.'
      );
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join MathQuest to empower your child's math journey"
    >
      {successMessage && (
        <div className="mb-5 p-3.5 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-start gap-3 text-xs text-mq-success font-medium animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Account Created</p>
            <p className="mt-0.5 text-mq-text">{successMessage}</p>
          </div>
        </div>
      )}

      {globalError && (
        <div className="mb-5 p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start gap-3 text-xs text-mq-danger font-medium animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Registration Notice</p>
            <p className="mt-0.5 text-mq-text">{globalError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Role Selector */}
        <RoleSelector selectedRole={role} onSelectRole={setRole} />

        {/* Full Name Input */}
        <AuthInput
          id="signUpFullName"
          label="Full Name"
          type="text"
          placeholder="e.g. Priyantha Perera"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
          }}
          error={errors.fullName}
          icon={<UserIcon size={18} />}
          required
          autoComplete="name"
          disabled={isLoading}
        />

        {/* Email Input */}
        <AuthInput
          id="signUpEmail"
          label="Email Address"
          type="email"
          placeholder="parent@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          error={errors.email}
          icon={<Mail size={18} />}
          required
          autoComplete="email"
          disabled={isLoading}
        />

        {/* Password Input */}
        <PasswordInput
          id="signUpPassword"
          label="Password"
          placeholder="Min 8 chars (A-z, 0-9)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
          required
          autoComplete="new-password"
          disabled={isLoading}
        />

        {/* Confirm Password Input */}
        <PasswordInput
          id="signUpConfirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
          disabled={isLoading}
        />

        {/* Terms & Privacy Policy Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-mq-text">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                if (errors.acceptedTerms) setErrors((prev) => ({ ...prev, acceptedTerms: '' }));
              }}
              className="w-4 h-4 rounded border-mq-border text-mq-primary focus:ring-mq-primary/30 accent-mq-primary cursor-pointer mt-0.5 shrink-0"
              disabled={isLoading}
            />
            <span>
              I agree to MathQuest's{' '}
              <a href="#" className="font-bold text-mq-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-bold text-mq-primary hover:underline">
                Privacy Policy
              </a>.
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="flex items-center gap-1 text-xs text-mq-danger font-medium mt-1 animate-fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errors.acceptedTerms}</span>
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full py-3 rounded-2xl mt-4 font-bold text-base shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Creating Account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>

        {/* Sign In Link */}
        <div className="text-center pt-4 border-t border-mq-border/60 mt-6">
          <p className="text-xs text-mq-text-muted font-medium">
            Already have an account?{' '}
            <Link
              to="/sign-in"
              className="font-bold text-mq-primary hover:text-mq-primary-hover hover:underline ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

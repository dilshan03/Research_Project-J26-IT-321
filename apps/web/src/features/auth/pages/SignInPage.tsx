import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
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

    const response = await authService.signIn({
      email,
      password,
      rememberMe,
    });

    setIsLoading(false);

    if (response.success) {
      const userEmail = email.trim();
      const userName = userEmail.split('@')[0];
      login({
        id: 'user-id-1',
        fullName: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: userEmail,
        role: 'parent',
      });

      setSuccessMessage(response.message || 'Sign in successful! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } else {
      setGlobalError(
        response.error?.message || response.message || 'Sign in failed. Please try again.'
      );
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your child's math journey"
    >
      {successMessage && (
        <div className="mb-5 p-3.5 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-start gap-3 text-xs text-mq-success font-medium animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Sign In Successful</p>
            <p className="mt-0.5 text-mq-text">{successMessage}</p>
          </div>
        </div>
      )}

      {globalError && (
        <div className="mb-5 p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start gap-3 text-xs text-mq-danger font-medium animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Authentication Notice</p>
            <p className="mt-0.5 text-mq-text">{globalError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Input */}
        <AuthInput
          id="signInEmail"
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
          id="signInPassword"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-mq-text-muted hover:text-mq-text">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-mq-border text-mq-primary focus:ring-mq-primary/30 accent-mq-primary cursor-pointer"
              disabled={isLoading}
            />
            <span>Remember Me</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-xs font-bold text-mq-primary hover:text-mq-primary-hover hover:underline"
          >
            Forgot Password?
          </Link>
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
              Signing In...
            </span>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Sign Up Link */}
        <div className="text-center pt-4 border-t border-mq-border/60 mt-6">
          <p className="text-xs text-mq-text-muted font-medium">
            Don't have an account?{' '}
            <Link
              to="/sign-up"
              className="font-bold text-mq-primary hover:text-mq-primary-hover hover:underline ml-1"
            >
              Create an Account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

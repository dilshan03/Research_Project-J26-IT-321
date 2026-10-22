import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathFor } from '../roleRoutes';
import { publicText } from '../../../shared/i18n/publicText';

const a = publicText.auth;
const t = publicText.auth.signIn;

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
      newErrors.email = a.errEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = a.errEmailInvalid;
    }

    if (!password) {
      newErrors.password = a.errPasswordRequired;
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

    if (response.success && response.data?.user) {
      login(response.data.user);
      setSuccessMessage(t.success);
      setTimeout(() => {
        navigate('/');
      }, 700);
    } else if (response.success) {
      const userEmail = email.trim();
      const userName = userEmail.split('@')[0];
      const fallbackUser = {
        id: '',
        fullName: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: userEmail,
        role: 'parent' as const,
      };
      login(fallbackUser);
      setSuccessMessage(t.success);
      setTimeout(() => {
        navigate('/');
      }, 700);
    } else {
      setGlobalError(
        response.error?.message || response.message || t.failed
      );
    }
  };

  return (
    <AuthLayout
      title={t.title}
      subtitle={t.subtitle}
    >
      {/* A single message: success or failure, never both and never repeated */}
      {successMessage ? (
        <div
          role="status"
          className="mb-5 p-3.5 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-center gap-3 text-sm text-mq-success font-semibold animate-fade-in"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <p>{successMessage}</p>
        </div>
      ) : (
        globalError && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-center gap-3 text-sm text-mq-danger font-semibold animate-fade-in"
          >
            <AlertCircle size={18} className="shrink-0" />
            <p>{globalError}</p>
          </div>
        )
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Input */}
        <AuthInput
          id="signInEmail"
          label={a.emailLabel}
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
          label={a.passwordLabel}
          placeholder={t.passwordPlaceholder}
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
            <span>{t.rememberMe}</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-xs font-bold text-mq-primary hover:text-mq-primary-hover hover:underline"
          >
            {t.forgot}
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
              {t.submitting}
            </span>
          ) : (
            t.submit
          )}
        </button>

        {/* Sign Up Link */}
        <div className="text-center pt-4 border-t border-mq-border/60 mt-6">
          <p className="text-xs text-mq-text-muted font-medium">
            {t.noAccount}{' '}
            <Link
              to="/sign-up"
              className="font-bold text-mq-primary hover:text-mq-primary-hover hover:underline ml-1"
            >
              {t.createAccount}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthInput } from '../components/AuthInput';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validate() || isLoading) return;

    setIsLoading(true);

    const response = await authService.requestPasswordReset({ email });

    setIsLoading(false);

    if (!response.success) {
      setGlobalError(
        response.error?.message || response.message || 'Failed to process request.'
      );
    } else {
      setIsSubmitted(true);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your account email to receive password reset instructions"
    >
      {isSubmitted ? (
        <div className="text-center py-4 space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 bg-mq-success-bg text-mq-success rounded-full mb-1 border border-mq-success/30">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-mq-text-strong">Request Submitted</h3>
          <p className="text-xs text-mq-text-muted leading-relaxed max-w-sm mx-auto">
            If an account registered to <strong className="text-mq-text">{email}</strong> exists in our system, password reset instructions will be sent shortly.
          </p>
          <div className="pt-4">
            <Link
              to="/sign-in"
              className="btn btn-secondary w-full py-2.5 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <>
          {globalError && (
            <div className="mb-5 p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start gap-3 text-xs text-mq-danger font-medium animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Reset Password Notice</p>
                <p className="mt-0.5 text-mq-text">{globalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Input */}
            <AuthInput
              id="resetEmail"
              label="Account Email"
              type="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              error={error}
              icon={<Mail size={18} />}
              required
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 rounded-2xl mt-4 font-bold text-base shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Sending Request...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Sign In Link */}
            <div className="text-center pt-4 border-t border-mq-border/60 mt-6">
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mq-primary hover:text-mq-primary-hover hover:underline"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  id: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  id,
  error,
  className = '',
  required,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
        {label} {required && <span className="text-mq-danger ml-0.5">*</span>}
      </label>
      <div className="relative rounded-2xl shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mq-text-muted">
          <Lock size={18} />
        </div>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required={required}
          className={`w-full py-2.5 sm:py-3 text-sm rounded-2xl border bg-mq-surface text-mq-text placeholder-mq-text-muted/60 transition-all outline-none pl-10 pr-11 ${
            error
              ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20 bg-mq-danger-bg/30'
              : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-mq-text-muted hover:text-mq-primary transition-colors focus:outline-none"
          title={showPassword ? 'Hide password' : 'Show password'}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-mq-danger font-medium mt-1 animate-fade-in">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

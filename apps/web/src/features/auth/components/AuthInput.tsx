import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  icon?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  id,
  error,
  icon,
  className = '',
  required,
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
        {label} {required && <span className="text-mq-danger ml-0.5">*</span>}
      </label>
      <div className="relative rounded-2xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mq-text-muted">
            {icon}
          </div>
        )}
        <input
          id={id}
          required={required}
          className={`w-full py-2.5 sm:py-3 text-sm rounded-2xl border bg-mq-surface text-mq-text placeholder-mq-text-muted/60 transition-all outline-none ${
            icon ? 'pl-10' : 'pl-4'
          } pr-4 ${
            error
              ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20 bg-mq-danger-bg/30'
              : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
          } ${className}`}
          {...props}
        />
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

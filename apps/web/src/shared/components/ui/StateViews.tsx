import React from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  messageSi?: string;
  minHeightClass?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  messageSi,
  minHeightClass = 'min-h-[280px]',
}) => {
  return (
    <div
      className={`bg-white rounded-3xl border border-mq-border p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-xs ${minHeightClass}`}
    >
      <Loader2 size={32} className="animate-spin text-mq-primary" />
      <p className="text-sm font-bold text-mq-text-strong">{message}</p>
      {messageSi && (
        <p className="text-xs text-mq-text-muted font-sinhala">{messageSi}</p>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  titleSi?: string;
  description: string;
  descriptionSi?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  titleSi,
  description,
  descriptionSi,
  action,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-mq-border-strong p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto my-4">
      {icon ? (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-mq-surface-soft border border-mq-border flex items-center justify-center text-3xl shadow-inner text-mq-primary">
          {icon}
        </div>
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-mq-surface-blue text-mq-primary flex items-center justify-center text-3xl">
          ✨
        </div>
      )}

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-lg sm:text-xl font-bold text-mq-text-strong">
          {title}
        </h3>
        {titleSi && (
          <p className="text-sm font-bold text-mq-primary font-sinhala">
            {titleSi}
          </p>
        )}
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed">
          {description}
        </p>
        {descriptionSi && (
          <p className="text-xs text-mq-text-muted/90 font-sinhala leading-relaxed">
            {descriptionSi}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export interface ErrorAlertProps {
  message: string;
  messageSi?: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  messageSi,
  onRetry,
}) => {
  return (
    <div className="p-4 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in shadow-xs">
      <div className="flex items-center gap-2.5">
        <AlertCircle size={18} className="shrink-0" />
        <div>
          <span>{message}</span>
          {messageSi && (
            <span className="block text-xs font-sinhala mt-0.5">{messageSi}</span>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold underline hover:opacity-80 shrink-0 cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export interface SuccessAlertProps {
  message: string;
  onDismiss?: () => void;
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  onDismiss,
}) => {
  return (
    <div className="p-4 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-mq-success font-bold animate-fade-in shadow-xs">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 size={18} className="shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-bold underline hover:opacity-80 shrink-0 cursor-pointer"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

import React from 'react';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { OnboardingStatus } from '../types';
import { statusLabel } from './parent/labels';

export interface OnboardingStatusBadgeProps {
  status: OnboardingStatus;
  /** Kept for compatibility; parent-portal labels are always Sinhala. */
  showSinhala?: boolean;
  size?: 'sm' | 'md';
}

const STYLES: Record<OnboardingStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  COMPLETED: { className: 'bg-mq-success-bg text-mq-success border-mq-success/30', Icon: CheckCircle2 },
  IN_PROGRESS: { className: 'bg-mq-surface-blue text-mq-primary border-mq-primary/30', Icon: Clock },
  NOT_STARTED: { className: 'bg-mq-warning-bg text-mq-warning border-mq-warning/30', Icon: Sparkles },
};

export const OnboardingStatusBadge: React.FC<OnboardingStatusBadgeProps> = ({ status, size = 'md' }) => {
  const { className, Icon } = STYLES[status] ?? STYLES.NOT_STARTED;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap ${className} ${sizeClasses}`}
    >
      <Icon size={size === 'sm' ? 12 : 13} className="shrink-0" />
      <span>{statusLabel(status)}</span>
    </span>
  );
};

export default OnboardingStatusBadge;

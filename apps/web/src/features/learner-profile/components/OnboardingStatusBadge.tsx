import React from 'react';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { OnboardingStatus } from '../types';

export interface OnboardingStatusBadgeProps {
  status: OnboardingStatus;
  showSinhala?: boolean;
  size?: 'sm' | 'md';
}

export const OnboardingStatusBadge: React.FC<OnboardingStatusBadgeProps> = ({
  status,
  showSinhala = true,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const iconSize = size === 'sm' ? 11 : 13;

  switch (status) {
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-mq-success-bg text-mq-success border border-mq-success/30 whitespace-nowrap max-w-full ${sizeClasses}`}>
          <CheckCircle2 size={iconSize} className="shrink-0" />
          <span>
            {showSinhala ? 'සම්පූර්ණයි (Completed)' : 'Completed'}
          </span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/30 whitespace-nowrap max-w-full ${sizeClasses}`}>
          <Clock size={iconSize} className="shrink-0" />
          <span>
            {showSinhala ? 'ක්‍රියාත්මකයි (In Progress)' : 'In Progress'}
          </span>
        </span>
      );
    case 'NOT_STARTED':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-mq-warning-bg text-mq-warning border border-mq-warning/30 whitespace-nowrap max-w-full ${sizeClasses}`}>
          <Sparkles size={iconSize} className="shrink-0" />
          <span>
            {showSinhala ? 'ආරම්භ කිරීමට ඇත (Needs Profiling)' : 'Needs Profiling'}
          </span>
        </span>
      );
  }
};

export default OnboardingStatusBadge;

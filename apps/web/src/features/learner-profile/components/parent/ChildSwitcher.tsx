import React from 'react';
import type { Learner } from '../../types';
import { AVATAR_OPTIONS } from '../../types';
import { parentText } from '../../../../shared/i18n/parentText';
import { OnboardingStatusBadge } from '../OnboardingStatusBadge';

interface ChildSwitcherProps {
  learners: Learner[];
  selectedId: string | null | undefined;
  onSelect: (learnerId: string) => void;
  showStatus?: boolean;
}

/** Wrapping grid of child buttons, so every child stays visible without horizontal scrolling. */
export const ChildSwitcher: React.FC<ChildSwitcherProps> = ({
  learners,
  selectedId,
  onSelect,
  showStatus = false,
}) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-2.5">
    {learners.map((child) => {
      const isSelected = child.learnerId === selectedId;
      const avatar = AVATAR_OPTIONS.find((a) => a.id === child.avatarId) || AVATAR_OPTIONS[0];
      return (
        <button
          key={child.learnerId}
          type="button"
          onClick={() => onSelect(child.learnerId)}
          aria-pressed={isSelected}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-2xl border text-left transition-colors cursor-pointer min-w-0 ${
            isSelected
              ? 'bg-mq-surface-blue border-mq-primary ring-2 ring-mq-primary/20'
              : 'bg-white border-mq-border hover:border-mq-primary/40'
          }`}
        >
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${avatar.bgColor} ${avatar.borderColor}`}
            aria-hidden="true"
          >
            {avatar.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-mq-text-strong truncate">
              {child.preferredName || child.firstName}
            </span>
            <span className="block text-xs text-mq-text-muted truncate">{parentText.common.grade(child.grade)}</span>
            {showStatus && (
              <span className="block mt-0.5 [&>span]:max-w-full [&>span]:truncate">
                <OnboardingStatusBadge status={child.onboardingStatus} size="sm" />
              </span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

export default ChildSwitcher;

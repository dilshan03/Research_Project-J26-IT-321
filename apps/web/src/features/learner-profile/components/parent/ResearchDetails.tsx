import React from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/useAuth';
import { parentText } from '../../../../shared/i18n/parentText';

/**
 * Collapsed section holding technical values (ELP-X statistics, identifiers, rule codes, versions).
 * Technical details are for administrators only: for parents, teachers and children this renders
 * nothing. Admins see the same data in full on the admin dashboard.
 */
export const ResearchDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;

  return (
    <details className="group rounded-2xl border border-mq-border bg-mq-surface-soft/50">
      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-mq-text-muted hover:text-mq-primary">
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={16} className="shrink-0" />
          <span>{parentText.research.toggle}</span>
        </span>
        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div lang="en" className="px-4 pb-4 pt-1 space-y-3 text-xs text-mq-text-muted">
        <p lang="si">{parentText.research.note}</p>
        {children}
      </div>
    </details>
  );
};

export default ResearchDetails;

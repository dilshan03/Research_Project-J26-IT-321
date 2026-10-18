import React from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { parentText } from '../../../../shared/i18n/parentText';

/**
 * Collapsed-by-default section that keeps the original technical values (ELP-X statistics,
 * identifiers, rule codes) available for research inspection without leading the parent view.
 */
export const ResearchDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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

export default ResearchDetails;

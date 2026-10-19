import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import type { ElpxStructuredRecommendation } from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';
import { ResearchDetails } from './ResearchDetails';

interface RecommendationListProps {
  recommendations: ElpxStructuredRecommendation[];
  limit?: number;
  rulesetVersion?: string;
  showNotice?: boolean;
  /** Set false when the page shows these codes in another research section (avoids duplicate panels). */
  showResearchDetails?: boolean;
}

/** Technical recommendation codes for a research details section. */
export const RecommendationResearchRows: React.FC<{
  recommendations: ElpxStructuredRecommendation[];
  rulesetVersion?: string;
}> = ({ recommendations, rulesetVersion }) => (
  <>
    {rulesetVersion && <p className="font-mono">ruleset: {rulesetVersion}</p>}
    <ul className="space-y-1.5 font-mono text-[11px]">
      {recommendations.map((rec) => (
        <li key={rec.recommendationId} className="break-words">
          {rec.recommendationId} • {rec.strategyCode}
          {rec.skillId ? ` • skill: ${rec.skillId}` : ''} • reasons: {rec.reasonCodes.join(', ')}
        </li>
      ))}
    </ul>
  </>
);

/**
 * Parent-friendly learning suggestions. Strategy codes, reason codes and ruleset versions are
 * kept in the research details section.
 */
export const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
  limit,
  rulesetVersion,
  showNotice = true,
  showResearchDetails = true,
}) => {
  const shown = typeof limit === 'number' ? recommendations.slice(0, limit) : recommendations;

  if (shown.length === 0) {
    return <p className="text-sm text-mq-text-muted">{parentText.recommendations.none}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map((rec) => (
          <div key={rec.recommendationId} className="p-4 rounded-2xl bg-white border border-mq-border flex gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-mq-surface-yellow text-mq-warning flex items-center justify-center shrink-0">
              <Lightbulb size={18} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-mq-text-strong break-words">{rec.titleSi || rec.titleEn}</p>
              <p className="text-sm text-mq-text leading-relaxed break-words">{rec.descriptionSi || rec.descriptionEn}</p>
            </div>
          </div>
        ))}
      </div>

      {showNotice && (
        <p className="text-xs text-mq-text-muted flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5 text-mq-primary" />
          <span>{parentText.recommendations.notice}</span>
        </p>
      )}

      {showResearchDetails && (
        <ResearchDetails>
          <RecommendationResearchRows recommendations={shown} rulesetVersion={rulesetVersion} />
        </ResearchDetails>
      )}
    </div>
  );
};

export default RecommendationList;

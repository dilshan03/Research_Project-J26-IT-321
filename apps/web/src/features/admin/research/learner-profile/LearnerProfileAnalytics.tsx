import React from 'react';
import { NavLink } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorLine, Panel, useLoad } from '../../components/ui';
import { researchApi } from '../researchApi';
import { LEARNER_PROFILE_TABS, TAB_LABELS, researchPath, type LearnerProfileTab } from '../access';
import { EmptyState } from '../components/badges';
import { sectionsOf } from './sections';
import { OverviewTab } from './OverviewTab';
import { ModelsTab } from './ModelsTab';
import { ExplainabilityTab } from './ExplainabilityTab';
import { RecommendationsTab } from './RecommendationsTab';
import { EvaluationTab } from './EvaluationTab';
import { ImlrDemoTab } from './imlr/ImlrDemoTab';

export const LearnerProfileAnalytics: React.FC<{ tab: LearnerProfileTab }> = ({ tab }) => {
  const detail = useLoad(() => researchApi.component('learner-profile'), []);
  const live = useLoad(() => researchApi.learnerProfileLiveSummary(), []);

  const header = (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Component 1</p>
        <h1 className="text-lg font-bold text-slate-900">Learner Profile &amp; Prediction Engine</h1>
      </div>
      <nav aria-label="Learner profile analytics" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {LEARNER_PROFILE_TABS.map((t) => (
          <NavLink
            key={t}
            to={researchPath('learner-profile', t)}
            end
            className={() =>
              `shrink-0 min-h-[40px] px-3 inline-flex items-center text-sm font-semibold border-b-2 -mb-px ${
                t === tab ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`
            }
            aria-current={t === tab ? 'page' : undefined}
          >
            {TAB_LABELS[t]}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  if (detail.loading) return <>{header}<Loader2 className="animate-spin text-slate-500" /></>;
  if (detail.error || !detail.data) return <>{header}<ErrorLine message={detail.error ?? 'Not available.'} /></>;

  const { snapshot, freshness, emptyReason } = detail.data;
  if (!snapshot) {
    return (
      <>
        {header}
        <Panel title="No snapshot">
          <EmptyState title="The research snapshot has not been generated">{emptyReason}</EmptyState>
        </Panel>
      </>
    );
  }
  const sections = sectionsOf(snapshot);
  const liveProps = { live: live.data, liveError: live.error, liveLoading: live.loading };

  return (
    <div className="space-y-4">
      {header}
      {tab === 'overview' && <OverviewTab snapshot={snapshot} freshness={freshness} />}
      {tab === 'models' && <ModelsTab snapshot={snapshot} sections={sections} {...liveProps} />}
      {tab === 'explainability' && <ExplainabilityTab sections={sections} />}
      {tab === 'recommendations' && <RecommendationsTab sections={sections} {...liveProps} />}
      {tab === 'evaluation' && <EvaluationTab sections={sections} />}
      {tab === 'imlr-demo' && <ImlrDemoTab demo={sections.imlrDemo} />}
    </div>
  );
};

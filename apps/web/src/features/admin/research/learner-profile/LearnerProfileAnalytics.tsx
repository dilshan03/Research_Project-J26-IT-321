import React from 'react';
import { NavLink } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { ErrorLine, Loading, Panel, useLoad } from '../../components/ui';
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
      <div className="rounded-3xl bg-gradient-to-r from-indigo-100 via-violet-100 to-rose-100 border border-indigo-100 text-slate-800 shadow-sm p-5">
        <p className="inline-flex items-center gap-1.5 text-sm text-indigo-700"><Brain size={16} /> Component 1</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Learner Profile &amp; Prediction Engine</h1>
        <p className="mt-1 text-sm text-slate-600">Models, explanations, recommendations and evaluation results, each labelled with where its data came from.</p>
      </div>
      <nav aria-label="Learner profile analytics" className="flex gap-1.5 overflow-x-auto rounded-full bg-white border border-slate-200 p-1 shadow-sm">
        {LEARNER_PROFILE_TABS.map((t) => (
          <NavLink
            key={t}
            to={researchPath('learner-profile', t)}
            end
            className={() =>
              `shrink-0 min-h-[38px] px-3.5 rounded-full inline-flex items-center text-sm font-semibold ${
                t === tab ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-800'
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

  if (detail.loading) return <>{header}<Loading label="Loading research snapshot…" /></>;
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

import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorLine, Panel, useLoad } from '../components/ui';
import { researchApi } from './researchApi';
import { findResearchComponent } from './registry';
import { parseTab } from './access';
import { ResearchLayout } from './ResearchLayout';
import { EmptyState } from './components/badges';
import { ModelCards, SnapshotMeta, SoftwareTestsPanel } from './components/snapshotPanels';
import { LearnerProfileAnalytics } from './learner-profile/LearnerProfileAnalytics';
import type { SoftwareTestRun } from './types';

/** Generic page for components without a dedicated page: shows registered outputs, or a clear empty state. */
const GenericComponentAnalytics: React.FC<{ componentId: string; title: string }> = ({ componentId, title }) => {
  const { loading, data, error } = useLoad(() => researchApi.component(componentId), [componentId]);
  if (loading) return <Loader2 className="animate-spin text-slate-500" />;
  if (error || !data) return <ErrorLine message={error ?? 'Not available.'} />;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{data.component.component}</p>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{data.component.summary}</p>
      </div>
      {!data.snapshot ? (
        <Panel title="No research outputs registered">
          <EmptyState title="Nothing to show yet">
            <p>{data.emptyReason}</p>
            <p className="mt-2">
              Component owners add a file named <code className="font-mono">{componentId}.json</code> to{' '}
              <code className="font-mono">services/learner-profile-service/app/research_snapshots/</code> following the{' '}
              <code className="font-mono">MQ-RESEARCH-SNAPSHOT-v1</code> schema (models, sources with hashes, software tests and
              component sections). It is validated and scanned for sensitive content before it is shown. Models, metrics and
              statuses are never filled in on the owner's behalf.
            </p>
          </EmptyState>
        </Panel>
      ) : (
        <>
          <Panel title="Registered models">
            <ModelCards models={data.snapshot.models} />
          </Panel>
          <SoftwareTestsPanel runs={(data.snapshot.sections.softwareTests as SoftwareTestRun[] | undefined) ?? []} />
          <SnapshotMeta snapshot={data.snapshot} freshness={data.freshness} />
        </>
      )}
    </div>
  );
};

export const ResearchComponentPage: React.FC = () => {
  const { componentId, tab } = useParams();
  const entry = findResearchComponent(componentId);
  if (!entry) return <Navigate to="/admin/research" replace />;

  return (
    <ResearchLayout>
      {entry.page === 'learner-profile' ? (
        <LearnerProfileAnalytics tab={parseTab(tab)} />
      ) : (
        <GenericComponentAnalytics key={entry.id} componentId={entry.id} title={entry.title} />
      )}
    </ResearchLayout>
  );
};

export default ResearchComponentPage;

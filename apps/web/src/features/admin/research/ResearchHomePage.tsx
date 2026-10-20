import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ErrorLine, date, useLoad } from '../components/ui';
import { researchApi } from './researchApi';
import { researchPath } from './access';
import { ResearchLayout } from './ResearchLayout';
import { StatusBadge } from './components/badges';
import type { ModelStatus } from './types';

export const ResearchHomePage: React.FC = () => {
  const { loading, data, error } = useLoad(() => researchApi.components(), []);

  return (
    <ResearchLayout>
      <div>
        <h1 className="text-lg font-bold text-slate-900">Research &amp; Model Analytics</h1>
        <p className="text-sm text-slate-600">One page per research component. Each owner registers their own sanitized outputs.</p>
      </div>
      {loading ? (
        <Loader2 className="animate-spin text-slate-500" />
      ) : error ? (
        <ErrorLine message={error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((c) => (
            <Link
              key={c.id}
              to={researchPath(c.id)}
              className="group bg-white rounded-2xl border border-slate-200 p-4 space-y-3 hover:border-blue-300 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.component}</p>
                  <h2 className="text-base font-bold text-slate-900">{c.title}</h2>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-700 shrink-0" />
              </div>
              <p className="text-xs text-slate-600">{c.summary}</p>
              {c.snapshotAvailable ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(c.modelStatuses).map(([s, n]) => (
                      <span key={s} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <StatusBadge status={s as ModelStatus} /> ×{n}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {c.modelCount} registered models • snapshot {date(c.generatedAtUtc)}
                    {c.liveSummary ? ' • live aggregate counts available' : ''}
                  </p>
                </>
              ) : c.snapshotValid === false ? (
                <p className="text-xs font-semibold text-red-700">Snapshot present but failed validation; not shown.</p>
              ) : (
                <p className="text-xs text-slate-500 italic">No research outputs registered yet.</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </ResearchLayout>
  );
};

export default ResearchHomePage;

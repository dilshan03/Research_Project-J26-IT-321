import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { ErrorLine, Loading, TONES, date, useLoad, type Tone } from '../components/ui';
import { researchApi } from './researchApi';
import { researchPath } from './access';
import { ResearchLayout } from './ResearchLayout';
import { StatusBadge } from './components/badges';
import type { ModelStatus } from './types';

const CARD_TONES: Tone[] = ['violet', 'sky', 'teal', 'orange', 'rose', 'indigo'];

export const ResearchHomePage: React.FC = () => {
  const { loading, data, error } = useLoad(() => researchApi.components(), []);

  return (
    <ResearchLayout>
      <div className="rounded-3xl bg-gradient-to-r from-violet-100 via-fuchsia-50 to-rose-100 border border-violet-100 text-slate-800 shadow-sm p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 text-sm text-violet-700"><FlaskConical size={16} /> Research &amp; Model Analytics</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">What each research component has built and tested</h1>
        <p className="mt-1 text-sm text-slate-600">One page per component. Each owner registers their own sanitized outputs.</p>
      </div>
      {loading ? (
        <Loading label="Loading research components…" />
      ) : error ? (
        <ErrorLine message={error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((c, i) => (
            <Link
              key={c.id}
              to={researchPath(c.id)}
              className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 hover:shadow-md hover:border-violet-300 transition"
            >
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${TONES[CARD_TONES[i % CARD_TONES.length]].solid}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${TONES[CARD_TONES[i % CARD_TONES.length]].soft} ${TONES[CARD_TONES[i % CARD_TONES.length]].text}`}>
                    <FlaskConical size={18} />
                  </span>
                  <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.component}</p>
                  <h2 className="text-base font-bold text-slate-900">{c.title}</h2>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-violet-700 shrink-0" />
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

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Info, Loader2, ShieldAlert } from 'lucide-react';
import { AdminShell, navTabClass } from '../components/ui';
import { RESEARCH_COMPONENTS } from './registry';
import { researchPath } from './access';
import { useResearchAccess } from './useResearchAccess';

/** Research section frame: admin header, research navigation and the read-only notice. */
export const ResearchLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminShell
    nav={
      <>
        <Link to="/admin" className={`${navTabClass(false)} gap-1`}>
          <ArrowLeft size={14} /> Admin dashboard
        </Link>
        <NavLink to="/admin/research" end className={({ isActive }) => navTabClass(isActive)}>
          <FlaskConical size={16} /> Research &amp; Model Analytics
        </NavLink>
        {RESEARCH_COMPONENTS.map((c) => (
          <NavLink key={c.id} to={researchPath(c.id)} className={({ isActive }) => navTabClass(isActive)}>
            {c.shortTitle}
          </NavLink>
        ))}
      </>
    }
  >
    <p className="flex items-start gap-2 text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-2xl px-3 py-2">
      <Info size={14} className="shrink-0 mt-px text-violet-500" />
      Read-only research outputs from sanitized, versioned snapshots and aggregate live counts. Data views are recorded in the
      admin audit log. Nothing here is a diagnosis, and no model on this page makes predictions about MathQuest children.
    </p>
    {children}
  </AdminShell>
);

/**
 * Usability gate: shows the section only after the server confirms admin role + researchAnalyticsAccess.
 * The server enforces the same rule on every data request, so hiding here is never the only protection.
 */
export const ResearchAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const access = useResearchAccess();
  if (access === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-sm text-slate-600 gap-2">
        <Loader2 size={18} className="animate-spin" /> Checking research analytics access…
      </div>
    );
  }
  if (access !== 'granted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
          <ShieldAlert size={28} className="mx-auto text-amber-700" />
          <h1 className="text-base font-bold text-slate-900">
            {access === 'denied' ? 'Research analytics access required' : 'Research analytics unavailable'}
          </h1>
          <p className="text-sm text-slate-600">
            {access === 'denied'
              ? 'This area needs an administrator account with research analytics access granted. Ask the project lead to provision it.'
              : 'The learner-profile service could not be reached. Try again later.'}
          </p>
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
            <ArrowLeft size={14} /> Back to the admin dashboard
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

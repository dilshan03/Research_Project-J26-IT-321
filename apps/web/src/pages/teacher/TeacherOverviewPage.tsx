import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Sparkles,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  School,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { teacherText } from '../../shared/i18n/teacherText';

const t = teacherText.overview;

export const TeacherOverviewPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. Personalized Teacher Welcome */}
      <div className="bg-gradient-to-r from-mq-secondary/15 via-mq-surface-blue to-white p-6 sm:p-8 rounded-3xl border border-mq-secondary/30 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-mq-primary-dark flex items-center gap-1.5">
              <School size={15} className="text-mq-primary" />
              <span>{t.badge}</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong">
              {t.welcome(user?.fullName || t.teacherFallback)}
            </h2>
            <p className="text-sm text-mq-text-muted max-w-2xl">
              {t.intro}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#/adapt"
              className="btn btn-primary inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold shadow-sm"
            >
              <BookOpen size={16} />
              <span>{t.openStudio}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Classroom Summary Indicator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-mq-border/70">
          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-text-muted">
              <Users size={14} className="text-mq-primary" />
              <span>{t.statAssigned}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              0
            </p>
          </div>

          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-success">
              <GraduationCap size={14} />
              <span>{t.statOnboarded}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              0
            </p>
          </div>

          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-warning">
              <AlertCircle size={14} />
              <span>{t.statSupport}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              0
            </p>
          </div>

          <div className="p-3.5 bg-white/80 backdrop-blur rounded-2xl border border-mq-border/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-mq-secondary">
              <Sparkles size={14} />
              <span>{t.statBlueprints}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mt-1">
              3
            </p>
          </div>
        </div>
      </div>

      {/* 2. Authorized Assignment Privacy & Security Notice */}
      <div className="p-6 bg-mq-surface-blue/60 rounded-3xl border border-mq-primary/20 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-primary text-white flex items-center justify-center shrink-0">
            <Lock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-mq-text-strong">
              {t.privacyTitle}
            </h3>
            <p className="text-xs text-mq-text-muted">
              {t.privacySubtitle}
            </p>
          </div>
        </div>
        <p className="text-xs text-mq-text leading-relaxed">
          {t.privacyText}
        </p>
      </div>

      {/* 3. Empty State: No Learners Assigned Yet */}
      <div className="bg-white rounded-3xl border border-dashed border-mq-border-strong p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-mq-surface-soft text-mq-primary rounded-3xl flex items-center justify-center mx-auto text-3xl">
          📚
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-mq-text-strong">
            {t.emptyTitle}
          </h3>
          <p className="text-xs sm:text-sm text-mq-text-muted max-w-md mx-auto leading-relaxed">
            {t.emptyText}
          </p>
        </div>

        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/teacher/dashboard/learners"
            className="btn btn-secondary text-xs py-2 px-4 rounded-full font-bold"
          >
            <span>{t.rosterLink}</span>
          </Link>
          <a
            href="#/adapt"
            className="btn btn-primary text-xs py-2 px-5 rounded-full font-bold inline-flex items-center gap-2"
          >
            <BookOpen size={15} />
            <span>{t.studioLink}</span>
          </a>
        </div>
      </div>

      {/* 4. Quick Actions for Teachers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 bg-white rounded-3xl border border-mq-border shadow-xs hover:border-mq-primary/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <h4 className="text-base font-extrabold text-mq-text-strong">
            {t.cardStudioTitle}
          </h4>
          <p className="text-xs text-mq-text-muted leading-relaxed">
            {t.cardStudioText}
          </p>
          <a
            href="#/adapt"
            className="text-xs font-bold text-mq-primary hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>{t.cardStudioAction}</span>
            <ArrowRight size={13} />
          </a>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-mq-border shadow-xs hover:border-mq-primary/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-mq-surface-green text-mq-success flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <h4 className="text-base font-extrabold text-mq-text-strong">
            {t.cardTipsTitle}
          </h4>
          <p className="text-xs text-mq-text-muted leading-relaxed">
            {t.cardTipsText}
          </p>
          <Link
            to="/teacher/dashboard/recommendations"
            className="text-xs font-bold text-mq-primary hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>{t.cardTipsAction}</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-mq-border shadow-xs hover:border-mq-primary/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <h4 className="text-base font-extrabold text-mq-text-strong">
            {t.cardSecurityTitle}
          </h4>
          <p className="text-xs text-mq-text-muted leading-relaxed">
            {t.cardSecurityText}
          </p>
          <Link
            to="/teacher/dashboard/learner-profiles"
            className="text-xs font-bold text-mq-primary hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>{t.cardSecurityAction}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherOverviewPage;

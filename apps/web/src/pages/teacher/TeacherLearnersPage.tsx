import { Lock, ShieldAlert, BookOpen, ExternalLink } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';
import { teacherText } from '../../shared/i18n/teacherText';

const t = teacherText.learners;

export const TeacherLearnersPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title={t.title}
        description={t.description}
      />

      <div className="bg-white rounded-3xl border border-mq-border p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-16 h-16 bg-mq-surface-blue text-mq-primary rounded-3xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
            {t.rosterTitle}
          </h2>
          <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto leading-relaxed">
            {t.rosterText}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 text-left text-xs text-mq-text-muted space-y-2 max-w-lg mx-auto">
          <p className="font-bold text-mq-text flex items-center gap-1.5">
            <ShieldAlert size={15} className="text-mq-primary" />
            <span>{t.boundaryTitle}</span>
          </p>
          <p>
            {t.boundaryText1}
          </p>
          <p>
            {t.boundaryText2}
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <a
            href="#/adapt"
            className="btn btn-primary text-xs py-2.5 px-6 rounded-full font-bold inline-flex items-center gap-2"
          >
            <BookOpen size={16} />
            <span>{t.studioLink}</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeacherLearnersPage;

import { Lock, ShieldAlert, BookOpen, ExternalLink } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';

export const TeacherLearnersPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title="Classroom Learners"
        titleSi="පන්තියේ ඉගෙනුම්කරුවන්"
        description="View and manage assigned student rosters and classroom learning differentiation."
      />

      <div className="bg-white rounded-3xl border border-mq-border p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-16 h-16 bg-mq-surface-blue text-mq-primary rounded-3xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
            Classroom Learner Roster (පන්තියේ ඉගෙනුම්කරුවන්)
          </h2>
          <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto leading-relaxed">
            Authorized teacher-to-learner roster linking is governed by school administrator
            assignment and verified parental consent.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 text-left text-xs text-mq-text-muted space-y-2 max-w-lg mx-auto">
          <p className="font-bold text-mq-text flex items-center gap-1.5">
            <ShieldAlert size={15} className="text-mq-primary" />
            <span>Authorization Security Boundary</span>
          </p>
          <p>
            To prevent unauthorized access across student populations, individual student profiles
            and progress records are accessible only when an active classroom assignment exists.
          </p>
          <p>
            No mock, dummy, or unauthorized child data is displayed in accordance with MathQuest security guidelines.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <a
            href="#/adapt"
            className="btn btn-primary text-xs py-2.5 px-6 rounded-full font-bold inline-flex items-center gap-2"
          >
            <BookOpen size={16} />
            <span>Go to Teacher Adaptation Studio</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeacherLearnersPage;

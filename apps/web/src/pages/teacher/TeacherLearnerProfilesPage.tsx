import React from 'react';
import { GraduationCap, ShieldCheck, Lock, ExternalLink, BookOpen } from 'lucide-react';

export const TeacherLearnerProfilesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border border-mq-border p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-16 h-16 bg-mq-surface-green text-mq-success rounded-3xl flex items-center justify-center mx-auto">
          <ShieldCheck size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
            Pedagogical Learner Profiles (අධ්‍යාපනික ඉගෙනුම් පැතිකඩ)
          </h2>
          <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto leading-relaxed">
            When learners are assigned to your class, you will see sanitized pedagogical profiles
            focusing strictly on mathematics skill mastery, Bayesian credible intervals, and instructional strategies.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 text-left text-xs text-mq-text-muted space-y-2 max-w-lg mx-auto">
          <p className="font-bold text-mq-text">Sanitized Cross-Component Architecture:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Exposes: Mathematics skill levels, credible intervals, and explainable recommendations.</li>
            <li>Protects: Raw SNAP-IV ratings, private parental notes, and clinical scale metrics remain hidden.</li>
          </ul>
        </div>

        <div className="pt-2">
          <a
            href="#/adapt"
            className="btn btn-primary text-xs py-2.5 px-6 rounded-full font-bold inline-flex items-center gap-2"
          >
            <BookOpen size={16} />
            <span>Open Teacher Adaptation Studio</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeacherLearnerProfilesPage;

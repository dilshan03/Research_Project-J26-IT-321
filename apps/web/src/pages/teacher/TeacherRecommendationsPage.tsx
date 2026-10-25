import React from 'react';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';
import { teacherText } from '../../shared/i18n/teacherText';
import { DetailsForTeacher } from '../../features/pedagogical-agent';

const t = teacherText.recommendations;
const STRATEGY_CODES = ['VISUAL_MANIPULATIVES', 'CHUNKING_PACING', 'MULTIMODAL_INSTRUCTION', 'POSITIVE_FEEDBACK_LOOPS'] as const;

export const TeacherRecommendationsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title={t.title}
        titleSi="ඉගැන්වීම් නිර්දේශ සහ පුහුණු දත්ත"
        description={t.description}
      />

      <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-mq-border">
          <Sparkles size={20} className="text-mq-accent-yellow" />
          <h2 className="text-lg font-extrabold text-mq-text-strong">{t.heading}</h2>
        </div>
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed">{t.intro}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {STRATEGY_CODES.map((code) => (
            <div
              key={code}
              className="p-5 rounded-2xl bg-mq-surface-soft/70 border border-mq-border space-y-2 hover:border-mq-primary/40 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-mq-primary">{t.strategies[code].title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-mq-border text-mq-text-muted">
                  {code}
                </span>
              </div>
              <p className="text-xs text-mq-text-muted leading-relaxed">{t.strategies[code].desc}</p>
            </div>
          ))}
        </div>
      </div>

      <DetailsForTeacher />
    </div>
  );
};

export default TeacherRecommendationsPage;

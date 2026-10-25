import React from 'react';
import { Sparkles, Construction, Info, ExternalLink } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { teacherText } from '../i18n/teacherText';

const t = teacherText.placeholder;

export interface FeaturePlaceholderProps {
  featureName: string;
  responsibleComponent: string;
  description: string;
  integrationStatus?: string;
  actionLink?: {
    label: string;
    href: string;
    isExternalHash?: boolean;
  };
}

export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({
  featureName,
  responsibleComponent,
  description,
  integrationStatus,
  actionLink,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={featureName}
        description={`${t.researchModule(responsibleComponent)} ${description}`}
      />

      <div className="w-full bg-white rounded-3xl border border-mq-border p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto my-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-mq-surface-blue rounded-3xl flex items-center justify-center mx-auto mb-6 text-mq-primary border border-mq-primary/20 shadow-xs">
        <Construction size={36} className="text-mq-primary" />
      </div>

      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-4">
        <Sparkles size={14} className="text-amber-600" />
        <span>{integrationStatus ?? t.status}</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong mb-2">
        {featureName}
      </h2>

      <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-mq-primary mb-4">
        {t.responsible(responsibleComponent)}
      </p>

      <p className="text-mq-text-muted text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
        {description}
      </p>

      <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/80 text-left text-xs text-mq-text-muted max-w-md mx-auto space-y-1.5 mb-6">
        <div className="flex items-center gap-2 font-bold text-mq-text">
          <Info size={14} className="text-mq-primary" />
          <span>{t.architectureTitle}</span>
        </div>
        <p>
          {t.architectureText} <strong className="text-mq-text">{responsibleComponent}</strong> {t.architectureTextEnd}
        </p>
      </div>

      {actionLink && (
        <a
          href={actionLink.href}
          className="btn btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6 rounded-full font-bold shadow-sm hover:shadow"
        >
          <span>{actionLink.label}</span>
          <ExternalLink size={15} />
        </a>
      )}
      </div>
    </div>
  );
};

export default FeaturePlaceholder;

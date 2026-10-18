import React from 'react';
import { TrendingUp, Gamepad2, Activity, ExternalLink, Clock } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { parentText } from '../../../shared/i18n/parentText';

type Feature = 'progress' | 'activities' | 'behaviour';

const FEATURES: Record<Feature, { title: string; text: string; Icon: typeof TrendingUp; action?: { label: string; href: string } }> = {
  progress: { title: parentText.nav.progress, text: parentText.comingSoon.progressText, Icon: TrendingUp },
  activities: {
    title: parentText.nav.activities,
    text: parentText.comingSoon.activitiesText,
    Icon: Gamepad2,
    action: { label: parentText.comingSoon.activitiesAction, href: '#/play' },
  },
  behaviour: { title: parentText.nav.behaviour, text: parentText.comingSoon.behaviourText, Icon: Activity },
};

/**
 * Parent-portal placeholder for sections owned by other research components.
 * Keeps the same routes and links as before, without internal research wording.
 */
export const ParentComingSoonPage: React.FC<{ feature: Feature }> = ({ feature }) => {
  const { title, text, Icon, action } = FEATURES[feature];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader role="parent" title={title} description={text} />

      <section className="bg-white rounded-3xl border border-mq-border p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-mq-surface-blue text-mq-primary rounded-3xl flex items-center justify-center mx-auto">
          <Icon size={32} />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock size={15} />
          <span>{parentText.comingSoon.badge}</span>
        </span>
        <h2 className="text-xl font-bold text-mq-text-strong">{title}</h2>
        <p className="text-base text-mq-text-muted leading-relaxed max-w-lg mx-auto">{text}</p>
        <p className="text-sm text-mq-text-muted">{parentText.comingSoon.note}</p>
        {action && (
          <a href={action.href} className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center gap-2 text-sm">
            <span>{action.label}</span>
            <ExternalLink size={16} />
          </a>
        )}
      </section>
    </div>
  );
};

export default ParentComingSoonPage;

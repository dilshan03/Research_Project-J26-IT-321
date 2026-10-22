import React from 'react';
import { Languages } from 'lucide-react';
import { setLanguage, useLanguage, type Language } from '../i18n/language';

const OPTIONS: Array<{ id: Language; short: string; label: string }> = [
  { id: 'si', short: 'සිං', label: 'සිංහල' },
  { id: 'en', short: 'EN', label: 'English' },
];

/**
 * Global Sinhala / English switch. Each option is labelled in its own language so it can always be found.
 * Changes the interface language only; stored data and the child activities are not affected.
 */
export const LanguageSwitch: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const lang = useLanguage();
  return (
    <div
      role="group"
      aria-label={lang === 'si' ? 'භාෂාව / Language' : 'Language / භාෂාව'}
      className={`inline-flex items-center gap-0.5 rounded-full border border-mq-border bg-white p-0.5 shadow-xs ${className}`}
    >
      {!compact && <Languages size={14} className="ml-1.5 mr-0.5 text-mq-text-muted" aria-hidden="true" />}
      {OPTIONS.map((o) => {
        const active = lang === o.id;
        return (
          <button
            key={o.id}
            type="button"
            lang={o.id}
            aria-pressed={active}
            title={o.label}
            onClick={() => setLanguage(o.id)}
            className={`min-h-[30px] min-w-[38px] px-2.5 rounded-full text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary ${
              active ? 'bg-mq-primary text-white shadow-xs' : 'text-mq-text hover:bg-mq-surface-soft hover:text-mq-primary'
            }`}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;

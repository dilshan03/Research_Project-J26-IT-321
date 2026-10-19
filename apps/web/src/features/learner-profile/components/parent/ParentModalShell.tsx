import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { parentText } from '../../../../shared/i18n/parentText';

type Tone = 'default' | 'warning' | 'danger';

interface ParentModalShellProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: Tone;
  size?: 'md' | 'lg';
  onClose: () => void;
  /** Prevents closing (Escape / close button) while a request is in flight. */
  isBusy?: boolean;
  /** When provided, body and footer are wrapped in a form so the footer can submit it. */
  onSubmit?: (e: React.FormEvent) => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}

const TONE_STYLES: Record<Tone, { icon: string; header: string }> = {
  default: { icon: 'bg-mq-surface-blue text-mq-primary', header: 'bg-white' },
  warning: { icon: 'bg-amber-100 text-amber-700', header: 'bg-white' },
  danger: { icon: 'bg-red-100 text-red-700', header: 'bg-red-50/60' },
};

/**
 * Parent-portal dialog frame.
 * Rendered into document.body so page transforms/animations cannot clip it, with a fixed header
 * and footer and a scrollable body, so actions stay reachable on short screens.
 */
export const ParentModalShell: React.FC<ParentModalShellProps> = ({
  isOpen,
  title,
  subtitle,
  icon,
  tone = 'default',
  size = 'md',
  onClose,
  isBusy = false,
  onSubmit,
  footer,
  children,
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) return null;

  const styles = TONE_STYLES[tone];
  const body = (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6">{children}</div>
      <div className="shrink-0 px-5 sm:px-7 py-4 border-t border-mq-border bg-mq-surface-soft/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
        {footer}
      </div>
    </>
  );

  return createPortal(
    <div
      lang="si"
      className="parent-portal fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-black/45 animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-mq-border flex flex-col max-h-[100dvh] sm:max-h-[min(90vh,880px)] overflow-hidden`}
      >
        {/* Header */}
        <div className={`shrink-0 flex items-start gap-3.5 px-5 sm:px-7 py-4 sm:py-5 border-b border-mq-border ${styles.header}`}>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${styles.icon}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-lg font-bold text-mq-text-strong leading-snug">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-mq-text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-10 h-10 -mr-1.5 rounded-xl flex items-center justify-center text-mq-text-muted hover:text-mq-text-strong hover:bg-mq-surface-soft transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            aria-label={parentText.common.close}
          >
            <X size={20} />
          </button>
        </div>

        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col" noValidate>
            {body}
          </form>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">{body}</div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ParentModalShell;

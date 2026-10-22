import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Edit3,
  ArrowRight,
  MoreVertical,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Gamepad2,
} from 'lucide-react';
import type { Learner, DeletionRequest } from '../types';
import { AVATAR_OPTIONS } from '../types';
import { OnboardingStatusBadge } from './OnboardingStatusBadge';
import { setActiveStudentProfile } from '../utils/activeStudentStorage';
import { parentText } from '../../../shared/i18n/parentText';
import { comprehensionLabel, deletionStatusLabel, languageLabel } from './parent/labels';

interface LearnerCardProps {
  learner: Learner;
  onEdit: (learner: Learner) => void;
  onArchive?: (learner: Learner) => void;
  onRestore?: (learner: Learner) => void;
  onRequestDeletion?: (learner: Learner) => void;
  deletionRequest?: DeletionRequest | null;
}

const t = parentText.card;

const DELETION_STYLES: Record<string, { className: string; Icon: typeof Clock }> = {
  PENDING_REVIEW: { className: 'bg-amber-50 text-amber-900 border-amber-300', Icon: Clock },
  APPROVED: { className: 'bg-blue-50 text-blue-800 border-blue-200', Icon: CheckCircle2 },
  COMPLETED: { className: 'bg-green-50 text-green-800 border-green-200', Icon: CheckCircle2 },
  REJECTED: { className: 'bg-zinc-100 text-zinc-700 border-zinc-200', Icon: XCircle },
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-mq-border/60 last:border-b-0">
    <dt className="text-sm text-mq-text-muted shrink-0">{label}</dt>
    <dd className="text-sm font-semibold text-mq-text-strong text-right min-w-0 break-words">{children}</dd>
  </div>
);

export const LearnerCard: React.FC<LearnerCardProps> = ({
  learner,
  onEdit,
  onArchive,
  onRestore,
  onRequestDeletion,
  deletionRequest,
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatar = AVATAR_OPTIONS.find((a) => a.id === learner.avatarId) || AVATAR_OPTIONS[0];

  const actionLabel =
    learner.onboardingStatus === 'COMPLETED'
      ? t.actionCompleted
      : learner.onboardingStatus === 'IN_PROGRESS'
      ? t.actionInProgress
      : t.actionNotStarted;

  const isBilingual = learner.preferredLanguage === 'Bilingual';
  const deletionStyle = deletionRequest ? DELETION_STYLES[deletionRequest.status] ?? DELETION_STYLES.REJECTED : null;

  const menuItemClass =
    'w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors cursor-pointer';

  const handleOpenStudentGameProfile = () => {
    setActiveStudentProfile(learner);
    const params = new URLSearchParams({
      learnerId: learner.learnerId,
      parentId: learner.parentId,
    });
    navigate(`/student/dashboard?${params.toString()}`);
  };

  return (
    <div
      className={`rounded-3xl border flex flex-col p-5 sm:p-6 transition-colors ${
        learner.isArchived
          ? 'border-amber-200 bg-stone-50/70'
          : 'bg-white border-mq-border hover:border-mq-primary/40 shadow-xs'
      }`}
    >
      {/* Header: avatar, name, options menu */}
      <div className="flex items-start gap-3.5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shrink-0 ${avatar.bgColor} ${avatar.borderColor}`}
          aria-hidden="true"
        >
          {avatar.icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-lg font-bold text-mq-text-strong break-words leading-snug">{learner.firstName}</h3>
          {learner.preferredName && (
            <p className="text-sm text-mq-text-muted break-words">"{learner.preferredName}"</p>
          )}
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            data-testid="child-actions-button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary"
            aria-label={t.actions(learner.firstName)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-mq-border shadow-lg py-1.5 z-30"
            >
              <button
                type="button"
                role="menuitem"
                data-testid="edit-child-button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit(learner);
                }}
                className={`${menuItemClass} text-mq-text-strong hover:bg-mq-surface-soft hover:text-mq-primary`}
              >
                <Edit3 size={16} className="shrink-0" />
                <span>{t.edit}</span>
              </button>

              {!learner.isArchived
                ? onArchive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onArchive(learner);
                      }}
                      className={`${menuItemClass} text-amber-800 hover:bg-amber-50`}
                    >
                      <Archive size={16} className="shrink-0" />
                      <span>{t.archive}</span>
                    </button>
                  )
                : onRestore && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRestore(learner);
                      }}
                      className={`${menuItemClass} text-emerald-700 hover:bg-emerald-50`}
                    >
                      <RotateCcw size={16} className="shrink-0" />
                      <span>{t.restore}</span>
                    </button>
                  )}

              {onRequestDeletion && (
                <>
                  <div className="my-1 border-t border-mq-border/60" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRequestDeletion(learner);
                    }}
                    className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                  >
                    <Trash2 size={16} className="shrink-0" />
                    <span>{t.requestDeletion}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <OnboardingStatusBadge status={learner.onboardingStatus} />
        {learner.isArchived && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Archive size={13} />
            <span>{t.archivedBadge}</span>
          </span>
        )}
        {deletionRequest && deletionStyle && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${deletionStyle.className}`}
          >
            <deletionStyle.Icon size={13} />
            <span>{deletionStatusLabel(deletionRequest.status)}</span>
          </span>
        )}
      </div>

      {/* Details */}
      <dl className="mt-4 mb-5 flex-1">
        <DetailRow label={t.grade}>{parentText.common.grade(learner.grade)}</DetailRow>
        <DetailRow label={t.age}>{t.years(learner.age)}</DetailRow>
        <DetailRow label={t.language}>
          <span className="block">{languageLabel(learner.preferredLanguage)}</span>
          {isBilingual && learner.primaryInstructionLanguage && (
            <span className="block text-xs font-normal text-mq-text-muted">
              {parentText.languages.mainLanguage(languageLabel(learner.primaryInstructionLanguage))}
            </span>
          )}
          {isBilingual && (learner.sinhalaComprehension || learner.englishComprehension) && (
            <span className="block text-xs font-normal text-mq-text-muted">
              {[
                learner.sinhalaComprehension
                  ? `${parentText.languages.Sinhala}: ${comprehensionLabel(learner.sinhalaComprehension)}`
                  : null,
                learner.englishComprehension
                  ? `${parentText.languages.English}: ${comprehensionLabel(learner.englishComprehension)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </span>
          )}
        </DetailRow>
      </dl>

      {/* Primary action */}
      {learner.isArchived ? (
        <button
          type="button"
          onClick={() => onRestore && onRestore(learner)}
          className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white min-h-[46px] px-4 rounded-2xl inline-flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw size={16} strokeWidth={2.5} className="shrink-0" />
          <span>{t.restore}</span>
        </button>
      ) : (
        <div className="space-y-2.5">
          <Link
            to={`/learners/${learner.learnerId}/onboarding`}
            className="w-full btn btn-primary min-h-[46px] px-4 rounded-2xl inline-flex items-center justify-center gap-2 text-sm"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" />
          </Link>

          <button
            type="button"
            onClick={handleOpenStudentGameProfile}
            className="w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold bg-mq-surface-green hover:bg-mq-secondary text-mq-success hover:text-white border border-mq-secondary/50 hover:border-mq-secondary shadow-xs hover:shadow-sm transition-all cursor-pointer font-sinhala"
            title={`Open ${learner.firstName}'s Student Game Dashboard`}
          >
            <Gamepad2 size={16} className="shrink-0" />
            <span className="truncate">ක්‍රීඩා පැතිකඩ (Game Profile)</span>
            <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LearnerCard;

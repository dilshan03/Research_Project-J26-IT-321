import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit3,
  ArrowRight,
  GraduationCap,
  Calendar,
  Languages,
  MoreVertical,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Learner, DeletionRequest } from '../types';
import { AVATAR_OPTIONS } from '../types';
import { OnboardingStatusBadge } from './OnboardingStatusBadge';

interface LearnerCardProps {
  learner: Learner;
  onEdit: (learner: Learner) => void;
  onArchive?: (learner: Learner) => void;
  onRestore?: (learner: Learner) => void;
  onRequestDeletion?: (learner: Learner) => void;
  deletionRequest?: DeletionRequest | null;
}

const GRADE_LABELS: Record<number, { si: string; en: string }> = {
  1: { si: '1 වන ශ්‍රේණිය', en: 'Grade 1' },
  2: { si: '2 වන ශ්‍රේණිය', en: 'Grade 2' },
  3: { si: '3 වන ශ්‍රේණිය', en: 'Grade 3' },
  4: { si: '4 වන ශ්‍රේණිය', en: 'Grade 4' },
  5: { si: '5 වන ශ්‍රේණිය', en: 'Grade 5' },
};

export const LearnerCard: React.FC<LearnerCardProps> = ({
  learner,
  onEdit,
  onArchive,
  onRestore,
  onRequestDeletion,
  deletionRequest,
}) => {
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

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner.avatarId) || AVATAR_OPTIONS[0];

  const gradeInfo = GRADE_LABELS[learner.grade] || {
    si: `${learner.grade} ශ්‍රේණිය`,
    en: `Grade ${learner.grade}`,
  };

  const getActionLabel = () => {
    switch (learner.onboardingStatus) {
      case 'COMPLETED':
        return 'ප්‍රතිඵල හා නිර්දේශ (View Profile)';
      case 'IN_PROGRESS':
        return 'ඇගයීම ඉදිරියට (Resume Profiling)';
      case 'NOT_STARTED':
      default:
        return 'ආරම්භක ඇගයීම (Start Profiling)';
    }
  };

  return (
    <div className={`bg-white rounded-3xl border transition-all flex flex-col justify-between group relative ${
      learner.isArchived
        ? 'border-amber-200/80 bg-stone-50/50 opacity-90'
        : 'border-mq-border hover:border-mq-primary/40 shadow-xs hover:shadow-md'
    } p-5 sm:p-6`}>
      {/* Top Header: Avatar + Name + Context Menu */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border shrink-0 ${avatar.bgColor} ${avatar.borderColor}`}
              title={avatar.name}
            >
              <span>{avatar.icon}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-mq-text-strong group-hover:text-mq-primary transition-colors flex items-center gap-2 truncate">
                <span className="truncate">{learner.firstName}</span>
                {learner.preferredName && (
                  <span className="text-xs font-medium text-mq-text-muted bg-mq-surface-soft px-2 py-0.5 rounded-full border border-mq-border/50 shrink-0">
                    "{learner.preferredName}"
                  </span>
                )}
              </h3>
              <p className="text-xs text-mq-text-muted font-sinhala font-medium mt-0.5 truncate">
                {avatar.nameSi} ({avatar.name})
              </p>
            </div>
          </div>

          {/* Three-dot context menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary"
              title="Learner Actions (විකල්ප)"
              aria-label={`Options for ${learner.firstName}`}
              aria-expanded={isMenuOpen}
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-mq-border shadow-lg py-1.5 z-30 animate-fade-in text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(learner);
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 text-mq-text-strong hover:bg-mq-surface-soft hover:text-mq-primary transition-colors cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile (පැතිකඩ සංස්කරණය)</span>
                </button>

                {!learner.isArchived ? (
                  onArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onArchive(learner);
                      }}
                      className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Archive size={15} />
                      <span>Archive Learner (සංරක්ෂණය කරන්න)</span>
                    </button>
                  )
                ) : (
                  onRestore && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRestore(learner);
                      }}
                      className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer font-bold"
                    >
                      <RotateCcw size={15} />
                      <span>Restore Learner (නැවත සක්‍රීය කරන්න)</span>
                    </button>
                  )
                )}

                <div className="my-1 border-t border-mq-border/60" />

                {onRequestDeletion && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRequestDeletion(learner);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>Request Permanent Deletion (ස්ථිරව ඉවත් කිරීමට)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Badges Area */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <OnboardingStatusBadge status={learner.onboardingStatus} />

          {learner.isArchived && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Archive size={12} />
              <span>Archived • සංරක්ෂිතයි</span>
            </span>
          )}

          {deletionRequest && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                deletionRequest.status === 'PENDING_REVIEW'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : deletionRequest.status === 'APPROVED'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : deletionRequest.status === 'COMPLETED'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {deletionRequest.status === 'PENDING_REVIEW' && <Clock size={12} />}
              {deletionRequest.status === 'APPROVED' && <CheckCircle2 size={12} />}
              {deletionRequest.status === 'COMPLETED' && <CheckCircle2 size={12} />}
              {deletionRequest.status === 'REJECTED' && <XCircle size={12} />}
              <span>Deletion: {deletionRequest.status.replace('_', ' ')}</span>
            </span>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-primary flex items-center justify-center shrink-0 border border-mq-border/60">
              <GraduationCap size={15} />
            </div>
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                Grade
              </span>
              <span className="font-bold text-mq-text-strong truncate block font-sinhala">
                {gradeInfo.en} ({gradeInfo.si})
              </span>
            </div>
          </div>

          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-secondary flex items-center justify-center shrink-0 border border-mq-border/60">
              <Calendar size={15} />
            </div>
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                Age
              </span>
              <span className="font-bold text-mq-text-strong block truncate">
                {learner.age} Years ({learner.age} වසර)
              </span>
            </div>
          </div>

          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 col-span-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-accent-yellow flex items-center justify-center shrink-0 border border-mq-border/60">
              <Languages size={15} />
            </div>
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                Language Preference (භාෂා මාධ්‍යය)
              </span>
              <span className="font-bold text-mq-text-strong block font-sinhala truncate">
                {learner.preferredLanguage === 'Bilingual'
                  ? `දෙබසම (Bilingual${
                      learner.primaryInstructionLanguage
                        ? ` • Primary: ${learner.primaryInstructionLanguage}`
                        : ''
                    })`
                  : learner.preferredLanguage}
              </span>
              {learner.preferredLanguage === 'Bilingual' &&
                (learner.sinhalaComprehension || learner.englishComprehension) && (
                  <span className="text-[10px] text-mq-text-muted block truncate font-sinhala mt-0.5">
                    {[
                      learner.sinhalaComprehension ? `සිංහල: ${learner.sinhalaComprehension}` : null,
                      learner.englishComprehension ? `EN: ${learner.englishComprehension}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-mq-border/60">
        {learner.isArchived ? (
          <button
            type="button"
            onClick={() => onRestore && onRestore(learner)}
            className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <RotateCcw size={15} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">Restore Profile (නැවත සක්‍රීය කරන්න)</span>
          </button>
        ) : (
          <Link
            to={`/learners/${learner.learnerId}/onboarding`}
            className="w-full btn btn-primary py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all"
          >
            <span className="truncate">{getActionLabel()}</span>
            <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default LearnerCard;


import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Edit3,
  ArrowRight,
  GraduationCap,
  Calendar,
  Languages,
  Gamepad2,
} from 'lucide-react';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import { OnboardingStatusBadge } from './OnboardingStatusBadge';
import { setActiveStudentProfile } from '../utils/activeStudentStorage';

interface LearnerCardProps {
  learner: Learner;
  onEdit: (learner: Learner) => void;
}

const GRADE_LABELS: Record<number, { si: string; en: string }> = {
  1: { si: '1 වන ශ්‍රේණිය', en: 'Grade 1' },
  2: { si: '2 වන ශ්‍රේණිය', en: 'Grade 2' },
  3: { si: '3 වන ශ්‍රේණිය', en: 'Grade 3' },
  4: { si: '4 වන ශ්‍රේණිය', en: 'Grade 4' },
  5: { si: '5 වන ශ්‍රේණිය', en: 'Grade 5' },
};

export const LearnerCard: React.FC<LearnerCardProps> = ({ learner, onEdit }) => {
  const navigate = useNavigate();

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

  const handleOpenStudentGameProfile = () => {
    setActiveStudentProfile(learner);
    const params = new URLSearchParams({
      learnerId: learner.learnerId,
      parentId: learner.parentId,
    });
    navigate(`/student/dashboard?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-mq-primary/40 transition-all flex flex-col justify-between group">
      {/* Top Header: Avatar + Name + Edit */}
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

          <button
            type="button"
            onClick={() => onEdit(learner)}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/60 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mq-primary"
            title="Edit Child Profile"
            aria-label={`Edit ${learner.firstName}'s profile`}
          >
            <Edit3 size={16} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <OnboardingStatusBadge status={learner.onboardingStatus} />
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
                {learner.preferredLanguage}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer: Start / Resume / View Profile + Launch Child Game Profile */}
      <div className="pt-3 border-t border-mq-border/60 space-y-2.5">
        <Link
          to={`/learners/${learner.learnerId}/onboarding`}
          className="w-full btn btn-primary py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all"
        >
          <span className="truncate">{getActionLabel()}</span>
          <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
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
    </div>
  );
};

export default LearnerCard;

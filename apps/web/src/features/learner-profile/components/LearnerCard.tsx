import React from 'react';
import { Link } from 'react-router-dom';
import {
  Edit3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  GraduationCap,
  Calendar,
  Languages,
} from 'lucide-react';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';

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
  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner.avatarId) || AVATAR_OPTIONS[0];

  const gradeInfo = GRADE_LABELS[learner.grade] || {
    si: `${learner.grade} ශ්‍රේණිය`,
    en: `Grade ${learner.grade}`,
  };

  const getStatusBadge = () => {
    switch (learner.onboardingStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-success-bg text-mq-success border border-mq-success/30">
            <CheckCircle2 size={13} />
            <span>සම්පූර්ණයි (Ready)</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary border border-mq-primary/30">
            <Clock size={13} />
            <span>ක්‍රියාත්මකයි (In Progress)</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-warning-bg text-mq-warning border border-mq-warning/30">
            <Sparkles size={13} />
            <span>ආරම්භ කිරීමට ඇත (Needs Profiling)</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      {/* Top Header: Avatar + Name + Edit */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border ${avatar.bgColor} ${avatar.borderColor}`}
              title={avatar.name}
            >
              <span>{avatar.icon}</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-mq-text-strong group-hover:text-mq-primary transition-colors flex items-center gap-2">
                <span>{learner.firstName}</span>
                {learner.preferredName && (
                  <span className="text-xs font-medium text-mq-text-muted bg-mq-surface-soft px-2 py-0.5 rounded-full border border-mq-border/50">
                    "{learner.preferredName}"
                  </span>
                )}
              </h3>
              <p className="text-xs text-mq-text-muted font-sinhala font-medium mt-0.5">
                {avatar.nameSi}
              </p>
            </div>
          </div>

          <button
            onClick={() => onEdit(learner)}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft border border-mq-border/60 transition-colors"
            title="දරුවාගේ තොරතුරු සංස්කරණය (Edit Child Profile)"
            aria-label="Edit child"
          >
            <Edit3 size={16} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-4">{getStatusBadge()}</div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-primary flex items-center justify-center shrink-0 border border-mq-border/60">
              <GraduationCap size={15} />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                ශ්‍රේණිය (Grade)
              </span>
              <span className="font-bold text-mq-text-strong truncate block font-sinhala">
                {gradeInfo.si}
              </span>
            </div>
          </div>

          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-secondary flex items-center justify-center shrink-0 border border-mq-border/60">
              <Calendar size={15} />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                වයස (Age)
              </span>
              <span className="font-bold text-mq-text-strong block">
                {learner.age} වසර (Years)
              </span>
            </div>
          </div>

          <div className="bg-mq-surface-soft p-3 rounded-2xl border border-mq-border/50 col-span-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-mq-accent-yellow flex items-center justify-center shrink-0 border border-mq-border/60">
              <Languages size={15} />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-mq-text-muted block">
                භාෂාව (Language Preference)
              </span>
              <span className="font-bold text-mq-text-strong block font-sinhala">
                {learner.preferredLanguage}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer: Start / Continue Profiling */}
      <div className="pt-3 border-t border-mq-border/60">
        <Link
          to={`/learners/${learner.learnerId}/onboarding`}
          className="w-full btn btn-primary py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm"
        >
          <span>
            {learner.onboardingStatus === 'COMPLETED'
              ? 'ප්‍රතිඵල හා නිර්දේශ (View Profile)'
              : 'ආරම්භක ඇගයීම (Start Profiling)'}
          </span>
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
};

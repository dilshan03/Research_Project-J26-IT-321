import { useState } from 'react';
import { Brain, User, CheckCircle2 } from 'lucide-react';
import type { StudentBehaviorProfile } from '../types';

export interface ArchetypePreset {
  id: string;
  nameEn: string;
  nameSi: string;
  tagline: string;
  icon: string;
  colorClass: string;
  profile: StudentBehaviorProfile;
}

export const ARCHETYPE_PRESETS: ArchetypePreset[] = [
  {
    id: 'INATTENTIVE',
    nameEn: 'Focused Scaffolding (Inattentive)',
    nameSi: 'අවධානය රඳවා ගැනීමේ සහය',
    tagline: 'Minimal distractors, high visual cues, step-by-step guidance.',
    icon: '🎯',
    colorClass: 'border-blue-400 bg-blue-50/70 text-blue-900',
    profile: {
      archetype_id: 'INATTENTIVE',
      student_name: 'Inattentive Profile (අවධානය)',
      inattention_level: 'HIGH',
      impulsivity_level: 'LOW',
      working_memory_support: true,
      activity_pace: 'CALM_STEP_BY_STEP',
      visual_assistance: 'ALWAYS',
      audio_assistance: 'READ_ON_CLICK',
    },
  },
  {
    id: 'IMPULSIVE',
    nameEn: 'Impulse Regulation (Fast Guesser)',
    nameSi: 'ක්ෂණික තේරීම් පාලන සහය',
    tagline: 'Untimed pacing, impulse-brake distractors, calm feedback.',
    icon: '⚡',
    colorClass: 'border-amber-400 bg-amber-50/70 text-amber-900',
    profile: {
      archetype_id: 'IMPULSIVE',
      student_name: 'Impulsive Profile (ක්ෂණික තේරීම්)',
      inattention_level: 'MODERATE',
      impulsivity_level: 'HIGH',
      working_memory_support: true,
      activity_pace: 'CALM_STEP_BY_STEP',
      visual_assistance: 'SOMETIMES',
      audio_assistance: 'READ_ON_CLICK',
    },
  },
  {
    id: 'WORKING_MEMORY',
    nameEn: 'Working Memory Chunking',
    nameSi: 'කෙටි කාලීන මතක සහය',
    tagline: 'Maximal 3-tier micro-steps, visual manipulatives, low cognitive load.',
    icon: '🧩',
    colorClass: 'border-purple-400 bg-purple-50/70 text-purple-900',
    profile: {
      archetype_id: 'WORKING_MEMORY',
      student_name: 'Working Memory Profile (මතක සහය)',
      inattention_level: 'MODERATE',
      impulsivity_level: 'MODERATE',
      working_memory_support: true,
      activity_pace: 'CALM_STEP_BY_STEP',
      visual_assistance: 'ALWAYS',
      audio_assistance: 'READ_EVERYTHING',
    },
  },
  {
    id: 'SENSORY_SENSITIVE',
    nameEn: 'Sensory-Friendly (Low Clutter)',
    nameSi: 'සන්සුන් පරිසර සහය',
    tagline: 'Low visual stimulus, clutter filter ON, soothing Gaja dialogue.',
    icon: '🌿',
    colorClass: 'border-emerald-400 bg-emerald-50/70 text-emerald-900',
    profile: {
      archetype_id: 'SENSORY_SENSITIVE',
      student_name: 'Sensory-Friendly Profile (සන්සුන්)',
      inattention_level: 'HIGH',
      impulsivity_level: 'LOW',
      working_memory_support: false,
      activity_pace: 'CALM_STEP_BY_STEP',
      visual_assistance: 'ALWAYS',
      audio_assistance: 'READ_ON_CLICK',
    },
  },
  {
    id: 'BALANCED',
    nameEn: 'General Classroom (Standard)',
    nameSi: 'සාමාන්‍ය පන්ති කාමරය',
    tagline: 'Standard 2-tier micro-steps, balanced distractors, moderate pace.',
    icon: '📚',
    colorClass: 'border-slate-300 bg-slate-50/70 text-slate-800',
    profile: {
      archetype_id: 'BALANCED',
      student_name: 'General Classroom (සාමාන්‍ය)',
      inattention_level: 'LOW',
      impulsivity_level: 'LOW',
      working_memory_support: false,
      activity_pace: 'REGULAR',
      visual_assistance: 'SOMETIMES',
      audio_assistance: 'READ_ON_CLICK',
    },
  },
];

interface StudentBehaviorSelectorProps {
  selectedProfile: StudentBehaviorProfile | null;
  onSelectProfile: (profile: StudentBehaviorProfile) => void;
  customStudentName: string;
  onCustomStudentNameChange: (name: string) => void;
}

export function StudentBehaviorSelector({
  selectedProfile,
  onSelectProfile,
  customStudentName,
  onCustomStudentNameChange,
}: StudentBehaviorSelectorProps) {
  const [activeArchetypeId, setActiveArchetypeId] = useState<string>(
    selectedProfile?.archetype_id || 'INATTENTIVE'
  );

  const handleSelectPreset = (preset: ArchetypePreset) => {
    setActiveArchetypeId(preset.id);
    onSelectProfile({
      ...preset.profile,
      student_name: customStudentName.trim() || preset.profile.student_name,
    });
  };

  return (
    <div className="rounded-3xl bg-white border border-mq-border p-5 shadow-[var(--mq-shadow-sm)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mq-border pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-mq-text-strong flex items-center gap-2">
            <User size={16} className="text-mq-primary" />
            <span>Target Student & Behavioral Needs (ශිෂ්‍ය චර්යාත්මක අවශ්‍යතා)</span>
          </h3>
          <p className="text-xs text-mq-text-muted mt-0.5">
            Select a student behavioral archetype or enter a learner's name to personalize cognitive load.
          </p>
        </div>

        {/* Student Name Input */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-mq-text-muted whitespace-nowrap">Learner / Group:</label>
          <input
            type="text"
            placeholder="e.g. Kasun / Grade 2 Group A"
            value={customStudentName}
            onChange={(e) => {
              onCustomStudentNameChange(e.target.value);
              if (selectedProfile) {
                onSelectProfile({
                  ...selectedProfile,
                  student_name: e.target.value,
                });
              }
            }}
            className="text-xs px-3 py-1.5 rounded-xl border border-mq-border bg-mq-surface-soft/40 focus:outline-none focus:ring-2 focus:ring-mq-primary/30 w-48 sm:w-56"
          />
        </div>
      </div>

      {/* Preset Archetypes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {ARCHETYPE_PRESETS.map((preset) => {
          const isSelected = activeArchetypeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`text-left p-3 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? `${preset.colorClass} ring-2 ring-mq-primary shadow-xs font-medium`
                  : 'border-mq-border bg-white hover:bg-mq-surface-soft text-mq-text'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{preset.icon}</span>
                  {isSelected && <CheckCircle2 size={15} className="text-mq-primary" />}
                </div>
                <h4 className="text-xs font-bold leading-tight line-clamp-1">{preset.nameEn}</h4>
                <p className="sinhala text-[10px] text-mq-text-muted line-clamp-1 mt-0.5">{preset.nameSi}</p>
                <p className="text-[11px] text-mq-text-muted mt-2 line-clamp-2 leading-relaxed">{preset.tagline}</p>
              </div>

              {/* Behavior Indicators */}
              <div className="mt-3 pt-2 border-t border-mq-border/50 flex flex-wrap gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-white/80 border border-mq-border/60">
                  Inattention: {preset.profile.inattention_level}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/80 border border-mq-border/60">
                  Impulse: {preset.profile.impulsivity_level}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Profile Behavioral Summary Strip */}
      {selectedProfile && (
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-mq-text-muted bg-mq-surface-soft/60 rounded-2xl p-3 border border-mq-border/70">
          <span className="font-bold text-mq-text flex items-center gap-1.5">
            <Brain size={14} className="text-mq-primary" /> Active Behavior Scaffold:
          </span>
          <span className="badge bg-white text-mq-text-strong font-semibold shadow-2xs">
            Pacing: {selectedProfile.activity_pace.replace(/_/g, ' ')}
          </span>
          <span className="badge bg-white text-mq-text-strong font-semibold shadow-2xs">
            Visual Support: {selectedProfile.visual_assistance}
          </span>
          <span className="badge bg-white text-mq-text-strong font-semibold shadow-2xs">
            Audio Prompts: {selectedProfile.audio_assistance.replace(/_/g, ' ')}
          </span>
          <span className="badge bg-white text-mq-text-strong font-semibold shadow-2xs">
            {selectedProfile.working_memory_support ? '🧠 Working Memory Support Active' : 'Normal Memory Load'}
          </span>
        </div>
      )}
    </div>
  );
}

export default StudentBehaviorSelector;

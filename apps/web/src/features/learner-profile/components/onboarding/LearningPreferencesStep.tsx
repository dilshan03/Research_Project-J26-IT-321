import React, { useState } from 'react';
import {
  Eye,
  Volume2,
  Clock,
  HelpCircle,
  ArrowRight,
  Save,
  Loader2,
  Trophy,
} from 'lucide-react';

import type { LearningPreferencesData } from '../../types/onboarding';

interface Props {
  initialData?: Partial<LearningPreferencesData>;
  onSave: (data: LearningPreferencesData) => Promise<void>;
  onSaveAndExit: (data: LearningPreferencesData) => Promise<void>;
  isSaving: boolean;
}

export const LearningPreferencesStep: React.FC<Props> = ({
  initialData,
  onSave,
  onSaveAndExit,
  isSaving,
}) => {
  const [visualAssistance, setVisualAssistance] = useState<
    'always' | 'sometimes' | 'minimal'
  >(initialData?.visualAssistance || 'always');

  const [audioAssistance, setAudioAssistance] = useState<
    'read_everything' | 'read_on_click' | 'off'
  >(initialData?.audioAssistance || 'read_everything');

  const [activityPace, setActivityPace] = useState<
    'calm_step_by_step' | 'regular' | 'flexible'
  >(initialData?.activityPace || 'calm_step_by_step');

  const [hintStyle, setHintStyle] = useState<
    'visual_clue' | 'step_guide' | 'audio_hint'
  >(initialData?.hintStyle || 'visual_clue');

  const [celebrationStyle, setCelebrationStyle] = useState<
    'gentle_star' | 'badge_sound' | 'minimal'
  >(initialData?.celebrationStyle || 'gentle_star');

  const [additionalNotes, setAdditionalNotes] = useState(
    initialData?.additionalNotes || ''
  );

  const getPayload = (): LearningPreferencesData => ({
    version: 'LEARNING-PREF-v1.0',
    visualAssistance,
    audioAssistance,
    activityPace,
    hintStyle,
    celebrationStyle,
    additionalNotes: additionalNotes.trim() ? additionalNotes.trim() : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(getPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary mb-2">
          <span>පියවර 1 (Step 1 of 5)</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong font-sinhala">
          දරුවාගේ ඉගෙනුම් මනාපයන් (Learning Preferences)
        </h2>
        <p className="text-xs sm:text-sm text-mq-text-muted mt-1 leading-relaxed font-sinhala">
          සෑම දරුවෙකුම ඉගෙන ගන්නේ තමන්ටම ආවේණික වූ පහසු ක්‍රමයකටය. මෙම තොරතුරු දරුවා සඳහා අනුවර්තී අභ්‍යාස නිර්මාණයට යොදා ගැනේ. (දරුවන් කිසිදු ස්ථිර කාණ්ඩයකට සීමා නොකෙරේ).
        </p>
      </div>

      {/* Question 1: Visual Assistance */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
            <Eye size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              1. දෘශ්‍ය උපකාර (Visual Illustrations & Icons)
            </h3>
            <p className="text-xs text-mq-text-muted">
              How often does the child find pictures and visual counters helpful?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'always',
              titleSi: 'නිතරම රූප සමඟ',
              titleEn: 'Rich Visuals & Counters',
              descSi: 'සෑම ගණිත ගැටලුවකටම රූප සටහන් සහ අයිකන ඇතුළත් කිරීම.',
            },
            {
              value: 'sometimes',
              titleSi: 'සමහර විට පමණක්',
              titleEn: 'Selective Visuals',
              descSi: 'අවශ්‍ය වන සංකීර්ණ ගැටලුවලට පමණක් රූප උපකාර සැපයීම.',
            },
            {
              value: 'minimal',
              titleSi: 'අවම දෘශ්‍ය භාවිතය',
              titleEn: 'Clean & Minimal',
              descSi: 'සරල, අවධානය නොවිසිරෙන සංඛ්‍යාත්මක ආකාරය.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setVisualAssistance(opt.value as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                visualAssistance === opt.value
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
              }`}
            >
              <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                {opt.titleSi}
              </span>
              <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                {opt.titleEn}
              </span>
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala leading-normal">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Question 2: Audio Assistance */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-green text-mq-success flex items-center justify-center shrink-0">
            <Volume2 size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              2. සිංහල ශ්‍රව්‍ය කියවීම් සහාය (Spoken Audio Assistance)
            </h3>
            <p className="text-xs text-mq-text-muted">
              Preferences for reading questions aloud in natural Sinhala.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'read_everything',
              titleSi: 'ස්වයංක්‍රීයව කියවීම',
              titleEn: 'Auto-Read All Prompts',
              descSi: 'ප්‍රශ්නය පෙන්වන විටම සිංහලෙන් කියවීම ආරම්භ වේ.',
            },
            {
              value: 'read_on_click',
              titleSi: 'ක්ලික් කළ විට පමණක්',
              titleEn: 'Read on Click (Audio Button)',
              descSi: 'දරුවා ශබ්ද අයිකනය තද කළ විට පමණක් කියවනු ලැබේ.',
            },
            {
              value: 'off',
              titleSi: 'නිහඬ ප්‍රකාරය',
              titleEn: 'Silent / Reading Only',
              descSi: 'ශ්‍රව්‍ය නැතිව තනිව කියවීමට කැමති දරුවන් සඳහා.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setAudioAssistance(opt.value as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                audioAssistance === opt.value
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
              }`}
            >
              <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                {opt.titleSi}
              </span>
              <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                {opt.titleEn}
              </span>
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala leading-normal">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Question 3: Activity Pace */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-yellow text-mq-warning flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              3. ඉගෙනුම් වේගය හා කාල කළමනාකරණය (Pacing & Task Flow)
            </h3>
            <p className="text-xs text-mq-text-muted">
              Pacing preferences with no stressful timers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'calm_step_by_step',
              titleSi: 'සන්සුන්, පියවරෙන් පියවර',
              titleEn: 'Calm & Step-by-Step',
              descSi: 'එක් වරකට එක් කුඩා පියවරක් පමණක් ඉදිරිපත් කිරීම.',
            },
            {
              value: 'regular',
              titleSi: 'සාමාන්‍ය වේගය',
              titleEn: 'Standard Activity Pace',
              descSi: 'සාමාන්‍ය පරිදි ගලායන අභ්‍යාස මාලාව.',
            },
            {
              value: 'flexible',
              titleSi: 'නම්‍යශීලී විවේක සහිතව',
              titleEn: 'Frequent Rest Breaks',
              descSi: 'අවධානය පවත්වා ගැනීමට නිතර කෙටි විවේක මතක් කිරීම්.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setActivityPace(opt.value as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activityPace === opt.value
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
              }`}
            >
              <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                {opt.titleSi}
              </span>
              <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                {opt.titleEn}
              </span>
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala leading-normal">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Question 4: Hint Style */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center shrink-0">
            <HelpCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              4. ඉඟි සහ උපකාරක ක්‍රමය (Hint Style When Stuck)
            </h3>
            <p className="text-xs text-mq-text-muted">
              How does the child prefer hints to be shown?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'visual_clue',
              titleSi: 'දෘශ්‍ය ඉඟි',
              titleEn: 'Visual Highlights',
              descSi: 'අදාළ කොටස පාට කිරීමෙන් හෝ ඊතල මගින් පෙන්වීම.',
            },
            {
              value: 'step_guide',
              titleSi: 'පියවරෙන් පියවර මගපෙන්වීම',
              titleEn: 'Guided Micro-Steps',
              descSi: 'ගැටලුව කුඩා පියවර 2කට කඩා විසඳීමට උපකාර වීම.',
            },
            {
              value: 'audio_hint',
              titleSi: 'මිත්‍රශීලී කටහඬ ඉඟියක්',
              titleEn: 'Spoken Encouragement',
              descSi: 'මිත්‍රශීලී සහයකයාගෙන් කටහඬින් දෙනු ලබන ඉඟියක්.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setHintStyle(opt.value as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                hintStyle === opt.value
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
              }`}
            >
              <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                {opt.titleSi}
              </span>
              <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                {opt.titleEn}
              </span>
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala leading-normal">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Question 5: Celebration Style */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-yellow text-mq-warning flex items-center justify-center shrink-0">
            <Trophy size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              5. ඇගයීම් සහ දිරිගැන්වීම් විලාසය (Reward & Feedback Style)
            </h3>
            <p className="text-xs text-mq-text-muted">
              How does the child prefer task accomplishments to be celebrated?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'gentle_star',
              titleSi: 'තරු සහ සන්සුන් සිනහවක්',
              titleEn: 'Gentle Stars',
              descSi: 'සන්සුන් තරු ලාංඡනයක් පෙන්වීම.',
            },
            {
              value: 'badge_sound',
              titleSi: 'ශබ්ද සහ ලාංඡන සහිතව',
              titleEn: 'Badges & Cheerful Sounds',
              descSi: 'සතුටුදායක ශබ්දයක් සහ ලාංඡනයක් පිරිනැමීම.',
            },
            {
              value: 'minimal',
              titleSi: 'සරල, අවම ඇගයීමක්',
              titleEn: 'Minimal Distraction',
              descSi: 'අවධානය නොකැඩෙන සරල "හරි" සංඥාවක්.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setCelebrationStyle(opt.value as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                celebrationStyle === opt.value
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-mq-surface-soft/40'
              }`}
            >
              <span className="block text-sm font-bold text-mq-text-strong font-sinhala">
                {opt.titleSi}
              </span>
              <span className="block text-xs font-semibold text-mq-primary mt-0.5">
                {opt.titleEn}
              </span>
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala leading-normal">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>

        {/* Optional Notes */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-mq-text-strong font-sinhala mb-1">
            වෙනත් විශේෂ ඉගෙනුම් සටහන් (Optional Additional Notes):
          </label>
          <input
            type="text"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="දරුවා කැමති විශේෂ විෂය ක්ෂේත්‍ර හෝ කැමැත්තන්..."
            className="w-full text-xs py-2 px-3 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Action Buttons: Next & Save & Exit */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSaveAndExit(getPayload())}
          className="btn btn-secondary w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center justify-center gap-2"
        >
          <Save size={15} />
          <span>සුරැක පසුව සම්පූර්ණ කරන්න (Save & Resume Later)</span>
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary w-full sm:w-auto px-7 py-2.5 rounded-full text-sm font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>මීළඟ පියවර: SNAP-IV ප්‍රශ්නාවලිය</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

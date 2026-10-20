import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Eye,
  Volume2,
  Clock,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

import type { LearningPreferencesData } from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';
import { ChoiceQuestion } from './ChoiceQuestion';

interface Props {
  initialData?: Partial<LearningPreferencesData>;
  onSave: (data: LearningPreferencesData) => Promise<void>;
  onSaveAndExit: (data: LearningPreferencesData) => Promise<void>;
  onBack?: () => void;
  isSaving: boolean;
}

const t = parentText.preferences;

type PreferenceField = 'visualAssistance' | 'audioAssistance' | 'activityPace' | 'hintStyle' | 'celebrationStyle';

// Option values are the stored API values; only their labels come from the dictionary.
const QUESTIONS: { field: PreferenceField; values: string[]; Icon: LucideIcon; tone: string }[] = [
  { field: 'visualAssistance', values: ['always', 'sometimes', 'minimal'], Icon: Eye, tone: 'bg-mq-surface-blue text-mq-primary' },
  { field: 'audioAssistance', values: ['read_everything', 'read_on_click', 'off'], Icon: Volume2, tone: 'bg-mq-surface-green text-mq-success' },
  { field: 'activityPace', values: ['calm_step_by_step', 'regular', 'flexible'], Icon: Clock, tone: 'bg-mq-surface-yellow text-mq-warning' },
  { field: 'hintStyle', values: ['visual_clue', 'step_guide', 'audio_hint'], Icon: HelpCircle, tone: 'bg-mq-surface-purple text-mq-accent-purple' },
  { field: 'celebrationStyle', values: ['gentle_star', 'badge_sound', 'minimal'], Icon: Trophy, tone: 'bg-mq-surface-pink text-mq-accent-pink' },
];

export const LearningPreferencesStep: React.FC<Props> = ({
  initialData,
  onSave,
  onSaveAndExit,
  onBack,
  isSaving,
}) => {
  const [values, setValues] = useState<Record<PreferenceField, string>>({
    visualAssistance: initialData?.visualAssistance || 'always',
    audioAssistance: initialData?.audioAssistance || 'read_everything',
    activityPace: initialData?.activityPace || 'calm_step_by_step',
    hintStyle: initialData?.hintStyle || 'visual_clue',
    celebrationStyle: initialData?.celebrationStyle || 'gentle_star',
  });
  const [additionalNotes, setAdditionalNotes] = useState(initialData?.additionalNotes || '');

  const getPayload = (): LearningPreferencesData => ({
    version: 'LEARNING-PREF-v1.0',
    visualAssistance: values.visualAssistance as LearningPreferencesData['visualAssistance'],
    audioAssistance: values.audioAssistance as LearningPreferencesData['audioAssistance'],
    activityPace: values.activityPace as LearningPreferencesData['activityPace'],
    hintStyle: values.hintStyle as LearningPreferencesData['hintStyle'],
    celebrationStyle: values.celebrationStyle as LearningPreferencesData['celebrationStyle'],
    additionalNotes: additionalNotes.trim() ? additionalNotes.trim() : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(getPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-blue text-mq-primary">
          {parentText.onboarding.stepOf(3)}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-mq-text-strong">{t.title}</h2>
        <p className="text-base text-mq-text-muted leading-relaxed">{t.intro}</p>
      </div>

      {QUESTIONS.map(({ field, values: optionValues, Icon, tone }, idx) => {
        const group = t[field] as unknown as Record<string, { title: string; desc: string }> & { question: string; help: string };
        return (
          <ChoiceQuestion
            key={field}
            number={idx + 1}
            icon={<Icon size={18} />}
            iconTone={tone}
            question={group.question}
            help={group.help}
            options={optionValues.map((value) => ({ value, title: group[value].title, desc: group[value].desc }))}
            selected={values[field]}
            onSelect={(value) => setValues((prev) => ({ ...prev, [field]: value }))}
          />
        );
      })}

      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs">
        <label htmlFor="pref-notes" className="block text-sm font-semibold text-mq-text-strong mb-2">
          {t.notes}
        </label>
        <input
          id="pref-notes"
          type="text"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
          className="w-full text-base py-2.5 px-3.5 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row gap-3">
          {onBack && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>{parentText.common.back}</span>
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSaveAndExit(getPayload())}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
          >
            <Save size={16} />
            <span>{parentText.common.saveAndExit}</span>
          </motion.button>
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={isSaving}
          className="btn btn-primary min-h-[48px] px-7 rounded-full text-base inline-flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <span>{parentText.common.saveAndContinue}</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Home,
  Users,
  Smile,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Users2,
  SkipForward,
  type LucideIcon,
} from 'lucide-react';

import type { SocialContextData } from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';
import { ChoiceQuestion } from './ChoiceQuestion';

interface Props {
  initialData?: Partial<SocialContextData>;
  onSave: (data: SocialContextData) => Promise<void>;
  onSaveAndExit: (data: SocialContextData) => Promise<void>;
  onBack: () => void;
  /** Social context is optional; skipping continues without saving. */
  onSkip?: () => void;
  isSaving: boolean;
}

const t = parentText.social;

type SocialField = 'learningEnvironment' | 'peerCollaboration' | 'parentInvolvement' | 'challengingTaskSupport';

// Option values are the stored API values; only their labels come from the dictionary.
const QUESTIONS: { field: SocialField; values: string[]; Icon: LucideIcon; tone: string }[] = [
  { field: 'learningEnvironment', values: ['quiet_room', 'shared_living_space', 'flexible_movement'], Icon: Home, tone: 'bg-mq-surface-blue text-mq-primary' },
  { field: 'peerCollaboration', values: ['independent_first', 'with_sibling_peer', 'group_friendly'], Icon: Users, tone: 'bg-mq-surface-green text-mq-success' },
  { field: 'parentInvolvement', values: ['guided_together', 'check_in_after', 'child_independent'], Icon: Users2, tone: 'bg-mq-surface-purple text-mq-accent-purple' },
  { field: 'challengingTaskSupport', values: ['take_a_break', 'break_down_step', 'parent_hug_reassurance'], Icon: Smile, tone: 'bg-mq-surface-yellow text-mq-warning' },
];

export const SocialContextStep: React.FC<Props> = ({
  initialData,
  onSave,
  onSaveAndExit,
  onBack,
  onSkip,
  isSaving,
}) => {
  const [values, setValues] = useState<Record<SocialField, string>>({
    learningEnvironment: initialData?.learningEnvironment || 'quiet_room',
    peerCollaboration: initialData?.peerCollaboration || 'independent_first',
    parentInvolvement: initialData?.parentInvolvement || 'guided_together',
    challengingTaskSupport: initialData?.challengingTaskSupport || 'take_a_break',
  });
  const [optionalNotes, setOptionalNotes] = useState<string>(initialData?.optionalNotes || '');

  const getPayload = (): SocialContextData => ({
    version: 'SOCIAL-CONTEXT-v1.0',
    learningEnvironment: values.learningEnvironment,
    peerCollaboration: values.peerCollaboration,
    parentInvolvement: values.parentInvolvement,
    challengingTaskSupport: values.challengingTaskSupport,
    optionalNotes: optionalNotes.trim() ? optionalNotes.trim() : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(getPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-yellow text-mq-warning">
            {parentText.onboarding.stepOf(4)}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-mq-surface-soft text-mq-text-muted border border-mq-border">
            {parentText.common.optional}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-mq-text-strong">{t.title}</h2>
        <p className="text-base text-mq-text-muted leading-relaxed">{t.intro}</p>
      </div>

      {QUESTIONS.map(({ field, values: optionValues, Icon, tone }, idx) => {
        const group = t[field] as unknown as Record<string, { title: string; desc: string }> & { question: string };
        return (
          <ChoiceQuestion
            key={field}
            number={idx + 1}
            icon={<Icon size={18} />}
            iconTone={tone}
            question={group.question}
            options={optionValues.map((value) => ({ value, title: group[value].title, desc: group[value].desc }))}
            selected={values[field]}
            onSelect={(value) => setValues((prev) => ({ ...prev, [field]: value }))}
          />
        );
      })}

      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs">
        <label htmlFor="social-notes" className="block text-sm font-semibold text-mq-text-strong mb-2">
          {t.notes}
        </label>
        <input
          id="social-notes"
          type="text"
          value={optionalNotes}
          onChange={(e) => setOptionalNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
          className="w-full text-base py-2.5 px-3.5 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col-reverse lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>{parentText.common.back}</span>
          </motion.button>
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

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {onSkip && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={isSaving}
              onClick={onSkip}
              className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm inline-flex items-center justify-center gap-2"
            >
              <SkipForward size={16} />
              <span>{parentText.common.skipForNow}</span>
            </motion.button>
          )}
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
      </div>
    </form>
  );
};

import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, UserPen, AlertCircle, Check, Languages, Info } from 'lucide-react';
import type {
  Learner,
  CreateLearnerData,
  UpdateLearnerData,
  LanguageComprehensionLevel,
  PrimaryInstructionLanguage,
} from '../types';
import { AVATAR_OPTIONS } from '../types';
import { parentText } from '../../../shared/i18n/parentText';
import { ParentModalShell } from './parent/ParentModalShell';
import { comprehensionLabel } from './parent/labels';

interface LearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLearnerData | UpdateLearnerData) => Promise<boolean>;
  editingLearner?: Learner | null;
}

// Stored values stay in English; only their display labels are localized.
const COMPREHENSION_LEVELS: { level: LanguageComprehensionLevel; dots: number }[] = [
  { level: 'Understands a little', dots: 1 },
  { level: 'Understands basic instructions', dots: 2 },
  { level: 'Understands well', dots: 3 },
];

const LANGUAGE_IDS = ['Sinhala', 'English', 'Bilingual'] as const;
const AGES = [6, 7, 8, 9, 10];
const GRADES = [1, 2, 3, 4, 5];

const t = parentText.childForm;

const choiceClass = (isSelected: boolean) =>
  `rounded-xl border font-semibold transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-mq-primary/40 ${
    isSelected
      ? 'bg-mq-surface-blue border-mq-primary text-mq-primary ring-1 ring-mq-primary/30'
      : 'bg-white border-mq-border text-mq-text hover:border-mq-primary/50'
  }`;

const inputClass = (hasError: boolean) =>
  `w-full py-3 px-4 rounded-xl border text-base outline-hidden transition-colors ${
    hasError
      ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20'
      : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
  }`;

const FieldLabel: React.FC<{ htmlFor?: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
  htmlFor,
  required,
  hint,
  children,
}) => (
  <div className="flex items-baseline justify-between gap-3 mb-2">
    <label htmlFor={htmlFor} className="text-sm font-semibold text-mq-text-strong">
      {children}
      {required && <span className="text-mq-danger ml-0.5">*</span>}
    </label>
    {hint && <span className="text-xs text-mq-text-muted shrink-0">{hint}</span>}
  </div>
);

export const LearnerModal: React.FC<LearnerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLearner,
}) => {
  const isEditing = Boolean(editingLearner);

  const [firstName, setFirstName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [age, setAge] = useState<number>(7);
  const [grade, setGrade] = useState<number>(2);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('Sinhala');
  const [sinhalaComprehension, setSinhalaComprehension] = useState<string>('');
  const [englishComprehension, setEnglishComprehension] = useState<string>('');
  const [primaryInstructionLanguage, setPrimaryInstructionLanguage] =
    useState<PrimaryInstructionLanguage>('Sinhala');
  const [avatarId, setAvatarId] = useState<string>('avatar_lion');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLearner) {
      setFirstName(editingLearner.firstName || '');
      setPreferredName(editingLearner.preferredName || '');
      setAge(typeof editingLearner.age === 'number' ? editingLearner.age : 7);
      setGrade(typeof editingLearner.grade === 'number' ? editingLearner.grade : 2);
      setPreferredLanguage(editingLearner.preferredLanguage || 'Sinhala');
      setSinhalaComprehension(editingLearner.sinhalaComprehension || '');
      setEnglishComprehension(editingLearner.englishComprehension || '');
      setPrimaryInstructionLanguage(
        (editingLearner.primaryInstructionLanguage as PrimaryInstructionLanguage) || 'Sinhala'
      );
      setAvatarId(editingLearner.avatarId || 'avatar_lion');
    } else {
      setFirstName('');
      setPreferredName('');
      setAge(7);
      setGrade(2);
      setPreferredLanguage('Sinhala');
      setSinhalaComprehension('');
      setEnglishComprehension('');
      setPrimaryInstructionLanguage('Sinhala');
      setAvatarId('avatar_lion');
    }
    setFormErrors({});
    setSubmitError(null);
  }, [editingLearner, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = t.errorFirstNameRequired;
    } else if (firstName.trim().length < 2) {
      errors.firstName = t.errorFirstNameShort;
    }

    // Age and Grade remain strictly independent
    if (age < 6 || age > 10) {
      errors.age = t.errorAge;
    }

    if (grade < 1 || grade > 5) {
      errors.grade = t.errorGrade;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const isBilingual = preferredLanguage === 'Bilingual';
      const payload: CreateLearnerData | UpdateLearnerData = {
        firstName: firstName.trim(),
        preferredName: preferredName.trim() || undefined,
        age,
        grade,
        preferredLanguage,
        sinhalaComprehension: isBilingual && sinhalaComprehension ? sinhalaComprehension : undefined,
        englishComprehension: isBilingual && englishComprehension ? englishComprehension : undefined,
        primaryInstructionLanguage: isBilingual ? primaryInstructionLanguage : undefined,
        avatarId,
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
      } else {
        setSubmitError(parentText.common.saveFailed);
      }
    } catch {
      setSubmitError(parentText.common.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComprehension = (
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    label: string
  ) => (
    <div>
      <FieldLabel hint={parentText.common.optional}>{label}</FieldLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {COMPREHENSION_LEVELS.map((opt) => {
          const isSelected = value === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setValue((prev) => (prev === opt.level ? '' : opt.level))}
              className={`${choiceClass(isSelected)} min-h-[48px] px-3 py-2 text-sm text-left flex items-center justify-between gap-2`}
            >
              <span className="leading-snug">{comprehensionLabel(opt.level)}</span>
              <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                {[1, 2, 3].map((d) => (
                  <span
                    key={d}
                    className={`w-1.5 h-1.5 rounded-full ${
                      d <= opt.dots ? (isSelected ? 'bg-mq-primary' : 'bg-mq-text-muted') : 'bg-mq-border'
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <ParentModalShell
      isOpen={isOpen}
      size="lg"
      title={isEditing ? t.editTitle : t.createTitle}
      subtitle={isEditing ? t.editSubtitle : t.createSubtitle}
      icon={isEditing ? <UserPen size={22} /> : <UserPlus size={22} />}
      onClose={onClose}
      isBusy={isSubmitting}
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary min-h-[44px] px-5 rounded-full text-sm w-full sm:w-auto"
          >
            {parentText.common.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary min-h-[44px] px-6 rounded-full text-sm w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{parentText.common.saving}</span>
              </>
            ) : (
              <span>{isEditing ? t.saveEdit : t.saveNew}</span>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {submitError && (
          <div role="alert" className="p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-xl flex items-start gap-2.5 text-sm text-mq-danger">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Avatar */}
        <fieldset>
          <legend className="text-sm font-semibold text-mq-text-strong mb-2">{t.avatar}</legend>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {AVATAR_OPTIONS.map((item) => {
              const isSelected = avatarId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setAvatarId(item.id)}
                  className={`${choiceClass(isSelected)} relative min-h-[88px] p-2 flex flex-col items-center justify-center gap-1`}
                >
                  <span className="text-3xl leading-none" aria-hidden="true">{item.icon}</span>
                  <span className="text-xs font-medium text-mq-text leading-tight text-center">{item.nameSi}</span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-mq-primary text-white rounded-full flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel htmlFor="child-first-name" required>{t.firstName}</FieldLabel>
            <input
              id="child-first-name"
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (formErrors.firstName) {
                  setFormErrors((prev) => ({ ...prev, firstName: '' }));
                }
              }}
              placeholder={t.firstNamePlaceholder}
              aria-invalid={Boolean(formErrors.firstName)}
              className={inputClass(Boolean(formErrors.firstName))}
            />
            {formErrors.firstName && <p className="text-sm text-mq-danger mt-1.5">{formErrors.firstName}</p>}
          </div>
          <div>
            <FieldLabel htmlFor="child-preferred-name" hint={parentText.common.optional}>
              {t.preferredName}
            </FieldLabel>
            <input
              id="child-preferred-name"
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder={t.preferredNamePlaceholder}
              className={inputClass(false)}
            />
          </div>
        </div>

        {/* Age and grade (independent of each other) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <fieldset>
            <FieldLabel required hint={t.ageHelp}>{t.age}</FieldLabel>
            <div className="grid grid-cols-5 gap-2">
              {AGES.map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={age === num}
                  onClick={() => setAge(num)}
                  className={`${choiceClass(age === num)} min-h-[46px] text-base`}
                >
                  {num}
                </button>
              ))}
            </div>
            {formErrors.age && <p className="text-sm text-mq-danger mt-1.5">{formErrors.age}</p>}
          </fieldset>
          <fieldset>
            <FieldLabel required hint={t.gradeHelp}>{t.grade}</FieldLabel>
            <div className="grid grid-cols-5 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={grade === g}
                  onClick={() => setGrade(g)}
                  className={`${choiceClass(grade === g)} min-h-[46px] text-base`}
                >
                  {g}
                </button>
              ))}
            </div>
            {formErrors.grade && <p className="text-sm text-mq-danger mt-1.5">{formErrors.grade}</p>}
          </fieldset>
        </div>

        {/* Learning language */}
        <fieldset>
          <FieldLabel>{t.language}</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={preferredLanguage === id}
                onClick={() => setPreferredLanguage(id)}
                className={`${choiceClass(preferredLanguage === id)} min-h-[48px] px-2 text-sm`}
              >
                {parentText.languages[id]}
              </button>
            ))}
          </div>
        </fieldset>

        {preferredLanguage === 'Bilingual' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-mq-surface-soft border border-mq-border space-y-5">
            <div className="flex items-start gap-2.5">
              <Languages size={18} className="text-mq-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-mq-text-strong">{t.bilingualTitle}</p>
                <p className="text-sm text-mq-text-muted">{t.bilingualHelp}</p>
              </div>
            </div>

            <div>
              <FieldLabel>{t.mainLanguage}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {(['Sinhala', 'English'] as PrimaryInstructionLanguage[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={primaryInstructionLanguage === id}
                    onClick={() => setPrimaryInstructionLanguage(id)}
                    className={`${choiceClass(primaryInstructionLanguage === id)} min-h-[46px] px-3 text-sm`}
                  >
                    {parentText.languages[id]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-mq-text-muted mt-1.5">{t.mainLanguageHelp}</p>
            </div>

            {renderComprehension(sinhalaComprehension, setSinhalaComprehension, t.sinhalaUnderstanding)}
            {renderComprehension(englishComprehension, setEnglishComprehension, t.englishUnderstanding)}

            <p className="flex items-start gap-2 text-xs text-mq-text-muted">
              <Info size={14} className="shrink-0 mt-0.5 text-mq-primary" />
              <span>{t.understandingNote}</span>
            </p>
          </div>
        )}

        <p className="text-xs text-mq-text-muted">{parentText.common.requiredNote}</p>
      </div>
    </ParentModalShell>
  );
};

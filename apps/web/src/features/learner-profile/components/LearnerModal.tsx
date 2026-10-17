import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle, Check, Languages, HelpCircle } from 'lucide-react';
import type {
  Learner,
  CreateLearnerData,
  UpdateLearnerData,
  LanguageComprehensionLevel,
  PrimaryInstructionLanguage,
} from '../types';
import { AVATAR_OPTIONS } from '../types';

interface LearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLearnerData | UpdateLearnerData) => Promise<boolean>;
  editingLearner?: Learner | null;
}

const COMPREHENSION_OPTIONS: {
  level: LanguageComprehensionLevel;
  labelEn: string;
  labelSi: string;
  dots: number;
}[] = [
  {
    level: 'Understands a little',
    labelEn: 'Understands a little',
    labelSi: 'සුළු වශයෙන්',
    dots: 1,
  },
  {
    level: 'Understands basic instructions',
    labelEn: 'Understands basic instructions',
    labelSi: 'මූලික උපදෙස්',
    dots: 2,
  },
  {
    level: 'Understands well',
    labelEn: 'Understands well',
    labelSi: 'හොඳින් තේරුම් ගනී',
    dots: 3,
  },
];

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
      errors.firstName = 'දරුවාගේ නම ඇතුළත් කරන්න (First name is required).';
    } else if (firstName.trim().length < 2) {
      errors.firstName = 'නම අකුරු 2කට වඩා වැඩි විය යුතුය (At least 2 characters).';
    }

    // Age and Grade remain strictly independent
    if (age < 6 || age > 10) {
      errors.age = 'වයස අවුරුදු 6 ත් 10 ත් අතර විය යුතුය (Age must be between 6 and 10).';
    }

    if (grade < 1 || grade > 5) {
      errors.grade = 'ශ්‍රේණිය 1 සිට 5 දක්වා විය යුතුය (Grade must be 1 to 5).';
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
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save child profile.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white rounded-3xl border border-mq-border shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-mq-surface-soft border-b border-mq-border/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mq-surface-blue text-mq-primary flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-mq-text-strong font-sinhala leading-snug">
                {isEditing ? 'දරුවාගේ තොරතුරු සංස්කරණය' : 'නව දරුවෙකු ලියාපදිංචි කිරීම'}
              </h2>
              <p className="text-xs text-mq-text-muted">
                {isEditing ? 'Edit Child Learner Profile' : 'Register Child Learner Profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-white border border-transparent hover:border-mq-border transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {submitError && (
            <div className="p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Child Avatar Picker */}
          <div>
            <label className="block text-xs font-bold text-mq-text-strong mb-1.5 font-sinhala">
              චරිත රූපය තෝරන්න <span className="text-mq-text-muted font-normal">(Select Child's Avatar)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((item) => {
                const isSelected = avatarId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAvatarId(item.id)}
                    className={`min-h-[72px] p-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-mq-primary/40 focus-visible:outline-hidden ${
                      isSelected
                        ? 'bg-mq-surface-blue border-mq-primary shadow-xs ring-1 ring-mq-primary/30'
                        : 'bg-mq-surface-soft border-mq-border hover:border-mq-primary/40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-0.5">{item.icon}</span>
                    <span className="text-[10px] font-bold text-mq-text truncate font-sinhala">
                      {item.nameSi}
                    </span>
                    {isSelected && (
                      <span className="w-3.5 h-3.5 bg-mq-primary text-white rounded-full flex items-center justify-center mt-0.5">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-mq-text-strong mb-1.5 font-sinhala">
                දරුවාගේ නම (First Name) <span className="text-mq-danger">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (formErrors.firstName) {
                    setFormErrors((prev) => ({ ...prev, firstName: '' }));
                  }
                }}
                placeholder="උදා: කසුන් / Kasun"
                className={`w-full py-2.5 px-3.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                  formErrors.firstName
                    ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20'
                    : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
                }`}
              />
              {formErrors.firstName && (
                <p className="text-xs text-mq-danger font-medium mt-1 font-sinhala">
                  {formErrors.firstName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-mq-text-strong mb-1.5 font-sinhala">
                අමතන කෙටි නම (Preferred Name)
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="උදා: කසූ / Kasu (Optional)"
                className="w-full py-2.5 px-3.5 rounded-2xl border border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20 text-sm font-semibold outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Independent Age and Grade Pickers */}
          <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/70 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs font-bold text-mq-text-strong font-sinhala">
                වයස සහ පාසල් ශ්‍රේණිය (Age & Grade)
              </span>
              <span className="text-[11px] text-mq-text-muted font-sinhala">
                ස්වාධීන තේරීම් • එකිනෙක මත රඳා නොපවතී
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Age Picker (6-10) */}
              <div>
                <label className="block text-xs font-semibold text-mq-text mb-1.5 font-sinhala">
                  වයස: අවුරුදු 6–10 (Age) <span className="text-mq-danger">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[6, 7, 8, 9, 10].map((num) => {
                    const isSelected = age === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAge(num)}
                        aria-pressed={isSelected}
                        className={`min-h-[42px] py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-mq-primary/40 focus-visible:outline-hidden ${
                          isSelected
                            ? 'bg-mq-primary text-white border-mq-primary shadow-xs ring-1 ring-mq-primary/30'
                            : 'bg-white border-mq-border text-mq-text hover:border-mq-primary/40'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-mq-text-muted mt-1 font-sinhala">
                  දරුවාට ගැලපෙන ආමන්ත්‍රණයට යොදා ගැනේ
                </p>
              </div>

              {/* Grade Picker (1-5) */}
              <div>
                <label className="block text-xs font-semibold text-mq-text mb-1.5 font-sinhala">
                  පාසල් ශ්‍රේණිය: 1–5 (Enrolled Grade) <span className="text-mq-danger">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((g) => {
                    const isSelected = grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        aria-pressed={isSelected}
                        className={`min-h-[42px] py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-mq-secondary/40 focus-visible:outline-hidden ${
                          isSelected
                            ? 'bg-mq-secondary text-white border-mq-secondary shadow-xs ring-1 ring-mq-secondary/30'
                            : 'bg-white border-mq-border text-mq-text hover:border-mq-secondary/40'
                        }`}
                      >
                        G-{g}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-mq-text-muted mt-1 font-sinhala">
                  ගණිත විෂය නිර්දේශ මට්ටම තීරණය කරයි
                </p>
              </div>
            </div>
          </div>

          {/* Preferred Language Picker */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-mq-text-strong mb-1.5 font-sinhala">
                උපදෙස් භාෂාව (Instructional Language)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Sinhala', labelSi: 'සිංහල', labelEn: 'Sinhala' },
                  { id: 'English', labelSi: 'English', labelEn: 'English' },
                  { id: 'Bilingual', labelSi: 'දෙබසම', labelEn: 'Bilingual' },
                ].map((lang) => {
                  const isSelected = preferredLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setPreferredLanguage(lang.id)}
                      className={`min-h-[46px] py-2 px-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center focus-visible:ring-2 focus-visible:ring-mq-primary/40 focus-visible:outline-hidden ${
                        isSelected
                          ? 'bg-mq-surface-blue border-mq-primary text-mq-primary shadow-xs ring-1 ring-mq-primary/30'
                          : 'bg-white border-mq-border text-mq-text-muted hover:border-mq-primary/40'
                      }`}
                    >
                      <span className="font-sinhala leading-tight">{lang.labelSi}</span>
                      <span className="text-[10px] font-normal opacity-80">{lang.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bilingual Comprehensive Options (Shown when Bilingual is selected) */}
            {preferredLanguage === 'Bilingual' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-mq-surface-soft border border-mq-border space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 border-b border-mq-border/70 pb-2.5">
                  <Languages size={17} className="text-mq-primary shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-mq-text-strong font-sinhala">
                      දෙබස් ඉගෙනුම් මනාප (Bilingual Preferences)
                    </h3>
                    <p className="text-[11px] text-mq-text-muted font-sinhala">
                      දරුවාට වඩාත් පහසු භාෂා භාවිතය සහ ප්‍රධාන උපදෙස් මාධ්‍යය තෝරන්න.
                    </p>
                  </div>
                </div>

                {/* Primary Instruction Language for Bilingual Learners */}
                <div>
                  <label className="block text-xs font-semibold text-mq-text-strong mb-1.5 font-sinhala">
                    ප්‍රධාන උපදෙස් මාධ්‍යය (Primary Instruction Language)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Sinhala', label: 'සිංහල (Sinhala Primary)' },
                      { id: 'English', label: 'English (English Primary)' },
                    ].map((opt) => {
                      const isSelected = primaryInstructionLanguage === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPrimaryInstructionLanguage(opt.id as PrimaryInstructionLanguage)}
                          className={`min-h-[40px] py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer font-sinhala flex items-center justify-between ${
                            isSelected
                              ? 'bg-mq-surface-blue border-mq-primary text-mq-primary shadow-xs'
                              : 'bg-white border-mq-border text-mq-text-muted hover:border-mq-primary/30'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} className="text-mq-primary shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-mq-text-muted mt-1 font-sinhala">
                    ගණිත ගැටළු සහ හඬ උපදෙස් ප්‍රධාන වශයෙන් ඉදිරිපත් වන මාධ්‍යය
                  </p>
                </div>

                {/* Sinhala Comprehension (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-mq-text-strong font-sinhala">
                      සිංහල අවබෝධය (Sinhala Comprehension)
                    </label>
                    <span className="text-[10px] text-mq-text-muted font-sinhala">විකල්පයි (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {COMPREHENSION_OPTIONS.map((opt) => {
                      const isSelected = sinhalaComprehension === opt.level;
                      return (
                        <button
                          key={opt.level}
                          type="button"
                          onClick={() =>
                            setSinhalaComprehension((prev) => (prev === opt.level ? '' : opt.level))
                          }
                          className={`min-h-[46px] p-2 rounded-xl border text-xs text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-mq-surface-green border-mq-secondary text-mq-text-strong shadow-xs'
                              : 'bg-white border-mq-border text-mq-text-muted hover:border-mq-secondary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold font-sinhala leading-tight">{opt.labelSi}</span>
                            {/* Visual Dots Indicator */}
                            <span className="flex items-center gap-0.5 text-[9px] shrink-0 ml-1">
                              {[1, 2, 3].map((d) => (
                                <span
                                  key={d}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    d <= opt.dots
                                      ? isSelected
                                        ? 'bg-mq-secondary'
                                        : 'bg-mq-text-muted'
                                      : 'bg-mq-border'
                                  }`}
                                />
                              ))}
                            </span>
                          </div>
                          <span className="text-[10px] text-mq-text-muted font-medium mt-0.5 truncate">
                            {opt.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* English Comprehension (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-mq-text-strong font-sinhala">
                      ඉංග්‍රීසි අවබෝධය (English Comprehension)
                    </label>
                    <span className="text-[10px] text-mq-text-muted font-sinhala">විකල්පයි (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {COMPREHENSION_OPTIONS.map((opt) => {
                      const isSelected = englishComprehension === opt.level;
                      return (
                        <button
                          key={opt.level}
                          type="button"
                          onClick={() =>
                            setEnglishComprehension((prev) => (prev === opt.level ? '' : opt.level))
                          }
                          className={`min-h-[46px] p-2 rounded-xl border text-xs text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-mq-surface-blue border-mq-primary text-mq-text-strong shadow-xs'
                              : 'bg-white border-mq-border text-mq-text-muted hover:border-mq-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold leading-tight">{opt.labelEn}</span>
                            {/* Visual Dots Indicator */}
                            <span className="flex items-center gap-0.5 text-[9px] shrink-0 ml-1">
                              {[1, 2, 3].map((d) => (
                                <span
                                  key={d}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    d <= opt.dots
                                      ? isSelected
                                        ? 'bg-mq-primary'
                                        : 'bg-mq-text-muted'
                                      : 'bg-mq-border'
                                  }`}
                                />
                              ))}
                            </span>
                          </div>
                          <span className="text-[10px] text-mq-text-muted font-sinhala mt-0.5 truncate">
                            {opt.labelSi}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Supportive note */}
                <div className="flex items-start gap-2 pt-1 text-[11px] text-mq-text-muted font-sinhala">
                  <HelpCircle size={14} className="shrink-0 mt-0.5 text-mq-primary" />
                  <span>
                    මෙම තොරතුරු දරුවාට සුවපහසු අයුරින් කෙටි උපදෙස් හා සහායක පරිවර්තන සැපයීමට පමණක් යොදා ගැනේ. දරුවාගේ භාෂා ප්‍රවීණතාවය ලෙස නොසැලකේ.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-mq-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary text-xs sm:text-sm min-h-[42px] py-2 px-4 rounded-full cursor-pointer"
            >
              අවලංගු කරන්න (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs sm:text-sm min-h-[42px] py-2 px-5 rounded-full flex items-center gap-2 shadow-xs font-sinhala cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>සුරකිමින් පවතී...</span>
                </>
              ) : (
                <span>{isEditing ? 'වෙනස්කම් සුරකින්න (Save)' : 'දරුවා ලියාපදිංචි කරන්න (Save Child)'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


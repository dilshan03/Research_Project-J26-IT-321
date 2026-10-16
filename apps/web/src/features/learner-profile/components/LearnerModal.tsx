import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle, Check } from 'lucide-react';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { AVATAR_OPTIONS } from '../types';

interface LearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLearnerData | UpdateLearnerData) => Promise<boolean>;
  editingLearner?: Learner | null;
}

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
  const [avatarId, setAvatarId] = useState<string>('avatar_lion');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLearner) {
      setFirstName(editingLearner.firstName || '');
      setPreferredName(editingLearner.preferredName || '');
      setAge(editingLearner.age || 7);
      setGrade(editingLearner.grade || 2);
      setPreferredLanguage(editingLearner.preferredLanguage || 'Sinhala');
      setAvatarId(editingLearner.avatarId || 'avatar_lion');
    } else {
      setFirstName('');
      setPreferredName('');
      setAge(7);
      setGrade(2);
      setPreferredLanguage('Sinhala');
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
      const payload: CreateLearnerData | UpdateLearnerData = {
        firstName: firstName.trim(),
        preferredName: preferredName.trim() || undefined,
        age,
        grade,
        preferredLanguage,
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
              <h2 className="text-base sm:text-lg font-bold text-mq-text-strong font-sinhala">
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
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-white border border-transparent hover:border-mq-border transition-colors"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-2">
              චරිත රූපය තෝරන්න (Select Child's Avatar)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((item) => {
                const isSelected = avatarId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAvatarId(item.id)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-mq-surface-blue border-mq-primary shadow-sm scale-105'
                        : 'bg-mq-surface-soft border-mq-border hover:border-mq-primary/40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1">{item.icon}</span>
                    <span className="text-[10px] font-bold text-mq-text truncate font-sinhala">
                      {item.nameSi}
                    </span>
                    {isSelected && (
                      <span className="w-3.5 h-3.5 bg-mq-primary text-white rounded-full flex items-center justify-center mt-1">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-1.5">
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
                className={`w-full py-2.5 px-3.5 rounded-2xl border text-sm font-semibold outline-none transition-all ${
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
              <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-1.5">
                අමතන කෙටි නම (Preferred / Calling Name)
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="උදා: කසූ / Kasu (Optional)"
                className="w-full py-2.5 px-3.5 rounded-2xl border border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20 text-sm font-semibold outline-none transition-all"
              />
            </div>
          </div>

          {/* Age and Grade Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-1.5">
                වයස (Age: 6–10 Years) <span className="text-mq-danger">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAge(num)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                      age === num
                        ? 'bg-mq-primary text-white border-mq-primary shadow-xs'
                        : 'bg-mq-surface-soft border-mq-border text-mq-text hover:border-mq-primary/40'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-1.5">
                ශ්‍රේණිය (Grade: 1–5) <span className="text-mq-danger">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                      grade === g
                        ? 'bg-mq-secondary text-white border-mq-secondary shadow-xs'
                        : 'bg-mq-surface-soft border-mq-border text-mq-text hover:border-mq-secondary/40'
                    }`}
                  >
                    G-{g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong mb-1.5">
              උපදෙස් භාෂාව (Instructional Language)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Sinhala', label: 'සිංහල (Sinhala)' },
                { id: 'English', label: 'English' },
                { id: 'Bilingual', label: 'දෙබසම (Bilingual)' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setPreferredLanguage(lang.id)}
                  className={`py-2 px-2.5 rounded-2xl border text-xs font-bold transition-all font-sinhala ${
                    preferredLanguage === lang.id
                      ? 'bg-mq-surface-blue border-mq-primary text-mq-primary shadow-xs'
                      : 'border-mq-border text-mq-text-muted hover:border-mq-primary/40'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-mq-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full"
            >
              අවලංගු කරන්න (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs sm:text-sm py-2 px-5 rounded-full flex items-center gap-2 shadow-sm font-sinhala"
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

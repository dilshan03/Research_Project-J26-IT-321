import React from 'react';
import { Check } from 'lucide-react';

interface ChoiceQuestionProps {
  number: number;
  icon: React.ReactNode;
  iconTone: string;
  question: string;
  help?: string;
  options: { value: string; title: string; desc: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

/** Single-choice question card used by the parent onboarding steps. */
export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({
  number,
  icon,
  iconTone,
  question,
  help,
  options,
  selected,
  onSelect,
}) => {
  const headingId = `choice-question-${number}-${question.length}`;
  return (
    <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>{icon}</div>
        <div className="space-y-1">
          <h3 id={headingId} className="text-base font-semibold text-mq-text-strong">
            {number}. {question}
          </h3>
          {help && <p className="text-sm text-mq-text-muted">{help}</p>}
        </div>
      </div>

      <div role="radiogroup" aria-labelledby={headingId} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`relative p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'border-mq-primary bg-mq-surface-blue/60 ring-2 ring-mq-primary/20'
                  : 'border-mq-border hover:border-mq-primary/40 bg-white'
              }`}
            >
              <span className="block text-base font-semibold text-mq-text-strong pr-6">{opt.title}</span>
              <span className="block text-sm text-mq-text-muted mt-1 leading-relaxed">{opt.desc}</span>
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-mq-primary text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChoiceQuestion;

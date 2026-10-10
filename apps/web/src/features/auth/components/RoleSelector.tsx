import React from 'react';
import type { UserRole } from '../types';
import { User, School, Check } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole }) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
        I am registering as a <span className="text-mq-danger ml-0.5">*</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {/* Parent / Guardian Card */}
        <button
          type="button"
          onClick={() => onSelectRole('parent')}
          className={`relative p-3.5 rounded-2xl border-2 text-left flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
            selectedRole === 'parent'
              ? 'border-mq-primary bg-mq-surface-blue text-mq-primary-dark shadow-sm'
              : 'border-mq-border bg-mq-surface text-mq-text-muted hover:border-mq-border-strong hover:bg-mq-surface-soft'
          }`}
        >
          {selectedRole === 'parent' && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-mq-primary text-white rounded-full flex items-center justify-center">
              <Check size={10} strokeWidth={3} />
            </div>
          )}
          <User size={22} className={selectedRole === 'parent' ? 'text-mq-primary' : 'text-mq-text-muted'} />
          <span className="text-xs font-bold text-mq-text-strong">Parent / Guardian</span>
        </button>

        {/* Teacher Card */}
        <button
          type="button"
          onClick={() => onSelectRole('teacher')}
          className={`relative p-3.5 rounded-2xl border-2 text-left flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
            selectedRole === 'teacher'
              ? 'border-mq-primary bg-mq-surface-blue text-mq-primary-dark shadow-sm'
              : 'border-mq-border bg-mq-surface text-mq-text-muted hover:border-mq-border-strong hover:bg-mq-surface-soft'
          }`}
        >
          {selectedRole === 'teacher' && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-mq-primary text-white rounded-full flex items-center justify-center">
              <Check size={10} strokeWidth={3} />
            </div>
          )}
          <School size={22} className={selectedRole === 'teacher' ? 'text-mq-primary' : 'text-mq-text-muted'} />
          <span className="text-xs font-bold text-mq-text-strong">Teacher / Educator</span>
        </button>
      </div>
    </div>
  );
};

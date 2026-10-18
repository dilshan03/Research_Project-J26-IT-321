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
} from 'lucide-react';

import type { SocialContextData } from '../../types/onboarding';

interface Props {
  initialData?: Partial<SocialContextData>;
  onSave: (data: SocialContextData) => Promise<void>;
  onSaveAndExit: (data: SocialContextData) => Promise<void>;
  onBack: () => void;
  /** Social context is optional; skipping continues without saving. */
  onSkip?: () => void;
  isSaving: boolean;
}

export const SocialContextStep: React.FC<Props> = ({
  initialData,
  onSave,
  onSaveAndExit,
  onBack,
  onSkip,
  isSaving,
}) => {
  const [learningEnvironment, setLearningEnvironment] = useState<string>(
    initialData?.learningEnvironment || 'quiet_room'
  );
  const [peerCollaboration, setPeerCollaboration] = useState<string>(
    initialData?.peerCollaboration || 'independent_first'
  );
  const [parentInvolvement, setParentInvolvement] = useState<string>(
    initialData?.parentInvolvement || 'guided_together'
  );
  const [challengingTaskSupport, setChallengingTaskSupport] = useState<string>(
    initialData?.challengingTaskSupport || 'take_a_break'
  );
  const [optionalNotes, setOptionalNotes] = useState<string>(
    initialData?.optionalNotes || ''
  );

  const getPayload = (): SocialContextData => ({
    version: 'SOCIAL-CONTEXT-v1.0',
    learningEnvironment,
    peerCollaboration,
    parentInvolvement,
    challengingTaskSupport,
    optionalNotes: optionalNotes.trim() ? optionalNotes.trim() : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(getPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-yellow text-mq-warning">
          <span>පියවර 4: ඉගෙනුම් පසුබිම (Step 4 of 6 - Optional Parent Context)</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong font-sinhala">
          සමාජීය ඉගෙනුම් පසුබිම සහ දිරිගැන්වීම (Social Learning Context)
        </h2>
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed font-sinhala">
          දරුවා පාඩම් වැඩ කරන පරිසරය සහ දිරිගැන්වීම ලබන ආකාරය පිළිබඳ දෙමාපිය නිරීක්ෂණ. කිසිදු සායනික වර්ගීකරණයක් හෝ සෘණාත්මක ලේබල් පැටවීමක් සිදු නොකෙරේ.
        </p>
      </div>

      {/* 1. Learning Environment */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
            <Home size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              1. දරුවා වඩාත් සුවපහසුව පාඩම් කරන පරිසරය (Preferred Study Environment)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'quiet_room',
              titleSi: 'නිහඬ, බාධා අවම කාමරයක්',
              titleEn: 'Quiet Room',
              descSi: 'ශබ්ද සහ දෘශ්‍ය බාධා අවම තනි කාමරයක් හෝ කොනක්.',
            },
            {
              value: 'shared_living_space',
              titleSi: 'පවුලේ සාමාජිකයන් අසල',
              titleEn: 'Near Family Members',
              descSi: 'සාලය හෝ පවුලේ අය ගැවසෙන සුවපහසු අවකාශයක්.',
            },
            {
              value: 'flexible_movement',
              titleSi: 'චලනය වීමට ඉඩ ඇති තැනක්',
              titleEn: 'Flexible Movement Space',
              descSi: 'එක තැන නොඉඳ ඇවිදිමින් හෝ චලනය වෙමින් වැඩ කිරීම.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setLearningEnvironment(opt.value)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                learningEnvironment === opt.value
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
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Peer / Sibling Collaboration Preference */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0">
            <Users2 size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              2. මිතුරන් හෝ සහෝදරයන් සමඟ ඉගෙනුම (Collaboration Comfort)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'independent_first',
              titleSi: 'තනිව ආරම්භ කිරීම',
              titleEn: 'Independent First',
              descSi: 'පළමුව තනිව උත්සාහ කර පසුව අන් අය සමඟ බෙදාගැනීම.',
            },
            {
              value: 'with_sibling_peer',
              titleSi: 'සහෝදරයෙකු හෝ මිතුරෙකු සමඟ',
              titleEn: 'With Peer / Sibling',
              descSi: 'තවත් ළමයෙකු සමඟ සහයෝගයෙන් අභ්‍යාස කිරීම.',
            },
            {
              value: 'group_friendly',
              titleSi: 'කණ්ඩායම් හිතකාමී',
              titleEn: 'Group Friendly',
              descSi: 'කණ්ඩායමක් තුළ එකමුතුව ක්‍රීඩා කිරීමට කැමැත්ත.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setPeerCollaboration(opt.value)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                peerCollaboration === opt.value
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
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Parent Involvement Preference */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-green text-mq-success flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              2. දෙමාපිය මැදිහත්වීම (Parent Co-Engagement Level)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'guided_together',
              titleSi: 'එකට වාඩිවී මගපෙන්වීම',
              titleEn: 'Co-Play & Guided Help',
              descSi: 'දෙමාපියන් ළඟින් හිඳ එකට ක්‍රීඩා කරමින් සහාය වීම.',
            },
            {
              value: 'check_in_after',
              titleSi: 'අවසානයේදී බලා දිරිමත් කිරීම',
              titleEn: 'Check-In After Activities',
              descSi: 'දරුවා තනිව කර අවසන් වූ පසු ප්‍රගතිය බැලීම.',
            },
            {
              value: 'child_independent',
              titleSi: 'ස්වාධීනව තනිව ක්‍රීඩා කිරීම',
              titleEn: 'Independent Exploration',
              descSi: 'දරුවා ස්වාධීනව තනිවම වැඩ කිරීමට වැඩි කැමැත්තක් දැක්වීම.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setParentInvolvement(opt.value)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                parentInvolvement === opt.value
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
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Encouragement when facing challenging tasks */}
      <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center shrink-0">
            <Smile size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-mq-text-strong font-sinhala">
              3. අපහසු අවස්ථාවලදී දිරිගැන්වීම (Support During Challenging Tasks)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: 'take_a_break',
              titleSi: 'කෙටි විවේකයක් ලබාදීම',
              titleEn: 'Gentle Break',
              descSi: 'විනාඩි 2ක කෙටි විවේකයක් හෝ හුස්ම ගැනීමේ ක්‍රියාකාරකමක්.',
            },
            {
              value: 'break_down_step',
              titleSi: 'ගැටලුව තව කුඩා පියවරකට කැඩීම',
              titleEn: 'Micro-Step Scaffolding',
              descSi: 'පහසු උදාහරණයක් මගින් සරල කර පෙන්වීම.',
            },
            {
              value: 'parent_hug_reassurance',
              titleSi: 'ආදරණීය වචනයකින් දිරිමත් කිරීම',
              titleEn: 'Affirmation & Praise',
              descSi: '"ඔයාට පුළුවන්, වැරදුණාට කමක් නැහැ" යනුවෙන් දිරිගැන්වීම.',
            },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setChallengingTaskSupport(opt.value)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                challengingTaskSupport === opt.value
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
              <span className="block text-[11px] text-mq-text-muted mt-1.5 font-sinhala">
                {opt.descSi}
              </span>
            </button>
          ))}
        </div>

        {/* Optional Context Notes */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-mq-text-strong font-sinhala mb-1">
            වෙනත් අදාළ ඉගෙනුම් හෝ සමාජීය නිරීක්ෂණ (Optional Context Notes):
          </label>
          <input
            type="text"
            value={optionalNotes}
            onChange={(e) => setOptionalNotes(e.target.value)}
            placeholder="දරුවාගේ ප්‍රියතම ඉගෙනුම් පුරුදු හෝ විශේෂ අවශ්‍යතා..."
            className="w-full text-xs py-2 px-3 rounded-xl border border-mq-border focus:border-mq-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={15} />
            <span>ආපසු</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSaveAndExit(getPayload())}
            className="btn btn-secondary px-4 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center gap-1.5"
          >
            <Save size={15} />
            <span>සුරැක පසුව සම්පූර්ණ කරන්න</span>
          </motion.button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
          {onSkip && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={isSaving}
              onClick={onSkip}
              className="btn btn-secondary w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold font-sinhala inline-flex items-center justify-center gap-1.5"
            >
              <SkipForward size={15} />
              <span>දැනට මඟ හරින්න (Skip for now)</span>
            </motion.button>
          )}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: isSaving ? 1 : 1.01 }}
            disabled={isSaving}
            className="btn btn-primary w-full sm:w-auto px-7 py-2.5 rounded-full text-sm font-bold font-sinhala inline-flex items-center justify-center gap-2 shadow-sm"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>මීළඟ පියවර: දරුවාට භාරදීම</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
};

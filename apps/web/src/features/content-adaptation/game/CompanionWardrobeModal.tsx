import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, RotateCcw, Volume2, Check } from 'lucide-react';
import {
  type AuraOption,
  type AccessoryOption,
  type MascotArchetype,
  type HeadwearId,
  type EyewearId,
  type OutfitId,
  MASCOT_ARCHETYPES,
  HEADWEAR_OPTIONS,
  EYEWEAR_OPTIONS,
  OUTFIT_OPTIONS,
  AURA_OPTIONS,
  NAME_SUGGESTIONS,
} from './companionTypes';
import { useCompanion } from './useCompanion';
import { Gaja } from './Gaja';
import type { Mood, Lang } from './gameKit';

interface CompanionWardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Lang;
}

type TabType = 'archetype' | 'headwear' | 'eyewear' | 'outfit' | 'aura' | 'name';

export function CompanionWardrobeModal({ isOpen, onClose, lang = 'si' }: CompanionWardrobeModalProps) {
  const { companion, updateCompanion, resetCompanion } = useCompanion();
  const [activeTab, setActiveTab] = useState<TabType>('archetype');
  const [previewMood, setPreviewMood] = useState<Mood>('happy');
  const [testSpeech, setTestSpeech] = useState<string>(() =>
    lang === 'si' ? 'නියමයි! මේක මට ගොඩක් ලස්සනයි!' : 'Awesome! This looks great on me!'
  );

  if (!isOpen) return null;

  const currentAura = AURA_OPTIONS.find((a: AuraOption) => a.id === companion.aura) || AURA_OPTIONS[0];

  const handleTestVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Hi! I am ${companion.nickname}! Let's solve math together!`
      );
      utterance.pitch = companion.archetype === 'chuti' ? 1.4 : 1.1;
      utterance.rate = companion.pace === 'calm' ? 0.9 : 1.05;
      window.speechSynthesis.speak(utterance);
    }
    setPreviewMood('celebrate');
    setTestSpeech(`ආයුබෝවන්! මම ${companion.nickname}! අපි එකට ගණන් හදමු!`);
    setTimeout(() => setPreviewMood('happy'), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden"
      >
        {/* LEFT PANEL: Interactive Live Preview & Stage */}
        <div
          className="relative flex flex-col items-center justify-between p-6 md:w-5/12 text-white border-b md:border-b-0 md:border-r border-amber-200/40"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${currentAura.hex}33 0%, #1e1b4b 85%)`,
          }}
        >
          {/* Header Title */}
          <div className="w-full text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-amber-200 backdrop-blur-md">
              <Sparkles size={13} className="text-amber-300" /> ගජාගේ ඇඳුම් පැළඳුම් කාමරය
            </span>
            <h2 className="mt-1 text-2xl font-black text-white tracking-tight drop-shadow">
              {companion.nickname}
            </h2>
            <p className="text-xs text-white/70">Dressing Room & Live Preview</p>
          </div>

          {/* Avatar Stage */}
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative">
              <Gaja
                mood={previewMood}
                lang={lang}
                calm={companion.pace === 'calm'}
                size="lg"
                companionConfig={companion}
              />
            </div>

            {/* Test Dialogue Speech Bubble */}
            <motion.div
              key={testSpeech}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-2 rounded-2xl bg-white/95 text-slate-800 text-xs font-semibold shadow-lg max-w-[240px] text-center border border-white"
            >
              <p>{testSpeech}</p>
            </motion.div>
          </div>

          {/* Expression / Mood Test Controls */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs text-white/80 font-medium px-1">
              <span>{lang === 'si' ? 'චරිතයේ මනෝභාවය (Pose Test):' : 'Pose & Mood Test:'}</span>
              <button
                onClick={handleTestVoice}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 text-xs font-bold underline cursor-pointer"
                title="Hear companion voice"
              >
                <Volume2 size={13} /> {lang === 'si' ? 'ශබ්දය අසන්න' : 'Test Voice'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'happy', label: lang === 'si' ? 'සතුටු 😃' : 'Happy 😃' },
                  { id: 'thinking', label: lang === 'si' ? 'කල්පනා 🤔' : 'Thinking 🤔' },
                  { id: 'celebrate', label: lang === 'si' ? 'ජයග්‍රහණ 🎉' : 'Celebrate 🎉' },
                  { id: 'encourage', label: lang === 'si' ? 'ධෛර්යය 💪' : 'Cheer 💪' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setPreviewMood(m.id);
                    if (m.id === 'happy') setTestSpeech(lang === 'si' ? 'මම සූදානම්! අපි ගණන් හදමු!' : "I'm ready! Let's solve math!");
                    if (m.id === 'thinking') setTestSpeech(lang === 'si' ? 'හ්ම්ම්... නිවැරදි පිළිතුර කුමක්ද?' : 'Hmm... what is the correct answer?');
                    if (m.id === 'celebrate') setTestSpeech(lang === 'si' ? 'හුරේ! ඔබ නියම ගණිත ශූරයෙක්!' : 'Hooray! You are a real math champ!');
                    if (m.id === 'encourage') setTestSpeech(lang === 'si' ? 'කමක් නැහැ, අපි ආයෙත් උත්සාහ කරමු!' : "That's okay, let's try again!");
                  }}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all ${
                    previewMood === m.id
                      ? 'bg-amber-400 text-slate-900 shadow-md scale-105'
                      : 'bg-white/10 text-white/90 hover:bg-white/20'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Wardrobe Tabs & Options */}
        <div className="flex flex-col flex-1 p-6 overflow-hidden">
          {/* Top Bar with Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                {lang === 'si' ? 'මිතුරා සරසන්න (Customize)' : 'Customize Companion'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'si'
                  ? 'චරිත වර්ගය, ආයිත්තම් සහ ආලෝක වළල්ල තෝරන්න.'
                  : 'Choose mascot species, accessories, and glowing aura.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetCompanion}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Reset to default Gaja"
              >
                <RotateCcw size={12} /> {lang === 'si' ? 'මුල් තත්වයට' : 'Reset'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close Wardrobe"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 py-3 border-b border-slate-100 overflow-x-auto">
            {(
              [
                { id: 'archetype', label: lang === 'si' ? 'චරිතය (Mascot)' : 'Mascot', icon: '🐘' },
                { id: 'headwear', label: lang === 'si' ? 'තොප්පි (Hats)' : 'Hats', icon: '👑' },
                { id: 'eyewear', label: lang === 'si' ? 'කණ්ණාඩි (Glasses)' : 'Glasses', icon: '🕶️' },
                { id: 'outfit', label: lang === 'si' ? 'ඇඳුම් (Outfits)' : 'Outfits', icon: '🦺' },
                { id: 'aura', label: lang === 'si' ? 'වර්ණය (Aura)' : 'Aura', icon: '✨' },
                { id: 'name', label: lang === 'si' ? 'නම (Name & Pace)' : 'Name & Pace', icon: '🏷️' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4 max-h-[50vh] md:max-h-[58vh]">
            {/* TAB 1: MASCOT ARCHETYPE */}
            {activeTab === 'archetype' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MASCOT_ARCHETYPES.map((m: AccessoryOption<MascotArchetype>) => {
                  const isSelected = companion.archetype === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        updateCompanion({ archetype: m.id });
                        setPreviewMood('celebrate');
                      }}
                      className={`relative flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-3xl p-2 rounded-xl bg-white shadow-sm border border-slate-100">
                        {m.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-800">{m.name.si}</h4>
                          {isSelected && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                              <Check size={10} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{m.name.en}</p>
                        {m.description && (
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            {m.description.si}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 2: HEADWEAR */}
            {activeTab === 'headwear' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {HEADWEAR_OPTIONS.map((item: AccessoryOption<HeadwearId>) => {
                  const isSelected = companion.headwear === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        updateCompanion({ headwear: item.id });
                        setPreviewMood('celebrate');
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-3xl mb-1.5">{item.icon}</span>
                      <span className="font-bold text-xs text-slate-800 text-center leading-tight">
                        {item.name.si}
                      </span>
                      <span className="text-[10px] text-slate-400 text-center">{item.name.en}</span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 3: EYEWEAR */}
            {activeTab === 'eyewear' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EYEWEAR_OPTIONS.map((item: AccessoryOption<EyewearId>) => {
                  const isSelected = companion.eyewear === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        updateCompanion({ eyewear: item.id });
                        setPreviewMood('celebrate');
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-3xl mb-1.5">{item.icon}</span>
                      <span className="font-bold text-xs text-slate-800 text-center leading-tight">
                        {item.name.si}
                      </span>
                      <span className="text-[10px] text-slate-400 text-center">{item.name.en}</span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 4: OUTFIT */}
            {activeTab === 'outfit' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {OUTFIT_OPTIONS.map((item: AccessoryOption<OutfitId>) => {
                  const isSelected = companion.outfit === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        updateCompanion({ outfit: item.id });
                        setPreviewMood('celebrate');
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-3xl mb-1.5">{item.icon}</span>
                      <span className="font-bold text-xs text-slate-800 text-center leading-tight">
                        {item.name.si}
                      </span>
                      <span className="text-[10px] text-slate-400 text-center">{item.name.en}</span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 5: AURA COLOR */}
            {activeTab === 'aura' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AURA_OPTIONS.map((item: AuraOption) => {
                  const isSelected = companion.aura === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        updateCompanion({ aura: item.id });
                        setPreviewMood('celebrate');
                      }}
                      className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: item.hex }}
                      >
                        {item.icon}
                      </span>
                      <div className="text-left flex-1 min-w-0">
                        <span className="block font-bold text-xs text-slate-800 truncate">
                          {item.name.si}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {item.name.en}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 6: NAME & PERSONALITY PACE */}
            {activeTab === 'name' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    මිතුරාගේ සුරතල් නම (Companion Nickname):
                  </label>
                  <input
                    type="text"
                    value={companion.nickname}
                    onChange={(e) => updateCompanion({ nickname: e.target.value })}
                    maxLength={25}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-semibold"
                    placeholder="Enter custom name (e.g. ගජා, චූටි)..."
                  />
                  {/* Name Quick Suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {NAME_SUGGESTIONS.map((name: string) => (
                      <button
                        key={name}
                        onClick={() => updateCompanion({ nickname: name })}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-[11px] font-medium text-slate-700 hover:text-amber-900 transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personality & Sensory Pacing */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span>🧘</span> ADHD Sensory Pacing (සංවේදී ඉගෙනුම් වේගය)
                  </h4>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Choose between high-energy celebratory animations or calm, gentle animations for
                    reduced cognitive overload.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => updateCompanion({ pace: 'cheerful' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        companion.pace === 'cheerful'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🌟 Cheerful (විනෝදකාමී)
                    </button>
                    <button
                      onClick={() => updateCompanion({ pace: 'calm' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        companion.pace === 'calm'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🌿 Calm Sensory (සන්සුන්)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button */}
          <div className="pt-3 mt-auto border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              ✨ Saved automatically to your browser profile.
            </span>
            <button
              onClick={onClose}
              className="btn btn-primary !text-xs !py-2 !px-6 flex items-center gap-1.5 shadow-md"
            >
              <Check size={14} /> Done (සම්පූර්ණයි)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

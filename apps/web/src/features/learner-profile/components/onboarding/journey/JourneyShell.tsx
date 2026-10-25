import React, { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { ChildPreferenceChoices } from '../../../types/onboarding';
import { AVATAR_OPTIONS } from '../../../types';
import { childText } from '../../../../../shared/i18n/childText';
import { ActivityFrame, PrimaryAction } from './ui';
import { COMPANION_IDS, WORLDS, type SoundMode, type WorldId } from './themes';

/*
 * Shared opening and closing steps for the Grade 2+ journeys (phase A: child-expressed preferences;
 * phase F: gentle ending, no score). Same behaviour as the Grade 1 journey, which keeps its own copy unchanged.
 */

const choiceClass = (selected: boolean) =>
  `rounded-3xl border-4 bg-white/90 p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] cursor-pointer transition-colors ${
    selected ? 'border-mq-primary ring-4 ring-mq-primary/25' : 'border-white hover:border-mq-primary/40'
  }`;

export const WelcomeStep: React.FC<{
  progress: { step: number; total: number };
  onStart: (prefs: ChildPreferenceChoices) => void;
}> = ({ progress, onStart }) => {
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<WorldId | null>(null);
  const [soundMode, setSoundMode] = useState<SoundMode | null>(null);
  const ready = companionId && worldId && soundMode;

  return (
    <ActivityFrame
      scene="welcome"
      instruction={childText.welcome.title}
      progress={progress}
      footer={
        <PrimaryAction
          disabled={!ready}
          onClick={() =>
            ready &&
            onStart({ source: 'child', avatarId: companionId, theme: worldId, soundMode, chosenAt: new Date().toISOString() })
          }
        >
          <span>{childText.welcome.start}</span>
          <ArrowRight size={22} />
        </PrimaryAction>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">{childText.welcome.companion}</h3>
          <div role="radiogroup" aria-label={childText.welcome.companion} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COMPANION_IDS.map((id) => {
              const avatar = AVATAR_OPTIONS.find((a) => a.id === id);
              if (!avatar) return null;
              return (
                <button key={id} type="button" role="radio" aria-checked={companionId === id} onClick={() => setCompanionId(id)} className={choiceClass(companionId === id)}>
                  <span aria-hidden="true" className="text-5xl">{avatar.icon}</span>
                  <span className="text-base font-semibold">{avatar.nameSi}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">{childText.welcome.world}</h3>
          <div role="radiogroup" aria-label={childText.welcome.world} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WORLDS.map((w) => (
              <button key={w.id} type="button" role="radio" aria-checked={worldId === w.id} onClick={() => setWorldId(w.id)} className={choiceClass(worldId === w.id)}>
                <span aria-hidden="true" className="text-5xl">{w.icon}</span>
                <span className="text-base font-semibold">{childText.worlds[w.id]}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-mq-text-strong mb-2 bg-white/80 inline-block rounded-xl px-3 py-1">{childText.welcome.sound}</h3>
          <div role="radiogroup" aria-label={childText.welcome.sound} className="grid grid-cols-2 gap-3 max-w-md">
            {([
              ['gentle', '🔉', childText.welcome.soundGentle],
              ['quiet', '🔇', childText.welcome.soundQuiet],
            ] as const).map(([id, icon, label]) => (
              <button key={id} type="button" role="radio" aria-checked={soundMode === id} onClick={() => setSoundMode(id)} className={choiceClass(soundMode === id)}>
                <span aria-hidden="true" className="text-4xl">{icon}</span>
                <span className="text-base font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </ActivityFrame>
  );
};

export const EndingStep: React.FC<{
  scene: React.ComponentProps<typeof ActivityFrame>['scene'];
  progress: { step: number; total: number };
  companionId: string | null;
  isSubmitting: boolean;
  submitFailed: boolean;
  onFinish: () => void;
}> = ({ scene, progress, companionId, isSubmitting, submitFailed, onFinish }) => {
  const companion = AVATAR_OPTIONS.find((a) => a.id === companionId) ?? AVATAR_OPTIONS[0];
  return (
    <ActivityFrame
      scene={scene}
      instruction={childText.ending.title}
      progress={progress}
      helpMessage={submitFailed ? childText.ending.error : null}
      footer={
        <PrimaryAction onClick={onFinish} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
          <span>{isSubmitting ? childText.ending.saving : submitFailed ? childText.ending.retry : childText.ending.finish}</span>
        </PrimaryAction>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden="true" className={`w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 ${companion.bgColor} ${companion.borderColor}`}>
          {companion.icon}
        </span>
        <p className="text-xl font-semibold text-mq-text-strong bg-white/85 rounded-2xl px-5 py-3">{childText.ending.text}</p>
        <span aria-hidden="true" className="text-4xl">🌟</span>
      </div>
    </ActivityFrame>
  );
};

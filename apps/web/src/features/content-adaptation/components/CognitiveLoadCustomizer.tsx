import { useMemo } from 'react';
import {
  Brain,
  Clock,
  Filter,
  Gauge,
  Layers,
  Sparkles,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import type { CustomADHDGameSettings, StudentBehaviorProfile } from '../types';

interface CognitiveLoadCustomizerProps {
  settings: CustomADHDGameSettings;
  onChangeSettings: (newSettings: CustomADHDGameSettings) => void;
  behaviorProfile?: StudentBehaviorProfile | null;
  baseCli?: number;
}

export function CognitiveLoadCustomizer({
  settings,
  onChangeSettings,
  behaviorProfile,
  baseCli = 2.4,
}: CognitiveLoadCustomizerProps) {
  // Compute effective CLI locally in real time for immediate slider responsiveness
  const effectiveCli = useMemo(() => {
    let delta = 0.0;

    // Granularity
    if (settings.step_granularity === 'MAXIMAL_THREE_TIER') {
      delta -= 0.40;
    } else {
      delta -= 0.15;
    }

    // Distractor count
    if (settings.distractor_count === 2) {
      delta -= 0.20;
    } else if (settings.distractor_count === 4) {
      delta += 0.25;
    }

    // Clutter filter
    if (settings.visual_clutter_filter) {
      delta -= 0.25;
    } else {
      delta += 0.15;
    }

    // Stimulus density
    if (settings.stimulus_density === 'LOW') {
      delta -= 0.15;
    }

    // Timer
    if (settings.timer_enabled) {
      delta += 0.45;
    } else {
      delta -= 0.10;
    }

    if (behaviorProfile) {
      if (behaviorProfile.working_memory_support) delta -= 0.15;
      if (behaviorProfile.inattention_level === 'HIGH' && !settings.visual_clutter_filter) delta += 0.30;
      if (behaviorProfile.impulsivity_level === 'HIGH' && settings.timer_enabled) delta += 0.35;
    }

    const calculated = Math.max(1.0, Math.min(5.0, baseCli + delta));
    return Number(calculated.toFixed(2));
  }, [settings, behaviorProfile, baseCli]);

  const cliReductionPercent = useMemo(() => {
    if (baseCli <= 0) return 0;
    const diff = ((baseCli - effectiveCli) / baseCli) * 100;
    return Math.round(diff);
  }, [baseCli, effectiveCli]);

  const cliColor =
    effectiveCli >= 3.0 ? 'text-mq-danger' : effectiveCli >= 2.0 ? 'text-mq-warning' : 'text-mq-success';
  const cliBgColor =
    effectiveCli >= 3.0 ? 'bg-mq-danger' : effectiveCli >= 2.0 ? 'bg-mq-warning' : 'bg-mq-success';

  return (
    <div className="rounded-3xl bg-white border border-mq-border p-5 shadow-[var(--mq-shadow-sm)] space-y-5">
      {/* Header & Live CLI Meter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mq-border pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-mq-text-strong flex items-center gap-2">
            <Sliders size={16} className="text-mq-primary" />
            <span>Teacher Cognitive Load & Game Customizer (ප්‍රජානන භාර සැකසුම්)</span>
          </h3>
          <p className="text-xs text-mq-text-muted mt-0.5">
            Adjust game mechanics and scaffolding to match the learner's cognitive bandwidth and focus.
          </p>
        </div>

        {/* Live CLI Gauge */}
        <div className="flex items-center gap-4 bg-mq-surface-soft/60 px-4 py-2.5 rounded-2xl border border-mq-border">
          <div className="flex items-center gap-2">
            <Gauge size={18} className={cliColor} />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-mq-text-muted">Effective CLI:</span>
                <span className={`text-base font-extrabold ${cliColor}`}>{effectiveCli.toFixed(2)}</span>
                <span className="text-[10px] text-mq-text-muted line-through">({baseCli.toFixed(2)})</span>
              </div>
              <div className="text-[10px] font-bold text-mq-text-muted">
                {cliReductionPercent > 0 ? (
                  <span className="text-mq-success">▼ {cliReductionPercent}% reduced load</span>
                ) : cliReductionPercent < 0 ? (
                  <span className="text-mq-danger">▲ {Math.abs(cliReductionPercent)}% higher load</span>
                ) : (
                  <span>Baseline cognitive demand</span>
                )}
              </div>
            </div>
          </div>

          {/* Mini Progress Bar */}
          <div className="w-24 sm:w-28 hidden sm:block">
            <div className="h-2 rounded-full bg-mq-border/70 overflow-hidden">
              <div
                className={`h-full ${cliBgColor} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, (effectiveCli / 4) * 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-mq-text-muted mt-1 text-center font-bold">
              {effectiveCli >= 3.0 ? 'High Executive Load' : effectiveCli >= 2.0 ? 'Moderate Load' : 'Accessible / Low Load'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Knobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Knob 1: Scaffolding Granularity */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
              <Layers size={14} className="text-mq-primary" /> Step Granularity
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-blue text-mq-primary-dark">
              {settings.step_granularity === 'MAXIMAL_THREE_TIER' ? '3-Tier' : '2-Tier'}
            </span>
          </div>
          <p className="text-[11px] text-mq-text-muted">
            {settings.step_granularity === 'MAXIMAL_THREE_TIER'
              ? 'Identify items → Pick operator → Calculate (Bite-sized chunking)'
              : 'Direct operation → Calculate (Standard 2 steps)'}
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, step_granularity: 'MAXIMAL_THREE_TIER' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.step_granularity === 'MAXIMAL_THREE_TIER'
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              3-Tier (Maximal)
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, step_granularity: 'TWO_TIER' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.step_granularity === 'TWO_TIER'
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              2-Tier (Standard)
            </button>
          </div>
        </div>

        {/* Knob 2: Distractor Count */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
              <Brain size={14} className="text-mq-primary" /> Distractor Count
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-soft text-mq-text">
              {(settings.distractor_count || 3) + 1} choices (1 right + {settings.distractor_count || 3})
            </span>
          </div>
          <p className="text-[11px] text-mq-text-muted">
            Fewer choices reduce visual scanning overhead and working memory drain.
          </p>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {([2, 3, 4] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => onChangeSettings({ ...settings, distractor_count: cnt })}
                className={`py-1.5 rounded-xl text-xs font-bold transition ${
                  settings.distractor_count === cnt
                    ? 'bg-mq-primary text-white shadow-2xs'
                    : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
                }`}
              >
                {cnt === 2 ? '2 (Low)' : cnt === 3 ? '3 (Balanced)' : '4 (High)'}
              </button>
            ))}
          </div>
        </div>

        {/* Knob 3: Visual Clutter Filter */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
              <Filter size={14} className="text-mq-primary" /> Visual Clutter Filter
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                settings.visual_clutter_filter
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {settings.visual_clutter_filter ? 'FILTER ON' : 'FULL GRAPHICS'}
            </span>
          </div>
          <p className="text-[11px] text-mq-text-muted">
            Strips non-essential background animations to prevent attention drifting.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, visual_clutter_filter: true })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.visual_clutter_filter
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Filter ON (Focused)
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, visual_clutter_filter: false })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                !settings.visual_clutter_filter
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Off (Full Visuals)
            </button>
          </div>
        </div>

        {/* Knob 4: Stimulus Density */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
              <Sparkles size={14} className="text-mq-primary" /> Stimulus Density
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mq-surface-soft text-mq-text">
              {settings.stimulus_density || 'LOW'}
            </span>
          </div>
          <p className="text-[11px] text-mq-text-muted">
            Controls particle effects, mascot bounce animations, and auditory feedback.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, stimulus_density: 'LOW' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.stimulus_density === 'LOW'
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Low (Calming)
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, stimulus_density: 'MEDIUM' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.stimulus_density === 'MEDIUM'
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Medium (Standard)
            </button>
          </div>
        </div>

        {/* Knob 5: Pacing & Timer */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
              <Clock size={14} className="text-mq-primary" /> Pacing / Timer Mode
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                settings.timer_enabled ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {settings.timer_enabled ? 'TIMED' : 'UNTIMED / SAFE'}
            </span>
          </div>
          <p className="text-[11px] text-mq-text-muted">
            Untimed mode prevents time-induced stress and impulsive guessing mistakes.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, timer_enabled: false })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                !settings.timer_enabled
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Untimed (Safe Pacing)
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, timer_enabled: true })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                settings.timer_enabled
                  ? 'bg-mq-primary text-white shadow-2xs'
                  : 'bg-white border border-mq-border text-mq-text-muted hover:text-mq-text'
              }`}
            >
              Timed Countdown
            </button>
          </div>
        </div>

        {/* Knob 6: Mascot Assistance Summary */}
        <div className="rounded-2xl border border-mq-border p-3.5 bg-mq-surface-soft/30 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-mq-text flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-mq-primary" /> Mascot & Cultural Scaffold
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                GAJA MASCOT ON
              </span>
            </div>
            <p className="text-[11px] text-mq-text-muted mt-1">
              Gaja the Elephant provides encouraging spoken Sinhala prompts and non-judgmental hint scaffolding.
            </p>
          </div>
          <div className="text-[10px] text-mq-text-muted bg-white/70 p-2 rounded-xl border border-mq-border/60">
            Hint Style:{' '}
            <strong className="text-mq-text">
              {behaviorProfile?.activity_pace === 'CALM_STEP_BY_STEP' ? 'Gentle Step-by-Step' : 'Audio Clues'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CognitiveLoadCustomizer;

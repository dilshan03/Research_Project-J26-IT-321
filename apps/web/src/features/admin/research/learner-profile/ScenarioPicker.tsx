import React from 'react';
import type { MqRecScenario } from './sections';

/** Selector for the MQ-REC synthetic learner scenarios (buttons, so it works by keyboard and touch). */
export const ScenarioPicker: React.FC<{ scenarios: MqRecScenario[]; selected: string; onSelect: (id: string) => void }> = ({
  scenarios,
  selected,
  onSelect,
}) => (
  <div role="radiogroup" aria-label="Synthetic scenario" className="flex flex-wrap gap-1.5">
    {scenarios.map((s) => {
      const active = s.id === selected;
      return (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onSelect(s.id)}
          title={s.description}
          className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold ${
            active ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {s.id.split('_')[0]}
        </button>
      );
    })}
  </div>
);

export const scenarioTitle = (s: MqRecScenario) => s.id.replace(/^S\d+_/, '').replace(/_/g, ' ');

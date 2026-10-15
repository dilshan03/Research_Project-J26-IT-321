import { create } from 'zustand';
import type { AgentActionName, AgentActionOptions, AgentId, GameEvent, HintLevel } from '../types/agent.types';
import { getAgentConfig } from '../agents/registry';
import { playAgentSound } from '../engine/soundEngine';
import { mapGameEvent } from '../mapping/gameEventMapping';

export const DEFAULT_ACTION_DURATIONS: Partial<Record<AgentActionName, number>> = {
  wave: 2.0,
  smallHint: 2.5,
  guidedHint: 3.0,
  stepByStep: 3.6,
  explain: 4.5,
  pointLeft: 1.5,
  pointRight: 1.5,
  thinking: 3.0,
  correctCelebrate: 2.5,
  tryAgain: 2.0,
  encourage: 2.5,
  clap: 2.5
};

interface AgentState {
  currentAction: AgentActionName;
  actionOptions: AgentActionOptions;
  activeAgentId: AgentId;
  actionInstanceId: number; // Incremented on every playAction to reset timers & prevent race conditions
  currentHintLevel: HintLevel;
  playAction: (actionName: AgentActionName, options?: AgentActionOptions) => void;
  triggerGameEvent: (event: GameEvent, customDuration?: number) => void;
  requestNextHint: () => HintLevel;
  resetHints: () => void;
  stopAction: () => void;
  setAgent: (agentId: AgentId) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  currentAction: 'idle',
  actionOptions: {},
  activeAgentId: 'greenbot',
  actionInstanceId: 0,
  currentHintLevel: 0,

  playAction: (actionName: AgentActionName, options: AgentActionOptions = {}) => {
    const nextInstanceId = get().actionInstanceId + 1;
    const defaultDuration = actionName === 'idle' ? undefined : DEFAULT_ACTION_DURATIONS[actionName];
    const duration = options.loop ? undefined : (options.duration ?? defaultDuration);

    set({
      currentAction: actionName,
      actionOptions: {
        ...options,
        duration
      },
      actionInstanceId: nextInstanceId
    });

    // Play synchronized sound unless explicitly disabled
    if (options.playSound !== false) {
      const config = getAgentConfig(get().activeAgentId);
      playAgentSound(actionName, config);
    }
  },

  triggerGameEvent: (event: GameEvent, customDuration?: number) => {
    const config = mapGameEvent(event);
    const duration = customDuration ?? config.duration;
    get().playAction(config.action, { duration });
  },

  requestNextHint: () => {
    const current = get().currentHintLevel;
    const nextLevel = (Math.min(current + 1, 4)) as HintLevel;
    set({ currentHintLevel: nextLevel });

    const hintEvent: GameEvent = `HINT_LEVEL_${nextLevel}` as GameEvent;
    get().triggerGameEvent(hintEvent);
    return nextLevel;
  },

  resetHints: () => {
    set({ currentHintLevel: 0 });
  },

  stopAction: () => {
    set({
      currentAction: 'idle',
      actionOptions: {},
      actionInstanceId: get().actionInstanceId + 1
    });
  },

  setAgent: (agentId: AgentId) => {
    set({ activeAgentId: agentId });
  }
}));

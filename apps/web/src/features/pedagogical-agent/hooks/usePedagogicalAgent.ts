import { useAgentStore } from '../store/useAgentStore';
import type { AgentActionName, AgentActionOptions, GameEvent } from '../types/agent.types';

/**
 * High-level Hook for controlling the Pedagogical Agent:
 * - playAction: Trigger any specific agent action (auto-resets to idle after default/custom duration)
 * - onGameEvent: Trigger an action mapped to a game event (e.g. 'CORRECT_ANSWER', 'HINT_LEVEL_1')
 * - stopAction: Instantly reset agent back to idle
 */
export function usePedagogicalAgent() {
  const currentAction = useAgentStore((state) => state.currentAction);
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const playAction = useAgentStore((state) => state.playAction);
  const triggerGameEvent = useAgentStore((state) => state.triggerGameEvent);
  const stopAction = useAgentStore((state) => state.stopAction);
  const setAgent = useAgentStore((state) => state.setAgent);

  return {
    currentAction,
    activeAgentId,
    playAction: (actionName: AgentActionName, options?: AgentActionOptions) => {
      playAction(actionName, options);
    },
    onGameEvent: (event: GameEvent, customDuration?: number) => {
      triggerGameEvent(event, customDuration);
    },
    stopAction,
    setAgent
  };
}

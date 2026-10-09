import { create } from 'zustand';
import type { AgentActionOptions, AgentId } from '../types/agent.types';

interface AgentState {
  currentAction: string;
  actionOptions: AgentActionOptions;
  activeAgentId: AgentId;
  playAction: (actionName: string, options?: AgentActionOptions) => void;
  stopAction: () => void;
  setAgent: (agentId: AgentId) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  currentAction: 'idle',
  actionOptions: {},
  activeAgentId: 'greenbot', // Default agent
  
  playAction: (actionName, options = {}) => {
    // In a real multi-agent scenario, we might key this state by agentId.
    // For now, we update the global agent action.
    set({ currentAction: actionName, actionOptions: options });
  },
  
  stopAction: () => {
    set({ currentAction: 'idle', actionOptions: {} });
  },
  
  setAgent: (agentId) => {
    set({ activeAgentId: agentId });
  }
}));

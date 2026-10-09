import type { AgentConfig, AgentId } from '../types/agent.types';
import { greenbot } from './greenbot';

export const AGENTS: Record<AgentId, AgentConfig> = {
  greenbot: greenbot as AgentConfig,
  blinkybot: greenbot as AgentConfig // Placeholder until blinkybot is properly configured
};

export const getAgentConfig = (id: AgentId): AgentConfig => {
  return AGENTS[id] || AGENTS.greenbot;
};

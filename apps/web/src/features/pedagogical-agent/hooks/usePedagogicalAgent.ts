import { useEffect } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { intentToAnimation } from '../mapping/intentToAnimation';
import type { PedagogicalIntent } from '../types/agent.types';
import { getAgentConfig } from '../agents/registry';
import { playAgentSound } from '../engine/soundEngine';

export function usePedagogicalAgent() {
  const playAction = useAgentStore((state) => state.playAction);
  const activeAgentId = useAgentStore((state) => state.activeAgentId);

  // Expose a method to handle intents from the backend
  const handleIntent = (intent: PedagogicalIntent, wrongAttempts = 0) => {
    const { actionName, duration } = intentToAnimation(intent, wrongAttempts);
    
    // Play the mapped animation
    playAction(actionName, { duration });
    
    // Play the corresponding sound
    const config = getAgentConfig(activeAgentId);
    playAgentSound(actionName, config);
  };

  return {
    handleIntent
  };
}

import type { PedagogicalIntent } from '../types/agent.types';

export const intentToAnimation = (intent: PedagogicalIntent, wrongAttempts = 0): { actionName: string, duration?: number } => {
  switch (intent) {
    case 'GREET': return { actionName: 'wave', duration: 3 };
    case 'CELEBRATE': return { actionName: 'correctCelebrate', duration: 4 };
    case 'RETRY_PROMPT': return { actionName: 'tryAgain', duration: 3 };
    case 'SMALL_HINT': return { actionName: 'smallHint', duration: 3 };
    case 'GUIDED_HINT': return { actionName: 'guidedHint', duration: 4 };
    case 'EXPLAIN': return { actionName: 'explain', duration: 5 };
    case 'REENGAGE': return { actionName: 'encourage', duration: 3 };
    case 'PROCESSING': return { actionName: 'thinking', duration: 2 };
    case 'IDLE':
    default:
      return { actionName: 'idle' };
  }
};

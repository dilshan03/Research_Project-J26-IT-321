import type { AgentActionName, GameEvent } from '../types/agent.types';

export interface GameEventConfig {
  action: AgentActionName;
  duration?: number;
  description: string;
}

/**
 * Maps game lifecycle events to corresponding Pedagogical Agent actions and durations.
 */
export const GAME_EVENT_MAP: Record<GameEvent, GameEventConfig> = {
  GAME_START: {
    action: 'wave',
    duration: 2.0,
    description: 'Friendly initial greeting when the game starts'
  },
  QUESTION_SHOW: {
    action: 'idle',
    description: 'Neutral, attentive resting stance when viewing a question'
  },
  THINKING: {
    action: 'thinking',
    duration: 3.0,
    description: 'Reflective pose while the learner is pondering or computing'
  },
  CORRECT_ANSWER: {
    action: 'correctCelebrate',
    duration: 2.5,
    description: 'Upbeat celebratory animation when answer is correct'
  },
  WRONG_ANSWER: {
    action: 'tryAgain',
    duration: 2.0,
    description: 'Gentle, supportive encouragement to try again'
  },
  HINT_LEVEL_1: {
    action: 'smallHint',
    duration: 2.5,
    description: 'Level 1: Subtle lean-in single hand clue'
  },
  HINT_LEVEL_2: {
    action: 'guidedHint',
    duration: 3.0,
    description: 'Level 2: Directional pointing towards problem elements'
  },
  HINT_LEVEL_3: {
    action: 'stepByStep',
    duration: 3.6,
    description: 'Level 3: Sequential 1-2-3 step breakdown'
  },
  HINT_LEVEL_4: {
    action: 'explain',
    duration: 4.5,
    description: 'Level 4: Comprehensive conversational explanation'
  },
  ENCOURAGE: {
    action: 'encourage',
    duration: 2.5,
    description: 'Warm nod and affirmative thumbs-up gesture'
  },
  CELEBRATE: {
    action: 'clap',
    duration: 2.5,
    description: 'Applauding milestone achievements or streaks'
  }
};

/**
 * Returns the action config mapped to a game event.
 */
export function mapGameEvent(event: GameEvent): GameEventConfig {
  return GAME_EVENT_MAP[event] || { action: 'idle', description: 'Default idle' };
}

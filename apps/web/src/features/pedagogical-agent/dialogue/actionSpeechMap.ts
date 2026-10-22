import type { AgentActionName } from '../types/agent.types';

export interface ActionSpeechContent {
  sinhala: string;
  emoji: string;
  color: string;
}

/**
 * Short, natural, child-friendly Sinhala phrases for the Agent head cloud.
 * Only simple encouraging phrases (no long explanations, no English, no meta-tags).
 * Detailed hints and explanations will appear on the separate board below the agent!
 */
export const ACTION_SPEECH_MAP: Record<AgentActionName, ActionSpeechContent | null> = {
  idle: null,

  // Greetings & encouragement
  wave: {
    sinhala: 'හායි! අපි සෙල්ලම් කරමු!',
    emoji: '👋',
    color: '#3C82B4'
  },

  tryAgain: {
    sinhala: 'අපි ආයෙත් උත්සාහ කරමු!',
    emoji: '🌱',
    color: '#E67E22'
  },

  correctCelebrate: {
    sinhala: 'ෂා! ඒක හරියටම හරි!',
    emoji: '🎉',
    color: '#27AE60'
  },

  encourage: {
    sinhala: 'ඔයාට පුළුවන්! දිගටම කරමු!',
    emoji: '⭐',
    color: '#2ECC71'
  },

  clap: {
    sinhala: 'නියමයි! ඔයා දක්ෂයි!',
    emoji: '👏',
    color: '#2980B9'
  },

  // Progressive Hint Triggers (short cues pointing to the hint board below)
  smallHint: {
    sinhala: 'මෙන්න පොඩි හෝඩුවාවක්...',
    emoji: '💡',
    color: '#F39C12'
  },

  guidedHint: {
    sinhala: 'මෙන්න මෙහෙම බලන්න...',
    emoji: '🧭',
    color: '#E67E22'
  },

  stepByStep: {
    sinhala: 'පියවරෙන් පියවර බලමු...',
    emoji: '🔢',
    color: '#D35400'
  },

  explain: {
    sinhala: 'මම කියලා දෙන්නම්...',
    emoji: '📖',
    color: '#8E44AD'
  },

  thinking: {
    sinhala: 'පොඩ්ඩක් හිතලා බලමු...',
    emoji: '🤔',
    color: '#8D6CE7'
  },

  pointLeft: {
    sinhala: 'මෙන්න මේ පැත්ත බලන්න!',
    emoji: '👈',
    color: '#3498DB'
  },

  pointRight: {
    sinhala: 'මෙන්න මේ පැත්ත බලන්න!',
    emoji: '👉',
    color: '#3498DB'
  }
};

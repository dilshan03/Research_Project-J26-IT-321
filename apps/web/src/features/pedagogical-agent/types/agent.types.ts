export type AgentId = 'greenbot' | 'blinkybot';

export interface AgentConfig {
  id: AgentId;
  name: string;
  modelUrl: string;
  scale: number;
  position: [number, number, number];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  boneOverrides?: Record<string, string>;
  calibration: {
    restPose: 'A' | 'T';
    armRaiseSign: number;
    armOffsetZ: number;
  };
  intensity: number;
  voice: {
    pitch: number;
    waveType: OscillatorType;
  };
  face: {
    blinkMorph?: string;
  };
}

export interface ActionContext {
  intensity: number;
  calibration: AgentConfig['calibration'];
  progress: number; // 0 to 1 if not looping
}

export type PedagogicalIntent = 
  | 'GREET'
  | 'CELEBRATE'
  | 'RETRY_PROMPT'
  | 'SMALL_HINT'
  | 'GUIDED_HINT'
  | 'STEP_BY_STEP'
  | 'EXPLAIN'
  | 'REENGAGE'
  | 'PROCESSING'
  | 'IDLE';

export type AgentActionName =
  | 'idle'
  | 'wave'
  | 'smallHint'
  | 'guidedHint'
  | 'stepByStep'
  | 'explain'
  | 'pointLeft'
  | 'pointRight'
  | 'thinking'
  | 'correctCelebrate'
  | 'tryAgain'
  | 'encourage'
  | 'clap';

export type GameEvent =
  | 'GAME_START'
  | 'QUESTION_SHOW'
  | 'THINKING'
  | 'CORRECT_ANSWER'
  | 'WRONG_ANSWER'
  | 'HINT_LEVEL_1'
  | 'HINT_LEVEL_2'
  | 'HINT_LEVEL_3'
  | 'HINT_LEVEL_4'
  | 'ENCOURAGE'
  | 'CELEBRATE';

export interface AgentActionOptions {
  duration?: number;
  loop?: boolean;
  intensity?: number;
  playSound?: boolean;
  message?: string;
  secondaryMessage?: string;
}

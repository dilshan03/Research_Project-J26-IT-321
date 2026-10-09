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
  | 'EXPLAIN'
  | 'REENGAGE'
  | 'PROCESSING'
  | 'IDLE';

export interface AgentActionOptions {
  duration?: number;
  loop?: boolean;
  intensity?: number;
}

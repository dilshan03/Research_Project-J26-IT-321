import type { AgentConfig } from '../types/agent.types';

export const greenbot: AgentConfig = {
  id: 'greenbot',
  name: 'Greenbot',
  modelUrl: '/assets/agents/greenbot/greenbot.glb',
  scale: 1,
  position: [0, -1, 0],
  camera: {
    position: [0, 1.2, 3.5],
    target: [0, 1, 0],
  },
  calibration: {
    restPose: 'A',
    armRaiseSign: 1,
    armOffsetZ: 0,
  },
  intensity: 1.0,
  voice: {
    pitch: 1.2,
    waveType: 'sine',
  },
};

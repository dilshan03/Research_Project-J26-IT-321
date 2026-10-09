import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const smallHint = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  const gentlePulse = Math.sin(time * 2) * 0.05 * ctx.intensity;
  setBoneTarget(targets, 'rightUpperArm', 0.3 * ctx.intensity, 0, -0.4 * ctx.intensity); 
  setBoneTarget(targets, 'rightLowerArm', 0.6 * ctx.intensity + gentlePulse, 0, 0); 
  setBoneTarget(targets, 'head', 0, -0.1 * ctx.intensity, -0.1 * ctx.intensity); 

};

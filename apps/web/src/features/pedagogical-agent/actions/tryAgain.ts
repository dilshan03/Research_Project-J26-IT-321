import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const tryAgain = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  setBoneTarget(targets, 'rightUpperArm', 0.3 * ctx.intensity, 0, -0.4 * ctx.intensity); 
  setBoneTarget(targets, 'rightLowerArm', 0.4 * ctx.intensity, 0, 0); 
  const gentleShake = Math.sin(time * 2) * 0.1 * ctx.intensity;
  setBoneTarget(targets, 'head', 0.1 * ctx.intensity, gentleShake, 0); 

};

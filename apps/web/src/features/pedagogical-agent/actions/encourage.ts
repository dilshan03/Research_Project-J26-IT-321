import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const encourage = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  setBoneTarget(targets, 'rightUpperArm', 0.6 * ctx.intensity, -0.2 * ctx.intensity, -0.2 * ctx.intensity); 
  setBoneTarget(targets, 'rightLowerArm', 1.0 * ctx.intensity, 0, 0); 
  const nod = Math.sin(time * 4) * 0.1 * ctx.intensity;
  setBoneTarget(targets, 'head', nod, 0, 0); 

};

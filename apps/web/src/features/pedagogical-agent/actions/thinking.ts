import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const thinking = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  setBoneTarget(targets, 'rightUpperArm', 1.2 * ctx.intensity, -0.3 * ctx.intensity, -0.2 * ctx.intensity); 
  setBoneTarget(targets, 'rightLowerArm', 2.0 * ctx.intensity, 0, 0); 
  const thoughtSway = Math.sin(time) * 0.05 * ctx.intensity;
  setBoneTarget(targets, 'head', -0.2 * ctx.intensity, 0.4 * ctx.intensity, 0.1 * ctx.intensity + thoughtSway); 

};

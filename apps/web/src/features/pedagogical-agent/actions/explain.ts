import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const explain = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  const lExplain = Math.sin(time * 2.5) * 0.15 * ctx.intensity;
  const rExplain = Math.cos(time * 2.5) * 0.15 * ctx.intensity;
  setBoneTarget(targets, 'rightUpperArm', 0.3 * ctx.intensity + rExplain, -0.1 * ctx.intensity, -0.4 * ctx.intensity);
  setBoneTarget(targets, 'rightLowerArm', 0.5 * ctx.intensity, 0, 0);
  setBoneTarget(targets, 'leftUpperArm', 0.3 * ctx.intensity + lExplain, 0.1 * ctx.intensity, 0.4 * ctx.intensity);
  setBoneTarget(targets, 'leftLowerArm', 0.5 * ctx.intensity, 0, 0);
  setBoneTarget(targets, 'head', 0, lExplain * 0.5, 0); 

};

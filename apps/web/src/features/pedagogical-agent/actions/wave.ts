import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const wave = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  const waveCycle = Math.sin(time * 8) * 0.4 * ctx.intensity;
  setBoneTarget(targets, 'rightUpperArm', 0.5 * ctx.intensity, 0, -1.8 * ctx.intensity);
  setBoneTarget(targets, 'rightLowerArm', 1.5 * ctx.intensity, waveCycle, 0);
  setBoneTarget(targets, 'head', 0, -0.2 * ctx.intensity, -0.1 * ctx.intensity);

};

import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const guidedHint = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  const guideMotion = Math.sin(time * 2) * 0.05 * ctx.intensity;
  setBoneTarget(targets, 'spine', 0.15 * ctx.intensity, 0, 0); 
  setBoneTarget(targets, 'rightUpperArm', (0.4 + guideMotion) * ctx.intensity, -0.2 * ctx.intensity, -0.5 * ctx.intensity);
  setBoneTarget(targets, 'rightLowerArm', 0.7 * ctx.intensity, 0, 0);
  setBoneTarget(targets, 'leftUpperArm', (0.4 + guideMotion) * ctx.intensity, 0.2 * ctx.intensity, 0.5 * ctx.intensity);
  setBoneTarget(targets, 'leftLowerArm', 0.7 * ctx.intensity, 0, 0);
  setBoneTarget(targets, 'head', 0.05 * ctx.intensity, 0, 0); 

};

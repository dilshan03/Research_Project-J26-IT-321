import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const correctCelebrate = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  const bounce = Math.abs(Math.sin(time * 5)) * 0.1 * ctx.intensity;
  setBoneTarget(targets, 'spine', bounce, 0, 0); 
  setBoneTarget(targets, 'rightUpperArm', 0, 0, -2.5 * ctx.intensity);
  setBoneTarget(targets, 'leftUpperArm', 0, 0, 2.5 * ctx.intensity);
  setBoneTarget(targets, 'rightLowerArm', 0.2 * ctx.intensity, 0, 0); 
  setBoneTarget(targets, 'leftLowerArm', 0.2 * ctx.intensity, 0, 0);
  setBoneTarget(targets, 'head', -0.15 * ctx.intensity, 0, 0); 

};

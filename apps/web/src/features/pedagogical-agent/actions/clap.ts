import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const clap = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  const clapCycle = Math.abs(Math.sin(time * 10)) * 0.2 * ctx.intensity; 
  setBoneTarget(targets, 'rightUpperArm', 0.6 * ctx.intensity, -0.5 * ctx.intensity, -0.2 * ctx.intensity);
  setBoneTarget(targets, 'leftUpperArm', 0.6 * ctx.intensity, 0.5 * ctx.intensity, 0.2 * ctx.intensity);
  setBoneTarget(targets, 'rightLowerArm', 1.2 * ctx.intensity, 0, clapCycle);
  setBoneTarget(targets, 'leftLowerArm', 1.2 * ctx.intensity, 0, -clapCycle);
  setBoneTarget(targets, 'head', 0.1 * ctx.intensity, 0, 0); 

};

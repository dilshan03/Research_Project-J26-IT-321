import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

export const pointLeft = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  idle(time, targets, ctx);
  setBoneTarget(targets, 'leftUpperArm', 0, 0, 1.5 * ctx.intensity); 
  setBoneTarget(targets, 'leftLowerArm', 0, 0, 0); 
  setBoneTarget(targets, 'head', 0, 0.8 * ctx.intensity, 0); 

};

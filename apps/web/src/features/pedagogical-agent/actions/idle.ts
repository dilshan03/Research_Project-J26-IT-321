import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';

export const idle = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {

  const breath = Math.sin(time * 1.5) * 0.02 * ctx.intensity;
  const sway = Math.sin(time * 0.5) * 0.03 * ctx.intensity;

  setBoneTarget(targets, 'spine', breath, 0, sway);
  setBoneTarget(targets, 'head', 0, sway * 0.5, breath * 0.5);
  setBoneTarget(targets, 'leftUpperArm', 0, 0, 0.05 + breath);
  setBoneTarget(targets, 'rightUpperArm', 0, 0, -0.05 - breath);
  setBoneTarget(targets, 'leftLowerArm', 0, 0, 0);
  setBoneTarget(targets, 'rightLowerArm', 0, 0, 0);

};

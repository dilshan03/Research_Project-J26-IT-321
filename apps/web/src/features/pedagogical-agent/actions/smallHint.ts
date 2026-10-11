import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

/**
 * Small Hint:
 * Subtle, gentle clue gesture.
 * The robot leans slightly forward toward the learner, making a gentle soft pointing motion 
 * with the right hand at waist/chest level, head tilted curiously.
 */
export const smallHint = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {
  idle(time, targets, ctx);

  // Soft subtle pulse to convey "here is a tiny clue"
  const cluePulse = Math.sin(time * 2.5) * 0.08 * ctx.intensity;

  // Lean slightly forward toward learner
  setBoneTarget(targets, 'spine', 0.12 * ctx.intensity, 0, 0.04 * ctx.intensity);

  // Curious, helpful head tilt
  setBoneTarget(targets, 'head', 0.05 * ctx.intensity, -0.15 * ctx.intensity, 0.12 * ctx.intensity);

  // Right arm: compact, waist-level soft clue gesture
  setBoneTarget(targets, 'rightUpperArm', (0.35 + cluePulse) * ctx.intensity, -0.1 * ctx.intensity, -0.25 * ctx.intensity); 
  setBoneTarget(targets, 'rightLowerArm', 0.85 * ctx.intensity + cluePulse, 0.2 * ctx.intensity, 0);

  // Left arm: relaxed by side
  setBoneTarget(targets, 'leftUpperArm', 0.05 * ctx.intensity, 0, 0.1 * ctx.intensity);
  setBoneTarget(targets, 'leftLowerArm', 0.1 * ctx.intensity, 0, 0);
};

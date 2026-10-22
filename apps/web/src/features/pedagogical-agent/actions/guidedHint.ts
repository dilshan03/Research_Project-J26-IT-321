import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

/**
 * Guided Hint:
 * Directional hint pointing directly at the problem/first step.
 * Right arm extends high & forward pointing at the task/question.
 * Left arm rests as an open palm at chest level supporting the explanation.
 */
export const guidedHint = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {
  idle(time, targets, ctx);

  // Gentle directional pulse
  const guidePulse = Math.sin(time * 3) * 0.06 * ctx.intensity;

  // Upright, focused spine turned slightly toward the question
  setBoneTarget(targets, 'spine', 0.1 * ctx.intensity, 0, -0.08 * ctx.intensity);

  // Head looks intentionally along the pointing arm
  setBoneTarget(targets, 'head', 0.05 * ctx.intensity, -0.2 * ctx.intensity, -0.05 * ctx.intensity);

  // Right arm: clear, elevated pointing toward question/board
  setBoneTarget(
    targets, 
    'rightUpperArm', 
    (0.65 + guidePulse) * ctx.intensity, 
    -0.25 * ctx.intensity, 
    -0.45 * ctx.intensity
  );
  setBoneTarget(targets, 'rightLowerArm', 0.45 * ctx.intensity, 0, 0);

  // Left arm: open palm held at chest level (guiding posture)
  setBoneTarget(targets, 'leftUpperArm', 0.4 * ctx.intensity, 0.25 * ctx.intensity, 0.35 * ctx.intensity);
  setBoneTarget(targets, 'leftLowerArm', 1.1 * ctx.intensity, 0.2 * ctx.intensity, 0);
};

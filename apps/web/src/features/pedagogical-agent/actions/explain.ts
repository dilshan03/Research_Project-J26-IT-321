import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

/**
 * Explain:
 * Full conversational explanation gesture.
 * Both arms open wide in an inviting, expressive teaching gesture,
 * with rhythmic alternating cadence and gentle head nodding.
 */
export const explain = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {
  idle(time, targets, ctx);

  // Conversational cadence: alternating natural speaking gestures
  const rGesture = Math.sin(time * 2.2) * 0.12 * ctx.intensity;
  const lGesture = Math.cos(time * 2.2) * 0.12 * ctx.intensity;
  const headCadence = Math.sin(time * 2.2) * 0.08 * ctx.intensity;

  // Attentive, slightly forward posture
  setBoneTarget(targets, 'spine', 0.08 * ctx.intensity, 0, 0);

  // Conversational head nods & tilt
  setBoneTarget(targets, 'head', 0.05 * ctx.intensity + headCadence, rGesture * 0.5, 0);

  // Right arm: wide open, expressive explaining gesture
  setBoneTarget(
    targets, 
    'rightUpperArm', 
    (0.45 + rGesture) * ctx.intensity, 
    -0.2 * ctx.intensity, 
    -(0.7 + rGesture * 0.5) * ctx.intensity
  );
  setBoneTarget(targets, 'rightLowerArm', 0.9 * ctx.intensity + rGesture, 0.2 * ctx.intensity, 0);

  // Left arm: wide open, expressive explaining gesture
  setBoneTarget(
    targets, 
    'leftUpperArm', 
    (0.45 + lGesture) * ctx.intensity, 
    0.2 * ctx.intensity, 
    (0.7 + lGesture * 0.5) * ctx.intensity
  );
  setBoneTarget(targets, 'leftLowerArm', 0.9 * ctx.intensity + lGesture, -0.2 * ctx.intensity, 0);
};

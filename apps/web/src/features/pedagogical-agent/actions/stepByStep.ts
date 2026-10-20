import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';
import { setBoneTarget } from './helpers';
import { idle } from './idle';

/**
 * Step-by-Step Pedagogical Action:
 * Sequential 3-step pointing gesture (Left -> Center -> Right)
 * Visually communicates a sequential process / step 1, 2, 3 with readable pauses.
 */
export const stepByStep = (
  time: number, 
  targets: Record<string, THREE.Quaternion>, 
  ctx: ActionContext
) => {
  idle(time, targets, ctx);

  // 3-step rhythmic cycle (approx 3.6s total cycle, 1.2s per step)
  const cycle = (time * 0.8) % 3; 

  let targetX = 0.5;   // arm raised forward
  let targetY = 0.0;   // arm horizontal swing
  let targetZ = -0.5;  // arm spread
  let headYaw = 0.0;
  let spineYaw = 0.0;

  if (cycle < 1.0) {
    // Step 1: Point to the Left / First Item
    const p = Math.sin(cycle * Math.PI) * 0.05; // subtle step accent
    targetX = (0.45 + p) * ctx.intensity;
    targetY = -0.4 * ctx.intensity;
    targetZ = -0.2 * ctx.intensity;
    headYaw = 0.25 * ctx.intensity;
    spineYaw = 0.15 * ctx.intensity;
  } else if (cycle < 2.0) {
    // Step 2: Point to the Center / Second Item
    const subP = cycle - 1.0;
    const p = Math.sin(subP * Math.PI) * 0.05;
    targetX = (0.6 + p) * ctx.intensity;
    targetY = 0.0;
    targetZ = -0.4 * ctx.intensity;
    headYaw = 0.0;
    spineYaw = 0.0;
  } else {
    // Step 3: Point to the Right / Third Item (Conclusion)
    const subP = cycle - 2.0;
    const p = Math.sin(subP * Math.PI) * 0.05;
    targetX = (0.45 + p) * ctx.intensity;
    targetY = 0.4 * ctx.intensity;
    targetZ = -0.7 * ctx.intensity;
    headYaw = -0.25 * ctx.intensity;
    spineYaw = -0.15 * ctx.intensity;
  }

  // Right arm performs sequential pointing
  setBoneTarget(targets, 'rightUpperArm', targetX, targetY, targetZ);
  setBoneTarget(targets, 'rightLowerArm', 0.85 * ctx.intensity, 0, 0);

  // Left arm supports open palm near hip/torso
  setBoneTarget(targets, 'leftUpperArm', 0.2 * ctx.intensity, 0.15 * ctx.intensity, 0.25 * ctx.intensity);
  setBoneTarget(targets, 'leftLowerArm', 0.5 * ctx.intensity, 0, 0);

  // Body orientation follows the step
  setBoneTarget(targets, 'spine', 0.08 * ctx.intensity, 0, spineYaw);
  setBoneTarget(targets, 'head', 0.05 * ctx.intensity, headYaw, 0);
};

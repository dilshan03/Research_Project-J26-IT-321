import * as THREE from 'three';
import type { ActionContext } from '../types/agent.types';

const euler = new THREE.Euler();

export function setBoneTarget(
  targets: Record<string, THREE.Quaternion>,
  boneName: string,
  x: number,
  y: number,
  z: number
) {
  euler.set(x, y, z);
  if (!targets[boneName]) {
    targets[boneName] = new THREE.Quaternion();
  }
  targets[boneName].setFromEuler(euler);
}

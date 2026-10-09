import * as THREE from 'three';
import type { AgentConfig } from '../types/agent.types';

// Map logical bone names to regex patterns as a fallback
const fallbackRegexMap: Record<string, RegExp> = {
  hips: /(hips|pelvis)/i,
  spine: /(spine\d*|chest)/i,
  head: /(head|neck)/i,
  leftUpperArm: /(left.*arm|l_uparm|upperarm_l|leftarm)/i,
  rightUpperArm: /(right.*arm|r_uparm|upperarm_r|rightarm)/i,
  leftLowerArm: /(left.*forearm|l_forearm|lowerarm_l)/i,
  rightLowerArm: /(right.*forearm|r_forearm|lowerarm_r)/i,
  leftHand: /(left.*hand|l_hand|hand_l)/i,
  rightHand: /(right.*hand|r_hand|hand_r)/i,
};

// Precise Mixamo rig mappings (often found in Meshy exports)
const exactMixamoMap: Record<string, string> = {
  hips: 'mixamorig:Hips',
  spine: 'mixamorig:Spine',
  head: 'mixamorig:Head',
  leftUpperArm: 'mixamorig:LeftArm',
  rightUpperArm: 'mixamorig:RightArm',
  leftLowerArm: 'mixamorig:LeftForeArm',
  rightLowerArm: 'mixamorig:RightForeArm',
  leftHand: 'mixamorig:LeftHand',
  rightHand: 'mixamorig:RightHand',
};

export const extractBones = (scene: THREE.Object3D, config: AgentConfig): Record<string, THREE.Bone> => {
  const bones: Record<string, THREE.Bone> = {};
  
  // First, extract all bones from the scene
  const allBones: THREE.Bone[] = [];
  scene.traverse((obj) => {
    if (obj.type === 'Bone') {
      allBones.push(obj as THREE.Bone);
    }
  });

  // Helper to find a bone by name
  const findBone = (logicalName: string) => {
    // 1. Check Agent Config Overrides
    if (config.boneOverrides && config.boneOverrides[logicalName]) {
      const overrideName = config.boneOverrides[logicalName];
      const found = allBones.find(b => b.name === overrideName);
      if (found) return found;
    }

    // 2. Check Exact Mixamo Match (most common for Meshy)
    const exactName = exactMixamoMap[logicalName];
    if (exactName) {
      const found = allBones.find(b => b.name === exactName);
      if (found) return found;
    }

    // 3. Fallback to Regex
    const pattern = fallbackRegexMap[logicalName];
    if (pattern) {
      // Find the first bone matching the regex
      const found = allBones.find(b => pattern.test(b.name));
      if (found) return found;
    }

    return null;
  };

  const logicalNames = [
    'hips', 'spine', 'head', 
    'leftUpperArm', 'rightUpperArm', 
    'leftLowerArm', 'rightLowerArm', 
    'leftHand', 'rightHand'
  ];

  logicalNames.forEach(name => {
    const bone = findBone(name);
    if (bone) {
      bones[name] = bone;
    }
  });

  console.log(`[Agent: ${config.id}] Extracted bones:`, Object.keys(bones));
  return bones;
};

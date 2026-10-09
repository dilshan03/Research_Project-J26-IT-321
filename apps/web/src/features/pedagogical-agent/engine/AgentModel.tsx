import React, { useMemo, useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { extractBones } from './boneMap';
import { useAgentStore } from '../store/useAgentStore';
import * as actions from '../actions';
import type { AgentConfig, ActionContext } from '../types/agent.types';
import { getAgentConfig } from '../agents/registry';

interface AgentModelProps {
  agentId: 'greenbot' | 'blinkybot';
}

export function AgentModel({ agentId }: AgentModelProps) {
  const config = getAgentConfig(agentId);
  const group = useRef<THREE.Group>(null);
  
  // Use Zustand store for action state
  const currentAction = useAgentStore((state) => state.currentAction);
  const actionOptions = useAgentStore((state) => state.actionOptions);
  const stopAction = useAgentStore((state) => state.stopAction);
  
  // Load model (suspends until loaded)
  const { scene } = useGLTF(config.modelUrl);

  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = SkeletonUtils.clone(scene);
    
    // Force true bind pose
    clone.traverse((obj: any) => {
      if (obj.isSkinnedMesh && obj.skeleton) {
        obj.skeleton.pose();
      }
    });
    return clone;
  }, [scene]);

  const mappedBones = useMemo(() => {
    if (!clonedScene) return {};
    return extractBones(clonedScene, config);
  }, [clonedScene, config]);

  const initialQuaternions = useRef<Record<string, THREE.Quaternion>>({});
  const targetQuaternions = useRef<Record<string, THREE.Quaternion>>({});
  
  // To implement `duration` and return to idle
  const actionStartTime = useRef<number>(0);

  useEffect(() => {
    Object.entries(mappedBones).forEach(([name, bone]) => {
      initialQuaternions.current[name] = bone.quaternion.clone();
      targetQuaternions.current[name] = new THREE.Quaternion();
    });
  }, [mappedBones]);
  
  // Reset start time when action changes
  useEffect(() => {
    actionStartTime.current = 0; // Will be set in useFrame
  }, [currentAction]);

  useFrame((state, delta) => {
    if (!clonedScene || Object.keys(mappedBones).length === 0) return;
    
    const time = state.clock.getElapsedTime();
    if (actionStartTime.current === 0) actionStartTime.current = time;
    
    // Check duration
    if (actionOptions.duration && currentAction !== 'idle') {
      if (time - actionStartTime.current > actionOptions.duration) {
        stopAction();
        return;
      }
    }

    const actionFunc = (actions as any)[currentAction] || actions.idle;
    
    const ctx: ActionContext = {
      intensity: actionOptions.intensity || config.intensity || 1.0,
      calibration: config.calibration,
      progress: actionOptions.duration ? (time - actionStartTime.current) / actionOptions.duration : 0
    };

    // 1. Reset target quaternions to Identity
    Object.keys(targetQuaternions.current).forEach(key => {
      targetQuaternions.current[key].identity();
    });

    // Calculate targets for current frame
    actionFunc(time, targetQuaternions.current, ctx);

    const blendSpeed = 5 * delta;
    
    // Reusable temp quaternion to avoid GC pauses
    const tempQ = new THREE.Quaternion();

    Object.entries(mappedBones).forEach(([name, bone]) => {
      const targetLocal = targetQuaternions.current[name];
      if (!targetLocal) return;

      tempQ.copy(initialQuaternions.current[name]).multiply(targetLocal);
      bone.quaternion.slerp(tempQ, blendSpeed);
    });
    
    // Auto-blink logic if morph targets exist
    const blinkCycle = time % 4;
    const isBlinking = blinkCycle < 0.1 || (blinkCycle > 0.2 && blinkCycle < 0.3 && Math.random() > 0.8);
    
    clonedScene.traverse((obj: any) => {
      if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        const blinkKey = config.face.blinkMorph || Object.keys(obj.morphTargetDictionary).find(k => k.toLowerCase().includes('blink') || k.toLowerCase().includes('eye_closed'));
        if (blinkKey) {
          const targetIndex = obj.morphTargetDictionary[blinkKey];
          obj.morphTargetInfluences[targetIndex] = THREE.MathUtils.lerp(
            obj.morphTargetInfluences[targetIndex], 
            isBlinking ? 1 : 0, 
            30 * delta
          );
        }
      }
    });
  });

  return (
    <group ref={group} dispose={null} scale={config.scale} position={config.position}>
      {clonedScene && <primitive object={clonedScene} />}
    </group>
  );
}

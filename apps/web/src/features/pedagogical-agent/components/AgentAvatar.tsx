import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import { AgentModel } from '../engine/AgentModel';
import { getAgentConfig } from '../agents/registry';
import type { AgentId } from '../types/agent.types';

interface AgentAvatarProps {
  agentId?: AgentId;
}

export function AgentAvatar({ agentId = 'greenbot' }: AgentAvatarProps) {
  const config = getAgentConfig(agentId);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <AgentModel agentId={agentId} />
          </Stage>
        </Suspense>
        <OrbitControls target={[0, 1, 0]} />
      </Canvas>
    </div>
  );
}

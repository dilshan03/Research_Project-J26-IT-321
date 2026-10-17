import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { AgentModel } from '../engine/AgentModel';
import { AgentSpeechBubble } from './AgentSpeechBubble';
import type { AgentId } from '../types/agent.types';

interface AgentAvatarProps {
  agentId?: AgentId;
  showSpeechBubble?: boolean;
  interactive?: boolean; // When false, camera is locked (no rotate, zoom in/out, pan)
}

export function AgentAvatar({ 
  agentId = 'greenbot', 
  showSpeechBubble = true,
  interactive = false 
}: AgentAvatarProps) {

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* 2D Speech Bubble Cloud Overlay */}
      {showSpeechBubble && <AgentSpeechBubble />}

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0.1, 3.2]} fov={45} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 4, -4]} intensity={0.4} />
        <Suspense fallback={null}>
          <Environment preset="city" />
          {/* Scaled down (0.72) and shifted down nicely to give ample headroom for bubble */}
          <group position={[0, -0.28, 0]} scale={0.72}>
            <AgentModel agentId={agentId} />
          </group>
        </Suspense>
        {interactive && <OrbitControls target={[0, -0.25, 0]} />}
      </Canvas>
    </div>
  );
}

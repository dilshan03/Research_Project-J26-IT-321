import React from 'react';
import { AgentAvatar, AgentDevPanel, useAgentStore } from '../../features/pedagogical-agent';

export function AgentTestPage() {
  const activeAgentId = useAgentStore((state) => state.activeAgentId);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1e1e1e', color: 'white' }}>
      
      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <AgentAvatar agentId={activeAgentId} />
      </div>
      
      {/* Test Panel Area */}
      <div style={{ width: '300px', padding: '20px', background: '#2c2c2c', overflowY: 'auto' }}>
        <AgentDevPanel />
      </div>

    </div>
  );
}

export default AgentTestPage;

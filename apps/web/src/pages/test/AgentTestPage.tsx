import React from 'react';
import { AgentAvatar, AgentDevPanel, useAgentStore } from '../../features/pedagogical-agent';

export function AgentTestPage() {
  const activeAgentId = useAgentStore((state) => state.activeAgentId);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#1e1e1e', color: 'white' }}>
      
      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <a 
          href="/"
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 50,
            padding: '8px 16px',
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← Back to Home
        </a>
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

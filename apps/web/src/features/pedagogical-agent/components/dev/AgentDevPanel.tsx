import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import type { AgentId } from '../../types/agent.types';
import { getAgentConfig } from '../../agents/registry';
import { playAgentSound } from '../../engine/soundEngine';

export function AgentDevPanel() {
  const currentAction = useAgentStore((state) => state.currentAction);
  const playAction = useAgentStore((state) => state.playAction);
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const setAgent = useAgentStore((state) => state.setAgent);

  const actionList = [
    { id: 'idle', label: 'Idle' },
    { id: 'wave', label: 'Wave' },
    { id: 'smallHint', label: 'Small Hint' },
    { id: 'guidedHint', label: 'Guided Hint' },
    { id: 'explain', label: 'Explain' },
    { id: 'pointLeft', label: 'Point Left' },
    { id: 'pointRight', label: 'Point Right' },
    { id: 'thinking', label: 'Thinking' },
    { id: 'correctCelebrate', label: 'Correct Celebrate' },
    { id: 'tryAgain', label: 'Try Again' },
    { id: 'encourage', label: 'Encourage' },
    { id: 'clap', label: 'Clap' }
  ];

  const handleAction = (act: string) => {
    playAction(act);
    const config = getAgentConfig(activeAgentId);
    playAgentSound(act, config);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ margin: '0 0 10px 0' }}>Procedural Actions</h2>
      <p style={{ marginBottom: '20px', fontSize: '0.9em', color: '#aaa' }}>
        Code-driven R3F animation system mapping to discovered bones.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Select Agent:</label>
        <select 
          value={activeAgentId} 
          onChange={(e) => setAgent(e.target.value as AgentId)}
          style={{ width: '100%', padding: '8px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
        >
          <option value="greenbot">Greenbot</option>
          <option value="blinkybot">BlinkyBot</option>
        </select>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
        {actionList.map(action => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            style={{
              padding: '10px',
              background: currentAction === action.id ? '#4CAF50' : '#444',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: currentAction === action.id ? 'bold' : 'normal'
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

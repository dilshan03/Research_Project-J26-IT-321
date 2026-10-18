import { useState } from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import type { AgentActionName, AgentId, GameEvent } from '../../types/agent.types';
import { GAME_EVENT_MAP } from '../../mapping/gameEventMapping';

export function AgentDevPanel() {
  const currentAction = useAgentStore((state) => state.currentAction);
  const playAction = useAgentStore((state) => state.playAction);
  const triggerGameEvent = useAgentStore((state) => state.triggerGameEvent);
  const stopAction = useAgentStore((state) => state.stopAction);
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const setAgent = useAgentStore((state) => state.setAgent);

  const [activeTab, setActiveTab] = useState<'gameEvents' | 'rawActions'>('gameEvents');

  const actionList: { id: AgentActionName; label: string }[] = [
    { id: 'idle', label: 'Idle' },
    { id: 'wave', label: 'Wave' },
    { id: 'smallHint', label: 'Small Hint' },
    { id: 'guidedHint', label: 'Guided Hint' },
    { id: 'stepByStep', label: 'Step-by-Step' },
    { id: 'explain', label: 'Explain' },
    { id: 'pointLeft', label: 'Point Left' },
    { id: 'pointRight', label: 'Point Right' },
    { id: 'thinking', label: 'Thinking' },
    { id: 'correctCelebrate', label: 'Correct Celebrate' },
    { id: 'tryAgain', label: 'Try Again' },
    { id: 'encourage', label: 'Encourage' },
    { id: 'clap', label: 'Clap' }
  ];

  const gameEventsList: { event: GameEvent; label: string; badge: string; color: string }[] = [
    { event: 'GAME_START', label: 'Game Start', badge: 'Wave', color: '#3C82B4' },
    { event: 'QUESTION_SHOW', label: 'Question Show', badge: 'Idle', color: '#666' },
    { event: 'THINKING', label: 'Thinking / Idle', badge: 'Thinking', color: '#8D6CE7' },
    { event: 'CORRECT_ANSWER', label: 'Correct Answer', badge: 'Celebrate', color: '#4E9B78' },
    { event: 'WRONG_ANSWER', label: 'Wrong Answer', badge: 'Try Again', color: '#C96868' },
    { event: 'HINT_LEVEL_1', label: 'Hint Level 1', badge: 'Small Hint', color: '#F3B944' },
    { event: 'HINT_LEVEL_2', label: 'Hint Level 2', badge: 'Guided Hint', color: '#F39C12' },
    { event: 'HINT_LEVEL_3', label: 'Hint Level 3', badge: 'Step-by-Step', color: '#E67E22' },
    { event: 'HINT_LEVEL_4', label: 'Hint Level 4', badge: 'Explain', color: '#D35400' },
    { event: 'ENCOURAGE', label: 'Encourage', badge: 'Thumbs-Up', color: '#27AE60' },
    { event: 'CELEBRATE', label: 'Milestone', badge: 'Clap', color: '#2980B9' }
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800 }}>Agent Controller</h2>
      <p style={{ marginBottom: '14px', fontSize: '0.85em', color: '#aaa', lineHeight: 1.4 }}>
        Unified controller with auto-idle reset and game event dispatching.
      </p>

      {/* Agent Selector */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8em', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Active Agent
        </label>
        <select 
          value={activeAgentId} 
          onChange={(e) => setAgent(e.target.value as AgentId)}
          style={{ width: '100%', padding: '8px 10px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '6px', fontSize: '0.9em' }}
        >
          <option value="greenbot">Greenbot</option>
          <option value="blinkybot">BlinkyBot</option>
        </select>
      </div>

      {/* Current State Pill */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '8px 12px', 
        background: '#1a202c', 
        borderRadius: '6px', 
        border: '1px solid #334155',
        marginBottom: '14px' 
      }}>
        <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>Current State:</span>
        <span style={{ 
          fontSize: '0.85em', 
          fontWeight: 700, 
          color: currentAction === 'idle' ? '#94a3b8' : '#38bdf8',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {currentAction} {currentAction !== 'idle' && '⏳'}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('gameEvents')}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '0.85em',
            fontWeight: 700,
            background: activeTab === 'gameEvents' ? '#3B82F6' : '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🎮 Game Events (Step 2)
        </button>
        <button
          onClick={() => setActiveTab('rawActions')}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '0.85em',
            fontWeight: 700,
            background: activeTab === 'rawActions' ? '#3B82F6' : '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🤖 Actions (Step 1)
        </button>
      </div>

      {/* Action / Event Button Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {activeTab === 'gameEvents' ? (
          <>
            {gameEventsList.map(item => {
              const config = GAME_EVENT_MAP[item.event];
              const isPlaying = currentAction === config.action;
              return (
                <button
                  key={item.event}
                  onClick={() => triggerGameEvent(item.event)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: isPlaying ? '#2563EB' : '#1e293b',
                    color: 'white',
                    border: isPlaying ? '1px solid #60A5FA' : '1px solid #334155',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.88em' }}>{item.label}</span>
                  <span style={{ 
                    fontSize: '0.75em', 
                    padding: '2px 8px', 
                    borderRadius: '999px', 
                    background: isPlaying ? '#1D4ED8' : item.color,
                    color: '#fff',
                    fontWeight: 700
                  }}>
                    → {item.badge}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            {actionList.map(action => {
              const isPlaying = currentAction === action.id;
              return (
                <button
                  key={action.id}
                  onClick={() => playAction(action.id)}
                  style={{
                    padding: '9px 12px',
                    background: isPlaying ? '#10B981' : '#1e293b',
                    color: 'white',
                    border: isPlaying ? '1px solid #34D399' : '1px solid #334155',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: isPlaying ? 700 : 500,
                    fontSize: '0.88em'
                  }}
                >
                  {action.label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={stopAction}
        style={{
          marginTop: '10px',
          padding: '8px',
          background: '#334155',
          color: '#e2e8f0',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8em',
          fontWeight: 600
        }}
      >
        ⏹ Reset to Idle
      </button>
    </div>
  );
}

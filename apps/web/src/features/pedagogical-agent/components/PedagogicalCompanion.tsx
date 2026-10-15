import React from 'react';
import { AgentAvatar } from './AgentAvatar';
import { HintBoard, type HintBoardProps } from './HintBoard';
import { useAgentStore } from '../store/useAgentStore';
import type { AgentId, HintLevel } from '../types/agent.types';

export interface PedagogicalCompanionProps {
  agentId?: AgentId;
  hints?: HintBoardProps['hints'];
  onHintRequest?: (level: HintLevel) => void;
  disabled?: boolean;
  interactive?: boolean; // Default false to prevent zoom/rotate/pan
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PedagogicalCompanion:
 * Dedicated, plug-and-play side companion widget.
 * Structure:
 * - Top: Fixed-size 3D Pedagogical Agent (non-draggable/non-zoomable by default)
 *        with natural Sinhala speech bubble above head
 * - Bottom: Progressive Hint Board (Levels 1 to 4)
 *
 * Placed on the right side of the learning screen during gameplay.
 */
export const PedagogicalCompanion: React.FC<PedagogicalCompanionProps> = ({
  agentId,
  hints,
  onHintRequest,
  disabled = false,
  interactive = false,
  className = '',
  style = {}
}) => {
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const targetAgentId = agentId || activeAgentId;
  const currentAction = useAgentStore((state) => state.currentAction);

  return (
    <aside
      className={`pedagogical-companion-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '460px',
        minWidth: '340px',
        height: '100%',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.35)',
        ...style
      }}
    >
      {/* 3D Agent Avatar Container (Fixed Framing, No Zoom/Rotation, Positioned closer to Hint Board) */}
      <div
        style={{
          width: '100%',
          height: '270px',
          minHeight: '260px',
          position: 'relative',
          borderRadius: '16px',
          background: 'radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <AgentAvatar
          agentId={targetAgentId}
          showSpeechBubble={true}
          interactive={interactive}
        />
      </div>

      {/* Progressive Hint Board (Sitting directly below agent) */}
      <div style={{ width: '100%', marginTop: '4px' }}>
        <HintBoard
          hints={hints}
          onHintRequest={onHintRequest}
          disabled={disabled}
        />
      </div>
    </aside>
  );
};

export default PedagogicalCompanion;

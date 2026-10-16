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
  theme?: 'light' | 'dark';
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
  theme = 'light',
  className = '',
  style = {},
}) => {
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const targetAgentId = agentId || activeAgentId;
  const isLight = theme === 'light';

  return (
    <aside
      className={`pedagogical-companion-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: isLight
          ? 'linear-gradient(180deg, #FFFFFF 0%, #F4F8FB 100%)'
          : 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        border: isLight ? '1px solid #D6E4ED' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '14px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        justifyContent: 'space-between',
        gap: '10px',
        boxShadow: isLight
          ? '0 8px 24px -8px rgba(13, 35, 64, 0.07)'
          : '-8px 0 30px rgba(0, 0, 0, 0.35)',
        ...style,
      }}
    >
      {/* 3D Agent Avatar Container (Fixed Framing, No Zoom/Rotation, Positioned closer to Hint Board) */}
      <div
        style={{
          width: '100%',
          height: '245px',
          minHeight: '235px',
          position: 'relative',
          borderRadius: '16px',
          background: isLight
            ? 'radial-gradient(circle at 50% 58%, rgba(60, 130, 180, 0.16) 0%, rgba(233, 243, 255, 0.65) 52%, rgba(255, 255, 255, 0) 80%)'
            : 'radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <AgentAvatar
          agentId={targetAgentId}
          showSpeechBubble={true}
          interactive={interactive}
        />
      </div>

      {/* Progressive Hint Board (Sitting directly below agent) */}
      <div style={{ width: '100%' }}>
        <HintBoard
          hints={hints}
          onHintRequest={onHintRequest}
          disabled={disabled}
          theme={theme}
        />
      </div>
    </aside>
  );
};

export default PedagogicalCompanion;

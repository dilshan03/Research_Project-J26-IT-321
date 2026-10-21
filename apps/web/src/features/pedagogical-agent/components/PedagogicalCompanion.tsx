import React, { useState, useEffect } from 'react';
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
  onClose?: () => void;
  defaultAvatar?: string;
  calm?: boolean;
}

/**
 * PedagogicalCompanion:
 * Dedicated side companion widget for MathQuest.
 * Initially presents ONLY 3D MathBot with zero visual clutter.
 * Tapping MathBot expands the progressive Hint Board.
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
  onClose,
}) => {
  const activeAgentId = useAgentStore((state) => state.activeAgentId);
  const targetAgentId = agentId || activeAgentId;
  const isLight = theme === 'light';

  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);
  const requestNextHint = useAgentStore((state) => state.requestNextHint);
  const [isHintsExpanded, setIsHintsExpanded] = useState<boolean>(currentHintLevel > 0);

  // Once a hint is requested or active, ensure the hints board stays open without auto-collapsing
  useEffect(() => {
    if (currentHintLevel > 0) {
      setIsHintsExpanded(true);
    }
  }, [currentHintLevel]);

  const handleAvatarClick = () => {
    if (!isHintsExpanded) {
      setIsHintsExpanded(true);
      // If no hint has been requested yet, automatically unlock Level 1 for immediate help
      if (currentHintLevel === 0) {
        const nextLevel = requestNextHint();
        if (onHintRequest) {
          onHintRequest(nextLevel);
        }
      }
    } else {
      // Keep hints open! Gentle friendly response without shrinking
      useAgentStore.getState().playAction('wave', { duration: 2.0 });
    }
  };

  const handleCollapseHints = () => {
    setIsHintsExpanded(false);
  };

  return (
    <aside
      className={`pedagogical-companion-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'auto',
        background: isLight
          ? 'linear-gradient(180deg, #FFFFFF 0%, #F4F8FB 100%)'
          : 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        border: isLight ? '1.5px solid #D6E4ED' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '14px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        gap: '10px',
        boxShadow: isLight
          ? '0 10px 30px -8px rgba(13, 35, 64, 0.08)'
          : '-8px 0 30px rgba(0, 0, 0, 0.35)',
        ...style,
      }}
    >
      {/* Top Support Header with Close Action */}
      <div className="flex items-center justify-between pb-2 border-b border-mq-border/50">
        <div className="flex items-center gap-1.5 text-xs font-black text-mq-primary">
          <span className="text-base">🤖</span>
          <span>MathBot</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-mq-text-muted hover:text-mq-text px-2 py-0.5 rounded-lg hover:bg-mq-surface-soft transition cursor-pointer flex items-center gap-1 border border-transparent hover:border-mq-border/50"
            title="සඟවන්න"
          >
            <span>✕</span>
          </button>
        )}
      </div>

      {/* 3D Agent Avatar Container - Interactive Tap to Reveal Hints */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleAvatarClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAvatarClick();
          }
        }}
        className={`group relative select-none transition-transform duration-200 ${
          !isHintsExpanded ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.98]' : ''
        }`}
        style={{
          width: '100%',
          height: '245px',
          minHeight: '235px',
          position: 'relative',
          borderRadius: '18px',
          background: isLight
            ? 'radial-gradient(circle at 50% 58%, rgba(60, 130, 180, 0.16) 0%, rgba(233, 243, 255, 0.65) 52%, rgba(255, 255, 255, 0) 80%)'
            : 'radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        title={!isHintsExpanded ? 'හෝඩුවාවන් බලන්න MathBot ඔබන්න' : 'MathBot'}
      >
        <AgentAvatar
          agentId={targetAgentId}
          showSpeechBubble={true}
          interactive={interactive}
        />

        {/* Minimal kid-friendly prompt pill when collapsed */}
        {!isHintsExpanded && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-mq-primary border border-mq-primary/30 shadow-md backdrop-blur-xs animate-bounce">
              <span>💡</span>
              <span>හෝඩුවාවන් බලන්න මාව ඔබන්න</span>
            </span>
          </div>
        )}
      </div>

      {/* Progressive Hint Board (Levels 1 to 4) - Shown when expanded */}
      {isHintsExpanded && (
        <div className="w-full space-y-2 animate-fade-in">
          <HintBoard
            hints={hints}
            onHintRequest={onHintRequest}
            disabled={disabled}
            theme={theme}
          />
          <button
            type="button"
            onClick={handleCollapseHints}
            className="w-full py-1.5 px-3 text-xs font-bold text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft/80 border border-transparent hover:border-mq-border/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-xl"
            title="හෝඩුවාවන් සඟවන්න (Hide hints)"
          >
            <span className="text-[10px]">▲</span>
            <span>හෝඩුවාවන් සඟවන්න</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default PedagogicalCompanion;

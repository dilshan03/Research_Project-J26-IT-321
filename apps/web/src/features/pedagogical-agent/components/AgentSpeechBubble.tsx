import React from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { ACTION_SPEECH_MAP } from '../dialogue/actionSpeechMap';

export function AgentSpeechBubble() {
  const currentAction = useAgentStore((state) => state.currentAction);
  const actionOptions = useAgentStore((state) => state.actionOptions);

  if (currentAction === 'idle') {
    return null;
  }

  const defaultSpeech = ACTION_SPEECH_MAP[currentAction];
  if (!defaultSpeech && !actionOptions.message) {
    return null;
  }

  const sinhalaText = actionOptions.message || defaultSpeech?.sinhala || '';
  const emoji = defaultSpeech?.emoji || '💬';
  const accentColor = defaultSpeech?.color || '#3C82B4';

  return (
    <div 
      style={{
        position: 'absolute',
        top: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}
    >
      <style>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(8px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        @keyframes floatCloud {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>

      {/* Clean, Compact, Child-friendly Cloud Bubble */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: '999px',
          padding: '6px 16px',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.3), 0 0 0 2px ' + accentColor + '33',
          border: '1.5px solid ' + accentColor,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          animation: 'floatCloud 3s ease-in-out infinite'
        }}
      >
        <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{emoji}</span>

        {/* Clean Sinhala Text Only */}
        <span 
          style={{
            fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            fontSize: '0.92rem',
            fontWeight: 800,
            color: '#0D2340',
            letterSpacing: '0.2px'
          }}
        >
          {sinhalaText}
        </span>

        {/* Compact Cloud Bubble Tail */}
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid ' + accentColor
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #FFFFFF'
          }}
        />
      </div>
    </div>
  );
}

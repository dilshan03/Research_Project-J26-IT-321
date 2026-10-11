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
        top: '15%',
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
            transform: translateX(-50%) translateY(14px) scale(0.9);
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
            transform: translateY(-4px);
          }
        }
      `}</style>

      {/* Clean & Cute Cloud Bubble */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(10px)',
          borderRadius: '999px',
          padding: '12px 24px',
          boxShadow: '0 14px 30px -8px rgba(0, 0, 0, 0.25), 0 0 0 3px ' + accentColor + '33',
          border: '2px solid ' + accentColor,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          whiteSpace: 'nowrap',
          animation: 'floatCloud 3s ease-in-out infinite'
        }}
      >
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{emoji}</span>

        {/* Clean Sinhala Text Only */}
        <span 
          style={{
            fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#0D2340',
            letterSpacing: '0.2px'
          }}
        >
          {sinhalaText}
        </span>

        {/* Cloud Bubble Tail */}
        <div
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid ' + accentColor
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #FFFFFF'
          }}
        />
      </div>

      {/* Little cloud thought puffs towards the robot */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.7,
          marginTop: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      />
      <div 
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.5,
          marginTop: '4px'
        }}
      />
    </div>
  );
}

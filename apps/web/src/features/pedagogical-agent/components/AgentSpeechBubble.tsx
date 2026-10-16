import React from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { ACTION_SPEECH_MAP } from '../dialogue/actionSpeechMap';

/**
 * Helper to split long dialogue into 2 balanced lines for clean speech bubble presentation
 */
function formatDialogue(text: string): React.ReactNode {
  if (!text) return text;

  // 0. If text begins with "හෝඩුවාව X:" or "පියවර පැහැදිලි කිරීම:", render prefix in a distinct color badge
  const hintPrefixMatch = text.match(
    /^(හෝඩුවාව\s*\d+\s*:|පියවර පැහැදිලි කිරීම\s*:|Hint\s*\d+\s*:)\s*(.+)$/
  );
  if (hintPrefixMatch) {
    const prefix = hintPrefixMatch[1];
    const body = hintPrefixMatch[2];
    return (
      <>
        <span
          style={{
            color: '#275F88',
            background: '#E9F3FF',
            border: '1px solid #BFD2DF',
            padding: '1px 7px',
            borderRadius: '6px',
            marginRight: '6px',
            fontWeight: 800,
            fontSize: '0.8rem',
            display: 'inline-block',
          }}
        >
          {prefix}
        </span>
        <span>{body}</span>
      </>
    );
  }

  if (text.length < 28) {
    return text;
  }

  // 1. If sentence contains exclamation mark or question mark with following text, break after punctuation
  const punctMatch = text.match(/^([^!?]+[!?])\s*(.+)$/);
  if (punctMatch) {
    return (
      <>
        <span style={{ display: 'block' }}>{punctMatch[1]}</span>
        <span style={{ display: 'block', marginTop: '2px' }}>{punctMatch[2]}</span>
      </>
    );
  }

  // 2. If sentence contains a comma in reasonable range, break at comma
  if (text.includes(',')) {
    const parts = text.split(',');
    if (parts.length === 2) {
      return (
        <>
          <span style={{ display: 'block' }}>{parts[0].trim()},</span>
          <span style={{ display: 'block', marginTop: '2px' }}>{parts[1].trim()}</span>
        </>
      );
    }
  }

  // 3. Fallback: split roughly in the middle words
  const words = text.split(' ');
  if (words.length >= 4) {
    const mid = Math.ceil(words.length / 2);
    return (
      <>
        <span style={{ display: 'block' }}>{words.slice(0, mid).join(' ')}</span>
        <span style={{ display: 'block', marginTop: '2px' }}>{words.slice(mid).join(' ')}</span>
      </>
    );
  }

  return text;
}

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
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '92%',
        width: 'max-content',
        boxSizing: 'border-box',
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

      {/* Clean, Child-friendly Multi-line Speech Cloud */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: '18px',
          padding: '8px 16px',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35), 0 0 0 2px ' + accentColor + '33',
          border: '1.5px solid ' + accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          maxWidth: '340px',
          boxSizing: 'border-box',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          textAlign: 'center',
          animation: 'floatCloud 3s ease-in-out infinite'
        }}
      >
        <span style={{ fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>

        {/* Clean Sinhala Text with 2-line auto-formatting */}
        <span 
          style={{
            fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            fontSize: '0.86rem',
            fontWeight: 800,
            color: '#0D2340',
            letterSpacing: '0.15px',
            lineHeight: '1.42',
            textAlign: 'center'
          }}
        >
          {formatDialogue(sinhalaText)}
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

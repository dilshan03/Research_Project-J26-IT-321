import React from 'react';
import { useAgentStore } from '../store/useAgentStore';
import type { HintLevel } from '../types/agent.types';

export interface HintBoardProps {
  hints?: Partial<Record<HintLevel, { title: string; description: string }>>;
  onHintRequest?: (level: HintLevel) => void;
  disabled?: boolean;
}

interface StepMeta {
  title: string;
  defaultDesc: string;
  icon: string;
  color: string;
  bgGlow: string;
}

const STEP_METADATA: Record<1 | 2 | 3 | 4, StepMeta> = {
  1: {
    title: 'පොඩි හෝඩුවාවක්',
    defaultDesc: 'ගැටලුව නැවත බලමු. මෙහි අහන්නේ කුමක්ද?',
    icon: '💡',
    color: '#F59E0B',
    bgGlow: 'rgba(245, 158, 11, 0.15)'
  },
  2: {
    title: 'මඟපෙන්වීම',
    defaultDesc: 'ලකුණ දෙස බලන්න. එකතු කිරීමක්ද (+), අඩු කිරීමක්ද (-)?',
    icon: '🧭',
    color: '#FB923C',
    bgGlow: 'rgba(251, 146, 60, 0.15)'
  },
  3: {
    title: 'පියවරෙන් පියවර',
    defaultDesc: 'අගයන් දෙක එකතු කිරීමට තිත් හෝ ඇඟිලි ගණන් කරමු.',
    icon: '🪜',
    color: '#38BDF8',
    bgGlow: 'rgba(56, 189, 248, 0.15)'
  },
  4: {
    title: 'විසඳුම',
    defaultDesc: 'මෙන්න පිළිතුර ලැබෙන හැටි! දැන් නිවැරදි උත්තරය තෝරන්න.',
    icon: '🔑',
    color: '#A855F7',
    bgGlow: 'rgba(168, 85, 247, 0.15)'
  }
};

export const HintBoard: React.FC<HintBoardProps> = ({
  hints = {},
  onHintRequest,
  disabled = false
}) => {
  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);
  const requestNextHint = useAgentStore((state) => state.requestNextHint);
  const resetHints = useAgentStore((state) => state.resetHints);

  const handleNextHint = () => {
    if (disabled || currentHintLevel >= 4) return;
    const nextLevel = requestNextHint();
    if (onHintRequest) {
      onHintRequest(nextLevel);
    }
  };

  const steps: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const activeMeta = currentHintLevel > 0 ? STEP_METADATA[currentHintLevel as 1 | 2 | 3 | 4] : null;
  const activeCustom = currentHintLevel > 0 ? hints[currentHintLevel] : null;
  const activeTitle = activeCustom?.title || activeMeta?.title || '';
  const activeDesc = activeCustom?.description || activeMeta?.defaultDesc || '';

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '12px 14px',
        color: '#F8FAFC',
        boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Visual Step Icons (No "Level" text - pure intuitive icons for ADHD kids) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#38BDF8',
              fontFamily: "'Noto Sans Sinhala', sans-serif"
            }}
          >
            හෝඩුවාවන්
          </span>
        </div>

        {/* 4 Progressive Visual Badges */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((step) => {
            const isUnlocked = currentHintLevel >= step;
            const isCurrent = currentHintLevel === step;
            const meta = STEP_METADATA[step];

            return (
              <div
                key={step}
                title={meta.title}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  background: isCurrent
                    ? meta.color
                    : isUnlocked
                    ? meta.bgGlow
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isCurrent
                    ? `2px solid #FFFFFF`
                    : isUnlocked
                    ? `1.5px solid ${meta.color}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isCurrent ? `0 0 12px ${meta.color}` : 'none',
                  transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <span style={{ opacity: isUnlocked ? 1 : 0.35 }}>{meta.icon}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Hint Content Box: Short, crisp, kid-friendly */}
      <div
        style={{
          minHeight: '76px',
          padding: '10px 14px',
          borderRadius: '14px',
          background: currentHintLevel > 0 ? activeMeta?.bgGlow : 'rgba(255, 255, 255, 0.03)',
          borderLeft: currentHintLevel > 0 ? `4px solid ${activeMeta?.color}` : '4px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          boxSizing: 'border-box'
        }}
      >
        {currentHintLevel === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🌟</span>
            <span
              style={{
                fontSize: '0.88rem',
                color: '#CBD5E1',
                fontWeight: 600,
                fontFamily: "'Noto Sans Sinhala', sans-serif"
              }}
            >
              උදව්වක් ඕනෙද? පහළ බොත්තම ඔබන්න!
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>{activeMeta?.icon}</span>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: activeMeta?.color,
                  fontFamily: "'Noto Sans Sinhala', sans-serif"
                }}
              >
                {activeTitle}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
                lineHeight: '1.4',
                color: '#F8FAFC',
                fontWeight: 500,
                fontFamily: "'Noto Sans Sinhala', sans-serif"
              }}
            >
              {activeDesc}
            </p>
          </>
        )}
      </div>

      {/* Action Controls: Creative Gamified Green 3D Button + Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
        {/* Reset button - pure Sinhala, rounded chip */}
        <button
          onClick={resetHints}
          disabled={currentHintLevel === 0 || disabled}
          style={{
            background: currentHintLevel === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.06)',
            border: currentHintLevel === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
            color: currentHintLevel === 0 ? '#475569' : '#94A3B8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: currentHintLevel === 0 ? 'not-allowed' : 'pointer',
            padding: '7px 12px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: "'Noto Sans Sinhala', sans-serif",
            transition: 'all 0.15s ease'
          }}
        >
          <span>🔄</span>
          <span>මුලසිට</span>
        </button>

        {/* Gamified Green 3D Bouncy Action Button */}
        <button
          onClick={handleNextHint}
          disabled={disabled || currentHintLevel >= 4}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.92rem',
            border: 'none',
            cursor: disabled || currentHintLevel >= 4 ? 'not-allowed' : 'pointer',
            background:
              currentHintLevel >= 4
                ? 'linear-gradient(180deg, #475569 0%, #334155 100%)'
                : 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            boxShadow:
              currentHintLevel >= 4
                ? '0 3px 0 #1E293B'
                : '0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.4)',
            transform: 'translateY(0)',
            transition: 'all 0.1s ease',
            fontFamily: "'Noto Sans Sinhala', sans-serif",
            letterSpacing: '0.2px'
          }}
          onMouseDown={(e) => {
            if (currentHintLevel < 4 && !disabled) {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #047857, 0 4px 10px rgba(16, 185, 129, 0.3)';
            }
          }}
          onMouseUp={(e) => {
            if (currentHintLevel < 4 && !disabled) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.4)';
            }
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>💡</span>
          <span>
            {currentHintLevel === 0
              ? 'හෝඩුවාවක් ගන්න'
              : currentHintLevel < 4
              ? 'ඊළඟ හෝඩුවාව'
              : 'අවසන් හෝඩුවාව'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default HintBoard;

import React from 'react';
import { useAgentStore } from '../store/useAgentStore';
import type { HintLevel } from '../types/agent.types';

export interface HintBoardProps {
  hints?: Partial<Record<HintLevel, { title: string; description: string }>>;
  onHintRequest?: (level: HintLevel) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

interface StepMeta {
  title: string;
  defaultDesc: string;
  icon: string;
  color: string;
  lightColor: string;
  bgGlowDark: string;
  bgGlowLight: string;
}

const STEP_METADATA: Record<1 | 2 | 3 | 4, StepMeta> = {
  1: {
    title: 'පොඩි හෝඩුවාවක්',
    defaultDesc: 'ගැටලුවේ සංඛ්‍යා දෙස සන්සුන්ව බලමු!',
    icon: '💡',
    color: '#F59E0B',
    lightColor: '#D97706',
    bgGlowDark: 'rgba(245, 158, 11, 0.15)',
    bgGlowLight: '#FFF7E3',
  },
  2: {
    title: 'තිත් ගණන් කිරීම',
    defaultDesc: 'තිත් ටික වමේ සිට දකුණට එකින් එක ගණන් කරමු!',
    icon: '🔵',
    color: '#0EA5E9',
    lightColor: '#0284C7',
    bgGlowDark: 'rgba(14, 165, 233, 0.15)',
    bgGlowLight: '#E0F2FE',
  },
  3: {
    title: 'පියවරෙන් පියවර',
    defaultDesc: 'පළමු අංකයේ සිට ඉදිරියට ගණන් කර පිළිතුර සොයමු!',
    icon: '🪜',
    color: '#8B5CF6',
    lightColor: '#7C3AED',
    bgGlowDark: 'rgba(139, 92, 246, 0.15)',
    bgGlowLight: '#F3E8FF',
  },
  4: {
    title: 'ගැටලුව විසඳන හැටි',
    defaultDesc: 'මෙන්න විසඳන හැටි! සිතා බලා නිවැරදි කාඩ්පත තෝරන්න.',
    icon: '🎯',
    color: '#10B981',
    lightColor: '#059669',
    bgGlowDark: 'rgba(16, 185, 129, 0.15)',
    bgGlowLight: '#ECFDF5',
  },
};

export const HintBoard: React.FC<HintBoardProps> = ({
  hints = {},
  onHintRequest,
  disabled = false,
  theme = 'light',
}) => {
  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);
  const requestNextHint = useAgentStore((state) => state.requestNextHint);
  const resetHints = useAgentStore((state) => state.resetHints);

  const isLight = theme === 'light';

  const handleNextHint = () => {
    if (disabled || currentHintLevel >= 4) return;
    const nextLevel = requestNextHint();
    if (onHintRequest) {
      onHintRequest(nextLevel);
    }
  };

  const steps: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const activeMeta =
    currentHintLevel > 0 ? STEP_METADATA[currentHintLevel as 1 | 2 | 3 | 4] : null;
  const activeCustom = currentHintLevel > 0 ? hints[currentHintLevel] : null;
  const activeTitle = activeCustom?.title || activeMeta?.title || '';
  const activeDesc = activeCustom?.description || activeMeta?.defaultDesc || '';

  return (
    <div
      style={{
        background: isLight ? '#F4F8FB' : 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: isLight ? '1.5px solid #D6E4ED' : '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '22px',
        padding: '16px',
        color: isLight ? '#0D2340' : '#F8FAFC',
        boxShadow: isLight
          ? '0 8px 24px -6px rgba(13, 35, 64, 0.08)'
          : '0 12px 28px -6px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Visual Step Icons (No "Level" text - pure intuitive icons for ADHD kids) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '1.15rem' }}>✨</span>
          <span
            style={{
              fontSize: '0.98rem',
              fontWeight: 800,
              color: isLight ? '#275F88' : '#38BDF8',
              fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            }}
          >
            හෝඩුවාවන්
          </span>
        </div>

        {/* 4 Progressive Visual Badges */}
        <div style={{ display: 'flex', gap: '7px' }}>
          {steps.map((step) => {
            const isUnlocked = currentHintLevel >= step;
            const isCurrent = currentHintLevel === step;
            const meta = STEP_METADATA[step];

            return (
              <div
                key={step}
                title={meta.title}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  background: isCurrent
                    ? meta.color
                    : isUnlocked
                    ? isLight
                      ? meta.bgGlowLight
                      : meta.bgGlowDark
                    : isLight
                    ? '#FFFFFF'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isCurrent
                    ? isLight
                      ? `2px solid ${meta.lightColor}`
                      : '2px solid #FFFFFF'
                    : isUnlocked
                    ? `1.5px solid ${meta.color}`
                    : isLight
                    ? '1.5px solid #D6E4ED'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isCurrent ? `0 4px 12px ${meta.color}44` : 'none',
                  transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <span style={{ opacity: isUnlocked ? 1 : 0.4 }}>{meta.icon}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Hint Content Box: Short, crisp, kid-friendly */}
      <div
        style={{
          minHeight: '84px',
          padding: '12px 16px',
          borderRadius: '16px',
          background:
            currentHintLevel > 0
              ? isLight
                ? activeMeta?.bgGlowLight
                : activeMeta?.bgGlowDark
              : isLight
              ? '#FFFFFF'
              : 'rgba(255, 255, 255, 0.03)',
          borderLeft:
            currentHintLevel > 0
              ? `4px solid ${activeMeta?.color}`
              : isLight
              ? '4px solid #3C82B4'
              : '4px solid rgba(255, 255, 255, 0.1)',
          borderTop: isLight ? '1px solid #D6E4ED' : '1px solid rgba(255, 255, 255, 0.06)',
          borderRight: isLight ? '1px solid #D6E4ED' : '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: isLight ? '1px solid #D6E4ED' : '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '5px',
          boxSizing: 'border-box',
        }}
      >
        {currentHintLevel === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>🌟</span>
            <span
              style={{
                fontSize: '0.92rem',
                lineHeight: '1.45',
                color: isLight ? '#17324D' : '#CBD5E1',
                fontWeight: 700,
                fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
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
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: isLight ? activeMeta?.lightColor : activeMeta?.color,
                  fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
                }}
              >
                {activeTitle}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.92rem',
                lineHeight: '1.5',
                color: isLight ? '#0D2340' : '#F8FAFC',
                fontWeight: 600,
                fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
              }}
            >
              {(() => {
                const match = activeDesc.match(
                  /^(හෝඩුවාව\s*\d+\s*:|පියවර පැහැදිලි කිරීම\s*:|Hint\s*\d+\s*:)\s*(.+)$/
                );
                if (!match) return activeDesc;
                return (
                  <>
                    <span
                      style={{
                        color: isLight ? '#275F88' : '#38BDF8',
                        background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(56, 189, 248, 0.15)',
                        border: isLight ? '1px solid #BFD2DF' : '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '1px 7px',
                        borderRadius: '6px',
                        marginRight: '7px',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        display: 'inline-block',
                      }}
                    >
                      {match[1]}
                    </span>
                    <span>{match[2]}</span>
                  </>
                );
              })()}
            </p>
          </>
        )}
      </div>

      {/* Action Controls: Creative Gamified Green 3D Button + Reset */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2px',
          gap: '8px',
        }}
      >
        {/* Reset button - pure Sinhala, rounded chip */}
        <button
          type="button"
          onClick={resetHints}
          disabled={currentHintLevel === 0 || disabled}
          style={{
            background:
              currentHintLevel === 0
                ? 'transparent'
                : isLight
                ? '#FFFFFF'
                : 'rgba(255, 255, 255, 0.06)',
            border:
              currentHintLevel === 0
                ? 'none'
                : isLight
                ? '1px solid #BFD2DF'
                : '1px solid rgba(255, 255, 255, 0.12)',
            color:
              currentHintLevel === 0
                ? isLight
                  ? '#7890A8'
                  : '#475569'
                : isLight
                ? '#275F88'
                : '#94A3B8',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: currentHintLevel === 0 ? 'not-allowed' : 'pointer',
            padding: '8px 12px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            transition: 'all 0.15s ease',
          }}
        >
          <span>🔄</span>
          <span>මුලසිට</span>
        </button>

        {/* Gamified Green 3D Bouncy Action Button */}
        <button
          type="button"
          onClick={handleNextHint}
          disabled={disabled || currentHintLevel >= 4}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '11px 22px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.94rem',
            border: 'none',
            cursor: disabled || currentHintLevel >= 4 ? 'not-allowed' : 'pointer',
            background:
              currentHintLevel >= 4
                ? isLight
                  ? 'linear-gradient(180deg, #94A3B8 0%, #64748B 100%)'
                  : 'linear-gradient(180deg, #475569 0%, #334155 100%)'
                : 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            boxShadow:
              currentHintLevel >= 4
                ? isLight
                  ? '0 3px 0 #475569'
                  : '0 3px 0 #1E293B'
                : '0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.32)',
            transform: 'translateY(0)',
            transition: 'all 0.1s ease',
            fontFamily: "'Noto Sans Sinhala', 'Lexend', sans-serif",
            letterSpacing: '0.2px',
          }}
          onMouseDown={(e) => {
            if (currentHintLevel < 4 && !disabled) {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow =
                '0 2px 0 #047857, 0 4px 10px rgba(16, 185, 129, 0.25)';
            }
          }}
          onMouseUp={(e) => {
            if (currentHintLevel < 4 && !disabled) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.32)';
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

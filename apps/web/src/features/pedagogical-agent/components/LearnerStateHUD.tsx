import React from 'react';
import type { LearnerState, CognitiveState } from '../types/telemetry.types';

export interface LearnerStateHUDProps {
  learnerState: LearnerState | null;
  isLoading?: boolean;
  onSimulateInattention?: () => void;
  onSimulateFrustration?: () => void;
  onSimulateFocusedFlow?: () => void;
  compact?: boolean;
  style?: React.CSSProperties;
}

const STATE_CONFIG: Record<
  CognitiveState,
  { label: string; sinhala: string; icon: string; bg: string; border: string; text: string }
> = {
  FOCUSED_FLOW: {
    label: 'FOCUSED FLOW',
    sinhala: 'මනා අවධානයෙන්',
    icon: '⚡',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    text: '#34D399'
  },
  INATTENTIVE_DRIFT: {
    label: 'INATTENTIVE DRIFT',
    sinhala: 'අවධානය ගිලිහී ඇත',
    icon: '⚠️',
    bg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.5)',
    text: '#FBBF24'
  },
  FRUSTRATED_STRUGGLE: {
    label: 'FRUSTRATED STRUGGLE',
    sinhala: 'කලකිරීමට පත්ව ඇත',
    icon: '🔥',
    bg: 'rgba(239, 68, 68, 0.22)',
    border: 'rgba(239, 68, 68, 0.6)',
    text: '#F87171'
  },
  IMPULSIVE_GUESSING: {
    label: 'IMPULSIVE GUESSING',
    sinhala: 'නොසිතා පිළිතුරු දීම',
    icon: '⏳',
    bg: 'rgba(249, 115, 22, 0.2)',
    border: 'rgba(249, 115, 22, 0.5)',
    text: '#FB923C'
  },
  PRODUCTIVE_STRUGGLE: {
    label: 'PRODUCTIVE STRUGGLE',
    sinhala: 'උත්සාහවන්ත විසඳීම',
    icon: '🛡️',
    bg: 'rgba(56, 189, 248, 0.18)',
    border: 'rgba(56, 189, 248, 0.5)',
    text: '#38BDF8'
  },
  NORMAL: {
    label: 'BALANCED BASELINE',
    sinhala: 'සාමාන්‍ය තත්ත්වය',
    icon: '🟢',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
    text: '#CBD5E1'
  }
};

export const LearnerStateHUD: React.FC<LearnerStateHUDProps> = ({
  learnerState,
  isLoading = false,
  onSimulateInattention,
  onSimulateFrustration,
  onSimulateFocusedFlow,
  compact = false,
  style = {}
}) => {
  const stateKey = learnerState?.cognitiveState || 'NORMAL';
  const cfg = STATE_CONFIG[stateKey] || STATE_CONFIG.NORMAL;

  const inattention = learnerState?.metrics.inattentionIndex ?? 0.1;
  const frustration = learnerState?.metrics.frustrationIndex ?? 0.0;
  const persistence = learnerState?.metrics.persistenceScore ?? 0.5;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: compact ? '12px' : '16px',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        ...style
      }}
    >
      {/* Header with Title & Live Pulse */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.05rem' }}>🧠</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.5px', color: '#F1F5F9' }}>
            Live ADHD Learner State
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isLoading ? '#F59E0B' : '#10B981',
              boxShadow: isLoading ? '0 0 8px #F59E0B' : '0 0 8px #10B981',
              display: 'inline-block'
            }}
          />
          <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
            {isLoading ? 'Computing...' : 'Decision API (5002)'}
          </span>
        </div>
      </div>

      {/* Main Cognitive State Hero Badge */}
      <div
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Cognitive State
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: cfg.text, letterSpacing: '0.4px' }}>
              {cfg.label}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: `1px solid ${cfg.border}`
          }}
        >
          {cfg.sinhala}
        </span>
      </div>

      {/* Real-time Meters (Inattention, Frustration, Persistence) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2px' }}>
        {/* Inattention Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>
              ⏱️ Inattention Index (I<sub>att</sub>)
            </span>
            <span
              style={{
                fontWeight: 800,
                color: inattention >= 0.6 ? '#F87171' : inattention >= 0.4 ? '#FBBF24' : '#34D399'
              }}
            >
              {Math.round(inattention * 100)}%
            </span>
          </div>
          <div
            style={{
              height: '7px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(inattention * 100)}%`,
                height: '100%',
                background:
                  inattention >= 0.6
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : inattention >= 0.4
                    ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                    : '#10B981',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Frustration Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>
              🔥 Frustration Index (F<sub>rust</sub>)
            </span>
            <span
              style={{
                fontWeight: 800,
                color: frustration >= 0.65 ? '#EF4444' : frustration >= 0.3 ? '#FB923C' : '#38BDF8'
              }}
            >
              {Math.round(frustration * 100)}%
              {learnerState?.flags.isFrustrated && ' ⚠️ ALERT'}
            </span>
          </div>
          <div
            style={{
              height: '7px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(frustration * 100)}%`,
                height: '100%',
                background: frustration >= 0.65 ? '#EF4444' : frustration >= 0.3 ? '#FB923C' : '#38BDF8',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Persistence Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>
              🛡️ Persistence (P<sub>ersist</sub>)
            </span>
            <span style={{ fontWeight: 800, color: '#38BDF8' }}>
              {Math.round(persistence * 100)}%
            </span>
          </div>
          <div
            style={{
              height: '7px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(persistence * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38BDF8, #818CF8)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommended Pedagogical Intervention Card */}
      {learnerState?.recommendedIntervention && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginTop: '2px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              🤖 Agent Intervention
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#38BDF8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              {learnerState.recommendedIntervention.action}
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0', marginTop: '4px' }}>
            "{learnerState.recommendedIntervention.messageSinhala}"
          </div>
        </div>
      )}

      {/* Simulator Test Buttons (Researcher Playground) */}
      {(onSimulateInattention || onSimulateFrustration || onSimulateFocusedFlow) && (
        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
            🧪 Real-time Simulator Triggers:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {onSimulateInattention && (
              <button
                onClick={onSimulateInattention}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#FBBF24',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚠️ Inattention
              </button>
            )}

            {onSimulateFrustration && (
              <button
                onClick={onSimulateFrustration}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔥 Frustration
              </button>
            )}

            {onSimulateFocusedFlow && (
              <button
                onClick={onSimulateFocusedFlow}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34D399',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Flow
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerStateHUD;

import React, { useState } from 'react';
import type { LearnerState, CognitiveState, BKTComparisonState } from '../types/telemetry.types';

export interface LearnerStateHUDProps {
  learnerState: LearnerState | null;
  bktComparison?: BKTComparisonState;
  isLoading?: boolean;
  onSimulateInattention?: () => void;
  onSimulateFrustration?: () => void;
  onSimulateFocusedFlow?: () => void;
  onSimulateHintAssisted?: () => void;
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
  bktComparison = {
    hintAwareKnowledge: 0.20,
    standardKnowledge: 0.20,
    predictedNextCorrect: 0.364,
    effectiveSlip: 0.18,
    effectiveGuess: 0.25,
    isMastered: false,
    overestimationGap: 0.0
  },
  isLoading = false,
  onSimulateInattention,
  onSimulateFrustration,
  onSimulateFocusedFlow,
  onSimulateHintAssisted,
  compact = false,
  style = {}
}) => {
  const [showBKTDetails, setShowBKTDetails] = useState<boolean>(true);

  const stateKey = learnerState?.cognitiveState || 'NORMAL';
  const cfg = STATE_CONFIG[stateKey] || STATE_CONFIG.NORMAL;

  const inattention = learnerState?.metrics.inattentionIndex ?? 0.1;
  const frustration = learnerState?.metrics.frustrationIndex ?? 0.0;
  const persistence = learnerState?.metrics.persistenceScore ?? 0.5;

  const pL_hintAware = bktComparison.hintAwareKnowledge;
  const pL_standard = bktComparison.standardKnowledge;
  const isMastered = bktComparison.isMastered;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: compact ? '12px' : '16px',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        ...style
      }}
    >
      {/* Header with Title & Backend Sync Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.05rem' }}>🧠</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.5px', color: '#F1F5F9' }}>
            Live ADHD Learner State & BKT
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

      {/* BKT Concept Mastery Hero Section (Task #20 Feature) */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>🎓</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#E2E8F0', letterSpacing: '0.3px' }}>
              BKT Concept Mastery P(L)
            </span>
          </div>

          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              background: isMastered ? 'rgba(34, 197, 94, 0.25)' : 'rgba(148, 163, 184, 0.2)',
              color: isMastered ? '#4ADE80' : '#CBD5E1',
              border: isMastered ? '1px solid #22C55E' : '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {isMastered ? '🏆 ප්‍රගුණ කර ඇත (MASTERED)' : '📚 ඉගෙන ගනිමින් (LEARNING)'}
          </span>
        </div>

        {/* Live Mastery Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
            <span style={{ color: '#C084FC', fontWeight: 700 }}>
              P(L) Mastery: {Math.round(pL_hintAware * 100)}%
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
              Threshold: 85% | Next P(C): {Math.round(bktComparison.predictedNextCorrect * 100)}%
            </span>
          </div>

          <div
            style={{
              height: '9px',
              borderRadius: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(pL_hintAware * 100)}%`,
                height: '100%',
                background: isMastered
                  ? 'linear-gradient(90deg, #10B981, #22C55E)'
                  : 'linear-gradient(90deg, #6366F1, #A855F7)',
                borderRadius: '5px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Comparative BKT Section (Standard vs Hint-Aware) Toggle */}
        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
          <div
            onClick={() => setShowBKTDetails(!showBKTDetails)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.73rem',
              color: '#38BDF8',
              fontWeight: 700
            }}
          >
            <span>⚖️ Standard vs Hint-Aware BKT Comparison</span>
            <span>{showBKTDetails ? '▲ Hide' : '▼ View'}</span>
          </div>

          {showBKTDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {/* Comparison Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A855F7', fontWeight: 600 }}>● Hint-Aware ADHD BKT:</span>
                  <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{Math.round(pL_hintAware * 100)}%</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(pL_hintAware * 100)}%`, height: '100%', background: '#A855F7' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: '#94A3B8', fontWeight: 600 }}>○ Standard BKT Baseline:</span>
                  <span style={{ fontWeight: 800, color: '#CBD5E1' }}>{Math.round(pL_standard * 100)}%</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(pL_standard * 100)}%`, height: '100%', background: '#94A3B8' }} />
                </div>
              </div>

              {/* Overestimation Notice */}
              {bktComparison.overestimationGap > 0.05 && (
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#FBBF24',
                    fontSize: '0.69rem',
                    fontWeight: 600
                  }}
                >
                  ⚠️ Standard BKT overestimates knowledge by +{Math.round(bktComparison.overestimationGap * 100)}% due to unadjusted hint scaffolding!
                </div>
              )}

              {/* Research Metrics Chips */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                <span>AUC-ROC: <b>0.6271</b> (+0.013)</span>
                <span>RMSE: <b>0.4657</b> (-0.005)</span>
                <span>LogLoss: <b>0.6251</b></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time ADHD Meters (Inattention, Frustration, Persistence) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
        {/* Inattention Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
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
              height: '6px',
              borderRadius: '3px',
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
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Frustration Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
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
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(frustration * 100)}%`,
                height: '100%',
                background: frustration >= 0.65 ? '#EF4444' : frustration >= 0.3 ? '#FB923C' : '#38BDF8',
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Persistence Gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>
              🛡️ Persistence (P<sub>ersist</sub>)
            </span>
            <span style={{ fontWeight: 800, color: '#38BDF8' }}>
              {Math.round(persistence * 100)}%
            </span>
          </div>
          <div
            style={{
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.round(persistence * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38BDF8, #818CF8)',
                borderRadius: '3px',
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
      {(onSimulateInattention || onSimulateFrustration || onSimulateFocusedFlow || onSimulateHintAssisted) && (
        <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>
            🧪 Real-time Simulator Triggers:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {onSimulateHintAssisted && (
              <button
                onClick={onSimulateHintAssisted}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  color: '#C084FC',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                💡 Hint L4 Success (Compare)
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
                ⚡ Flow (Unassisted)
              </button>
            )}

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
                ⚠️ Inattention Slip
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
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerStateHUD;

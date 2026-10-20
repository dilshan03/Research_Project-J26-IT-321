import React, { useState } from 'react';
import type { LearnerState, CognitiveState, BKTComparisonState, FSMDecision, FSMState } from '../types/telemetry.types';

export interface LearnerStateHUDProps {
  learnerState: LearnerState | null;
  bktComparison?: BKTComparisonState;
  fsmDecision?: FSMDecision;
  isLoading?: boolean;
  cameraPermissionGranted?: boolean;
  cameraAttentionScore?: number;
  onToggleCameraPermission?: (granted: boolean) => void;
  onChangeCameraScore?: (score: number) => void;
  elapsedDays?: number;
  onChangeElapsedDays?: (days: number) => void;
  onSimulateInattention?: () => void;
  onSimulateFrustration?: () => void;
  onSimulateFocusedFlow?: () => void;
  onSimulateHintAssisted?: () => void;
  onSimulateRapidAttentionSlip?: () => void;
  onTriggerFSMRule?: (context: Record<string, any>) => void;
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

const FSM_STATE_CONFIG: Record<
  FSMState,
  { label: string; sinhala: string; icon: string; color: string; bg: string }
> = {
  OBSERVING: {
    label: 'OBSERVING',
    sinhala: 'අධීක්ෂණය කරමින්',
    icon: '👁️',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.15)'
  },
  ATTENTION_REDIRECT: {
    label: 'ATTENTION REDIRECT',
    sinhala: 'අවධානය යොමු කිරීම',
    icon: '👋',
    color: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.2)'
  },
  DISTRACTED_RE_ENGAGE: {
    label: 'DISTRACTED / RE-ENGAGE',
    sinhala: 'අවධානය නැවත ගොඩනැංවීම',
    icon: '🎯',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.22)'
  },
  REVISION_DUE: {
    label: 'SPACED REVISION DUE',
    sinhala: 'මතක පුනරීක්ෂණ අවස්ථාව',
    icon: '🔔',
    color: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.25)'
  },
  HINT_SCAFFOLDING: {
    label: 'HINT SCAFFOLDING',
    sinhala: 'හෝඩුවාවෙන් මඟපෙන්වීම',
    icon: '💡',
    color: '#C084FC',
    bg: 'rgba(168, 85, 247, 0.2)'
  },
  FRUSTRATION_REGULATION: {
    label: 'FRUSTRATION REGULATION',
    sinhala: 'කලකිරීම පාලනය',
    icon: '❤️‍🩹',
    color: '#F87171',
    bg: 'rgba(239, 68, 68, 0.2)'
  },
  IMPULSE_BRAKING: {
    label: 'IMPULSE BRAKING',
    sinhala: 'නොසිතා පිළිතුරු දීම වැළැක්වීම',
    icon: '🛑',
    color: '#FB923C',
    bg: 'rgba(249, 115, 22, 0.2)'
  },
  MASTERY_REINFORCEMENT: {
    label: 'MASTERY REINFORCEMENT',
    sinhala: 'දැනුම තහවුරු කිරීම',
    icon: '🏆',
    color: '#34D399',
    bg: 'rgba(16, 185, 129, 0.2)'
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
    overestimationGap: 0.0,
    masteryProtected: false,
    falseDemotionPrevented: 0.0,
    retentionScore: 1.0,
    memoryStability: 1.0,
    decayedKnowledge: 0.20,
    elapsedDays: 0,
    revisionRecommended: false,
    optimalNextReviewDays: 0.4
  },
  fsmDecision = {
    fsmState: 'OBSERVING',
    previousState: 'OBSERVING',
    stateTransitionOccurred: false,
    rule: {
      id: 'RULE_DEFAULT',
      name: 'Baseline Passive Observation',
      description: 'Default state when student is engaged normally.'
    },
    decision: {
      action: 'IDLE_OBSERVE',
      animation: 'idle',
      targetHintLevel: null,
      messageSinhala: 'ඔයාට පුළුවන්! හොඳට හිතලා බලන්න.',
      autoOpenHint: false
    },
    timestamp: new Date().toISOString()
  },
  isLoading = false,
  cameraPermissionGranted = false,
  cameraAttentionScore = 0.85,
  onToggleCameraPermission,
  onChangeCameraScore,
  elapsedDays = 0,
  onChangeElapsedDays,
  onSimulateInattention,
  onSimulateFrustration,
  onSimulateFocusedFlow,
  onSimulateHintAssisted,
  onSimulateRapidAttentionSlip,
  onTriggerFSMRule,
  compact = false,
  style = {}
}) => {
  const [showBKTDetails, setShowBKTDetails] = useState<boolean>(true);
  const [showFSMDetails, setShowFSMDetails] = useState<boolean>(true);
  const [showTeacherLogs, setShowTeacherLogs] = useState<boolean>(true);

  const stateKey = learnerState?.cognitiveState || 'NORMAL';
  const cfg = STATE_CONFIG[stateKey] || STATE_CONFIG.NORMAL;

  const inattention = learnerState?.metrics.inattentionIndex ?? 0.1;
  const frustration = learnerState?.metrics.frustrationIndex ?? 0.0;
  const persistence = learnerState?.metrics.persistenceScore ?? 0.5;
  const fusion = learnerState?.attentionFusion;
  const isMultimodal =
    fusion?.fusionMode === 'MULTIMODAL_CAMERA_AND_GAMEPLAY' || cameraPermissionGranted;
  const gameplayInatt = fusion?.gameplayInattentionIndex ?? learnerState?.metrics.gameplayInattentionIndex ?? inattention;
  const cameraInatt =
    fusion?.cameraInattentionIndex ??
    (cameraPermissionGranted ? Number((1 - cameraAttentionScore).toFixed(2)) : null);
  const attentionProb = fusion?.attentionProbability ?? Number((1 - inattention).toFixed(2));
  const rtBaseline = fusion?.personalRtBaseline;
  const rtZScore = rtBaseline?.latestRtZScore ?? learnerState?.metrics.rtZScore ?? 0.0;
  const isAttentionSlip = Boolean(
    fusion?.isAttentionSlip || learnerState?.flags?.isAttentionSlip
  );

  const pL_hintAware = bktComparison.hintAwareKnowledge;
  const pL_standard = bktComparison.standardKnowledge;
  const isMastered = bktComparison.isMastered;
  const masteryProtected = Boolean(bktComparison.masteryProtected);
  const falseDemotionPrevented = bktComparison.falseDemotionPrevented ?? 0.0;
  const retentionScore = bktComparison.retentionScore ?? 1.0;
  const memoryStability = bktComparison.memoryStability ?? 1.0;
  const decayedKnowledge = bktComparison.decayedKnowledge ?? pL_hintAware;
  const activeElapsedDays = bktComparison.elapsedDays ?? elapsedDays;
  const revisionRecommended = Boolean(bktComparison.revisionRecommended);
  const optimalNextReviewDays = bktComparison.optimalNextReviewDays ?? 0.4;

  const fsmConfig = FSM_STATE_CONFIG[fsmDecision.fsmState] || FSM_STATE_CONFIG.OBSERVING;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: compact ? '12px' : '16px',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        ...style
      }}
    >
      {/* Header with Title & Backend Sync Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.05rem' }}>🧠</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.5px', color: '#F1F5F9' }}>
            Live Pedagogical Engine & FSM
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

      {/* Step 5 & Step 6: State-Aware Constrained FSM, Expected Mastery Gain (EMG) & Teacher Explainable Logs */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>🤖</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.3px' }}>
              Constrained FSM & EMG (Step 5)
            </span>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              background: fsmConfig.bg,
              color: fsmConfig.color,
              border: `1px solid ${fsmConfig.color}40`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{fsmConfig.icon}</span>
            <span>{fsmConfig.label}</span>
          </span>
        </div>

        {/* Active Rule Fired Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '8px 10px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#F1F5F9' }}>
              ⚡ Fired: {fsmDecision.rule.name}
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38BDF8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              {fsmDecision.rule.id}
            </span>
          </div>

          <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '2px' }}>
            {fsmDecision.rule.description}
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2E8F0', marginTop: '6px', fontStyle: 'italic' }}>
            💬 "{fsmDecision.decision.messageSinhala}"
          </div>

          {fsmDecision.decision.targetHintLevel && (
            <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C084FC' }}>
                💡 Recommended Scaffolding: Level {fsmDecision.decision.targetHintLevel}
              </span>
            </div>
          )}

          {/* Step 5 Novelty: Expected Mastery Gain (EMG) Optimal Challenge Difficulty Pill */}
          {fsmDecision.challengeRecommendation && (
            <div
              style={{
                marginTop: '6px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                <span style={{ color: '#34D399', fontWeight: 800 }}>
                  🎯 EMG Optimal Challenge: {fsmDecision.challengeRecommendation.recommendedDifficulty}
                </span>
                <span style={{ color: '#4ADE80', fontWeight: 800 }}>
                  EMG: +{Math.round(fsmDecision.challengeRecommendation.expectedMasteryGain * 100)}%
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#CBD5E1' }}>
                {fsmDecision.challengeRecommendation.labelSinhala} (P(Success):{' '}
                {Math.round(fsmDecision.challengeRecommendation.predictedSuccessProb * 100)}%)
              </div>
            </div>
          )}
        </div>

        {/* Step 6 Novelty: Teacher (HITL) Explainable Decision Rationale Log Inspector */}
        {fsmDecision.explainableRationale && (
          <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
            <div
              onClick={() => setShowTeacherLogs(!showTeacherLogs)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: '#4ADE80',
                fontWeight: 700
              }}
            >
              <span>👩‍🏫 Teacher Explainable Decision Log (Step 6 HITL)</span>
              <span>{showTeacherLogs ? '▲ Hide' : '▼ View'}</span>
            </div>

            {showTeacherLogs && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.69rem'
                }}
              >
                <div style={{ color: '#F8FAFC', fontWeight: 700 }}>
                  📌 {fsmDecision.explainableRationale.summary}
                </div>
                <div style={{ color: '#CBD5E1' }}>
                  <b>Why Triggered:</b> {fsmDecision.explainableRationale.whyTriggered}
                </div>
                <div style={{ color: '#94A3B8' }}>
                  <b>Signal Source:</b> {fsmDecision.explainableRationale.fusionSource}
                </div>
                <div style={{ color: '#38BDF8' }}>
                  <b>Difficulty Policy:</b> {fsmDecision.explainableRationale.difficultyRationale}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FSM Rules Catalog Toggle */}
        <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
          <div
            onClick={() => setShowFSMDetails(!showFSMDetails)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#38BDF8',
              fontWeight: 700
            }}
          >
            <span>📋 FSM State Machine Rules & Triggers</span>
            <span>{showFSMDetails ? '▲ Hide' : '▼ View'}</span>
          </div>

          {showFSMDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {/* Interactive Rule Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <button
                  onClick={() =>
                    onTriggerFSMRule &&
                    onTriggerFSMRule({
                      cameraPermissionGranted: true,
                      cameraAttentionScore: 0.30,
                      inattentionIndex: 0.65,
                      isAttentionSlip: true,
                      bktKnowledge: 0.72
                    })
                  }
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background:
                      fsmDecision.rule.id === 'RULE_DISTRACTED_RE_ENGAGE'
                        ? 'rgba(56, 189, 248, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      fsmDecision.rule.id === 'RULE_DISTRACTED_RE_ENGAGE'
                        ? '1px solid #38BDF8'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_DISTRACTED_RE_ENGAGE' ? '#38BDF8' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🎯 Step 5: Distracted Re-Engage
                </button>

                <button
                  onClick={() =>
                    onTriggerFSMRule &&
                    onTriggerFSMRule({
                      retentionScore: 0.52,
                      revisionRecommended: true,
                      elapsedDays: 5,
                      memoryStability: 2.5,
                      bktKnowledge: 0.78
                    })
                  }
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background:
                      fsmDecision.rule.id === 'RULE_REVISION_DUE'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      fsmDecision.rule.id === 'RULE_REVISION_DUE'
                        ? '1px solid #FBBF24'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_REVISION_DUE' ? '#FBBF24' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🔔 Step 5: Revision Due (R&lt;70%)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ consecutiveErrors: 2, highestHintLevel: 0 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_1' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_1' ? '1px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_1' ? '#C084FC' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  💡 Rule 1: 2x Errors (Hint 1)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ currentIdleTimeMs: 16000 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_2' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_2' ? '1px solid #FBBF24' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_2' ? '#FBBF24' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  👋 Rule 2: Idle &gt; 15s (Redirect)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ bktKnowledge: 0.92, consecutiveCorrect: 3 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_4' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_4' ? '1px solid #34D399' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_4' ? '#34D399' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🏆 Rule 4: Mastery 90% (Celebrate)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ isImpulsive: true })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_5' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_5' ? '1px solid #FB923C' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_5' ? '#FB923C' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🛑 Rule 5: Impulsive &lt; 1.5s (Brake)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ isFrustrated: true, consecutiveErrors: 3, frustrationIndex: 0.8 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_FRUSTRATION' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_FRUSTRATION' ? '1px solid #F87171' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_FRUSTRATION' ? '#F87171' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  ❤️‍🩹 Rule: Frustration (Calm)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ lastAnswerIsCorrect: true, highestHintLevel: 0 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_AUTONOMY_PRAISE' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_AUTONOMY_PRAISE' ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_AUTONOMY_PRAISE' ? '#38BDF8' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🌟 Rule: Autonomous Success (Praise)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ consecutiveErrors: 1, highestHintLevel: 0, bktKnowledge: 0.78, lastAnswerIsCorrect: false })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_KNOWLEDGE_SLIP' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_KNOWLEDGE_SLIP' ? '1px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_KNOWLEDGE_SLIP' ? '#818CF8' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🔍 Rule: High P(L) Slip (Verify)
                </button>

                <button
                  onClick={() => onTriggerFSMRule && onTriggerFSMRule({ consecutiveErrors: 2, highestHintLevel: 1 })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: fsmDecision.rule.id === 'RULE_6' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: fsmDecision.rule.id === 'RULE_6' ? '1px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: fsmDecision.rule.id === 'RULE_6' ? '#C084FC' : '#CBD5E1',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  📈 Rule 6: Escalate (Hint 2)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3 & Step 4 Novelty: AD-BKT Concept Mastery P(L) & Forgetting-Aware Retention */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: masteryProtected
            ? '1px solid rgba(56, 189, 248, 0.6)'
            : '1px solid rgba(168, 85, 247, 0.35)',
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
              AD-BKT Concept Mastery P(L)
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
              AD-BKT P(L): {Math.round(pL_hintAware * 100)}%
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

        {/* Step 3 Banner: AD-BKT Attention Slip Mastery Protection */}
        {masteryProtected && (
          <div
            style={{
              padding: '6px 9px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.16)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              color: '#38BDF8',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>🛡️ Step 3: AD-BKT Mastery Protected! (ADHD Slip Disentangled)</span>
            <span style={{ color: '#4ADE80', fontWeight: 800 }}>
              +{Math.round(falseDemotionPrevented * 100)}% Saved
            </span>
          </div>
        )}

        {/* Comparative BKT Section (Standard vs AD-BKT) Toggle */}
        <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
          <div
            onClick={() => setShowBKTDetails(!showBKTDetails)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#38BDF8',
              fontWeight: 700
            }}
          >
            <span>⚖️ Standard BKT vs AD-BKT Comparison (Step 3)</span>
            <span>{showBKTDetails ? '▲ Hide' : '▼ View'}</span>
          </div>

          {showBKTDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {/* Comparison Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A855F7', fontWeight: 600 }}>● AD-BKT (Attention & Hint-Aware):</span>
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
                <span>P(Slip<sub>eff</sub>): <b>{Math.round(bktComparison.effectiveSlip * 100)}%</b></span>
                <span>P(Guess<sub>eff</sub>): <b>{Math.round(bktComparison.effectiveGuess * 100)}%</b></span>
                <span>Saved: <b style={{ color: falseDemotionPrevented > 0 ? '#4ADE80' : '#94A3B8' }}>+{Math.round(falseDemotionPrevented * 100)}%</b></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 4 Novelty Panel: Stability-Based Forgetting & Spaced Retrieval Scheduling */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, rgba(168, 85, 247, 0.12) 100%)',
          border: revisionRecommended
            ? '1px solid rgba(245, 158, 11, 0.55)'
            : '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '12px',
          padding: '11px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.95rem' }}>⏳</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#E2E8F0' }}>
              Forgetting & Memory Stability (Step 4)
            </span>
          </div>

          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
              background: revisionRecommended ? 'rgba(245, 158, 11, 0.22)' : 'rgba(16, 185, 129, 0.2)',
              color: revisionRecommended ? '#FBBF24' : '#34D399',
              border: revisionRecommended ? '1px solid #F59E0B' : '1px solid #10B981'
            }}
          >
            {revisionRecommended ? '🔔 REVISION DUE' : '✅ RETENTION STRONG'}
          </span>
        </div>

        {/* Interactive Time-Gap Simulator Buttons (0d / 1d / 3d / 5d / 7d) */}
        {onChangeElapsedDays && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '5px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.69rem', color: '#CBD5E1', fontWeight: 600 }}>
              Simulate Time Gap (Δt):
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 3, 5, 7].map((d) => {
                const isSelected = activeElapsedDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChangeElapsedDays(d)}
                    style={{
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #FBBF24' : '1px solid rgba(255,255,255,0.12)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#FBBF24' : '#94A3B8'
                    }}
                  >
                    {d}d
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Retention Progress Bar R_t = exp(-Δt / S_t) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
            <span style={{ color: '#FBBF24', fontWeight: 700 }}>
              Retention R(t) = e<sup>-Δt/S</sup>: {Math.round(retentionScore * 100)}%
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.69rem' }}>
              Decayed P(L): <b style={{ color: '#E2E8F0' }}>{Math.round(decayedKnowledge * 100)}%</b>
            </span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round(retentionScore * 100)}%`,
                height: '100%',
                background: revisionRecommended
                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                  : 'linear-gradient(90deg, #10B981, #38BDF8)',
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Memory Stability & Optimal Next Review */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            fontSize: '0.68rem',
            textAlign: 'center'
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>Stability S<sub>t</sub></div>
            <div style={{ fontWeight: 800, color: '#34D399', fontSize: '0.76rem' }}>
              {memoryStability.toFixed(2)}d
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>Elapsed Δt</div>
            <div style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.76rem' }}>
              {activeElapsedDays} days
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>Next Review</div>
            <div style={{ fontWeight: 800, color: '#C084FC', fontSize: '0.76rem' }}>
              {optimalNextReviewDays}d
            </div>
          </div>
        </div>

        {revisionRecommended && (
          <div
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#FBBF24',
              fontSize: '0.69rem',
              fontWeight: 700
            }}
          >
            🔔 Spaced Revision Triggered (R(t) &lt; 70%): Recommend micro-review before new concept!
          </div>
        )}
      </div>

      {/* Step 1 & Step 2 Novelty Panel: Privacy-Aware Dual-Source Fusion & Personal RT Baseline */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.10) 0%, rgba(56, 189, 248, 0.12) 100%)',
          border: isMultimodal
            ? '1px solid rgba(16, 185, 129, 0.45)'
            : '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '11px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.95rem' }}>📡</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#E2E8F0' }}>
              Attention Fusion & RT Baseline
            </span>
          </div>

          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
              background: isMultimodal ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.2)',
              color: isMultimodal ? '#34D399' : '#38BDF8',
              border: isMultimodal ? '1px solid #10B981' : '1px solid #38BDF8'
            }}
          >
            {isMultimodal ? '📷 MULTIMODAL (Cam+Game)' : '🛡️ TELEMETRY FALLBACK'}
          </span>
        </div>

        {/* Interactive Camera Consent & Score Controls */}
        {onToggleCameraPermission && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '7px 9px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600 }}>
                Peer Camera Consent:
              </span>
              <button
                type="button"
                onClick={() => onToggleCameraPermission(!cameraPermissionGranted)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: cameraPermissionGranted ? '1px solid #10B981' : '1px solid #64748B',
                  background: cameraPermissionGranted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: cameraPermissionGranted ? '#4ADE80' : '#94A3B8'
                }}
              >
                {cameraPermissionGranted ? 'ON (Permitted)' : 'OFF (Privacy Mode)'}
              </button>
            </div>

            {cameraPermissionGranted && onChangeCameraScore && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.69rem', color: '#94A3B8' }}>
                  <span>Camera Visual Attention:</span>
                  <b style={{ color: '#34D399' }}>{Math.round(cameraAttentionScore * 100)}%</b>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(cameraAttentionScore * 100)}
                  onChange={(e) => onChangeCameraScore(Number(e.target.value) / 100)}
                  style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Fusion Signal Breakdown & Personal RT Z-Score */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            fontSize: '0.69rem',
            textAlign: 'center'
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>Game I<sub>att</sub></div>
            <div style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.78rem' }}>
              {Math.round(gameplayInatt * 100)}%
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>Cam I<sub>att</sub></div>
            <div style={{ fontWeight: 800, color: cameraInatt !== null ? '#34D399' : '#64748B', fontSize: '0.78rem' }}>
              {cameraInatt !== null ? `${Math.round(cameraInatt * 100)}%` : 'OFF'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px', borderRadius: '6px' }}>
            <div style={{ color: '#94A3B8' }}>RT Z-Score</div>
            <div
              style={{
                fontWeight: 800,
                color: Math.abs(rtZScore) >= 1.5 ? '#FBBF24' : '#E2E8F0',
                fontSize: '0.78rem'
              }}
            >
              {rtZScore > 0 ? `+${rtZScore}` : rtZScore}σ
            </div>
          </div>
        </div>

        {/* Personal RT Baseline & Attention Slip Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#94A3B8' }}>
          <span>
            Child RT μ: <b>{rtBaseline ? `${(rtBaseline.meanMs / 1000).toFixed(1)}s` : '6.0s'}</b> (±
            {rtBaseline ? `${(rtBaseline.stdMs / 1000).toFixed(1)}s` : '2.0s'})
          </span>
          <span>
            P(Focused): <b style={{ color: '#4ADE80' }}>{Math.round(attentionProb * 100)}%</b>
          </span>
        </div>

        {isAttentionSlip && (
          <div
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: '#FBBF24',
              fontSize: '0.7rem',
              fontWeight: 700
            }}
          >
            🛡️ Attention Slip Detected (|z| ≥ 1.5 or rapid/idle error) — Ready for AD-BKT Mastery Protection!
          </div>
        )}
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

      {/* Simulator Test Buttons (Researcher Playground) */}
      {(onSimulateInattention || onSimulateFrustration || onSimulateFocusedFlow || onSimulateHintAssisted) && (
        <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>
            🧪 Quick Gameplay Simulations:
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
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                💡 Hint L4 Success (Discount)
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
                  fontSize: '0.7rem',
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
                  fontSize: '0.7rem',
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
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔥 Frustration Struggle
              </button>
            )}

            {onSimulateRapidAttentionSlip && (
              <button
                onClick={onSimulateRapidAttentionSlip}
                style={{
                  gridColumn: '1 / -1',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38BDF8',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🛡️ Rapid RT Z-Score Attention Slip (&lt; 0.8s Error)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerStateHUD;

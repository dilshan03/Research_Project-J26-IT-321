import React, { useState, useEffect } from 'react';
import { 
  PedagogicalCompanion, 
  AgentDevPanel, 
  LearnerStateHUD,
  usePedagogicalAgent, 
  useInteractionLogger,
  useLearnerState,
  useAgentStore 
} from '../../features/pedagogical-agent';
import type { InteractionEvent, HintLevel } from '../../features/pedagogical-agent';

export function AgentTestPage() {
  const { playAction, onGameEvent, resetHints } = usePedagogicalAgent();
  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);
  
  // Mock Game State to simulate gameplay
  const [question] = useState({
    id: 'math_q_add_01',
    concept: 'single_digit_addition',
    num1: 5,
    num2: 3,
    answer: 8,
    options: [6, 7, 8, 9]
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(true); // Default open for live inspection

  // Initialize Research Telemetry Logger (Task #17)
  const { logs, metrics, logAnswer, logHint, clearLogs } = useInteractionLogger({
    sessionId: 'sess_adhd_study_01',
    studentId: 'student_trial_01',
    questionId: question.id,
    concept: question.concept
  });

  // Initialize Real-time Learner State Builder & Hint-Aware BKT (Tasks #19 & #20)
  const { learnerState, bktComparison, isLoading: isStateLoading, evaluateInteractions } = useLearnerState({
    studentId: 'student_trial_01',
    sessionId: 'sess_adhd_study_01',
    autoIntervene: true // Automatically triggers 3D agent reaction & speech bubble
  });

  // Evaluate state when logs array changes
  useEffect(() => {
    if (logs.length > 0) {
      evaluateInteractions(logs);
    }
  }, [logs, evaluateInteractions]);

  const handleSelectOption = (num: number) => {
    setSelectedOption(num);
    const isCorrect = num === question.answer;

    if (isCorrect) {
      setFeedback('correct');
      onGameEvent('CORRECT_ANSWER');
    } else {
      setFeedback('wrong');
      onGameEvent('WRONG_ANSWER');
    }

    // Record telemetry event with latency, accuracy, and current hint level
    logAnswer(num, isCorrect, currentHintLevel);
  };

  const handleResetQuestion = () => {
    setSelectedOption(null);
    setFeedback(null);
    resetHints();
    playAction('wave');
  };

  // --- Real-time Simulator Test Triggers (For immediate researcher verification) ---
  const handleSimulateInattention = () => {
    const simEvent: InteractionEvent = {
      id: 'sim_inatt_' + Math.random().toString(36).substring(2, 7),
      sessionId: 'sess_adhd_study_01',
      studentId: 'student_trial_01',
      questionId: question.id,
      concept: question.concept,
      eventType: 'QUESTION_VIEW',
      attemptNumber: 0,
      hintLevelReached: 0,
      totalHintsRequested: 0,
      responseTimeMs: 25000,
      idleTimeBeforeFirstActionMs: 22000,
      timestamp: new Date().toISOString()
    };
    evaluateInteractions([...logs, simEvent]);
  };

  const handleSimulateFrustration = () => {
    const simEvents: InteractionEvent[] = [
      {
        id: 'sim_err1_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: 6,
        isCorrect: false,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 4000,
        idleTimeBeforeFirstActionMs: 1500,
        timestamp: new Date().toISOString()
      },
      {
        id: 'sim_err2_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 2,
        selectedAnswer: 7,
        isCorrect: false,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 3500,
        idleTimeBeforeFirstActionMs: 1000,
        timestamp: new Date().toISOString()
      }
    ];
    evaluateInteractions([...logs, ...simEvents]);
  };

  const handleSimulateFocusedFlow = () => {
    const simEvents: InteractionEvent[] = [
      {
        id: 'sim_flow1_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: 8,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 5000,
        idleTimeBeforeFirstActionMs: 1200,
        timestamp: new Date().toISOString()
      },
      {
        id: 'sim_flow2_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: 8,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 4800,
        idleTimeBeforeFirstActionMs: 1100,
        timestamp: new Date().toISOString()
      }
    ];
    evaluateInteractions([...logs, ...simEvents]);
  };

  const handleSimulateHintAssisted = () => {
    const simEvents: InteractionEvent[] = [
      {
        id: 'sim_hint4_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'HINT_REQUEST',
        attemptNumber: 1,
        hintLevelReached: 4,
        totalHintsRequested: 4,
        responseTimeMs: 3000,
        idleTimeBeforeFirstActionMs: 800,
        timestamp: new Date().toISOString()
      },
      {
        id: 'sim_hint_ans_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: 8,
        isCorrect: true,
        hintLevelReached: 4,
        totalHintsRequested: 4,
        responseTimeMs: 6000,
        idleTimeBeforeFirstActionMs: 800,
        timestamp: new Date().toISOString()
      }
    ];
    evaluateInteractions([...logs, ...simEvents]);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: '#0B1120',
        color: '#F8FAFC',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 30
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="/"
            style={{
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#E2E8F0',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            ← Back to Home
          </a>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8' }}>
            🎮 MathQuest Learning Session Simulator
          </span>
        </div>

        {/* Live Metrics Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.78rem'
            }}
          >
            <span style={{ color: '#10B981', fontWeight: 700 }}>✓ {metrics.correctCount}</span>
            <span style={{ color: '#EF4444', fontWeight: 700 }}>✕ {metrics.wrongCount}</span>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>💡 {metrics.totalHintsCount}</span>
            <span style={{ color: '#94A3B8' }}>⏱️ {metrics.avgResponseTimeMs ? `${(metrics.avgResponseTimeMs / 1000).toFixed(1)}s` : '0s'}</span>
          </div>

          {/* Real-time State Badge (Task #19 Visual Indicator) */}
          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            style={{
              padding: '6px 12px',
              background: showLogsDrawer ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: showLogsDrawer ? '#38BDF8' : '#E2E8F0',
              borderRadius: '8px',
              border: showLogsDrawer ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🧠</span>
            <span>
              ADHD State: <b style={{ color: '#F8FAFC' }}>{learnerState?.cognitiveState || 'SYNCING'}</b>
            </span>
          </button>

          <button
            onClick={() => setShowDevPanel(!showDevPanel)}
            style={{
              padding: '6px 12px',
              background: showDevPanel ? '#8B5CF6' : 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>⚙️</span>
            <span>Dev Controls</span>
          </button>
        </div>
      </header>

      {/* Main Horizontal Work Area: Left = Game Area | Right = Pedagogical Companion | Far Right = HUD Drawer */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        
        {/* Left Side: Mock Math Game Workspace */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
            background: 'radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.22) 0%, rgba(11, 17, 32, 1) 75%)'
          }}
        >
          {/* Question Card */}
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#38BDF8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '4px 12px',
                  borderRadius: '20px'
                }}
              >
                මූලික එකතු කිරීම
              </span>
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                ප්‍රශ්න අංක: 01 / 05
              </span>
            </div>

            {/* Math Expression */}
            <div style={{ padding: '16px 0' }}>
              <span style={{ fontSize: '3.4rem', fontWeight: 900, letterSpacing: '4px', color: '#FFFFFF' }}>
                {question.num1} + {question.num2} = ?
              </span>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: '#94A3B8' }}>
                නිවැරදි පිළිතුර තෝරන්න
              </p>
            </div>

            {/* Answer Options Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {question.options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrect = isSelected && feedback === 'correct';
                const isWrong = isSelected && feedback === 'wrong';

                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    style={{
                      padding: '14px',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isCorrect
                        ? '2px solid #22C55E'
                        : isWrong
                        ? '2px solid #EF4444'
                        : '1.5px solid rgba(255, 255, 255, 0.15)',
                      background: isCorrect
                        ? 'rgba(34, 197, 94, 0.25)'
                        : isWrong
                        ? 'rgba(239, 68, 68, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: '#FFFFFF',
                      boxShadow: isCorrect
                        ? '0 0 20px rgba(34, 197, 94, 0.4)'
                        : isWrong
                        ? '0 0 20px rgba(239, 68, 68, 0.4)'
                        : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Result Feedback Banner */}
            {feedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background:
                    feedback === 'correct' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: feedback === 'correct' ? '#4ADE80' : '#F87171',
                  border:
                    feedback === 'correct' ? '1px solid #22C55E' : '1px solid #EF4444'
                }}
              >
                <span>{feedback === 'correct' ? '🎉' : '🤔'}</span>
                <span>
                  {feedback === 'correct'
                    ? 'නියමයි! පිළිතුර නිවැරදියි!'
                    : 'පිළිතුර වැරදියි. දකුණු පස හෝඩුවාව බලන්න!'}
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px' }}>
              <button
                onClick={handleResetQuestion}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#CBD5E1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 ප්‍රශ්නය මුලසිට
              </button>
            </div>
          </div>
        </main>

        {/* Right Side: Standalone Pedagogical Companion Panel */}
        <PedagogicalCompanion
          interactive={false}
          onHintRequest={(lvl) => logHint(lvl)}
          style={{ width: '420px', minWidth: '380px' }}
        />

        {/* Telemetry & ADHD Learner State Drawer (Task #17 & #19 Live Inspection) */}
        {showLogsDrawer && (
          <aside
            style={{
              width: '380px',
              minWidth: '360px',
              background: '#0F172A',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              zIndex: 20
            }}
          >
            {/* Visual Tasks #19 & #20 HUD: Real-time Inattention, Frustration, Persistence & BKT Mastery */}
            <LearnerStateHUD
              learnerState={learnerState}
              bktComparison={bktComparison}
              isLoading={isStateLoading}
              onSimulateInattention={handleSimulateInattention}
              onSimulateFrustration={handleSimulateFrustration}
              onSimulateFocusedFlow={handleSimulateFocusedFlow}
              onSimulateHintAssisted={handleSimulateHintAssisted}
            />

            {/* Raw Interaction Event Stream */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10B981' }}>
                📊 Interaction Stream ({logs.length})
              </span>
              <button
                onClick={clearLogs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              {logs.slice().reverse().map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderLeft: evt.eventType === 'ANSWER_SUBMIT'
                      ? evt.isCorrect ? '3px solid #10B981' : '3px solid #EF4444'
                      : '3px solid #F59E0B'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', fontWeight: 700 }}>
                    <span>{evt.eventType}</span>
                    <span style={{ color: '#94A3B8', fontWeight: 400 }}>{evt.responseTimeMs ? `${(evt.responseTimeMs / 1000).toFixed(2)}s` : ''}</span>
                  </div>
                  {evt.eventType === 'ANSWER_SUBMIT' && (
                    <div style={{ marginTop: '2px', color: evt.isCorrect ? '#4ADE80' : '#F87171' }}>
                      Answer: {evt.selectedAnswer} ({evt.isCorrect ? 'Correct' : 'Incorrect'}) | Hint: L{evt.hintLevelReached}
                    </div>
                  )}
                  {evt.eventType === 'HINT_REQUEST' && (
                    <div style={{ marginTop: '2px', color: '#FCD34D' }}>
                      Requested Level: L{evt.hintLevelReached} (Total hints: {evt.totalHintsRequested})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Optional Collapsible Dev Panel for thorough debugging */}
        {showDevPanel && (
          <aside
            style={{
              width: '320px',
              background: '#18181B',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <AgentDevPanel />
          </aside>
        )}
      </div>
    </div>
  );
}

export default AgentTestPage;

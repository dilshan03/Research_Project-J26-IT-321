import React, { useState } from 'react';
import { PedagogicalCompanion, AgentDevPanel, usePedagogicalAgent } from '../../features/pedagogical-agent';

export function AgentTestPage() {
  const { playAction, onGameEvent, requestNextHint, resetHints } = usePedagogicalAgent();
  
  // Mock Game State to simulate gameplay
  const [question] = useState({
    num1: 5,
    num2: 3,
    answer: 8,
    options: [6, 7, 8, 9]
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);

  const handleSelectOption = (num: number) => {
    setSelectedOption(num);
    if (num === question.answer) {
      setFeedback('correct');
      onGameEvent('CORRECT_ANSWER');
    } else {
      setFeedback('wrong');
      onGameEvent('WRONG_ANSWER');
    }
  };

  const handleResetQuestion = () => {
    setSelectedOption(null);
    setFeedback(null);
    resetHints();
    playAction('wave');
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
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 30
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a
            href="/"
            style={{
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#E2E8F0',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            ← Back to Home
          </a>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#38BDF8' }}>
            🎮 MathQuest Learning Session Simulator
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowDevPanel(!showDevPanel)}
            style={{
              padding: '6px 14px',
              background: showDevPanel ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)',
              color: showDevPanel ? '#0B1120' : '#E2E8F0',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⚙️</span>
            <span>{showDevPanel ? 'Hide Dev Controls' : 'Show Dev Controls'}</span>
          </button>
        </div>
      </header>

      {/* Main Horizontal Work Area: Left = Game Area | Right = Pedagogical Companion */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        
        {/* Left Side: Mock Math Game Workspace */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            position: 'relative',
            background: 'radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.25) 0%, rgba(11, 17, 32, 1) 75%)'
          }}
        >
          {/* Question Card */}
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#38BDF8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '4px 12px',
                  borderRadius: '20px'
                }}
              >
                Level 1: මූලික එකතු කිරීම
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                ප්‍රශ්න අංක: 01 / 05
              </span>
            </div>

            {/* Math Expression */}
            <div style={{ padding: '20px 0' }}>
              <span style={{ fontSize: '3.6rem', fontWeight: 900, letterSpacing: '4px', color: '#FFFFFF' }}>
                {question.num1} + {question.num2} = ?
              </span>
              <p style={{ margin: '10px 0 0 0', fontSize: '1rem', color: '#94A3B8' }}>
                නිවැරදි පිළිතුර තෝරන්න
              </p>
            </div>

            {/* Answer Options Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {question.options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrect = isSelected && feedback === 'correct';
                const isWrong = isSelected && feedback === 'wrong';

                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    style={{
                      padding: '16px',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isCorrect
                        ? '2px solid #22C55E'
                        : isWrong
                        ? '2px solid #EF4444'
                        : '1px solid rgba(255, 255, 255, 0.15)',
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
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '1rem',
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
                    : 'පිළිතුර වැරදියි. දකුණු පස හෝඩුවාව (Hint) බලන්න!'}
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={handleResetQuestion}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#CBD5E1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 ප්‍රශ්නය මුලසිට (Reset)
              </button>
            </div>
          </div>
        </main>

        {/* Right Side: Standalone Pedagogical Companion Panel */}
        <PedagogicalCompanion
          interactive={false} // Camera movement locked (no rotate, zoom in/out, pan)
          style={{ width: '420px', minWidth: '380px' }}
        />

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

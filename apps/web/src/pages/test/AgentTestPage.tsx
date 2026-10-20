import React, { useState, useEffect, useRef } from 'react';
import {
  PedagogicalCompanion,
  AgentDevPanel,
  LearnerStateHUD,
  usePedagogicalAgent,
  useInteractionLogger,
  useLearnerState,
  useAgentStore,
} from '../../features/pedagogical-agent';
import type { InteractionEvent, HintLevel } from '../../features/pedagogical-agent';

interface TestQuestion {
  id: string;
  stepNumber: number;
  concept: string;
  num1: number;
  num2: number;
  answer: number;
  options: number[];
  hints: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
}

const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'math_q_add_01',
    stepNumber: 1,
    concept: 'single_digit_addition',
    num1: 5,
    num2: 3,
    answer: 8,
    options: [6, 7, 8, 9],
    hints: {
      1: 'හෝඩුවාව 1: 5 සිට ඉදිරියට පියවර 3ක් ගණන් කරන්න.',
      2: 'හෝඩුවාව 2: ඇඟිලි 5කට තව ඇඟිලි 3ක් එකතු කර බලන්න.',
      3: 'හෝඩුවාව 3: 5 න් පසු 6, 7, 8 ලෙස ගණන් කරමු!',
      4: 'හෝඩුවාව 4: 5 + 3 හි නිවැරදි පිළිතුර 8 වේ!',
    },
  },
  {
    id: 'math_q_add_02',
    stepNumber: 2,
    concept: 'single_digit_addition',
    num1: 4,
    num2: 5,
    answer: 9,
    options: [7, 8, 9, 10],
    hints: {
      1: 'හෝඩුවාව 1: 4 + 4 කීයද කියා මුලින්ම සිතන්න.',
      2: 'හෝඩුවාව 2: 4 + 4 = 8 නිසා, ඊට තව 1ක් එකතු කරන්න.',
      3: 'හෝඩුවාව 3: 4 සිට ඉදිරියට ගණන් කරමු: 5, 6, 7, 8, 9!',
      4: 'හෝඩුවාව 4: 4 + 5 හි නිවැරදි පිළිතුර 9 වේ!',
    },
  },
  {
    id: 'math_q_add_03',
    stepNumber: 3,
    concept: 'single_digit_addition',
    num1: 6,
    num2: 7,
    answer: 13,
    options: [11, 12, 13, 14],
    hints: {
      1: 'හෝඩුවාව 1: මුලින්ම 6 + 6 කීයද කියා මතක් කරගන්න.',
      2: 'හෝඩුවාව 2: 6 + 6 = 12 කි. 7 යනු 6 ට වඩා 1ක් වැඩි නිසා 12 ට 1ක් එකතු කරන්න.',
      3: 'හෝඩුවාව 3: නැතහොත් 6 + 4 = 10 හදාගෙන ඉතිරි 3 එකතු කරන්න (10 + 3).',
      4: 'හෝඩුවාව 4: 12 + 1 = 13! නිවැරදි පිළිතුර 13 වේ.',
    },
  },
  {
    id: 'math_q_add_04',
    stepNumber: 4,
    concept: 'single_digit_addition',
    num1: 5,
    num2: 6,
    answer: 11,
    options: [10, 11, 12, 13],
    hints: {
      1: 'හෝඩුවාව 1: අත් දෙකේ ඇඟිලි 5 බැගින් එකතු කළ විට 10 කි.',
      2: 'හෝඩුවාව 2: 6 යනු 5 + 1 වේ. එවිට (5 + 5) + 1 ලෙස ගත හැක.',
      3: 'හෝඩුවාව 3: 10 ට 1ක් එකතු කළ විට 10 ට පසුව එන සංඛ්‍යාව ලැබේ.',
      4: 'හෝඩුවාව 4: 5 + 6 හි නිවැරදි උත්තරය 11 වේ!',
    },
  },
  {
    id: 'math_q_add_05',
    stepNumber: 5,
    concept: 'single_digit_addition',
    num1: 8,
    num2: 5,
    answer: 13,
    options: [12, 13, 14, 15],
    hints: {
      1: 'හෝඩුවාව 1: 8 ට තව 2ක් එකතු කළ විට 10 ලැබේ.',
      2: 'හෝඩුවාව 2: 5 යන සංඛ්‍යාව 2 සහ 3 ලෙස කොටස් දෙකකට වෙන් කරන්න.',
      3: 'හෝඩුවාව 3: දැන් (8 + 2) + 3 = 10 + 3 ලෙස එකතු කරන්න.',
      4: 'හෝඩුවාව 4: 10 + 3 = 13 වේ!',
    },
  },
  {
    id: 'math_q_add_06',
    stepNumber: 6,
    concept: 'single_digit_addition',
    num1: 7,
    num2: 8,
    answer: 15,
    options: [13, 14, 15, 16],
    hints: {
      1: 'හෝඩුවාව 1: 7 + 7 = 14 බව මතක් කරගන්න.',
      2: 'හෝඩුවාව 2: 8 යනු 7 ට වඩා 1ක් වැඩි නිසා 14 ට 1ක් එකතු කරන්න.',
      3: 'හෝඩුවාව 3: නැතහොත් 8 + 2 = 10 හදා ඉතිරි 5 එකතු කරන්න.',
      4: 'හෝඩුවාව 4: නිවැරදි පිළිතුර 15 වේ!',
    },
  },
  {
    id: 'math_q_add_07',
    stepNumber: 7,
    concept: 'single_digit_addition',
    num1: 9,
    num2: 4,
    answer: 13,
    options: [11, 12, 13, 14],
    hints: {
      1: 'හෝඩුවාව 1: 9 ට 1ක් එකතු කර 10 සාදාගන්න.',
      2: 'හෝඩුවාව 2: 4 න් 1ක් ගත් පසු ඉතිරි වන්නේ 3 කි.',
      3: 'හෝඩුවාව 3: දැන් 10 සහ 3 එකතු කරන්න.',
      4: 'හෝඩුවාව 4: 10 + 3 = 13 වේ!',
    },
  },
  {
    id: 'math_q_add_08',
    stepNumber: 8,
    concept: 'single_digit_addition',
    num1: 8,
    num2: 8,
    answer: 16,
    options: [14, 15, 16, 18],
    hints: {
      1: 'හෝඩුවාව 1: දෙවන 8 න් 2ක් ගෙන පළමු 8 ට එකතු කර 10 සාදන්න.',
      2: 'හෝඩුවාව 2: 8 න් 2ක් ගත් විට ඉතිරි වන්නේ 6 කි.',
      3: 'හෝඩුවාව 3: දැන් 10 ට 6ක් එකතු කරන්න.',
      4: 'හෝඩුවාව 4: නිවැරදි පිළිතුර 16 වේ!',
    },
  },
  {
    id: 'math_q_add_09',
    stepNumber: 9,
    concept: 'single_digit_addition',
    num1: 9,
    num2: 6,
    answer: 15,
    options: [14, 15, 16, 17],
    hints: {
      1: 'හෝඩුවාව 1: 9 + 1 = 10 කි.',
      2: 'හෝඩුවාව 2: 6 න් 1ක් අඩු කළ විට 5ක් ඉතිරි වේ.',
      3: 'හෝඩුවාව 3: 10 සහ 5 එකතු කරන්න.',
      4: 'හෝඩුවාව 4: 10 + 5 = 15 වේ!',
    },
  },
  {
    id: 'math_q_add_10',
    stepNumber: 10,
    concept: 'single_digit_addition',
    num1: 9,
    num2: 8,
    answer: 17,
    options: [15, 16, 17, 18],
    hints: {
      1: 'හෝඩුවාව 1: 9 ට 1ක් එකතු කළ විට 10 වේ.',
      2: 'හෝඩුවාව 2: 8 න් 1ක් ගත් විට ඉතිරි වන්නේ 7 කි.',
      3: 'හෝඩුවාව 3: දැන් 10 සහ 7 එකතු කරන්න.',
      4: 'හෝඩුවාව 4: 10 + 7 = 17! ඔයා ප්‍රශ්න 10 ම සාර්ථකව අවසන් කළා!',
    },
  },
];

const QUESTION_TIME_LIMIT_SEC = 30;

export function AgentTestPage() {
  const { playAction, onGameEvent, resetHints } = usePedagogicalAgent();
  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);

  // 10-Question Progression State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(true); // Default open for live inspection

  // Step 1 & Step 2 Visual State: Live Remaining Time & Privacy-Aware Optional Camera Fusion
  const [remainingTimeSec, setRemainingTimeSec] = useState<number>(QUESTION_TIME_LIMIT_SEC);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [cameraAttentionScore, setCameraAttentionScore] = useState<number>(0.85);
  // Step 4 Visual State: Simulated Elapsed Days (Δt) for Stability-Based Forgetting Curve
  const [simulatedElapsedDays, setSimulatedElapsedDays] = useState<number>(0);

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = TEST_QUESTIONS[currentQuestionIdx];

  // Clear pending timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Countdown remainingTimeSec per question
  useEffect(() => {
    setRemainingTimeSec(QUESTION_TIME_LIMIT_SEC);
    if (isSessionComplete) return;
    const interval = setInterval(() => {
      setRemainingTimeSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestionIdx, isSessionComplete]);

  // Initialize Research Telemetry Logger across all 10 questions (Task #17)
  const { logs, metrics, logAnswer, logHint, clearLogs } = useInteractionLogger({
    sessionId: 'sess_adhd_study_01',
    studentId: 'student_trial_01',
    questionId: question.id,
    concept: question.concept,
  });

  // Initialize Real-time Learner State Builder, Hint-Aware BKT & FSM (Tasks #19, #20, #21)
  const {
    learnerState,
    bktComparison,
    fsmDecision,
    isLoading: isStateLoading,
    evaluateInteractions,
    triggerFSMContext,
  } = useLearnerState({
    studentId: 'student_trial_01',
    sessionId: 'sess_adhd_study_01',
    autoIntervene: true, // Automatically triggers 3D agent reaction & speech bubble
  });

  // Evaluate state when logs, camera consent/score, or simulated elapsed days changes
  useEffect(() => {
    if (logs.length > 0) {
      evaluateInteractions(
        logs,
        {
          cameraPermissionGranted,
          cameraAttentionScore,
        },
        simulatedElapsedDays
      );
    }
  }, [logs, cameraPermissionGranted, cameraAttentionScore, simulatedElapsedDays, evaluateInteractions]);

  const goToQuestion = (nextIdx: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setCurrentQuestionIdx(nextIdx);
    setSelectedOption(null);
    setFeedback(null);
    setRemainingTimeSec(QUESTION_TIME_LIMIT_SEC);
    resetHints();
  };

  const handleSelectOption = (num: number) => {
    // Prevent duplicate clicks while auto-advancing after a correct answer
    if (feedback === 'correct' || isSessionComplete) return;

    setSelectedOption(num);
    const isCorrect = num === question.answer;

    // Record telemetry event with latency, remainingTimeMs, accuracy, hint level & optional camera telemetry
    logAnswer(num, isCorrect, currentHintLevel, {
      remainingTimeMs: remainingTimeSec * 1000,
      timeLimitMs: QUESTION_TIME_LIMIT_SEC * 1000,
      cameraPermissionGranted,
      cameraAttentionScore: cameraPermissionGranted ? cameraAttentionScore : null,
    });

    if (isCorrect) {
      setFeedback('correct');
      onGameEvent('CORRECT_ANSWER');

      if (!completedSteps.includes(question.stepNumber)) {
        setCompletedSteps((prev) => [...prev, question.stepNumber]);
      }

      // Auto-advance to the next question after 1.3s so calculations proceed across all 10 questions
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (currentQuestionIdx < TEST_QUESTIONS.length - 1) {
          goToQuestion(currentQuestionIdx + 1);
        } else {
          setIsSessionComplete(true);
        }
      }, 1350);
    } else {
      setFeedback('wrong');
      onGameEvent('WRONG_ANSWER');
    }
  };

  const handleResetCurrentQuestion = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setSelectedOption(null);
    setFeedback(null);
    setRemainingTimeSec(QUESTION_TIME_LIMIT_SEC);
    resetHints();
    playAction('wave');
  };

  const handleRestartFullSession = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearLogs();
    setCompletedSteps([]);
    setIsSessionComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setFeedback(null);
    setRemainingTimeSec(QUESTION_TIME_LIMIT_SEC);
    resetHints();
    playAction('wave', {
      message: 'අපි ප්‍රශ්න 10 මුලසිට නැවත පටන් ගමු!',
      duration: 3,
    });
  };

  const handleHintRequest = (lvl: HintLevel) => {
    if (lvl === 0) return;
    logHint(lvl);
    const hintText = question.hints[lvl as 1 | 2 | 3 | 4];
    const animMap = {
      1: 'smallHint',
      2: 'guidedHint',
      3: 'stepByStep',
      4: 'explain',
    } as const;
    playAction(animMap[lvl as 1 | 2 | 3 | 4], {
      message: hintText,
      duration: 4,
    });
  };

  const activeHintBoardHints = {
    1: { title: 'පොඩි හෝඩුවාවක්', description: question.hints[1] },
    2: { title: 'මඟපෙන්වීම', description: question.hints[2] },
    3: { title: 'පියවරෙන් පියවර', description: question.hints[3] },
    4: { title: 'විසඳුම', description: question.hints[4] },
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
      remainingTimeMs: 5000,
      timeLimitMs: 30000,
      cameraPermissionGranted,
      cameraAttentionScore: cameraPermissionGranted ? cameraAttentionScore : null,
      timestamp: new Date().toISOString(),
    };
    evaluateInteractions([...logs, simEvent], { cameraPermissionGranted, cameraAttentionScore }, simulatedElapsedDays);
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
        selectedAnswer: question.options[0],
        isCorrect: false,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 4000,
        idleTimeBeforeFirstActionMs: 1500,
        remainingTimeMs: 26000,
        timeLimitMs: 30000,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'sim_err2_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 2,
        selectedAnswer: question.options[1],
        isCorrect: false,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 3500,
        idleTimeBeforeFirstActionMs: 1000,
        remainingTimeMs: 26500,
        timeLimitMs: 30000,
        timestamp: new Date().toISOString(),
      },
    ];
    evaluateInteractions([...logs, ...simEvents], { cameraPermissionGranted, cameraAttentionScore }, simulatedElapsedDays);
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
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 5000,
        idleTimeBeforeFirstActionMs: 1200,
        remainingTimeMs: 25000,
        timeLimitMs: 30000,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'sim_flow2_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 4800,
        idleTimeBeforeFirstActionMs: 1100,
        remainingTimeMs: 25200,
        timeLimitMs: 30000,
        timestamp: new Date().toISOString(),
      },
    ];
    evaluateInteractions([...logs, ...simEvents], { cameraPermissionGranted, cameraAttentionScore }, simulatedElapsedDays);
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
        timestamp: new Date().toISOString(),
      },
      {
        id: 'sim_hint_ans_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 4,
        totalHintsRequested: 4,
        responseTimeMs: 6000,
        idleTimeBeforeFirstActionMs: 800,
        remainingTimeMs: 24000,
        timeLimitMs: 30000,
        timestamp: new Date().toISOString(),
      },
    ];
    evaluateInteractions([...logs, ...simEvents], { cameraPermissionGranted, cameraAttentionScore }, simulatedElapsedDays);
  };

  // Step 2 & Step 3 Novelty Trigger: Personal RT Baseline Z-Score & Attention Slip Mastery Protection Simulation
  const handleSimulateRapidAttentionSlip = () => {
    const now = Date.now();
    const simEvents: InteractionEvent[] = [
      {
        id: 'sim_base1_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 5200,
        idleTimeBeforeFirstActionMs: 1100,
        remainingTimeMs: 24800,
        timeLimitMs: 30000,
        timestamp: new Date(now - 30000).toISOString(),
      },
      {
        id: 'sim_base2_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 5500,
        idleTimeBeforeFirstActionMs: 1000,
        remainingTimeMs: 24500,
        timeLimitMs: 30000,
        timestamp: new Date(now - 20000).toISOString(),
      },
      {
        id: 'sim_base3_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.answer,
        isCorrect: true,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 5100,
        idleTimeBeforeFirstActionMs: 900,
        remainingTimeMs: 24900,
        timeLimitMs: 30000,
        timestamp: new Date(now - 10000).toISOString(),
      },
      {
        id: 'sim_slip_' + Math.random().toString(36).substring(2, 7),
        sessionId: 'sess_adhd_study_01',
        studentId: 'student_trial_01',
        questionId: question.id,
        concept: question.concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: 1,
        selectedAnswer: question.options[0],
        isCorrect: false,
        hintLevelReached: 0,
        totalHintsRequested: 0,
        responseTimeMs: 700,
        idleTimeBeforeFirstActionMs: 300,
        remainingTimeMs: 29300,
        timeLimitMs: 30000,
        cameraPermissionGranted,
        cameraAttentionScore: cameraPermissionGranted ? cameraAttentionScore : null,
        timestamp: new Date(now).toISOString(),
      },
    ];
    evaluateInteractions([...logs, ...simEvents], { cameraPermissionGranted, cameraAttentionScore }, simulatedElapsedDays);
  };

  const formattedQNum = String(question.stepNumber).padStart(2, '0');
  const formattedTotalQ = String(TEST_QUESTIONS.length).padStart(2, '0');

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
        fontFamily: "'Inter', sans-serif",
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
          zIndex: 30,
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
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            ← Back to Home
          </a>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8' }}>
            🎮 MathQuest Learning Session Simulator (10 Questions)
          </span>
        </div>

        {/* Live Metrics Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Camera Consent Quick Toggle Pill (Step 1 & Step 2 Visual Indicator) */}
          <button
            type="button"
            onClick={() => setCameraPermissionGranted(!cameraPermissionGranted)}
            title="Toggle optional peer camera consent (Multimodal vs Telemetry-Only Fallback)"
            style={{
              padding: '5px 10px',
              borderRadius: '18px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: cameraPermissionGranted
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(56, 189, 248, 0.12)',
              color: cameraPermissionGranted ? '#34D399' : '#38BDF8',
              border: cameraPermissionGranted
                ? '1px solid rgba(16, 185, 129, 0.45)'
                : '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            {cameraPermissionGranted
              ? `📷 Camera ON (${Math.round(cameraAttentionScore * 100)}%)`
              : '🛡️ Camera OFF (Telemetry Mode)'}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: '#38BDF8', fontWeight: 800 }}>
              Q: {formattedQNum}/{formattedTotalQ}
            </span>
            <span style={{ color: '#10B981', fontWeight: 700 }}>✓ {metrics.correctCount}</span>
            <span style={{ color: '#EF4444', fontWeight: 700 }}>✕ {metrics.wrongCount}</span>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>💡 {metrics.totalHintsCount}</span>
            <span style={{ color: '#94A3B8' }}>
              ⏱️{' '}
              {metrics.avgResponseTimeMs
                ? `${(metrics.avgResponseTimeMs / 1000).toFixed(1)}s`
                : '0s'}
            </span>
          </div>

          {/* Real-time State Badge (Task #19 Visual Indicator) */}
          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            style={{
              padding: '6px 12px',
              background: showLogsDrawer
                ? 'rgba(56, 189, 248, 0.2)'
                : 'rgba(255, 255, 255, 0.08)',
              color: showLogsDrawer ? '#38BDF8' : '#E2E8F0',
              borderRadius: '8px',
              border: showLogsDrawer
                ? '1px solid rgba(56, 189, 248, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🧠</span>
            <span>
              State:{' '}
              <b style={{ color: '#F8FAFC' }}>{learnerState?.cognitiveState || 'SYNCING'}</b>
              {' | '}
              FSM: <b style={{ color: '#C084FC' }}>{fsmDecision.fsmState}</b>
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
              gap: '5px',
            }}
          >
            <span>⚙️</span>
            <span>Dev Controls</span>
          </button>
        </div>
      </header>

      {/* Main Horizontal Work Area: Left = Game Area | Right = Pedagogical Companion | Far Right = HUD Drawer */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* Left Side: 10-Question Math Game Workspace */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            background:
              'radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.22) 0%, rgba(11, 17, 32, 1) 75%)',
          }}
        >
          {/* Question Card */}
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '26px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#38BDF8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                මූලික එකතු කිරීම
              </span>

              {/* Live Remaining Time Pill (Step 1 Telemetry Indicator) */}
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: remainingTimeSec <= 8 ? '#F87171' : '#34D399',
                  background:
                    remainingTimeSec <= 8 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                  border:
                    remainingTimeSec <= 8
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '14px',
                }}
              >
                ⏳ ඉතිරි කාලය: {remainingTimeSec}s / {QUESTION_TIME_LIMIT_SEC}s
              </span>

              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0' }}>
                ප්‍රශ්න අංක: {formattedQNum} / {formattedTotalQ}
              </span>
            </div>

            {/* 10-Question Interactive Stepper Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {TEST_QUESTIONS.map((q, idx) => {
                const isCurrent = idx === currentQuestionIdx && !isSessionComplete;
                const isDone = completedSteps.includes(q.stepNumber);

                return (
                  <React.Fragment key={q.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionComplete(false);
                        goToQuestion(idx);
                      }}
                      title={`ප්‍රශ්නය ${q.stepNumber}: ${q.num1} + ${q.num2}`}
                      style={{
                        width: isCurrent ? '28px' : '24px',
                        height: isCurrent ? '28px' : '24px',
                        borderRadius: '50%',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isCurrent
                          ? '2px solid #38BDF8'
                          : isDone
                          ? '1.5px solid #10B981'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                        background: isCurrent
                          ? 'rgba(56, 189, 248, 0.25)'
                          : isDone
                          ? '#10B981'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: '#FFFFFF',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isDone && !isCurrent ? '✓' : q.stepNumber}
                    </button>
                    {idx < TEST_QUESTIONS.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          margin: '0 3px',
                          background: isDone ? '#10B981' : 'rgba(255, 255, 255, 0.12)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {isSessionComplete ? (
              /* 10-Question Session Completed Summary View */
              <div
                style={{
                  padding: '20px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '2.6rem' }}>🏆</div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#4ADE80' }}>
                  ප්‍රශ්න 10 ම සාර්ථකව අවසන්!
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                  ප්‍රශ්න 10 තුළ ඔබේ සමස්ත BKT ප්‍රගුණතා මට්ටම සහ FSM ප්‍රතිඵල පහතින් බලන්න:
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    width: '100%',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>AD-BKT P(L)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399' }}>
                      {Math.round(bktComparison.hintAwareKnowledge * 100)}%
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Standard P(L)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38BDF8' }}>
                      {Math.round(bktComparison.standardKnowledge * 100)}%
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Stability S<sub>t</sub></div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#C084FC' }}>
                      {(bktComparison.memoryStability ?? 1.0).toFixed(1)}d
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Hints Used</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBF24' }}>
                      {metrics.totalHintsCount}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRestartFullSession}
                  style={{
                    marginTop: '8px',
                    padding: '11px 22px',
                    borderRadius: '14px',
                    background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  🔄 ප්‍රශ්න 10 නැවත මුලසිට ආරම්භ කරන්න
                </button>
              </div>
            ) : (
              <>
                {/* Math Expression */}
                <div style={{ padding: '10px 0' }}>
                  <span
                    style={{
                      fontSize: '3.2rem',
                      fontWeight: 900,
                      letterSpacing: '4px',
                      color: '#FFFFFF',
                    }}
                  >
                    {question.num1} + {question.num2} ={' '}
                    {selectedOption !== null ? selectedOption : '?'}
                  </span>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.92rem', color: '#94A3B8' }}>
                    නිවැරදි පිළිතුර තෝරන්න (නිවැරදි පිළිතුර දුන් විට ස්වයංක්‍රීයව ඊළඟ ප්‍රශ්නයට
                    යයි)
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
                          cursor: feedback === 'correct' ? 'default' : 'pointer',
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
                          transition: 'all 0.15s ease-in-out',
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
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background:
                        feedback === 'correct'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      color: feedback === 'correct' ? '#4ADE80' : '#F87171',
                      border:
                        feedback === 'correct' ? '1px solid #22C55E' : '1px solid #EF4444',
                    }}
                  >
                    <span>{feedback === 'correct' ? '🎉' : '🤔'}</span>
                    <span>
                      {feedback === 'correct'
                        ? currentQuestionIdx < TEST_QUESTIONS.length - 1
                          ? 'නියමයි! පිළිතුර නිවැරදියි! ඊළඟ ප්‍රශ්නයට යමින්...'
                          : 'නියමයි! ප්‍රශ්න 10 ම සාර්ථකයි!'
                        : 'පිළිතුර වැරදියි. දකුණු පසින් හෝඩුවාවක් ගන්න හෝ නැවත උත්සාහ කරන්න!'}
                    </span>
                  </div>
                )}

                {/* Quick Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '2px',
                  }}
                >
                  <button
                    onClick={handleResetCurrentQuestion}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#CBD5E1',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 මෙම ප්‍රශ්නය මුලසිට
                  </button>

                  <button
                    onClick={handleRestartFullSession}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      color: '#38BDF8',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⏮️ ප්‍රශ්න 10 ම මුලසිට
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right Side: Standalone Pedagogical Companion Panel */}
        <PedagogicalCompanion
          interactive={false}
          hints={activeHintBoardHints}
          onHintRequest={handleHintRequest}
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
              zIndex: 20,
            }}
          >
            {/* Visual Tasks #19, #20 & #21 + Step 1, Step 2, Step 3 & Step 4 HUD */}
            <LearnerStateHUD
              learnerState={learnerState}
              bktComparison={bktComparison}
              fsmDecision={fsmDecision}
              isLoading={isStateLoading}
              cameraPermissionGranted={cameraPermissionGranted}
              cameraAttentionScore={cameraAttentionScore}
              onToggleCameraPermission={setCameraPermissionGranted}
              onChangeCameraScore={setCameraAttentionScore}
              elapsedDays={simulatedElapsedDays}
              onChangeElapsedDays={setSimulatedElapsedDays}
              onSimulateInattention={handleSimulateInattention}
              onSimulateFrustration={handleSimulateFrustration}
              onSimulateFocusedFlow={handleSimulateFocusedFlow}
              onSimulateHintAssisted={handleSimulateHintAssisted}
              onSimulateRapidAttentionSlip={handleSimulateRapidAttentionSlip}
              onTriggerFSMRule={triggerFSMContext}
            />

            {/* Raw Interaction Event Stream */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
              }}
            >
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10B981' }}>
                📊 Interaction Stream ({logs.length})
              </span>
              <button
                onClick={handleRestartFullSession}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset Session
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.78rem',
              }}
            >
              {logs
                .slice()
                .reverse()
                .map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderLeft:
                        evt.eventType === 'ANSWER_SUBMIT'
                          ? evt.isCorrect
                            ? '3px solid #10B981'
                            : '3px solid #EF4444'
                          : '3px solid #F59E0B',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#38BDF8',
                        fontWeight: 700,
                      }}
                    >
                      <span>
                        {evt.eventType} ({evt.questionId.replace('math_q_add_', 'Q')})
                      </span>
                      <span style={{ color: '#94A3B8', fontWeight: 400 }}>
                        {evt.responseTimeMs ? `${(evt.responseTimeMs / 1000).toFixed(2)}s` : ''}
                        {typeof evt.remainingTimeMs === 'number'
                          ? ` (Rem: ${Math.round(evt.remainingTimeMs / 1000)}s)`
                          : ''}
                      </span>
                    </div>
                    {evt.eventType === 'ANSWER_SUBMIT' && (
                      <div
                        style={{
                          marginTop: '2px',
                          color: evt.isCorrect ? '#4ADE80' : '#F87171',
                        }}
                      >
                        Answer: {evt.selectedAnswer} ({evt.isCorrect ? 'Correct' : 'Incorrect'}) |
                        Hint: L{evt.hintLevelReached}
                        {evt.cameraPermissionGranted
                          ? ` | 📷 Cam: ${Math.round((evt.cameraAttentionScore ?? 0.85) * 100)}%`
                          : ' | 🛡️ Cam: OFF'}
                      </div>
                    )}
                    {evt.eventType === 'HINT_REQUEST' && (
                      <div style={{ marginTop: '2px', color: '#FCD34D' }}>
                        Requested Level: L{evt.hintLevelReached} (Total hints:{' '}
                        {evt.totalHintsRequested})
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
              overflowY: 'auto',
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

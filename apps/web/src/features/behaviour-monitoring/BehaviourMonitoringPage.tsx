import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';

type SavedGameplayEvent = { eventId: string; sessionId: string; timestamp: string; eventType: string; stepOrder?: number; isCorrect?: boolean; selectedOption?: string };
type SavedGameplaySummary = { sessionId: string; activityId: string; updatedAt: number; events: SavedGameplayEvent[] };
const GAMEPLAY_SUMMARY_KEY = 'mathquest:gameplay-summary:v1';
function readGamePlayerSummary(): SavedGameplaySummary | null {
  try {
    const raw = sessionStorage.getItem(GAMEPLAY_SUMMARY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedGameplaySummary;
    return data && typeof data.sessionId === 'string' && Array.isArray(data.events) ? data : null;
  } catch { return null; }
}
type DeepFaceObservation = { at: number; dominant: string; scores: Record<string, number> };
const DEEPFACE_API = 'http://127.0.0.1:8010';
const deepfaceLabels: Record<string, string> = { happy: 'සතුටට සමාන ප්‍රකාශනය', angry: 'කෝපයට සමාන ප්‍රකාශනය', sad: 'දුකට සමාන ප්‍රකාශනය', surprise: 'පුදුමයට සමාන ප්‍රකාශනය', fear: 'බියට සමාන ප්‍රකාශනය', disgust: 'අප්‍රසාදයට සමාන ප්‍රකාශනය', neutral: 'මධ්‍යස්ථ ප්‍රකාශනය' };

type Stage = 'welcome' | 'camera' | 'game' | 'summary' | 'report';
type Observation = { at: number; face: boolean; yaw: number; quality: number; smile: number | null; browDown: number | null; browUp: number | null; blink: number | null; jawOpen: number | null; mouthPress: number | null; mouthFrown: number | null; expression: string };
type Answer = { question: number; correct: boolean; responseMs: number; choices: number; changes: number; changed: boolean; selectedValue: number };
type BehaviourEvent = { at: number; question: number; type: 'distraction' | 'hesitation' | 'impulsive' | 'inactivity' | 'fast' | 'repeated_wrong' | 'answer_changes'; evidence: string };
const STATE_THRESHOLDS = { headTurnMs: 5000, inactivityMs: 15000, hesitationMs: 15000, fastMs: 1500, impulsiveMs: 1200, repeatedWrong: 2, answerChanges: 2 };

const QUESTIONS = [
  { si: '5 + 3 = කීයද?', choices: [6, 8, 9], correct: 8 },
  { si: '12 - 4 = කීයද?', choices: [6, 8, 10], correct: 8 },
  { si: '3 × 4 = කීයද?', choices: [10, 12, 14], correct: 12 },
  { si: '9 + 6 = කීයද?', choices: [13, 15, 16], correct: 15 },
  { si: '20 - 7 = කීයද?', choices: [11, 12, 13], correct: 13 },
];
const expressionLabels: Record<string, string> = {
  smile: 'සිනහවක් පෙනීම',
  brow_down: 'ඇහිබැම පහළට චලනය',
  brow_up: 'ඇහිබැම ඉහළට එසවීම',
  eyes_closed: 'ඇස් පියවීම',
  mouth_open: 'මුඛය විවෘත කිරීම',
  anger_like: 'කෝපයට සමාන මුහුණේ චලන (පරීක්ෂණාත්මක)',
  boredom_like: 'කම්මැලිකමට සමාන හැසිරීම් රටාව (පරීක්ෂණාත්මක)',
  other: 'වෙනත් / පැහැදිලි චලනයක් නොමැත',
  no_face: 'මුහුණ නොපෙනේ',
};
function blendshapeScore(categories: { categoryName: string; score: number }[], name: string) {
  return categories.find(c => c.categoryName === name)?.score ?? 0;
}
function classifyExpression(v: { smile: number; browDown: number; browUp: number; blink: number; jawOpen: number; mouthPress: number; mouthFrown: number; possibleBoredom: boolean }) {
  // Demo-only thresholds: observable facial actions, not emotion diagnosis.
  // Exploratory patterns, NOT validated anger or boredom recognition.
  if (v.browDown > 0.40 && (v.mouthPress > 0.35 || v.mouthFrown > 0.35)) return 'anger_like';
  if (v.possibleBoredom) return 'boredom_like';
  if (v.blink > 0.65) return 'eyes_closed';
  if (v.smile > 0.45) return 'smile';
  if (v.jawOpen > 0.50) return 'mouth_open';
  if (v.browUp > 0.45) return 'brow_up';
  if (v.browDown > 0.45) return 'brow_down';
  return 'other';
}
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export default function BehaviourMonitoringPage() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [realGameplaySummary, setRealGameplaySummary] = useState<SavedGameplaySummary | null>(() => readGamePlayerSummary());
  const [deepfaceStatus, setDeepfaceStatus] = useState('ප්‍රකාශන විශ්ලේෂණය සම්බන්ධ කර නැත');
  const [deepfaceReport, setDeepfaceReport] = useState<DeepFaceObservation[]>([]);
  const [analysisRequests, setAnalysisRequests] = useState(0);
  const [analysisFailures, setAnalysisFailures] = useState(0);
  const deepfaceRef = useRef<DeepFaceObservation[]>([]);
  const deepfacePendingRef = useRef(false);
  const deepfaceLastRef = useRef(0);
  const deepfaceSessionRef = useRef('');
  const deepfaceActiveRef = useRef(false);
  const deepfaceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deepfaceErrorShownRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState('කැමරාව තවම සක්‍රීය කර නැත');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectionChanges, setSelectionChanges] = useState(0);
  const eventsRef = useRef<BehaviourEvent[]>([]);
  const lastInteractionRef = useRef(Date.now());
  const headTurnStartRef = useRef<number | null>(null);
  const headTurnReportedRef = useRef(false);
  const inactivityReportedRef = useRef(false);
  const hesitationReportedRef = useRef(false);
  const questionRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const quickWrongStreakRef = useRef(0);
  const lastSelectedRef = useRef<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sessionEnd, setSessionEnd] = useState(0);
  const [reportObservations, setReportObservations] = useState<Observation[]>([]);
  const [reportEvents, setReportEvents] = useState<BehaviourEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const questionStartRef = useRef(Date.now());
  const observationsRef = useRef<Observation[]>([]);
  const lastFrameRef = useRef(0);
  const stageRef = useRef<Stage>('welcome');
  const cameraRef = useRef(false);
  const sessionStartRef = useRef(0);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  function recordEvent(type: BehaviourEvent['type'], evidence: string, at = Date.now()) {
    const event: BehaviourEvent = { at, question: questionRef.current + 1, type, evidence };
    eventsRef.current.push(event);
  }
  function markInteraction() {
    lastInteractionRef.current = Date.now();
    inactivityReportedRef.current = false;
  }
  useEffect(() => { cameraRef.current = cameraEnabled; }, [cameraEnabled]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      if (stageRef.current !== 'game' || !sessionStartRef.current) return;
      if (!inactivityReportedRef.current && t - lastInteractionRef.current >= STATE_THRESHOLDS.inactivityMs) {
        recordEvent('inactivity', `${Math.round((t-lastInteractionRef.current)/1000)} seconds without gameplay interaction`, t);
        inactivityReportedRef.current = true;
      }
      if (!hesitationReportedRef.current && t - questionStartRef.current >= STATE_THRESHOLDS.hesitationMs && lastSelectedRef.current === null) {
        recordEvent('hesitation', 'No answer selected within 15 seconds of question start', t);
        hesitationReportedRef.current = true;
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  async function sendDeepfaceFrame(video: HTMLVideoElement) {
    if (deepfacePendingRef.current || !deepfaceActiveRef.current) return;
    const canvas = deepfaceCanvasRef.current ?? document.createElement('canvas');
    deepfaceCanvasRef.current = canvas;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL('image/jpeg', 0.65).split(',')[1];
    const currentSession = deepfaceSessionRef.current;
    deepfacePendingRef.current = true;
    setAnalysisRequests(n => n + 1);
    try {
      const response = await fetch(`${DEEPFACE_API}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession, imageBase64: encoded }),
      });
      if (!response.ok) { const details = await response.text(); throw new Error(`HTTP ${response.status}: ${details.slice(0, 180)}`); }
      const data: { faceDetected: boolean; dominant: string | null; scores: Record<string, number> | null } = await response.json();
      if (data.faceDetected && data.dominant && data.scores && deepfaceSessionRef.current === currentSession) {
        const observation = { at: Date.now(), dominant: data.dominant, scores: data.scores };
        deepfaceRef.current.push(observation);
        setDeepfaceReport([...deepfaceRef.current]);
        setDeepfaceStatus('ප්‍රකාශන දත්ත රැස් කරමින් පවතී');
      } else if (!data.faceDetected) {
        setDeepfaceStatus('ප්‍රකාශන විශ්ලේෂණයට මුහුණ හඳුනාගෙන නැත');
      }
    } catch (error) {
      if (!deepfaceErrorShownRef.current) console.warn('DeepFace API unavailable', error);
      setAnalysisFailures(n => n + 1);
      deepfaceErrorShownRef.current = true;
      setDeepfaceStatus(`ප්‍රකාශන සේවා දෝෂය: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      deepfacePendingRef.current = false;
    }
  }

  function stopCamera() {
    deepfaceActiveRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
    cameraRef.current = false;
    setFaceVisible(false);
  }
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); landmarkerRef.current?.close(); }, []);

  async function startCamera() {
    setCameraStatus('කැමරාව සූදානම් කරමින්...');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('මෙම බ්‍රවුසරයේ කැමරා පහසුකම නොමැත.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const vision = await FilesetResolver.forVisionTasks(  "/mediapipe/wasm");
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true });
      setCameraEnabled(true);
      cameraRef.current = true;
      setCameraStatus('කැමරාව සක්‍රීයයි');
      function detect() {
        const video = videoRef.current;
        const detector = landmarkerRef.current;
        if (!video || !detector || !streamRef.current) return;
        const ts = performance.now();
        if (stageRef.current === 'game' && deepfaceActiveRef.current && video.readyState >= 2 && ts - deepfaceLastRef.current >= 2500) {
          deepfaceLastRef.current = ts;
          void sendDeepfaceFrame(video);
        }
        if (video.readyState >= 2 && ts - lastFrameRef.current >= 300) {
          lastFrameRef.current = ts;
          try {
            const result = detector.detectForVideo(video, ts);
            const face = result.faceLandmarks[0];
            const visible = Boolean(face);
            setFaceVisible(visible);
            // Rough head symmetry proxy; NOT calibrated screen gaze or attention.
            const yaw = face ? Math.abs((face[1]?.x ?? .5) - ((face[234]?.x ?? .3) + (face[454]?.x ?? .7))/2) : 0;
            const quality = visible ? 1 : 0;
            // Sustained head turn is a visual cue, NOT proof of distraction.
            if (stageRef.current === 'game' && visible && yaw > 0.065) {
              if (headTurnStartRef.current === null) headTurnStartRef.current = Date.now();
              if (!headTurnReportedRef.current && Date.now() - headTurnStartRef.current >= STATE_THRESHOLDS.headTurnMs) {
                recordEvent('distraction', 'Head-position proxy exceeded threshold for 5 seconds');
                headTurnReportedRef.current = true;
              }
            } else {
              headTurnStartRef.current = null;
              headTurnReportedRef.current = false;
            }
            if (stageRef.current === 'game') {
              const categories = result.faceBlendshapes[0]?.categories ?? [];
              const values = {
                smile: (blendshapeScore(categories, 'mouthSmileLeft') + blendshapeScore(categories, 'mouthSmileRight')) / 2,
                browDown: (blendshapeScore(categories, 'browDownLeft') + blendshapeScore(categories, 'browDownRight')) / 2,
                browUp: blendshapeScore(categories, 'browInnerUp'),
                blink: (blendshapeScore(categories, 'eyeBlinkLeft') + blendshapeScore(categories, 'eyeBlinkRight')) / 2,
                jawOpen: blendshapeScore(categories, 'jawOpen'),
                mouthPress: (blendshapeScore(categories, 'mouthPressLeft') + blendshapeScore(categories, 'mouthPressRight')) / 2,
                mouthFrown: (blendshapeScore(categories, 'mouthFrownLeft') + blendshapeScore(categories, 'mouthFrownRight')) / 2,
              };
              const obs: Observation = {
                at: Date.now(), face: visible, yaw, quality,
                smile: visible ? values.smile : null, browDown: visible ? values.browDown : null,
                browUp: visible ? values.browUp : null, blink: visible ? values.blink : null,
                jawOpen: visible ? values.jawOpen : null,
                mouthPress: visible ? values.mouthPress : null,
                mouthFrown: visible ? values.mouthFrown : null,
                expression: visible ? classifyExpression({
                  ...values,
                  // Requires both a sustained absence of gameplay interaction
                  // and a head-position cue. Not an emotion diagnosis.
                  possibleBoredom: yaw > 0.065 && Date.now() - lastInteractionRef.current >= STATE_THRESHOLDS.inactivityMs,
                }) : 'no_face',
              };
              observationsRef.current.push(obs);
            }
          } catch (e) { console.warn('Face tracking frame failed', e); }
        }
        rafRef.current = requestAnimationFrame(detect);
      }
      rafRef.current = requestAnimationFrame(detect);
    } catch (e) {
      stopCamera();
      const message = e instanceof Error ? e.message : 'Unknown camera error';
      setCameraStatus(`කැමරාව සක්‍රීය කළ නොහැක: ${message}`);
    }
  }
  function begin() {
    const start = Date.now();
    deepfaceSessionRef.current = `mq_${start}`;
    deepfaceRef.current = [];
    setDeepfaceReport([]);
    setAnalysisRequests(0); setAnalysisFailures(0);
    deepfaceLastRef.current = 0;
    deepfaceErrorShownRef.current = false;
    deepfaceActiveRef.current = cameraRef.current;
    setDeepfaceStatus(cameraRef.current ? 'ප්‍රකාශන විශ්ලේෂණය ආරම්භ කරමින්...' : 'කැමරාව භාවිතා නොකෙරේ');
    sessionStartRef.current = start;
    setQuestionIndex(0); setSelected(null); setSelectionCount(0); setSelectionChanges(0); setAnswers([]);
    eventsRef.current = []; questionRef.current = 0;
    wrongStreakRef.current = 0; quickWrongStreakRef.current = 0;
    lastSelectedRef.current = null; lastInteractionRef.current = start;
    headTurnStartRef.current = null; headTurnReportedRef.current = false;
    inactivityReportedRef.current = false; hesitationReportedRef.current = false;
    observationsRef.current = [];
    questionStartRef.current = start; setStage('game');
  }
  function submit() {
    if (selected === null) return;
    const t = Date.now();
    const q = QUESTIONS[questionIndex];
    const responseMs = t - questionStartRef.current;
    const isCorrect = selected === q.correct;
    const row: Answer = { question: questionIndex + 1, correct: isCorrect, responseMs, choices: selectionCount, changes: selectionChanges, changed: selectionChanges > 0, selectedValue: selected };
    if (responseMs < STATE_THRESHOLDS.fastMs) recordEvent('fast', `Answer submitted in ${responseMs} ms`, t);
    if (selectionChanges >= STATE_THRESHOLDS.answerChanges) recordEvent('answer_changes', `${selectionChanges} distinct selection revisions`, t);
    if (!isCorrect) {
      wrongStreakRef.current += 1;
      quickWrongStreakRef.current = responseMs < STATE_THRESHOLDS.impulsiveMs ? quickWrongStreakRef.current + 1 : 0;
      if (wrongStreakRef.current >= STATE_THRESHOLDS.repeatedWrong) recordEvent('repeated_wrong', `${wrongStreakRef.current} consecutive incorrect questions (not retries on the same question)`, t);
      if (quickWrongStreakRef.current >= 2) recordEvent('impulsive', 'Two consecutive very fast incorrect submissions', t);
    } else { wrongStreakRef.current = 0; quickWrongStreakRef.current = 0; }
    setAnswers(prev => [...prev, row]); markInteraction();
    if (questionIndex + 1 === QUESTIONS.length) {
       setSessionEnd(t); setReportObservations([...observationsRef.current]); setReportEvents([...eventsRef.current]);
       setStage('summary'); stopCamera();
    } else {
      questionRef.current = questionIndex + 1;
      setQuestionIndex(i => i + 1); setSelected(null); setSelectionCount(0); setSelectionChanges(0);
      lastSelectedRef.current = null; inactivityReportedRef.current = false; hesitationReportedRef.current = false;
      questionStartRef.current = t;
    }
  }
function reset() { deepfaceActiveRef.current = false; deepfaceRef.current = []; setDeepfaceReport([]); stopCamera(); setStage('welcome'); setAnswers([]); eventsRef.current = []; observationsRef.current = []; setReportObservations([]); setReportEvents([]); setSessionEnd(0); }
  function exportReport() {
    const rows = [
      ['record_type', 'timestamp', 'question', 'event_type', 'evidence', 'face_visible', 'yaw', 'smile', 'brow_down', 'brow_up', 'eye_blink', 'jaw_open', 'mouth_press', 'mouth_frown', 'expression', 'correct', 'response_ms', 'answer_changes'],
      ...reportObservations.map(o => ['face', new Date(o.at).toISOString(), '', '', '', o.face, o.yaw, o.smile, o.browDown, o.browUp, o.blink, o.jawOpen, o.mouthPress, o.mouthFrown, o.expression, '', '', '']),
      ...deepfaceReport.map(o => ['deepface', new Date(o.at).toISOString(), '', o.dominant, JSON.stringify(o.scores), '', '', '', '', '', '', '', '', '', '', '', '', '']),
      ...reportEvents.map(e => ['behaviour', new Date(e.at).toISOString(), e.question, e.type, e.evidence, '', '', '', '', '', '', '', '', '', '', '', '', '']),
      ...answers.map(a => ['answer', '', a.question, '', '', '', '', '', '', '', '', '', '', '', '', a.correct, a.responseMs, a.changes]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `mathquest-session-${sessionStartRef.current}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visibleObservations = reportObservations.filter(o => o.face);
  const expressionCounts = Object.keys(expressionLabels).filter(k => k !== 'no_face').map(key => ({
    key, label: expressionLabels[key], count: visibleObservations.filter(o => o.expression === key).length,
    percentage: visibleObservations.length ? Math.round(visibleObservations.filter(o => o.expression === key).length / visibleObservations.length * 100) : 0,
  }));
  // Experimental task-engagement proxies, not emotion or attention diagnoses.
  // These are session-level evidence flags, not per-frame emotion classifications.
  const distractionEvents = reportEvents.filter(e => e.type === 'distraction').length;
  const inactivityEvents = reportEvents.filter(e => e.type === 'inactivity').length;
  const hesitationEvents = reportEvents.filter(e => e.type === 'hesitation').length;
  const offscreenSamples = visibleObservations.filter(o => o.yaw > 0.065).length;
  const offscreenRatio = visibleObservations.length ? offscreenSamples / visibleObservations.length : 0;
  const taskEngagementIndicators = [
    {
      key: 'distraction_like', label: 'අවධානය වෙනතකට යොමුවීමේ සංඥා',
      detected: distractionEvents > 0 || (offscreenRatio >= 0.30 && inactivityEvents > 0),
      evidence: `දිගු හිස හැරීම්: ${distractionEvents} | තිරයෙන් ඉවතට හැරුණු නියැදි: ${offscreenSamples}/${visibleObservations.length}`,
      available: visibleObservations.length > 0,
    },
    {
      key: 'boredom_like', label: 'කම්මැලිකමට සමාන හැසිරීම් රටාව (පරීක්ෂණාත්මක)',
      detected: inactivityEvents > 0 && (distractionEvents > 0 || offscreenRatio >= 0.30),
      evidence: `ක්‍රීඩා අක්‍රියතා සිදුවීම්: ${inactivityEvents} | දිගු හිස හැරීම්: ${distractionEvents}`,
      available: visibleObservations.length > 0,
    },
    {
      key: 'concentration_like', label: 'කාර්යයට යොමු වූ හැසිරීම් රටාව (පරීක්ෂණාත්මක)',
      detected: visibleObservations.length >= 10 && offscreenRatio <= 0.20 && inactivityEvents === 0 && answers.length >= 2,
      evidence: `තිරයට මුහුණලා සිටි නියැදි: ${visibleObservations.length - offscreenSamples}/${visibleObservations.length} | පිළිතුරු: ${answers.length} | ප්‍රමාද සංඥා: ${hesitationEvents}`,
      available: visibleObservations.length >= 10 && answers.length >= 2,
    },
  ];
  const behaviourKeys: BehaviourEvent['type'][] = ['distraction', 'hesitation', 'impulsive', 'inactivity', 'fast', 'repeated_wrong', 'answer_changes'];
  const behaviourNames: Record<BehaviourEvent['type'], string> = {
    distraction: 'හිස හැරීමේ සංඥා', hesitation: 'පිළිතුරු ප්‍රමාදය', impulsive: 'ඉතා ඉක්මන් වැරදි පිළිතුරු',
    inactivity: 'ක්‍රීඩා අක්‍රියතාව', fast: 'ඉක්මන් පිළිතුරු', repeated_wrong: 'අඛණ්ඩ වැරදි පිළිතුරු', answer_changes: 'නැවත පිළිතුරු වෙනස් කිරීම',
  };
  const correctCount = answers.filter(a => a.correct).length;
  const averageResponse = answers.length ? Math.round(answers.reduce((sum, a) => sum + a.responseMs, 0) / answers.length / 1000) : 0;
  const totalChanges = answers.reduce((sum, a) => sum + a.changes, 0);
  const realEvents = realGameplaySummary?.events ?? [];
  const countReal = (kind: string) => realEvents.filter(e => e.eventType === kind).length;
  const realSteps = [...new Set(realEvents.map(e => e.stepOrder).filter((n): n is number => typeof n === 'number'))].sort((a, b) => a - b);

  const sessionDuration = sessionEnd && sessionStartRef.current ? Math.round((sessionEnd - sessionStartRef.current) / 1000) : 0;
  return <div className="min-h-screen bg-mq-bg text-mq-text px-4 py-8">
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-8"><div><div className="text-2xl font-extrabold"><span className="text-mq-primary-dark">Math</span><span className="text-mq-secondary">Quest</span></div><p className="text-sm text-mq-text-muted sinhala">ගණිත ක්‍රීඩා</p></div><span className="badge">{stage === 'welcome' ? '1 / 5' : stage === 'camera' ? '2 / 5' : stage === 'game' ? '3 / 5' : stage === 'summary' ? '4 / 5' : '5 / 5'}</span></header>
      {stage === 'welcome' && <section className="bg-white rounded-3xl border border-mq-border p-8 md:p-12 text-center shadow-[var(--mq-shadow-md)]"><div className="text-6xl mb-5">🌟</div><h1 className="sinhala text-3xl mb-4">MathQuest වෙත සාදරයෙන් පිළිගනිමු!</h1><p className="sinhala text-mq-text-muted mb-5">අපි ගණිත ප්‍රශ්න කිහිපයක් විසඳමු. පළමුව කැමරාව සූදානම් කරගනිමු.</p><p className="text-sm text-mq-text-muted mb-8">Camera use is optional. With permission, selected camera frames are processed by a local facial-expression analysis service. Frames are not saved; numerical analysis results are stored locally.</p><button className="btn btn-primary" onClick={() => setStage('camera')}>ඉදිරියට <ArrowRight size={18}/></button></section>}
      {(stage === 'camera' || stage === 'game') && <div className={stage === 'camera' ? 'max-w-3xl mx-auto' : 'hidden'}><section className="bg-white rounded-3xl border border-mq-border p-7 shadow-[var(--mq-shadow-sm)]"><h1 className="sinhala text-2xl mb-2">📷 කැමරාව සූදානම් කරමු</h1><p className="sinhala text-mq-text-muted mb-4">මුහුණ කැමරාවට පෙනෙන ලෙස වාඩිවන්න. කැමරාව භාවිතා කිරීමට අවසර දෙන්න.</p><div className="bg-mq-surface-soft rounded-2xl overflow-hidden relative aspect-video mb-4"><video ref={videoRef} muted playsInline autoPlay className="w-full h-full object-cover scale-x-[-1]"/><span className="absolute bottom-3 left-3 badge">{cameraEnabled ? (faceVisible ? 'මුහුණ හඳුනාගෙන ඇත ✓' : 'මුහුණ හමු නොවීය') : 'Camera off'}</span></div><p role="status" className="text-sm text-mq-text-muted mb-4">{cameraStatus}</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={() => void startCamera()} disabled={cameraEnabled}><Camera size={18}/> කැමරාව ක්‍රියාත්මක කරන්න</button><button className="btn btn-secondary" onClick={begin}> {cameraEnabled ? 'ක්‍රීඩාව ආරම්භ කරන්න' : 'කැමරාව නොමැතිව ඉදිරියට'} <ArrowRight size={18}/></button></div><p className="text-xs text-mq-text-muted mt-4">This is face positioning, not validated gaze calibration. No identity recognition is performed.</p></section></div>}
             {stage === 'game' && (
         <section className="max-w-3xl mx-auto">
           <div className="flex justify-between items-center mb-4">
             <span className="badge sinhala">ප්‍රශ්නය {questionIndex + 1} / {QUESTIONS.length}</span>
           </div>
           <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[var(--mq-shadow-md)] border border-mq-border text-center">
             <div className="text-5xl mb-6" aria-hidden="true">🧩</div>
             <h1 className="sinhala text-3xl mb-8">{QUESTIONS[questionIndex].si}</h1>
             <div className="grid grid-cols-3 gap-3 mb-8">
               {QUESTIONS[questionIndex].choices.map(choice => (
                 <button key={choice} type="button" onClick={() => {
                   if (lastSelectedRef.current !== null && lastSelectedRef.current !== choice) setSelectionChanges(n => n + 1);
                   lastSelectedRef.current = choice;
                   setSelected(choice);
                   setSelectionCount(n => n + 1);
                   markInteraction();
                 }} className={`rounded-3xl border-2 py-7 text-3xl font-extrabold transition ${selected === choice ? 'bg-mq-surface-blue border-mq-primary text-mq-primary-dark' : 'bg-white border-mq-border hover:border-mq-primary'}`}>
                   {choice}
                 </button>
               ))}
             </div>
             <button type="button" className="btn btn-primary" disabled={selected === null} onClick={submit}>
               පිළිතුර යොමු කරන්න <ArrowRight size={18}/>
             </button>
             <p className="sinhala text-mq-text-muted text-sm mt-6">හොඳින් සිතා පිළිතුරු දෙන්න. ඉක්මන් වීමට අවශ්‍ය නැහැ.</p>
           </div>
         </section>
       )}
       {stage === 'summary' && (
         <section className="max-w-2xl mx-auto bg-white rounded-3xl border border-mq-border p-8 md:p-12 text-center shadow-[var(--mq-shadow-md)]">
           <CheckCircle2 className="mx-auto text-mq-success mb-4" size={52}/>
           <div className="text-6xl mb-4" aria-hidden="true">🌟</div>
           <h1 className="sinhala text-3xl mb-4">ක්‍රීඩාව අවසන්! ඉතා හොඳයි!</h1>
           <p className="sinhala text-lg text-mq-text-muted mb-7">ඔබ ප්‍රශ්න {QUESTIONS.length} ක් සම්පූර්ණ කළා!</p>
           <div className="flex justify-center gap-2 text-4xl mb-8" aria-label="Well done">⭐ ⭐ ⭐</div>
           <div className="flex flex-wrap justify-center gap-3">
             <button type="button" className="btn btn-primary" onClick={reset}><RotateCcw size={18}/> නැවත ක්‍රීඩා කරන්න</button>
             <button type="button" className="btn btn-secondary" onClick={() => setStage('report')}>සැසි සාරාංශය බලන්න <ArrowRight size={18}/></button>
           </div>
         </section>
       )}
       {stage === 'report' && (
         <section className="max-w-4xl mx-auto space-y-5 sinhala">
           <div className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
             <h1 className="text-2xl font-bold mb-2">සැසි සාරාංශය</h1>
             <p className="text-sm text-mq-text-muted mb-5">මෙම සැසිය තුළ සැබෑ ලෙස රැස් කළ දත්ත පමණි. මුහුණේ චලන සහ ක්‍රීඩා අක්‍රියතාව මත පදනම් වූ පරීක්ෂණාත්මක දර්ශක පමණි. සැබෑ හැඟීම් තහවුරු කළ නොහැක.</p>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {[
                 ['පිළිතුරු දුන් ප්‍රශ්න', String(answers.length)],
                 ['නිවැරදි පිළිතුරු', `${correctCount} / ${answers.length}`],
                 ['සාමාන්‍ය පිළිතුරු කාලය', `${averageResponse} තත්පර`],
                 ['ක්‍රීඩා කාලය', `${Math.floor(sessionDuration / 60)} මිනිත්තු ${sessionDuration % 60} තත්පර`],
               ].map(([label, value]) => <div key={label} className="bg-mq-surface-soft rounded-xl p-4"><p className="text-sm text-mq-text-muted">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}
             </div>
           </div>
           <div className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
             <h2 className="text-xl font-bold mb-4">මුහුණේ ප්‍රකාශන සාරාංශය</h2>
             <p className="text-sm text-mq-text-muted mb-4">කැමරා මිනුම්: {reportObservations.length} | මුහුණ හඳුනාගත් මිනුම්: {visibleObservations.length} | සාර්ථක ප්‍රකාශන වර්ගීකරණ නියැදි: {deepfaceReport.length}</p>
             {deepfaceReport.length === 0 && <p className="text-sm text-amber-700 mb-4">ප්‍රකාශන වර්ගීකරණ දත්ත නොමැත. {deepfaceStatus} — ප්‍රකාශන සඳහා 0% යනු ප්‍රකාශනය නොතිබුණු බව නොවේ.</p>}
             <p className="text-xs text-mq-text-muted mb-4">ප්‍රකාශන විශ්ලේෂණ ඉල්ලීම්: {analysisRequests} | දෝෂ: {analysisFailures} | සාර්ථක නියැදි: {deepfaceReport.length}</p>
             <h3 className="font-semibold mb-2">ප්‍රකාශන වර්ගීකරණය</h3>
             <p className="text-xs text-mq-text-muted mb-3">සමස්ත මුහුණේ ප්‍රකාශන පිළිබඳ ආකෘති අනාවැකි (නියැදි: {deepfaceReport.length})</p>
             <div className="space-y-3 mb-6">
               {Object.entries(deepfaceLabels).map(([key, label]) => {
                 const count = deepfaceReport.filter(o => o.dominant === key).length;
                 const percentage = deepfaceReport.length ? Math.round(count / deepfaceReport.length * 100) : 0;
                 return <div key={key}>
                   <div className="flex justify-between gap-2 text-sm mb-1"><span>{label}</span><span>{deepfaceReport.length ? `${percentage}% (${count})` : 'දත්ත නොමැත'}</span></div>
                   <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${percentage}%` }}/></div>
                 </div>;
               })}
             </div>
             <h3 className="font-semibold mb-2">මුහුණේ චලන නිරීක්ෂණ</h3>
             <p className="text-xs text-mq-text-muted mb-3">සිනහව, ඇහිබැම, ඇස් සහ මුඛ චලන (නියැදි: {visibleObservations.length})</p>
             <div className="space-y-3 mb-6">
               {expressionCounts.filter(item => ['smile', 'brow_down', 'brow_up', 'eyes_closed', 'mouth_open', 'other'].includes(item.key)).map(item => <div key={item.key}>
                 <div className="flex justify-between gap-2 text-sm mb-1"><span>{item.label}</span><span>{visibleObservations.length ? `${item.percentage}% (${item.count})` : 'දත්ත නොමැත'}</span></div>
                 <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${item.percentage}%` }}/></div>
               </div>)}
             </div>
             <h3 className="font-semibold mb-2">ඉගෙනුම් හැසිරීම් සංඥා</h3>
             <p className="text-xs text-mq-text-muted mb-3">මුහුණේ දිශාව සහ ක්‍රීඩා අන්තර්ක්‍රියා එකට සලකා බැලූ පරීක්ෂණාත්මක දර්ශක</p>
             <div className="grid grid-cols-1 gap-3">
               {taskEngagementIndicators.map(item => <div key={item.key} className="rounded-xl bg-mq-surface-soft p-4">
                 <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>{item.label}</strong><span className="font-semibold">{!item.available ? 'ප්‍රමාණවත් දත්ත නොමැත' : item.detected ? 'සංඥා හමු විය' : 'සංඥා හමු නොවීය'}</span></div>
                 <p className="text-xs text-mq-text-muted mt-2">{item.evidence}</p>
               </div>)}
             </div>
             <p className="text-xs text-mq-text-muted mt-4">ප්‍රකාශන වර්ගීකරණ ප්‍රතිශත සාර්ථක ආකෘති නියැදි මත ගණනය වේ. මුහුණේ චලන ප්‍රතිශත මුහුණ හඳුනාගත් කැමරා මිනුම් මත ගණනය වේ. ඒවා වෙනස් මිනුම් වර්ග බැවින් එකතු කර 100% නොවිය හැක. මෙම ප්‍රතිඵල සැබෑ හැඟීම් තහවුරු නොකරයි. කම්මැලිකම, අවධානය වෙනතකට යොමුවීම සහ කාර්යයට යොමුවීම පිළිබඳ දර්ශක පරීක්ෂණාත්මකය. ඒවා දරුවාගේ සැබෑ මානසික තත්ත්වය හෝ ADHD තහවුරු නොකරයි.</p>
           </div>
           <div className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
             <h2 className="text-xl font-bold mb-4">හැසිරීම් සංඥා</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{behaviourKeys.map(key => <div key={key} className="bg-mq-surface-soft rounded-xl p-4 flex justify-between gap-3"><span>{behaviourNames[key]}</span><strong>{reportEvents.filter(e => e.type === key).length}</strong></div>)}</div>
             <p className="text-xs text-mq-text-muted mt-3">මෙම සංඥා නිරීක්ෂණ පමණි; ADHD හෝ අවධානය පිළිබඳ රෝග නිර්ණය නොවේ.</p>
           </div>
           <div className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
             <h2 className="text-xl font-bold mb-4">ක්‍රීඩා අන්තර්ක්‍රියා</h2>
             <p className="text-sm text-mq-text-muted mb-4">පිළිතුරු විකල්ප තෝරාගැනීමේ ක්ලික් කිරීම් සහ පිළිතුරු යොමු කිරීම් පමණක් මෙහි ගණනය කර ඇත.</p>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
               {[
                 ['විකල්ප තේරීම් ක්ලික්', answers.reduce((sum, a) => sum + a.choices, 0)],
                 ['පිළිතුරු යොමු කිරීම්', answers.length],
                 ['මුළු පිළිතුරු අන්තර්ක්‍රියා', answers.reduce((sum, a) => sum + a.choices, 0) + answers.length],
                 ['පිළිතුරු වෙනස් කිරීම්', totalChanges],
               ].map(([label, value]) => <div key={label} className="bg-mq-surface-soft rounded-xl p-4"><p className="text-sm text-mq-text-muted">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}
             </div>
             <h3 className="font-semibold mb-3">ප්‍රශ්න අනුව ක්‍රීඩා අන්තර්ක්‍රියා</h3>
             <div className="space-y-2">{answers.map(a => <div key={a.question} className="flex flex-wrap justify-between gap-3 bg-mq-surface-soft rounded-xl p-3 text-sm"><span>ප්‍රශ්නය {a.question}</span><span>{a.correct ? 'නිවැරදි' : 'වැරදි'}</span><span>විකල්ප ක්ලික්: {a.choices}</span><span>වෙනස් කිරීම්: {a.changes}</span><span>ප්‍රතිචාර කාලය: {(a.responseMs / 1000).toFixed(1)} තත්පර</span></div>)}</div>
           </div>
            <div className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <h2 className="text-xl font-bold">සැබෑ ක්‍රීඩා අන්තර්ක්‍රියා දත්ත</h2>
                <button type="button" className="btn btn-secondary" onClick={() => setRealGameplaySummary(readGamePlayerSummary())}>දත්ත යාවත්කාලීන කරන්න</button>
              </div>
              <p className="text-sm text-mq-text-muted mb-4">මෙහි පෙන්වන්නේ GamePlayer තුළ පවතින gameplay tracker මගින් රැස් කළ වෙනම සැසියක දත්තයි. ඉහත ප්‍රශ්න 5ක ආදර්ශ ක්‍රීඩාවේ දත්ත සමඟ එකතු කර නැත.</p>
              {realGameplaySummary && realEvents.length ? <>
                <p className="text-xs text-mq-text-muted mb-4">ක්‍රියාකාරකම: {realGameplaySummary.activityId} | සැසි අංකය: {realGameplaySummary.sessionId}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {([
                    ['මුළු ක්ලික්', countReal('click')],
                    ['පිළිතුරු තේරීම්', countReal('answer_select')],
                    ['පිළිතුරු වෙනස් කිරීම්', countReal('answer_change')],
                    ['පිළිතුරු යොමු කිරීම්', countReal('answer_submit')],
                    ['වැරදි යොමු කිරීම්', realEvents.filter(e => e.eventType === 'answer_submit' && e.isCorrect === false).length],
                    ['විරාම', countReal('pause_detected')],
                    ['අක්‍රියතාව අවසන් වීම්', countReal('inactivity_end')],
                    ['ස්පර්ශ', countReal('touch_start')],
                  ] as [string, number][]).map(([label, value]) => <div key={label} className="bg-mq-surface-soft rounded-xl p-4"><p className="text-sm text-mq-text-muted">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}
                </div>
                <h3 className="font-semibold mb-3">පියවර අනුව ක්‍රීඩා අන්තර්ක්‍රියා</h3>
                <div className="space-y-2">{realSteps.map(stepNo => {
                  const events = realEvents.filter(e => e.stepOrder === stepNo);
                  return <div key={stepNo} className="bg-mq-surface-soft rounded-xl p-3 text-sm flex flex-wrap gap-4">
                    <strong>පියවර {stepNo}</strong><span>ක්ලික්: {events.filter(e => e.eventType === 'click').length}</span>
                    <span>තේරීම්: {events.filter(e => e.eventType === 'answer_select').length}</span>
                    <span>වෙනස් කිරීම්: {events.filter(e => e.eventType === 'answer_change').length}</span>
                    <span>වැරදි උත්සාහ: {events.filter(e => e.eventType === 'answer_submit' && e.isCorrect === false).length}</span>
                  </div>;
                })}</div>
              </> : <p className="text-sm text-amber-700">මෙම බ්‍රවුසර ටැබය තුළ GamePlayer දත්ත තවම නැත. පළමුව GamePlayer ක්‍රීඩාවක් කරන්න, ඉන්පසු මෙම පිටුවට පැමිණ දත්ත යාවත්කාලීන කරන්න.</p>}
            </div>
           <div className="flex flex-wrap gap-3"><button className="btn btn-primary" type="button" onClick={exportReport}>CSV දත්ත බාගන්න</button><button className="btn btn-secondary" type="button" onClick={reset}><RotateCcw size={18}/> නැවත ක්‍රීඩා කරන්න</button></div>
           <p className="text-xs text-mq-text-muted">ක්‍රීඩා දත්ත මෙම පිටුවේ තාවකාලිකව පවතී. මුහුණේ ප්‍රකාශන විශ්ලේෂණ ලකුණු ප්‍රාදේශීය සේවාවේ JSONL ගොනුවක ගබඩා වේ. MongoDB තවම සම්බන්ධ කර නොමැත.</p>
         </section>
       )}
     </div>
   </div>;
}

import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, CheckCircle2, ArrowRight, RotateCcw, Download } from 'lucide-react';

type Stage = 'welcome' | 'camera' | 'game' | 'summary';
type Observation = { at: number; face: boolean; yaw: number; quality: number };
type Answer = { question: number; correct: boolean; responseMs: number; choices: number; changes: number; changed: boolean; selectedValue: number };
type BehaviourEvent = { at: number; question: number; type: 'distraction' | 'hesitation' | 'impulsive' | 'inactivity' | 'fast' | 'repeated_wrong' | 'answer_changes'; evidence: string };
const STATE_KEYS: BehaviourEvent['type'][] = ['distraction','hesitation','impulsive','inactivity','fast','repeated_wrong','answer_changes'];
const STATE_THRESHOLDS = { headTurnMs: 5000, inactivityMs: 15000, hesitationMs: 15000, fastMs: 1500, impulsiveMs: 1200, repeatedWrong: 2, answerChanges: 2 };

const QUESTIONS = [
  { si: '5 + 3 = කීයද?', choices: [6, 8, 9], correct: 8 },
  { si: '12 - 4 = කීයද?', choices: [6, 8, 10], correct: 8 },
  { si: '3 × 4 = කීයද?', choices: [10, 12, 14], correct: 12 },
  { si: '9 + 6 = කීයද?', choices: [13, 15, 16], correct: 15 },
  { si: '20 - 7 = කීයද?', choices: [11, 12, 13], correct: 13 },
];
const STATES = ['අවධානය වෙනතකට යොමුවීම', 'පිළිතුරු දීමට පැකිලීම', 'හදිසි ප්‍රතිචාර', 'දිගු විරාමය', 'ඉතා වේගවත් පිළිතුරු', 'නැවත නැවත වැරදි පිළිතුරු', 'පිළිතුරු වෙනස් කිරීම'];
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export default function BehaviourMonitoringPage() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [cameraStatus, setCameraStatus] = useState('කැමරාව තවම සක්‍රීය කර නැත');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectionChanges, setSelectionChanges] = useState(0);
  const [events, setEvents] = useState<BehaviourEvent[]>([]);
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
  const [sessionStarted, setSessionStarted] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(0);
  const [observations, setObservations] = useState<Observation[]>([]);
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
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  function recordEvent(type: BehaviourEvent['type'], evidence: string, at = Date.now()) {
    const event: BehaviourEvent = { at, question: questionRef.current + 1, type, evidence };
    eventsRef.current.push(event);
    setEvents([...eventsRef.current]);
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
      setElapsed(Math.floor((t - sessionStartRef.current) / 1000));
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

  function stopCamera() {
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
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 1 });
      setCameraEnabled(true);
      cameraRef.current = true;
      setCameraStatus('කැමරාව සක්‍රීයයි');
      function detect() {
        const video = videoRef.current;
        const detector = landmarkerRef.current;
        if (!video || !detector || !streamRef.current) return;
        const ts = performance.now();
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
              const obs = { at: Date.now(), face: visible, yaw, quality };
              observationsRef.current.push(obs);
              if (observationsRef.current.length > 2000) observationsRef.current.shift();
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
    sessionStartRef.current = start;
    setSessionStarted(start); setSessionEnded(0); setElapsed(0);
    setQuestionIndex(0); setSelected(null); setSelectionCount(0); setSelectionChanges(0); setAnswers([]);
    setEvents([]); eventsRef.current = []; questionRef.current = 0;
    wrongStreakRef.current = 0; quickWrongStreakRef.current = 0;
    lastSelectedRef.current = null; lastInteractionRef.current = start;
    headTurnStartRef.current = null; headTurnReportedRef.current = false;
    inactivityReportedRef.current = false; hesitationReportedRef.current = false;
    observationsRef.current = []; setObservations([]);
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
      setSessionEnded(t); setObservations([...observationsRef.current]); setStage('summary'); stopCamera();
    } else {
      questionRef.current = questionIndex + 1;
      setQuestionIndex(i => i + 1); setSelected(null); setSelectionCount(0); setSelectionChanges(0);
      lastSelectedRef.current = null; inactivityReportedRef.current = false; hesitationReportedRef.current = false;
      questionStartRef.current = t;
    }
  }
  function reset() { stopCamera(); setStage('welcome'); setAnswers([]); setEvents([]); eventsRef.current = []; setObservations([]); observationsRef.current = []; }
  const correct = answers.filter(a => a.correct).length;
  const wrong = answers.length - correct;
  const avgMs = answers.length ? Math.round(answers.reduce((s,a) => s+a.responseMs,0)/answers.length) : 0;
  const faceRatio = observations.length ? observations.filter(o => o.face).length / observations.length : null;
  const turnedRatio = observations.length ? observations.filter(o => o.face && o.yaw > 0.065).length / observations.length : null;
  const eventCounts = STATE_KEYS.map(key => events.filter(event => event.type === key).length);
  const flags = eventCounts.map(count => count > 0);
  const liveFlags = STATE_KEYS.map(key => events.filter(event => event.type === key).length);
  const download = () => {
    const report = { disclaimer: 'Experimental rule-based indicators, not validated behaviour diagnoses', sessionStarted, sessionEnded, cameraSampleCount: observations.length, facePresenceRatio: faceRatio, headTurnProxyRatio: turnedRatio, answers, events, thresholds: STATE_THRESHOLDS, indicators: STATES.map((label,i) => ({ key: STATE_KEYS[i], label, flagged: flags[i], eventCount: eventCounts[i] })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href=url; a.download=`mathquest-component4-${sessionStarted}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="min-h-screen bg-mq-bg text-mq-text px-4 py-8">
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-8"><div><div className="text-2xl font-extrabold"><span className="text-mq-primary-dark">Math</span><span className="text-mq-secondary">Quest</span></div><p className="text-sm text-mq-text-muted">Component 4 · Standalone Behaviour Monitoring</p></div><span className="badge">{stage === 'welcome' ? '1 / 4' : stage === 'camera' ? '2 / 4' : stage === 'game' ? '3 / 4' : '4 / 4'}</span></header>
      {stage === 'welcome' && <section className="bg-white rounded-3xl border border-mq-border p-8 md:p-12 text-center shadow-[var(--mq-shadow-md)]"><div className="text-6xl mb-5">🌟</div><h1 className="sinhala text-3xl mb-4">MathQuest වෙත සාදරයෙන් පිළිගනිමු!</h1><p className="sinhala text-mq-text-muted mb-5">අපි ගණිත ප්‍රශ්න කිහිපයක් විසඳමු. පළමුව කැමරාව සූදානම් කරගනිමු.</p><p className="text-sm text-mq-text-muted mb-8">Camera use is optional. Only numerical face-presence and head-position measurements are collected in this prototype; video is not recorded or uploaded.</p><button className="btn btn-primary" onClick={() => setStage('camera')}>ඉදිරියට <ArrowRight size={18}/></button></section>}
      {(stage === 'camera' || stage === 'game') && <div className={stage === 'camera' ? 'max-w-3xl mx-auto' : 'hidden'}><section className="bg-white rounded-3xl border border-mq-border p-7 shadow-[var(--mq-shadow-sm)]"><h1 className="sinhala text-2xl mb-2">📷 කැමරාව සූදානම් කරමු</h1><p className="sinhala text-mq-text-muted mb-4">මුහුණ කැමරාවට පෙනෙන ලෙස වාඩිවන්න. කැමරාව භාවිතා කිරීමට අවසර දෙන්න.</p><div className="bg-mq-surface-soft rounded-2xl overflow-hidden relative aspect-video mb-4"><video ref={videoRef} muted playsInline autoPlay className="w-full h-full object-cover scale-x-[-1]"/><span className="absolute bottom-3 left-3 badge">{cameraEnabled ? (faceVisible ? 'මුහුණ හඳුනාගෙන ඇත ✓' : 'මුහුණ හමු නොවීය') : 'Camera off'}</span></div><p role="status" className="text-sm text-mq-text-muted mb-4">{cameraStatus}</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={() => void startCamera()} disabled={cameraEnabled}><Camera size={18}/> කැමරාව ක්‍රියාත්මක කරන්න</button><button className="btn btn-secondary" onClick={begin}> {cameraEnabled ? 'ක්‍රීඩාව ආරම්භ කරන්න' : 'කැමරාව නොමැතිව ඉදිරියට'} <ArrowRight size={18}/></button></div><p className="text-xs text-mq-text-muted mt-4">This is face positioning, not validated gaze calibration. No identity recognition is performed.</p></section></div>}
      {stage === 'game' && <section className="max-w-3xl mx-auto"><div className="flex justify-between items-center mb-4"><span className="badge">ප්‍රශ්නය {questionIndex+1} / {QUESTIONS.length}</span><span className="badge">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')} · {cameraEnabled ? (faceVisible ? '📷 ✓' : '📷 …') : 'Camera off'}</span></div><div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[var(--mq-shadow-md)] border border-mq-border text-center"><div className="text-5xl mb-6">🧩</div><h1 className="sinhala text-3xl mb-8">{QUESTIONS[questionIndex].si}</h1><div className="grid grid-cols-3 gap-3 mb-8">{QUESTIONS[questionIndex].choices.map(choice => <button key={choice} onClick={() => { if (lastSelectedRef.current !== null && lastSelectedRef.current !== choice) setSelectionChanges(n => n+1); lastSelectedRef.current = choice; setSelected(choice); setSelectionCount(n => n+1); markInteraction(); }} className={`rounded-3xl border-2 py-7 text-3xl font-extrabold transition ${selected===choice ? 'bg-mq-surface-blue border-mq-primary text-mq-primary-dark' : 'bg-white border-mq-border hover:border-mq-primary'}`}>{choice}</button>)}</div><button className="btn btn-primary" disabled={selected===null} onClick={submit}>පිළිතුර යොමු කරන්න <ArrowRight size={18}/></button><p className="sinhala text-mq-text-muted text-sm mt-6">හොඳින් සිතා පිළිතුරු දෙන්න. ඉක්මන් වීමට අවශ්‍ය නැහැ.</p></div><div className="bg-white rounded-2xl border border-mq-border p-4 mt-4"><p className="text-sm font-bold mb-2">Live behaviour indicators (experimental)</p><div className="flex flex-wrap gap-2">{STATES.map((name, i) => <span key={name} className={`badge ${liveFlags[i] ? 'text-mq-warning' : ''}`}>{name}: {liveFlags[i]}</span>)}</div><p className="text-xs text-mq-text-muted mt-2">Counts are tentative rule-based events, not diagnoses. Face absence is not treated as distraction.</p></div><p className="text-center text-xs text-mq-text-muted mt-5">Tracking runs in the background. Camera signals are experimental and not proof of attention.</p></section>}
      {stage === 'summary' && <section className="space-y-5"><div className="bg-white rounded-3xl border border-mq-border p-8 text-center"><CheckCircle2 className="mx-auto text-mq-success mb-3" size={44}/><h1 className="sinhala text-3xl mb-2">ක්‍රීඩාව අවසන්! ඉතා හොඳයි!</h1><p className="text-mq-text-muted">Session analytics · Component 4 prototype</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[['නිවැරදි පිළිතුරු', `${correct}/${answers.length}`],['වැරදි පිළිතුරු', String(wrong)],['සාමාන්‍ය පිළිතුරු කාලය', `${(avgMs/1000).toFixed(1)}s`],['කැමරාවෙන් මුහුණ පෙනුණු ප්‍රමාණය', faceRatio === null ? 'N/A' : `${Math.round(faceRatio*100)}%`]].map(([label,value])=><div key={label} className="bg-white border border-mq-border rounded-3xl p-5"><p className="sinhala text-sm text-mq-text-muted">{label}</p><p className="text-3xl font-extrabold text-mq-primary-dark mt-2">{value}</p></div>)}</div><div className="bg-white border border-mq-border rounded-3xl p-6"><h2 className="font-extrabold text-xl mb-2">Experimental behaviour indicators</h2><p className="text-sm text-mq-text-muted mb-4">Rule-based demonstrations only. These are not trained ML predictions, ADHD diagnoses, or reliable measures of attention.</p><div className="grid md:grid-cols-2 gap-3">{STATES.map((s,i)=><div key={s} className="flex justify-between gap-3 border border-mq-border rounded-2xl p-3"><span className="sinhala">{s}</span><span className={`badge ${flags[i] ? 'text-mq-warning' : 'text-mq-text-muted'}`}>{flags[i] ? `Flagged (${eventCounts[i]})` : 'Not flagged'}</span></div>)}</div></div><div className="bg-white border border-mq-border rounded-3xl p-6"><h2 className="font-extrabold text-xl mb-3">Recorded behaviour events</h2>{events.length ? <div className="space-y-2 max-h-72 overflow-auto">{events.map((event, i) => <p key={i} className="text-sm border-b border-mq-border pb-2"><strong>Q{event.question} · {event.type}</strong> — {event.evidence}</p>)}</div> : <p className="text-sm text-mq-text-muted">No rule-based events recorded.</p>}</div><div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={download}><Download size={18}/> Download session JSON</button><button className="btn btn-secondary" onClick={reset}><RotateCcw size={18}/> නැවත ආරම්භ කරන්න</button></div></section>}
    </div>
  </div>;
}

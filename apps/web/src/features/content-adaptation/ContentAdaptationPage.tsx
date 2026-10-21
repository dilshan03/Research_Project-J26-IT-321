import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { contentAdaptationApi } from './api';
import type { BlueprintEnvelope } from './types';
import { AdaptationStudio } from './components/AdaptationStudio';
import { GamePlayer } from './game/GamePlayer';
import { MathQuestCameraSetup } from '../behaviour-monitoring/MathQuestCameraSetup';
import { BehaviourMonitorOverlay } from '../behaviour-monitoring/BehaviourMonitorOverlay';
import { captureSessionSnapshot, RealGameSessionReport } from '../behaviour-monitoring/RealGameSessionReport';
import type { SessionSnapshot } from '../behaviour-monitoring/RealGameSessionReport';

function ApprovedActivities({ onPlay }: { onPlay: (env: BlueprintEnvelope) => void }) {
  const [items, setItems] = useState<BlueprintEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    contentAdaptationApi.list('approved').then(setItems).catch(e => setError((e as Error).message));
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="sinhala text-3xl font-extrabold mb-1">ක්‍රීඩා තෝරන්න</h1>
      <p className="text-mq-text-muted mb-8">Choose a game</p>
      {error && <p className="text-mq-danger font-semibold">{error}</p>}
      {!error && items.length === 0 && <p className="text-mq-text-muted">No approved activities yet. Ask your teacher to approve one in the Studio.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((env, i) => (
          <button key={env.blueprint.activity_id} id={`activity-${env.blueprint.activity_id}`} onClick={() => onPlay(env)}
            className="group text-left rounded-3xl bg-white border border-mq-border p-6 shadow-[var(--mq-shadow-sm)] hover:-translate-y-1 hover:shadow-[var(--mq-shadow-md)] transition-all animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="text-4xl mb-3">{{ VILLAGE_MARKET: '🧺', JUNGLE_ADVENTURE: '🐘', SPACE_QUEST: '🚀' }[env.blueprint.game_theme]}</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mq-text-muted">{env.blueprint.topic} · Grade {env.blueprint.grade}</p>
            <p className="sinhala text-mq-text-strong mt-2 line-clamp-2">{env.raw_sinhala_question}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-mq-primary font-bold group-hover:gap-2 transition-all"><Play size={16} /> Play</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ContentAdaptationPage({ mode }: { mode: 'studio' | 'play' }) {
  const [playing, setPlaying] = useState<BlueprintEnvelope | null>(null);
  const [stage, setStage] = useState<'setup' | 'game' | 'report'>('setup');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const startedAtRef = useRef(0);

  function chooseGame(env: BlueprintEnvelope) {
    setPlaying(env);
    setStage('setup');
    setSnapshot(null);
    setCameraStream(null);
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  }

  function returnToGames() {
    stopCamera();
    setPlaying(null);
    setSnapshot(null);
    setStage('setup');
  }

  function finishGame() {
    if (!playing) return;
    // Capture data before the overlay unmounts. The tracker may write its final
    // batch asynchronously, so a missing final event is possible until flush completes.
    const captured = captureSessionSnapshot(playing.blueprint.activity_id, startedAtRef.current);
    setSnapshot(captured);
    stopCamera();
    setStage('report');
  }

  if (playing) {
    if (stage === 'setup') {
      return <MathQuestCameraSetup onBack={returnToGames} onStart={(stream) => {
        // Clear previous-session records so this report never uses stale data.
        sessionStorage.removeItem('mathquest:camera-session:v1');
        sessionStorage.removeItem('mathquest:gameplay-summary:v1');
        startedAtRef.current = Date.now();
        setCameraStream(stream);
        setStage('game');
      }} />;
    }
    if (stage === 'report' && snapshot) {
      return <RealGameSessionReport snapshot={snapshot} onBack={returnToGames} onPlayAgain={() => {
        stopCamera();
        setSnapshot(null);
        setStage('setup');
      }} />;
    }
    return (
      <>
        {/* The existing GamePlayer is unchanged. onExit opens the report. */}
        <GamePlayer envelope={playing} onExit={finishGame} />
        <BehaviourMonitorOverlay activityId={playing.blueprint.activity_id} initialStream={cameraStream} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-mq-bg">
      <nav className="flex items-center gap-4 px-6 py-3 bg-white/90 backdrop-blur border-b border-mq-border sticky top-0 z-20">
        <a href="#/" className="btn btn-secondary"><ArrowLeft size={16} /> Home</a>
        <span className="font-extrabold text-xl"><span className="text-mq-primary-dark">Math</span><span className="text-mq-secondary">Quest</span></span>
        <div className="ml-auto flex gap-2 text-sm font-bold">
          <a href="#/adapt" className={`px-4 py-2 rounded-full ${mode === 'studio' ? 'bg-mq-primary text-white' : 'text-mq-text-muted hover:bg-mq-surface-soft'}`}>Studio</a>
          <a href="#/play" className={`px-4 py-2 rounded-full ${mode === 'play' ? 'bg-mq-primary text-white' : 'text-mq-text-muted hover:bg-mq-surface-soft'}`}>Learner games</a>
        </div>
      </nav>
      {mode === 'studio' ? <AdaptationStudio onPlay={chooseGame} /> : <ApprovedActivities onPlay={chooseGame} />}
    </div>
  );
}

export default ContentAdaptationPage;

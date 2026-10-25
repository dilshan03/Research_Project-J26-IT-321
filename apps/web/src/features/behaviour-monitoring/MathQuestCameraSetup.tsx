import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Play, ShieldCheck } from 'lucide-react';

/** Pre-game camera permission and face-positioning preview. No recording. */
export function MathQuestCameraSetup({ onBack, onStart }: {
  onBack: () => void;
  onStart: (stream: MediaStream | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transferredRef = useRef(false);
  const [state, setState] = useState<'off' | 'loading' | 'ready' | 'error'>('off');
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (!transferredRef.current) streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  async function enableCamera() {
    if (state === 'loading') return;
    setState('loading'); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('මෙම බ්‍රවුසරයේ කැමරාව භාවිතා කළ නොහැක.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('ready');
    } catch (e) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setState('error');
      setError(e instanceof Error ? e.message : 'කැමරාව විවෘත කළ නොහැකි විය.');
    }
  }

  function startGame() {
    transferredRef.current = true;
    onStart(streamRef.current);
  }

  return (
    <main className="min-h-screen bg-mq-bg flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-3xl rounded-3xl bg-white border border-mq-border p-5 sm:p-8 shadow-[var(--mq-shadow-md)]">
        <div className="flex items-center justify-between mb-5">
          <button type="button" onClick={onBack} className="btn btn-secondary flex items-center gap-2"><ArrowLeft size={17} /> ආපසු</button>
          <span className="text-sm font-bold text-mq-primary">🌈 MathQuest</span>
        </div>
        <div className="text-center mb-5">
          <div className="text-5xl mb-2" aria-hidden="true">📸 🌟</div>
          <h1 className="sinhala text-2xl sm:text-3xl font-extrabold text-mq-text-strong">අපි කැමරාව සූදානම් කරමු!</h1>
          <p className="sinhala mt-3 text-mq-text">ඔයාගේ මුහුණ කැමරාවට පේන විදිහට ඉඳගන්න. 😊</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-sky-50 border-4 border-sky-100 aspect-video max-h-[420px] flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${state === 'ready' ? '' : 'invisible'}`} />
          {state !== 'ready' && <div className="text-center px-4 text-mq-text-muted"><Camera size={48} className="mx-auto mb-3"/><p className="sinhala">මෙතැන ඔයාගේ කැමරා දර්ශනය පෙනේවි</p></div>}
          {state === 'ready' && <div className="absolute top-3 left-3 bg-white/90 rounded-full px-3 py-1.5 text-xs font-bold text-green-700 flex items-center gap-1"><CheckCircle2 size={15}/> කැමරාව සූදානම්!</div>}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-mq-text-muted"><ShieldCheck size={18} className="text-green-600"/><span className="sinhala">කැමරාව භාවිතා කරන්නේ ඔයාගේ අවසරයෙන් පමණයි.</span></div>
        {state === 'error' && <p role="alert" className="text-center text-red-600 text-sm mt-3">{error}</p>}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          {state !== 'ready' && <button type="button" disabled={state === 'loading'} onClick={() => void enableCamera()} className="btn btn-primary flex-1 justify-center flex items-center gap-2 !py-3"><Camera size={18}/>{state === 'loading' ? 'කැමරාව සූදානම් කරමින්...' : 'කැමරාව ක්‍රියාත්මක කරමු! 📷'}</button>}
          {state === 'ready' && <button type="button" onClick={startGame} className="btn btn-primary flex-1 justify-center flex items-center gap-2 !py-3"><Play size={18}/> ක්‍රීඩාව පටන් ගමු! 🚀</button>}
          <button type="button" onClick={startGame} className="btn btn-secondary flex-1 justify-center !py-3">කැමරාව නොමැතිව ඉදිරියට →</button>
        </div>
      </section>
    </main>
  );
}

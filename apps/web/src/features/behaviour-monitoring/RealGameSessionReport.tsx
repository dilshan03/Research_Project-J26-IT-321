import { useMemo } from 'react';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';

const GAMEPLAY_KEY = 'mathquest:gameplay-summary:v1';
const CAMERA_KEY = 'mathquest:camera-session:v1';

type GameplayEvent = {
  eventId?: string; timestamp: string; eventType: string; stepOrder?: number;
  isCorrect?: boolean; selectedOption?: string;
};
type GameplaySession = { sessionId: string; activityId: string; updatedAt: number; events: GameplayEvent[] };
type CameraObservation = {
  at: number; faceVisible: boolean; headPositionProxy: number;
  smile: number | null; blink: number | null; jawOpen: number | null;
  deepfaceExpression?: string;
};
type CameraSession = { sessionId: string; activityId: string; updatedAt: number; observations: CameraObservation[] };
export type SessionSnapshot = {
  activityId: string; startedAt: number; endedAt: number;
  gameplay: GameplaySession | null; camera: CameraSession | null;
};
function read<T>(key: string): T | null {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; }
  catch { return null; }
}
export function captureSessionSnapshot(activityId: string, startedAt: number): SessionSnapshot {
  const endedAt = Date.now();
  const gameplay = read<GameplaySession>(GAMEPLAY_KEY);
  const camera = read<CameraSession>(CAMERA_KEY);
  return {
    activityId, startedAt, endedAt,
    gameplay: gameplay?.activityId === activityId && gameplay.updatedAt >= startedAt && Array.isArray(gameplay.events)
      ? { ...gameplay, events: gameplay.events.filter(e => {
        const t = Date.parse(e.timestamp);
        return Number.isFinite(t) && t >= startedAt && t <= endedAt + 1000;
      }) } : null,
    camera: camera?.activityId === activityId && camera.updatedAt >= startedAt && Array.isArray(camera.observations)
      ? { ...camera, observations: camera.observations.filter(o => o.at >= startedAt && o.at <= endedAt + 1000) } : null,
  };
}

const behaviourNames = {
  distraction: 'හිස හැරීමේ සංඥා',
  hesitation: 'පිළිතුරු ප්‍රමාදය',
  impulsive: 'ඉතා ඉක්මන් වැරදි පිළිතුරු',
  inactivity: 'ක්‍රීඩා අක්‍රියතාව',
  fast: 'ඉක්මන් පිළිතුරු',
  repeated_wrong: 'එකම පියවරේ නැවත වැරදි උත්සාහ',
  answer_changes: 'නැවත පිළිතුරු වෙනස් කිරීම',
};
const deepfaceLabels: Record<string, string> = {
  happy: 'සතුටට සමාන ප්‍රකාශනය', angry: 'කෝපයට සමාන ප්‍රකාශනය',
  sad: 'දුකට සමාන ප්‍රකාශනය', surprise: 'පුදුමයට සමාන ප්‍රකාශනය',
  fear: 'බියට සමාන ප්‍රකාශනය', disgust: 'අප්‍රසාදයට සමාන ප්‍රකාශනය',
  neutral: 'මධ්‍යස්ථ ප්‍රකාශනය',
};
const thresholds = { head: 0.065, headMs: 5000, hesitationMs: 15000, fastMs: 1500, impulsiveMs: 1200 };
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} තත්පර`;
const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-mq-surface-soft rounded-xl p-4"><p className="text-sm text-mq-text-muted">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>
);
const Bar = ({ label, count, total }: { label: string; count: number; total: number }) => (
  <div className="space-y-1"><div className="flex justify-between gap-2 text-sm"><span>{label}</span><span>{total ? `${Math.round(count / total * 100)}% (${count})` : 'දත්ත නොමැත'}</span></div>
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${total ? count / total * 100 : 0}%` }} /></div></div>
);

export function RealGameSessionReport({ snapshot, onBack, onPlayAgain }: {
  snapshot: SessionSnapshot; onBack: () => void; onPlayAgain: () => void;
}) {
  const gameplay = snapshot.gameplay?.events ?? [];
  const camera = snapshot.camera?.observations ?? [];
  const result = useMemo(() => {
    const ordered = [...gameplay].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const count = (type: string) => ordered.filter(e => e.eventType === type).length;
    const submissions = ordered.filter(e => e.eventType === 'answer_submit');
    const correct = submissions.filter(e => e.isCorrect === true).length;
    const incorrect = submissions.filter(e => e.isCorrect === false).length;
    const grouped = new Map<number, GameplayEvent[]>();
    for (const e of ordered) if (typeof e.stepOrder === 'number') grouped.set(e.stepOrder, [...(grouped.get(e.stepOrder) ?? []), e]);
    const steps = [...grouped.entries()].sort((a, b) => a[0] - b[0]).map(([step, es]) => {
      const starts = es.filter(e => e.eventType === 'question_start');
      const tries = es.filter(e => e.eventType === 'answer_submit');
      const firstStart = starts[0] ? Date.parse(starts[0].timestamp) : NaN;
      const firstTry = tries[0] ? Date.parse(tries[0].timestamp) : NaN;
      const responseMs = Number.isFinite(firstStart) && Number.isFinite(firstTry) && firstTry >= firstStart ? firstTry - firstStart : null;
      return { step, tries: tries.length, correct: tries.filter(e => e.isCorrect).length,
        wrong: tries.filter(e => e.isCorrect === false).length,
        selections: es.filter(e => e.eventType === 'answer_select').length,
        changes: es.filter(e => e.eventType === 'answer_change').length,
        responseMs, firstIncorrect: tries[0]?.isCorrect === false };
    });
    const responseTimes = steps.map(s => s.responseMs).filter((x): x is number => x !== null);
    const visible = camera.filter(o => o.faceVisible);
    const headSamples = visible.filter(o => o.headPositionProxy > thresholds.head);
    let headEpisodes = 0, began: number | null = null, marked = false;
    for (const o of camera) {
      if (o.faceVisible && o.headPositionProxy > thresholds.head) {
        if (began === null) { began = o.at; marked = false; }
        if (!marked && o.at - began >= thresholds.headMs) { headEpisodes++; marked = true; }
      } else { began = null; marked = false; }
    }
    const expressions = camera.filter(o => !!o.deepfaceExpression);
      const behaviour = [
      { key: 'distraction', count: visible.length ? headEpisodes : null, evidence: 'තත්පර 5ක් පුරා හිස පිහිටීමේ දර්ශකය ඉහළ යාම (අවධානය තහවුරු නොකරයි)' },
      { key: 'hesitation', count: responseTimes.length ? steps.filter(s => s.responseMs !== null && s.responseMs >= thresholds.hesitationMs).length : null, evidence: 'පළමු පිළිතුරට තත්පර 15ක් හෝ ඊට වැඩි කාලයක් ගත වීම' },
      { key: 'impulsive', count: responseTimes.length ? steps.filter(s => s.responseMs !== null && s.responseMs < thresholds.impulsiveMs && s.firstIncorrect).length : null, evidence: 'තත්පර 1.2ට අඩු පළමු වැරදි පිළිතුරු; පරීක්ෂණාත්මක දර්ශකයක්' },
      { key: 'inactivity', count: snapshot.gameplay ? count('pause_detected') : null, evidence: 'ක්‍රීඩා tracker විසින් සටහන් කළ විරාම; 15 තත්පර සීමාවට සමාන නොවිය හැක' },
      { key: 'fast', count: responseTimes.length ? steps.filter(s => s.responseMs !== null && s.responseMs < thresholds.fastMs).length : null, evidence: 'පළමු පිළිතුර තත්පර 1.5ට අඩුවෙන් ලබා දීම' },
      { key: 'repeated_wrong', count: snapshot.gameplay ? steps.filter(s => s.wrong >= 2).length : null, evidence: 'එකම පියවරේ වැරදි උත්සාහ දෙකක් හෝ වැඩි ගණනක්' },
      { key: 'answer_changes', count: snapshot.gameplay ? steps.filter(s => s.changes >= 2).length : null, evidence: 'එකම පියවරේ තේරීම් වෙනස් කිරීම් දෙකක් හෝ වැඩි ගණනක්; යොමු කිරීමට පෙර තේරීම් වෙනස් කළ අවස්ථා පමණි' },
    ];
    return { count, correct, incorrect, submissions, steps, responseTimes, visible, headSamples, headEpisodes, expressions, behaviour };
  }, [gameplay, camera, snapshot.gameplay]);
  const duration = Math.max(0, Math.round((snapshot.endedAt - snapshot.startedAt) / 1000));
  const totalFaceSamples = camera.filter(o => o.smile !== null || o.blink !== null || o.jawOpen !== null).length;
  const download = (format: 'csv' | 'json') => {
    const payload = { ...snapshot, derived: { correct: result.correct, incorrect: result.incorrect, steps: result.steps, behaviour: result.behaviour },
      notice: 'Rule-based experimental signals; not validated ADHD, emotion or attention diagnosis.' };
    let body: string, mime: string;
    if (format === 'json') { body = JSON.stringify(payload, null, 2); mime = 'application/json'; }
    else {
      const rows: (string | number | boolean | null | undefined)[][] = [
        ['record_type', 'timestamp', 'step', 'event_type', 'correct', 'selected_option', 'face_visible', 'head_position_proxy', 'smile', 'blink', 'jaw_open', 'deepface_expression'],
        ...gameplay.map(e => ['gameplay', e.timestamp, e.stepOrder, e.eventType, e.isCorrect, e.selectedOption, '', '', '', '', '', '']),
        ...camera.map(o => ['camera', new Date(o.at).toISOString(), '', '', '', '', o.faceVisible, o.headPositionProxy, o.smile, o.blink, o.jawOpen, o.deepfaceExpression]),
      ];
      body = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      mime = 'text/csv;charset=utf-8';
    }
    const url = URL.createObjectURL(new Blob([body], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = `mathquest-session-${snapshot.startedAt}.${format}`;
    document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="min-h-screen bg-mq-bg text-mq-text px-4 py-8 sinhala"><div className="max-w-5xl mx-auto space-y-5">
      <header className="flex justify-between items-center mb-8 gap-3"><div><div className="text-2xl font-extrabold"><span className="text-mq-primary-dark">Math</span><span className="text-mq-secondary">Quest</span></div><p className="text-sm text-mq-text-muted">ගණිත ක්‍රීඩා</p></div><span className="badge">සැසි සාරාංශය</span></header>
      <section className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-2">සැසි සාරාංශය</h1>
        <p className="text-sm text-mq-text-muted mb-5">මෙම සැසියේ සැබෑ ක්‍රීඩා හා කැමරා දත්ත මත පදනම් වූ නිරීක්ෂණ පමණි. මෙය ADHD හෝ සැබෑ හැඟීම් හඳුනාගැනීමක් නොවේ.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="පිළිතුරු යොමු කිරීම්" value={snapshot.gameplay ? result.submissions.length : 'දත්ත නොමැත'} />
          <Stat label="නිවැරදි උත්සාහ" value={snapshot.gameplay ? result.correct : 'දත්ත නොමැත'} />
          <Stat label="සාමාන්‍ය පළමු ප්‍රතිචාර කාලය" value={result.responseTimes.length ? seconds(result.responseTimes.reduce((a, b) => a + b, 0) / result.responseTimes.length) : 'දත්ත නොමැත'} />
          <Stat label="ක්‍රීඩා කාලය" value={`${Math.floor(duration / 60)} මිනිත්තු ${duration % 60} තත්පර`} />
        </div>
      </section>
      <section className="bg-white rounded-3xl border border-mq-border p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-bold">මුහුණේ ප්‍රකාශන සාරාංශය</h2>
        <p className="text-sm text-mq-text-muted">කැමරා නිරීක්ෂණ: {camera.length} | මුහුණ හඳුනාගත් නිරීක්ෂණ: {result.visible.length} | ප්‍රකාශන වර්ගීකරණ නියැදි: {result.expressions.length}</p>
        <h3 className="font-semibold">ප්‍රකාශන වර්ගීකරණය</h3>
        {result.expressions.length ? <div className="space-y-3">{Object.entries(deepfaceLabels).map(([key, label]) => <Bar key={key} label={label} count={result.expressions.filter(o => o.deepfaceExpression === key).length} total={result.expressions.length} />)}</div>
          : <p className="text-sm text-amber-700">ප්‍රකාශන වර්ගීකරණ දත්ත නොමැත. DeepFace සේවාව ක්‍රියාත්මක නොවිය හැක. මෙය ප්‍රකාශන නොතිබූ බව අදහස් නොකරයි.</p>}
        <h3 className="font-semibold">මුහුණේ චලන නිරීක්ෂණ</h3>
        {totalFaceSamples ? <div className="space-y-3">
          <Bar label="සිනහවක් පෙනීම" count={result.visible.filter(o => (o.smile ?? 0) > 0.45).length} total={result.visible.length} />
          <Bar label="ඇස් පියවීම" count={result.visible.filter(o => (o.blink ?? 0) > 0.65).length} total={result.visible.length} />
          <Bar label="මුඛය විවෘත කිරීම" count={result.visible.filter(o => (o.jawOpen ?? 0) > 0.50).length} total={result.visible.length} />
          <Bar label="හිස පිහිටීමේ වෙනස" count={result.headSamples.length} total={result.visible.length} />
        </div> : <p className="text-sm text-amber-700">මුහුණේ චලන නිරීක්ෂණ සඳහා ප්‍රමාණවත් දත්ත නොමැත.</p>}
        <h3 className="font-semibold">ඉගෙනුම් හැසිරීම් සංඥා</h3>
        <p className="text-xs text-mq-text-muted">මුහුණේ පිහිටීම සහ ක්‍රීඩා අක්‍රියතාව මත පදනම් වූ පරීක්ෂණාත්මක දර්ශක.</p>
        {[
          { label: 'අවධානය වෙනතකට යොමුවීමේ සංඥා', available: result.visible.length > 0, detected: result.headEpisodes > 0, evidence: `දිගු හිස හැරීම්: ${result.headEpisodes}` },
          { label: 'කම්මැලිකමට සමාන හැසිරීම් රටාව (පරීක්ෂණාත්මක)', available: result.visible.length > 0 && !!snapshot.gameplay, detected: result.headEpisodes > 0 && result.count('pause_detected') > 0, evidence: `හිස හැරීම්: ${result.headEpisodes} | විරාම: ${result.count('pause_detected')}` },
          { label: 'කාර්යයට යොමු වූ හැසිරීම් රටාව (පරීක්ෂණාත්මක)', available: result.visible.length >= 10 && !!snapshot.gameplay, detected: result.visible.length >= 10 && result.headSamples.length / result.visible.length <= 0.20 && result.count('pause_detected') === 0, evidence: `මුහුණ පෙනුණු නියැදි: ${result.visible.length} | හිස හැරුණු නියැදි: ${result.headSamples.length}` },
        ].map(item => <div key={item.label} className="rounded-xl bg-mq-surface-soft p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{item.label}</strong><span>{!item.available ? 'ප්‍රමාණවත් දත්ත නොමැත' : item.detected ? 'සංඥා හමු විය' : 'සංඥා හමු නොවීය'}</span></div><p className="text-xs text-mq-text-muted mt-2">{item.evidence}</p></div>)}
        <p className="text-xs text-mq-text-muted">මුහුණේ චලන ප්‍රතිශත නියැදි මත ගණනය වේ. ඒවා දරුවාගේ සැබෑ මානසික තත්ත්වය, හැඟීම් හෝ ADHD තහවුරු නොකරයි.</p>
      </section>
      <section className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">හැසිරීම් සංඥා</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{result.behaviour.map(item => <div key={item.key} className="bg-mq-surface-soft rounded-xl p-4"><div className="flex justify-between gap-3"><span>{behaviourNames[item.key as keyof typeof behaviourNames]}</span><strong>{item.count ?? 'දත්ත නොමැත'}</strong></div><p className="text-xs text-mq-text-muted mt-2">{item.evidence}</p></div>)}</div>
        <p className="text-xs text-mq-text-muted mt-3">මෙම දර්ශක තාවකාලික නීති මත පදනම් වේ. Random Forest ආකෘතියක් මෙහි ක්‍රියාත්මක නොවේ. වැරදි පිළිතුරෙන් පසු නැවත තේරීම, පිළිතුරක් යොමු කිරීමට පෙර වෙනස් කිරීමෙන් වෙනස් වේ.</p>
      </section>
      <section className="bg-white rounded-3xl border border-mq-border p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">ක්‍රීඩා අන්තර්ක්‍රියා</h2>
        {snapshot.gameplay ? <><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="මුළු ක්ලික්" value={result.count('click')} /><Stat label="ස්පර්ශ" value={result.count('touch_start')} />
          <Stat label="විකල්ප තේරීම්" value={result.count('answer_select')} /><Stat label="පිළිතුරු යොමු කිරීම්" value={result.count('answer_submit')} />
          <Stat label="වැරදි උත්සාහ" value={result.incorrect} /><Stat label="තේරීම් වෙනස් කිරීම්" value={result.count('answer_change')} />
          <Stat label="විරාම" value={result.count('pause_detected')} /><Stat label="අක්‍රියතාව අවසන් වීම්" value={result.count('inactivity_end')} />
        </div><h3 className="font-semibold mb-3">පියවර අනුව ක්‍රීඩා අන්තර්ක්‍රියා</h3>
        <div className="space-y-2">{result.steps.map(s => <div key={s.step} className="bg-mq-surface-soft rounded-xl p-3 text-sm flex flex-wrap gap-4"><strong>පියවර {s.step}</strong><span>තේරීම්: {s.selections}</span><span>යොමු කිරීම්: {s.tries}</span><span>වැරදි උත්සාහ: {s.wrong}</span><span>තේරීම් වෙනස් කිරීම්: {s.changes}</span><span>පළමු ප්‍රතිචාරය: {s.responseMs === null ? 'දත්ත නොමැත' : seconds(s.responseMs)}</span></div>)}
          {!result.steps.length && <p className="text-sm text-amber-700">මෙම සැසියේ පියවර අනුව දත්ත නොමැත.</p>}</div></>
          : <p className="text-sm text-amber-700">මෙම සැසියේ GamePlayer දත්ත සොයාගත නොහැකි විය. Backend නොමැති වුවත් local tracker ක්‍රියාත්මක විය යුතුය.</p>}
      </section>
      <div className="flex flex-wrap gap-3"><button type="button" className="btn btn-primary" onClick={() => download('csv')}><Download size={18} /> CSV දත්ත බාගන්න</button><button type="button" className="btn btn-secondary" onClick={() => download('json')}><Download size={18} /> JSON දත්ත බාගන්න</button><button type="button" className="btn btn-secondary" onClick={onPlayAgain}><RotateCcw size={18} /> නැවත ක්‍රීඩා කරන්න</button><button type="button" className="btn btn-secondary" onClick={onBack}><ArrowLeft size={18} /> ක්‍රීඩා තෝරන්න</button></div>
    </div></div>
  );
}

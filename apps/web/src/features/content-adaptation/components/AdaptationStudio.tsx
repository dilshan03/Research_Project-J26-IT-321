import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Brain, Check, Gauge, Layers, Loader2, Play, Sparkles, Wand2, X,
} from 'lucide-react';
import { contentAdaptationApi } from '../api';
import type {
  BlueprintEnvelope, BlueprintStatus, GameTheme, GenerateBlueprintRequest, RiskLevel, SampleQuestion,
} from '../types';

const DISTRACTOR_STYLE: Record<string, string> = {
  IMPULSIVITY: 'bg-[var(--mq-danger-bg)] text-mq-danger',
  WORKING_MEMORY_OVERFLOW: 'bg-[var(--mq-info-bg)] text-mq-info',
  MAGNITUDE_SLIP: 'bg-[var(--mq-warning-bg)] text-mq-warning',
};

const STATUS_STYLE: Record<BlueprintStatus, string> = {
  draft: 'bg-mq-surface-soft text-mq-primary-dark',
  approved: 'bg-[var(--mq-success-bg)] text-mq-success',
  rejected: 'bg-[var(--mq-danger-bg)] text-mq-danger',
};

const emptyForm: GenerateBlueprintRequest = {
  source_question_id: '', grade: 1, topic: 'Addition', raw_sinhala_question: '', adhd_risk_level: 'MEDIUM',
};

function CliMeter({ score }: { score: number }) {
  const pct = Math.min(100, (score / 4) * 100);
  const color = score >= 3 ? 'bg-mq-danger' : score >= 2 ? 'bg-mq-warning' : 'bg-mq-success';
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-mq-text-muted mb-1">
        <span className="flex items-center gap-1"><Gauge size={14} /> Cognitive Load Index</span>
        <span className="text-mq-text-strong">{score.toFixed(2)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-mq-surface-soft overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BlueprintDetail({ env, onStatus, onPlay, busy }: {
  env: BlueprintEnvelope; onStatus: (s: BlueprintStatus) => void; onPlay: () => void; busy: boolean;
}) {
  const bp = env.blueprint;
  const s = bp.adhd_game_settings;
  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mq-text-muted">{bp.source_question_id} · Grade {bp.grade} · {bp.topic}</p>
          <p className="sinhala text-lg text-mq-text-strong mt-1">{env.raw_sinhala_question}</p>
        </div>
        <span className={`badge ${STATUS_STYLE[bp.status]} capitalize`}>{bp.status}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-mq-border p-4"><CliMeter score={env.cli_score} /></div>
        <div className="rounded-2xl border border-mq-border p-4 flex flex-wrap gap-2 content-start">
          <span className="badge"><Layers size={12} /> {s.step_granularity === 'MAXIMAL_THREE_TIER' ? '3-tier steps' : '2-tier steps'}</span>
          <span className="badge">{s.distractor_count} distractors</span>
          <span className="badge">Stimulus: {s.stimulus_density}</span>
          <span className="badge">{s.timer_enabled ? 'Timer on' : 'No timer'}</span>
          <span className="badge">{s.visual_clutter_filter ? 'Clutter filter' : 'Full visuals'}</span>
          <span className="badge">{bp.game_theme.replace('_', ' ')}</span>
        </div>
      </div>

      <ol className="space-y-4">
        {bp.micro_steps.map(step => (
          <li key={step.step_order} className="rounded-2xl border border-mq-border bg-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-mq-primary text-white flex items-center justify-center font-bold text-sm">{step.step_order}</span>
              <div>
                <p className="sinhala font-semibold text-mq-text-strong leading-tight">{step.instruction_si}</p>
                <p className="text-sm text-mq-text-muted">{step.instruction_en} · <code className="text-xs">{step.action_type}</code></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {step.game_options.map(o => (
                <div key={o.text_en} title={o.distractor_rationale ?? ''}
                  className={`rounded-xl border px-3 py-2 text-sm ${o.is_correct ? 'border-mq-success bg-[var(--mq-success-bg)]' : 'border-mq-border'}`}>
                  <span className="font-bold mr-2">{o.text_en}</span>
                  {o.is_correct
                    ? <span className="text-xs font-semibold text-mq-success">correct</span>
                    : <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DISTRACTOR_STYLE[o.distractor_type ?? ''] ?? ''}`}>{o.distractor_type}</span>}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3 mt-6">
        <button id="preview-play" onClick={onPlay} className="btn btn-secondary"><Play size={16} /> Preview as learner</button>
        <div className="flex-1" />
        <button id="reject-blueprint" disabled={busy} onClick={() => onStatus('rejected')} className="btn btn-secondary !text-mq-danger"><X size={16} /> Reject</button>
        <button id="approve-blueprint" disabled={busy} onClick={() => onStatus('approved')} className="btn btn-primary"><Check size={16} /> Approve</button>
      </div>
    </div>
  );
}

export function AdaptationStudio({ onPlay }: { onPlay: (env: BlueprintEnvelope) => void }) {
  const [form, setForm] = useState<GenerateBlueprintRequest>(emptyForm);
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const [items, setItems] = useState<BlueprintEnvelope[]>([]);
  const [selected, setSelected] = useState<BlueprintEnvelope | null>(null);
  const [filter, setFilter] = useState<BlueprintStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await contentAdaptationApi.list(filter === 'all' ? undefined : filter));
    } catch (e) { setError((e as Error).message); }
  }, [filter]);

  useEffect(() => {
    contentAdaptationApi.sampleQuestions().then(setSamples).catch(e => setError((e as Error).message));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const set = <K extends keyof GenerateBlueprintRequest>(k: K, v: GenerateBlueprintRequest[K]) => setForm(f => ({ ...f, [k]: v }));

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const env = await contentAdaptationApi.generate({ ...form, game_theme: form.game_theme || null });
      setSelected(env);
      await refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (status: BlueprintStatus) => {
    if (!selected) return;
    setLoading(true);
    try {
      setSelected(await contentAdaptationApi.setStatus(selected.blueprint.activity_id, status));
      await refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const input = 'w-full rounded-xl border border-mq-border bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mq-primary/40';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-8">
        <span className="badge mb-3"><Brain size={14} /> Content Adaptation Engine</span>
        <h1 className="text-3xl md:text-4xl font-extrabold">Adaptation Studio</h1>
        <p className="text-mq-text-muted mt-1">Turn Sinhala curriculum questions into attention-friendly game activities, then review before learners see them.</p>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[var(--mq-danger-bg)] text-mq-danger px-4 py-3 text-sm font-semibold">
          <AlertTriangle size={16} /> {error}
          <button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-6">
          <form onSubmit={generate} className="rounded-3xl bg-white border border-mq-border shadow-[var(--mq-shadow-sm)] p-6 space-y-4">
            <h2 className="text-lg flex items-center gap-2"><Wand2 size={18} className="text-mq-primary" /> New adaptation</h2>

            {samples.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {samples.map(s => (
                  <button type="button" key={s.source_question_id} title={s.translation_en}
                    onClick={() => setForm(f => ({ ...f, source_question_id: s.source_question_id, grade: s.grade, topic: s.topic, raw_sinhala_question: s.raw_sinhala_question }))}
                    className="text-xs font-semibold px-3 py-1 rounded-full border border-mq-border hover:border-mq-primary hover:text-mq-primary transition">
                    {s.source_question_id}
                  </button>
                ))}
              </div>
            )}

            <label className="block text-sm font-semibold">Sinhala question
              <textarea id="question-input" required rows={4} lang="si" value={form.raw_sinhala_question}
                onChange={e => set('raw_sinhala_question', e.target.value)} className={`${input} sinhala mt-1`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">Question ID
                <input id="question-id" required value={form.source_question_id} onChange={e => set('source_question_id', e.target.value)} className={`${input} mt-1`} />
              </label>
              <label className="block text-sm font-semibold">Grade
                <select id="grade-select" value={form.grade} onChange={e => set('grade', Number(e.target.value))} className={`${input} mt-1`}>
                  {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Topic
                <input id="topic-input" required value={form.topic} onChange={e => set('topic', e.target.value)} className={`${input} mt-1`} />
              </label>
              <label className="block text-sm font-semibold">Theme
                <select id="theme-select" value={form.game_theme ?? ''} onChange={e => set('game_theme', (e.target.value || null) as GameTheme | null)} className={`${input} mt-1`}>
                  <option value="">Auto</option>
                  <option value="VILLAGE_MARKET">Village Market</option>
                  <option value="JUNGLE_ADVENTURE">Jungle Adventure</option>
                  <option value="SPACE_QUEST">Space Quest</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold mb-1">ADHD risk level</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as RiskLevel[]).map(r => (
                  <button type="button" key={r} id={`risk-${r.toLowerCase()}`} onClick={() => set('adhd_risk_level', r)}
                    className={`py-2 rounded-xl text-sm font-bold border transition ${form.adhd_risk_level === r ? 'bg-mq-primary text-white border-mq-primary' : 'border-mq-border hover:border-mq-primary'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </fieldset>
            <button id="generate-blueprint" type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate game blueprint
            </button>
          </form>

          <div className="rounded-3xl bg-white border border-mq-border p-4">
            <div className="flex gap-1 mb-3 text-xs font-bold">
              {(['all', 'draft', 'approved', 'rejected'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full capitalize ${filter === f ? 'bg-mq-primary text-white' : 'text-mq-text-muted hover:bg-mq-surface-soft'}`}>{f}</button>
              ))}
            </div>
            {items.length === 0 && <p className="text-sm text-mq-text-muted px-2 py-4">No blueprints yet.</p>}
            <ul className="space-y-2 max-h-80 overflow-auto">
              {items.map(env => (
                <li key={env.blueprint.activity_id}>
                  <button onClick={() => setSelected(env)}
                    className={`w-full text-left rounded-xl px-3 py-2 border transition ${selected?.blueprint.activity_id === env.blueprint.activity_id ? 'border-mq-primary bg-mq-surface-blue' : 'border-transparent hover:bg-mq-surface-soft'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">{env.blueprint.source_question_id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[env.blueprint.status]}`}>{env.blueprint.status}</span>
                    </div>
                    <p className="sinhala text-xs text-mq-text-muted truncate">{env.raw_sinhala_question}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="rounded-3xl bg-mq-surface-soft/60 border border-mq-border p-6 min-h-[420px]">
          {selected
            ? <BlueprintDetail env={selected} busy={loading} onStatus={updateStatus} onPlay={() => onPlay(selected)} />
            : (
              <div className="h-full flex flex-col items-center justify-center text-center text-mq-text-muted">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 animate-float"><Wand2 className="text-mq-primary" size={32} /></div>
                <p className="font-semibold">Generate or select a blueprint to review it here.</p>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

export default AdaptationStudio;

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Database,
  FileText,
  FileUp,
  Filter,
  Gauge,
  Layers,
  Loader2,
  Play,
  Search,
  Sliders,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import { contentAdaptationApi } from '../api';
import type {
  AdaptProblemRequest,
  BlueprintEnvelope,
  BlueprintStatus,
  CurriculumProblem,
  CustomADHDGameSettings,
  GameTheme,
  RiskLevel,
  StudentBehaviorProfile,
  SyllabusDocument,
} from '../types';
import { GamePlayer } from '../game/GamePlayer';
import { CompanionWardrobeModal } from '../game/CompanionWardrobeModal';
import { useCompanion } from '../game/useCompanion';
import { StudentBehaviorSelector } from './StudentBehaviorSelector';
import { CognitiveLoadCustomizer } from './CognitiveLoadCustomizer';

type StudioTab = 'library' | 'bank' | 'review' | 'preview';

const DISTRACTOR_STYLE: Record<string, string> = {
  IMPULSIVITY: 'bg-[var(--mq-danger-bg)] text-mq-danger border-mq-danger/30',
  WORKING_MEMORY_OVERFLOW: 'bg-[var(--mq-info-bg)] text-mq-info border-mq-info/30',
  MAGNITUDE_SLIP: 'bg-[var(--mq-warning-bg)] text-mq-warning border-mq-warning/30',
  INVERSION: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_STYLE: Record<BlueprintStatus, string> = {
  draft: 'bg-mq-surface-soft text-mq-primary-dark',
  approved: 'bg-[var(--mq-success-bg)] text-mq-success',
  rejected: 'bg-[var(--mq-danger-bg)] text-mq-danger',
};

const OP_SIGN: Record<string, string> = { ADD: '+', SUB: '−', MUL: '×', DIV: '÷' };

/** One-line answer key for a problem card, in the form that suits its game type. */
function problemSummary(p: CurriculumProblem): string {
  const vp = p.visual_props ?? {};
  switch (p.operation) {
    case 'ADD': case 'SUB': case 'MUL': case 'DIV':
      return `${p.operands.join(` ${OP_SIGN[p.operation]} `)} = ${p.expected_answer}`;
    case 'COUNT':
      return `count ${p.expected_answer}`;
    case 'COMPARE':
      return `${vp.target === 'SMALLER' ? 'smaller' : 'bigger'} of ${p.operands.join(', ')} → ${p.expected_answer}`;
    case 'SHAPE':
      return `find ${String(vp.shape_en ?? vp.target_shape ?? 'shape').toLowerCase()}`;
    case 'PATTERN':
      return `${(vp.sequence ?? []).join(', ')}, … → ${vp.target ?? p.expected_answer}`;
    default:
      return `${p.operands.join(', ')} → ${p.expected_answer}`;
  }
}

function CliMeter({ score }: { score: number }) {
  const pct = Math.min(100, (score / 4) * 100);
  const color = score >= 3 ? 'bg-mq-danger' : score >= 2 ? 'bg-mq-warning' : 'bg-mq-success';
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-mq-text-muted mb-1">
        <span className="flex items-center gap-1">
          <Gauge size={14} /> Cognitive Load Index (CLI)
        </span>
        <span className="text-mq-text-strong font-bold">{score.toFixed(2)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-mq-surface-soft overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-mq-text-muted mt-1">
        {score >= 3.0 ? 'High Working Memory Demand' : score >= 2.0 ? 'Moderate Cognitive Load' : 'Low Extraneous Load'}
      </p>
    </div>
  );
}

export function AdaptationStudio({ onPlay }: { onPlay: (env: BlueprintEnvelope) => void }) {
  const [activeTab, setActiveTab] = useState<StudioTab>('library');
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const { companion } = useCompanion();

  // Documents State
  const [documents, setDocuments] = useState<SyllabusDocument[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadGrade, setUploadGrade] = useState<number>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingDocId, setIsExtractingDocId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Curriculum Problems State
  const [problems, setProblems] = useState<CurriculumProblem[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [adaptingProbId, setAdaptingProbId] = useState<string | null>(null);

  // Adaptation Settings State
  const [adhdRisk] = useState<RiskLevel>('MEDIUM');
  const [gameTheme, setGameTheme] = useState<GameTheme>('VILLAGE_MARKET');

  // Teacher Customization State
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentBehaviorProfile>({
    archetype_id: 'INATTENTIVE',
    student_name: 'Inattentive Profile (අවධානය)',
    inattention_level: 'HIGH',
    impulsivity_level: 'LOW',
    working_memory_support: true,
    activity_pace: 'CALM_STEP_BY_STEP',
    visual_assistance: 'ALWAYS',
    audio_assistance: 'READ_ON_CLICK',
  });
  const [customStudentName, setCustomStudentName] = useState<string>('');
  const [customAdhdSettings, setCustomAdhdSettings] = useState<CustomADHDGameSettings>({
    step_granularity: 'MAXIMAL_THREE_TIER',
    distractor_count: 2,
    stimulus_density: 'LOW',
    visual_clutter_filter: true,
    timer_enabled: false,
  });
  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [showAdvancedCustomizer, setShowAdvancedCustomizer] = useState(true);

  // Blueprint Review State
  const [blueprints, setBlueprints] = useState<BlueprintEnvelope[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintEnvelope | null>(null);
  const [gajaIntroText, setGajaIntroText] = useState<string>('');
  const [gajaHintText, setGajaHintText] = useState<string>('');

  // Global UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Initial Data
  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await contentAdaptationApi.listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshProblems = useCallback(async () => {
    try {
      const probs = await contentAdaptationApi.listProblems({
        grade: selectedGradeFilter === 'all' ? undefined : selectedGradeFilter,
        topic: topicSearch.trim() || undefined,
      });
      setProblems(probs);
    } catch (e) {
      console.error(e);
    }
  }, [selectedGradeFilter, topicSearch]);

  const refreshBlueprints = useCallback(async () => {
    try {
      const bps = await contentAdaptationApi.list();
      setBlueprints(bps);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
    refreshProblems();
    refreshBlueprints();
  }, [refreshDocuments, refreshProblems, refreshBlueprints]);

  // Handle PDF Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await contentAdaptationApi.uploadSyllabus(uploadFile, uploadGrade);
      setSuccessMsg(res.message);
      setUploadFile(null);
      await refreshDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk Seed Local Syllabi: registers the bundled guides and queues them; progress is polled below.
  const handleSeedLocal = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      const res = await contentAdaptationApi.seedLocalSyllabi();
      setSuccessMsg(`Queued ${res.imported_documents} NIE guides for extraction. Pages already read are reused from cache.`);
      await refreshDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Extract problems from single document (runs in the background on the server)
  const handleExtractDocument = async (docId: string) => {
    setIsExtractingDocId(docId);
    setError(null);
    try {
      await contentAdaptationApi.extractProblems(docId);
      await refreshDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExtractingDocId(null);
    }
  };

  // While any document is extracting, poll its progress; announce each one that finishes.
  const lastStatus = useRef<Record<string, SyllabusDocument['status']>>({});
  const anyExtracting = documents.some(d => d.status === 'extracting');
  useEffect(() => {
    const finished = documents.filter(d => lastStatus.current[d.doc_id] === 'extracting' && d.status !== 'extracting');
    lastStatus.current = Object.fromEntries(documents.map(d => [d.doc_id, d.status]));
    if (finished.length) {
      refreshProblems();
      const done = finished.filter(d => d.status === 'extracted');
      const failed = finished.filter(d => d.status === 'error');
      if (done.length) {
        setSuccessMsg(done.map(d => `Grade ${d.grade}: ${d.extracted_problem_count} verified problems`).join(' · '));
      }
      if (failed.length) setError(failed.map(d => `${d.filename}: ${d.error_message}`).join(' · '));
    }
  }, [documents, refreshProblems]);
  useEffect(() => {
    if (!anyExtracting) return;
    const t = window.setInterval(refreshDocuments, 2500);
    return () => window.clearInterval(t);
  }, [anyExtracting, refreshDocuments]);

  // Adapt Curriculum Problem into ADHD Blueprint
  const handleAdaptProblem = async (problem: CurriculumProblem) => {
    setAdaptingProbId(problem.problem_id);
    setError(null);
    try {
      const req: AdaptProblemRequest = {
        adhd_risk_level: adhdRisk,
        game_theme: gameTheme,
        learner_id: selectedStudentProfile?.learner_id || undefined,
        student_name: customStudentName.trim() || selectedStudentProfile?.student_name,
        behavior_profile: selectedStudentProfile,
        custom_settings: customAdhdSettings,
      };
      const env = await contentAdaptationApi.adaptProblem(problem.problem_id, req);
      setSelectedBlueprint(env);
      if (env.blueprint.story_narrative) {
        setGajaIntroText(env.blueprint.story_narrative.gaja_dialogue.intro.si);
        setGajaHintText(env.blueprint.story_narrative.gaja_dialogue.hint.si);
      }
      await refreshBlueprints();
      setActiveTab('review');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdaptingProbId(null);
    }
  };

  // Re-tune Blueprint Cognitive Load
  const handleTuneBlueprint = async () => {
    if (!selectedBlueprint) return;
    setIsTuning(true);
    setError(null);
    try {
      const updated = await contentAdaptationApi.tuneBlueprint(
        selectedBlueprint.blueprint.activity_id,
        {
          custom_settings: customAdhdSettings,
          behavior_profile: selectedStudentProfile,
          game_theme: gameTheme,
        }
      );
      setSelectedBlueprint(updated);
      await refreshBlueprints();
      setSuccessMsg('Blueprint re-tuned with updated cognitive load and micro-steps!');
      setIsTuningModalOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsTuning(false);
    }
  };

  // Approve or Reject Blueprint
  const handleUpdateStatus = async (status: BlueprintStatus) => {
    if (!selectedBlueprint) return;
    setLoading(true);
    try {
      const updated = await contentAdaptationApi.setStatus(selectedBlueprint.blueprint.activity_id, status);
      setSelectedBlueprint(updated);
      await refreshBlueprints();
      setSuccessMsg(`Activity blueprint marked as ${status}!`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* Top Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="badge mb-2 inline-flex items-center gap-1.5 bg-mq-surface-blue text-mq-primary-dark">
            <Brain size={14} /> Cognitive Accessibility & Curriculum Adaptation
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-mq-text-strong tracking-tight">
            Teacher Adaptation Studio
          </h1>
          <p className="text-sm md:text-base text-mq-text-muted mt-1">
            Multimodal syllabus ingestion, deterministic math verification, and ADHD-friendly game blueprint generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="open-wardrobe-btn"
            onClick={() => setIsWardrobeOpen(true)}
            className="btn btn-secondary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 shadow-sm border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
            title="Customize Companion Mascot & Wardrobe"
          >
            <span>🎨</span>
            <span>Companion Wardrobe ({companion.nickname})</span>
          </button>

          <button
            id="seed-syllabi-btn"
            disabled={isSeeding}
            onClick={handleSeedLocal}
            className="btn btn-secondary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 shadow-sm"
            title="Register the Grade 1-5 NIE teacher's guides in data/syllabi and extract their problems"
          >
            {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {isSeeding ? 'Queuing Guides...' : 'Ingest NIE Guides'}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[var(--mq-danger-bg)] text-mq-danger px-4 py-3 text-sm font-semibold border border-mq-danger/20 animate-fade-in">
          <AlertTriangle size={16} /> {error}
          <button className="ml-auto p-1" onClick={() => setError(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[var(--mq-success-bg)] text-mq-success px-4 py-3 text-sm font-semibold border border-mq-success/20 animate-fade-in">
          <Check size={16} /> {successMsg}
          <button className="ml-auto p-1" onClick={() => setSuccessMsg(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <nav className="flex space-x-1 sm:space-x-2 border-b border-mq-border pb-3 mb-6 overflow-x-auto" aria-label="Studio Tabs">
        <button
          id="tab-library"
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-mq-primary text-white shadow-sm'
              : 'text-mq-text-muted hover:text-mq-text hover:bg-mq-surface-soft'
          }`}
        >
          <BookOpen size={16} />
          1. Syllabus Library ({documents.length})
        </button>

        <button
          id="tab-bank"
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'bank'
              ? 'bg-mq-primary text-white shadow-sm'
              : 'text-mq-text-muted hover:text-mq-text hover:bg-mq-surface-soft'
          }`}
        >
          <FileText size={16} />
          2. Curriculum Problem Bank ({problems.length})
        </button>

        <button
          id="tab-review"
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'review'
              ? 'bg-mq-primary text-white shadow-sm'
              : 'text-mq-text-muted hover:text-mq-text hover:bg-mq-surface-soft'
          }`}
        >
          <Wand2 size={16} />
          3. Blueprint Studio & Review
          {selectedBlueprint && (
            <span className="w-2 h-2 rounded-full bg-mq-accent-yellow animate-pulse" />
          )}
        </button>

        <button
          id="tab-preview"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'preview'
              ? 'bg-mq-accent-green text-white shadow-sm'
              : 'text-mq-text-muted hover:text-mq-text hover:bg-mq-surface-soft'
          }`}
        >
          <Play size={16} />
          4. Learner Preview Player
        </button>
      </nav>

      {/* TAB 1: SYLLABUS LIBRARY */}
      {activeTab === 'library' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 animate-fade-in">
          {/* Uploader Card */}
          <div className="space-y-6">
            <form
              onSubmit={handleUpload}
              className="rounded-3xl bg-white border border-mq-border shadow-[var(--mq-shadow-sm)] p-6 space-y-4"
            >
              <h2 className="text-lg font-bold flex items-center gap-2 text-mq-text-strong">
                <FileUp size={18} className="text-mq-primary" /> Ingest Syllabus PDF
              </h2>
              <p className="text-xs text-mq-text-muted">
                Upload official Sri Lankan NIE Mathematics syllabus documents (Grade 1 - 5).
              </p>

              {/* Drag & Drop Area */}
              <div
                className="border-2 border-dashed border-mq-border hover:border-mq-primary rounded-2xl p-6 text-center cursor-pointer transition-colors bg-mq-surface-soft/40"
                onClick={() => document.getElementById('pdf-file-input')?.click()}
              >
                <UploadCloud className="mx-auto text-mq-primary mb-2" size={32} />
                <p className="text-sm font-semibold text-mq-text-strong">
                  {uploadFile ? uploadFile.name : 'Click to select or drag PDF here'}
                </p>
                <p className="text-xs text-mq-text-muted mt-1">Official Curriculum PDFs (Max 25MB)</p>
                <input
                  id="pdf-file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-mq-text">
                  Grade Level
                  <select
                    id="upload-grade-select"
                    value={uploadGrade}
                    onChange={(e) => setUploadGrade(Number(e.target.value))}
                    className="w-full rounded-xl border border-mq-border bg-white px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-mq-primary/40 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-mq-text">
                  Curriculum Year
                  <input
                    type="number"
                    defaultValue={2024}
                    className="w-full rounded-xl border border-mq-border bg-white px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-mq-primary/40 focus:outline-none"
                  />
                </label>
              </div>

              <button
                id="submit-pdf-upload"
                type="submit"
                disabled={!uploadFile || isUploading}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                {isUploading ? 'Ingesting Document...' : 'Ingest Document'}
              </button>
            </form>

            {/* Quick Bulk Seed helper card */}
            <div className="rounded-3xl bg-mq-surface-blue/50 border border-mq-border p-5 space-y-2">
              <h3 className="text-sm font-bold text-mq-primary-dark flex items-center gap-1.5">
                <Database size={15} /> Local Repository Syllabi
              </h3>
              <p className="text-xs text-mq-text-muted">
                Sri Lankan NIE Grade 1 to 5 syllabi are bundled in <code className="text-[11px] font-mono">data/syllabi/</code>.
              </p>
              <button
                onClick={handleSeedLocal}
                disabled={isSeeding}
                className="w-full py-2 px-3 rounded-xl bg-white border border-mq-border text-xs font-bold text-mq-primary hover:bg-mq-surface-soft transition shadow-xs flex items-center justify-center gap-1.5"
              >
                {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Extract All Grades (1 to 5)
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-mq-text-strong">Uploaded Syllabus Documents</h2>
              <span className="text-xs font-semibold text-mq-text-muted">
                {documents.length} Document{documents.length === 1 ? '' : 's'} Registered
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-3xl bg-white border border-mq-border p-12 text-center text-mq-text-muted space-y-3">
                <BookOpen size={40} className="mx-auto text-mq-primary/40" />
                <p className="font-semibold text-sm">No syllabus documents uploaded yet.</p>
                <p className="text-xs max-w-sm mx-auto">
                  Click 'Bulk Ingest Local Syllabi' or drag a PDF into the uploader to begin multimodal extraction.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="rounded-3xl bg-white border border-mq-border p-5 shadow-[var(--mq-shadow-sm)] hover:border-mq-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge bg-mq-surface-blue text-mq-primary-dark font-bold text-xs">
                          Grade {doc.grade}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            doc.status === 'extracted'
                              ? 'bg-[var(--mq-success-bg)] text-mq-success'
                              : doc.status === 'extracting'
                              ? 'bg-mq-surface-yellow text-mq-warning animate-pulse'
                              : doc.status === 'error'
                              ? 'bg-[var(--mq-danger-bg)] text-mq-danger'
                              : 'bg-mq-surface-soft text-mq-text-muted'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-mq-text-strong truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <p className="text-xs text-mq-text-muted mt-1">
                        {doc.page_count} Pages · {(doc.file_size / 1024 / 1024).toFixed(1)} MB · {doc.subject}
                      </p>

                      {doc.status === 'extracting' && (
                        <div className="mt-3" aria-live="polite">
                          <div className="flex justify-between text-[11px] font-semibold text-mq-text-muted mb-1">
                            <span>
                              {doc.progress_stage === 'transcribing' ? 'Reading pages'
                                : doc.progress_stage === 'extracting' ? 'Finding problems'
                                : 'Waiting in queue'}
                            </span>
                            {!!doc.progress_total && <span>{doc.progress_done}/{doc.progress_total}</span>}
                          </div>
                          <div className="h-1.5 rounded-full bg-mq-surface-soft overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mq-primary transition-all duration-700"
                              style={{ width: `${doc.progress_total ? (100 * (doc.progress_done ?? 0)) / doc.progress_total : 3}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {doc.status === 'error' && doc.error_message && (
                        <p className="mt-3 text-[11px] font-semibold text-mq-danger bg-[var(--mq-danger-bg)] rounded-lg px-2.5 py-1.5">
                          {doc.error_message}
                        </p>
                      )}

                      {doc.status === 'extracted' && !!doc.rejected_count && (
                        <details className="mt-3 text-[11px] text-mq-text-muted">
                          <summary className="cursor-pointer font-semibold">
                            {doc.rejected_count} candidate{doc.rejected_count === 1 ? '' : 's'} rejected by verification
                          </summary>
                          <ul className="mt-1.5 space-y-0.5 pl-3">
                            {Object.entries(doc.rejection_summary ?? {})
                              .sort((a, b) => b[1] - a[1])
                              .map(([reason, n]) => (
                                <li key={reason} className="flex justify-between gap-3">
                                  <span>{reason}</span>
                                  <span className="font-bold text-mq-text-strong">{n}</span>
                                </li>
                              ))}
                          </ul>
                        </details>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-mq-border/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-mq-text-strong">
                        {doc.extracted_problem_count} Problems
                      </span>
                      <button
                        id={`extract-doc-${doc.doc_id}`}
                        disabled={isExtractingDocId === doc.doc_id || doc.status === 'extracting'}
                        onClick={() => handleExtractDocument(doc.doc_id)}
                        className="btn btn-secondary !text-xs !py-1.5 !px-3 flex items-center gap-1"
                      >
                        {isExtractingDocId === doc.doc_id || doc.status === 'extracting' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {doc.status === 'extracting' ? 'Extracting…'
                          : doc.status === 'error' ? 'Retry Extraction'
                          : doc.extracted_problem_count > 0 ? 'Re-extract Problems' : 'Extract Math Problems'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM PROBLEM BANK */}
      {activeTab === 'bank' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters Bar */}
          <div className="rounded-3xl bg-white border border-mq-border p-4 sm:p-5 shadow-[var(--mq-shadow-sm)] flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-mq-text-muted uppercase tracking-wider flex items-center gap-1 mr-1">
                <Filter size={14} /> Grade:
              </span>
              {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                <button
                  key={String(g)}
                  id={`filter-grade-${g}`}
                  onClick={() => setSelectedGradeFilter(g)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                    selectedGradeFilter === g
                      ? 'bg-mq-primary text-white shadow-xs'
                      : 'bg-mq-surface-soft text-mq-text-muted hover:text-mq-text'
                  }`}
                >
                  {g === 'all' ? 'All Grades' : `Grade ${g}`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-sm min-w-[200px]">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-2.5 text-mq-text-muted" />
                <input
                  type="text"
                  placeholder="Search topic (Addition, Money...)"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-mq-border focus:ring-2 focus:ring-mq-primary/40 focus:outline-none bg-mq-surface-soft/30"
                />
              </div>
            </div>
          </div>

          {/* Teacher Customization: Student Behavioral Needs & Cognitive Load Tuning */}
          <StudentBehaviorSelector
            selectedProfile={selectedStudentProfile}
            onSelectProfile={(prof) => {
              setSelectedStudentProfile(prof);
              // Auto-tune cognitive load based on archetype
              if (prof.inattention_level === 'HIGH') {
                setCustomAdhdSettings((prev) => ({ ...prev, distractor_count: 2, visual_clutter_filter: true }));
              }
              if (prof.impulsivity_level === 'HIGH') {
                setCustomAdhdSettings((prev) => ({ ...prev, timer_enabled: false, step_granularity: 'MAXIMAL_THREE_TIER' }));
              }
              if (prof.activity_pace === 'CALM_STEP_BY_STEP') {
                setCustomAdhdSettings((prev) => ({ ...prev, timer_enabled: false, stimulus_density: 'LOW' }));
              }
            }}
            customStudentName={customStudentName}
            onCustomStudentNameChange={setCustomStudentName}
          />

          {/* Quick Controls Bar: Theme & Customizer Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-mq-surface-soft/80 border border-mq-border px-4 py-3 rounded-2xl">
            <button
              type="button"
              onClick={() => setShowAdvancedCustomizer(!showAdvancedCustomizer)}
              className="btn btn-secondary !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shadow-2xs font-bold"
            >
              <Sliders size={13} className="text-mq-primary" />
              <span>{showAdvancedCustomizer ? 'Hide Cognitive Load Knobs' : 'Fine-Tune Cognitive Load Knobs (CLI Sliders)'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-mq-text-muted">Game Theme:</span>
                <select
                  value={gameTheme}
                  onChange={(e) => setGameTheme(e.target.value as GameTheme)}
                  className="rounded-xl border border-mq-border bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="VILLAGE_MARKET">🧺 Village Market (Pola)</option>
                  <option value="JUNGLE_ADVENTURE">🐘 Jungle Adventure (Sinharaja)</option>
                  <option value="SPACE_QUEST">🚀 Space Quest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Cognitive Load Tuning Panel */}
          {showAdvancedCustomizer && (
            <CognitiveLoadCustomizer
              settings={customAdhdSettings}
              onChangeSettings={setCustomAdhdSettings}
              behaviorProfile={selectedStudentProfile}
              baseCli={2.4}
            />
          )}

          {/* Problem Cards Grid */}
          {problems.length === 0 ? (
            <div className="rounded-3xl bg-white border border-mq-border p-12 text-center text-mq-text-muted space-y-3">
              <FileText size={40} className="mx-auto text-mq-primary/40" />
              <p className="font-semibold text-sm">No mathematics problems found matching current filters.</p>
              <button onClick={handleSeedLocal} className="btn btn-secondary !text-xs !py-1.5 !px-3 mx-auto">
                Seed Problems from Syllabi
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {problems.map((prob) => (
                <div
                  key={prob.problem_id}
                  className="rounded-3xl bg-white border border-mq-border p-5 shadow-[var(--mq-shadow-sm)] hover:border-mq-primary/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="badge bg-mq-surface-blue text-mq-primary-dark font-bold text-xs">
                          Grade {prob.grade}
                        </span>
                        <span className="badge text-[10px] font-semibold">{prob.topic}</span>
                        {prob.is_money && (
                          <span className="badge bg-mq-surface-yellow text-mq-warning text-[10px] font-bold">
                            Rs. Currency
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-mq-text-muted">{prob.problem_id}</span>
                    </div>

                    <p className="sinhala font-medium text-mq-text-strong text-base leading-relaxed mt-2">
                      {prob.raw_problem_text}
                    </p>

                    {prob.child_prompt_si && (
                      <div className="mt-2.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-900 flex items-start gap-2">
                        <span className="text-lg select-none">🐘</span>
                        <div>
                          <span className="font-bold block text-[10px] uppercase text-amber-800">
                            Gaja Child Voice (ළමා ආමන්ත්‍රණය):
                          </span>
                          <span className="sinhala font-medium text-amber-950 text-xs leading-relaxed">
                            {prob.child_prompt_si}
                          </span>
                        </div>
                      </div>
                    )}

                    {prob.english_translation && (
                      <p className="text-xs text-mq-text-muted italic mt-1.5">
                        "{prob.english_translation}"
                      </p>
                    )}

                    {prob.competency_desc && (
                      <p className="text-[11px] text-mq-text-muted/80 mt-2 bg-mq-surface-soft/60 px-2.5 py-1 rounded-lg">
                        <strong>Competency {prob.competency_code}:</strong> {prob.competency_desc}
                      </p>
                    )}

                    {prob.source_quote && (
                      <blockquote className="mt-2 border-l-4 border-mq-primary/40 pl-2.5 text-[11px] text-mq-text-muted">
                        <span className="font-bold text-mq-text-strong not-italic">
                          {prob.source_kind === 'exercise' ? 'Printed in the guide' : 'Written for this competency'}
                          {prob.page_number ? ` · page ${prob.page_number}` : ''}:
                        </span>{' '}
                        <span className="sinhala">“{prob.source_quote}”</span>
                      </blockquote>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-mq-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-mq-text-muted">{prob.operation ?? 'Task'}:</span>
                      <code className="bg-mq-surface-soft px-1.5 py-0.5 rounded text-mq-text-strong font-bold">
                        {problemSummary(prob)}
                      </code>
                    </div>

                    <button
                      id={`adapt-prob-${prob.problem_id}`}
                      disabled={adaptingProbId === prob.problem_id}
                      onClick={() => handleAdaptProblem(prob)}
                      className="btn btn-primary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 shadow-sm"
                    >
                      {adaptingProbId === prob.problem_id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      <span>
                        Adapt for {customStudentName.trim() || selectedStudentProfile?.student_name?.split(' ')[0] || 'Learner'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BLUEPRINT STUDIO & REVIEW */}
      {activeTab === 'review' && (
        <div className="grid lg:grid-cols-[340px_1fr] gap-6 animate-fade-in">
          {/* Blueprints Sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-mq-border p-4 shadow-[var(--mq-shadow-sm)]">
              <h2 className="text-sm font-bold text-mq-text-strong mb-3 flex items-center gap-1.5">
                <Wand2 size={15} className="text-mq-primary" /> Generated Game Blueprints ({blueprints.length})
              </h2>

              {blueprints.length === 0 ? (
                <p className="text-xs text-mq-text-muted py-6 text-center">
                  No blueprints generated yet. Pick a question from the Problem Bank to adapt it.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {blueprints.map((env) => {
                    const bp = env.blueprint;
                    const isSel = selectedBlueprint?.blueprint.activity_id === bp.activity_id;
                    return (
                      <li key={bp.activity_id}>
                        <button
                          onClick={() => {
                            setSelectedBlueprint(env);
                            if (bp.story_narrative) {
                              setGajaIntroText(bp.story_narrative.gaja_dialogue.intro.si);
                              setGajaHintText(bp.story_narrative.gaja_dialogue.hint.si);
                            }
                          }}
                          className={`w-full text-left rounded-2xl p-3 border transition-all ${
                            isSel
                              ? 'border-mq-primary bg-mq-surface-blue shadow-xs'
                              : 'border-mq-border/70 hover:bg-mq-surface-soft'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-mq-text-strong">{bp.source_question_id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[bp.status]}`}>
                              {bp.status}
                            </span>
                          </div>
                          <p className="sinhala text-xs text-mq-text-muted truncate line-clamp-1">
                            {env.raw_sinhala_question}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-mq-text-muted">
                            <span>Grade {bp.grade}</span>
                            <span>·</span>
                            <span>CLI {env.cli_score.toFixed(2)}</span>
                            <span>·</span>
                            <span>{bp.game_theme.replace('_', ' ')}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Inspector Panel */}
          <section className="rounded-3xl bg-white border border-mq-border p-6 shadow-[var(--mq-shadow-sm)] min-h-[500px]">
            {selectedBlueprint ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-mq-border/80">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge bg-mq-surface-blue text-mq-primary-dark font-bold text-xs">
                        Grade {selectedBlueprint.blueprint.grade}
                      </span>
                      <span className="badge text-xs font-semibold">{selectedBlueprint.blueprint.topic}</span>
                      <span className="badge bg-mq-surface-purple text-purple-700 text-xs font-bold">
                        {selectedBlueprint.blueprint.game_theme.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="sinhala text-lg font-semibold text-mq-text-strong mt-2">
                      {selectedBlueprint.raw_sinhala_question}
                    </p>
                  </div>
                  <span className={`badge ${STATUS_STYLE[selectedBlueprint.blueprint.status]} font-bold capitalize`}>
                    {selectedBlueprint.blueprint.status}
                  </span>
                </div>

                {/* Cognitive Load and ADHD Metrics */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-mq-border p-4 bg-mq-surface-soft/40 space-y-2">
                    <CliMeter score={selectedBlueprint.blueprint.effective_cli_score ?? selectedBlueprint.cli_score} />
                    {selectedBlueprint.blueprint.effective_cli_score && selectedBlueprint.blueprint.effective_cli_score !== selectedBlueprint.cli_score && (
                      <div className="text-[10px] text-mq-text-muted flex justify-between font-bold pt-1 border-t border-mq-border/50">
                        <span>Raw Baseline CLI: {selectedBlueprint.cli_score.toFixed(2)}</span>
                        <span className="text-mq-success">
                          Scaffolded Delta: {(selectedBlueprint.blueprint.effective_cli_score - selectedBlueprint.cli_score).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-mq-border p-4 bg-mq-surface-soft/40 flex flex-col justify-between gap-3">
                    <div className="flex flex-wrap gap-2 content-start">
                      <span className="badge font-bold">
                        <Layers size={12} />
                        {selectedBlueprint.blueprint.adhd_game_settings.step_granularity === 'MAXIMAL_THREE_TIER'
                          ? '3-Tier Micro-Steps'
                          : '2-Tier Micro-Steps'}
                      </span>
                      <span className="badge">
                        {selectedBlueprint.blueprint.adhd_game_settings.distractor_count} Distractors / Step
                      </span>
                      <span className="badge">
                        Stimulus: {selectedBlueprint.blueprint.adhd_game_settings.stimulus_density}
                      </span>
                      <span className="badge">
                        {selectedBlueprint.blueprint.adhd_game_settings.visual_clutter_filter ? 'Clutter Filter ON' : 'Full Visuals'}
                      </span>
                      <span className="badge">
                        {selectedBlueprint.blueprint.adhd_game_settings.timer_enabled ? 'Timer ON' : 'Untimed / Safe Pacing'}
                      </span>
                      {selectedBlueprint.blueprint.customized_by_teacher && (
                        <span className="badge bg-purple-100 text-purple-800 font-bold">
                          ✨ Teacher Customized
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-mq-border/60">
                      <span className="text-[11px] text-mq-text-muted">
                        {selectedBlueprint.blueprint.student_name ? (
                          <>Target Learner: <strong className="text-mq-primary">{selectedBlueprint.blueprint.student_name}</strong></>
                        ) : (
                          'General Classroom Activity'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAdhdSettings({
                            step_granularity: selectedBlueprint.blueprint.adhd_game_settings.step_granularity,
                            distractor_count: selectedBlueprint.blueprint.adhd_game_settings.distractor_count,
                            stimulus_density: selectedBlueprint.blueprint.adhd_game_settings.stimulus_density,
                            visual_clutter_filter: selectedBlueprint.blueprint.adhd_game_settings.visual_clutter_filter,
                            timer_enabled: selectedBlueprint.blueprint.adhd_game_settings.timer_enabled,
                          });
                          setIsTuningModalOpen(true);
                        }}
                        className="btn btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1.5 shadow-2xs font-bold"
                      >
                        <Sliders size={12} className="text-mq-primary" />
                        <span>Re-tune Cognitive Load</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cultural Narrative Backdrop & Gaja Dialogue */}
                {selectedBlueprint.blueprint.story_narrative && (
                  <div className="rounded-2xl border border-mq-border p-5 bg-gradient-to-r from-mq-surface-soft via-white to-mq-surface-soft/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-mq-text-strong flex items-center gap-1.5">
                        <span className="text-xl">🐘</span> Story Backdrop & Mascot Narrative (Gaja the Elephant)
                      </h3>
                      <span className="text-[11px] font-semibold text-mq-primary">
                        {selectedBlueprint.blueprint.story_narrative.title_en}
                      </span>
                    </div>

                    <p className="sinhala text-sm text-mq-text leading-relaxed">
                      {selectedBlueprint.blueprint.story_narrative.backdrop_si}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-mq-text-muted">Gaja Intro Speech (Sinhala)</label>
                        <input
                          type="text"
                          value={gajaIntroText}
                          onChange={(e) => setGajaIntroText(e.target.value)}
                          className="sinhala w-full rounded-xl border border-mq-border bg-white px-3 py-1.5 text-xs text-mq-text-strong focus:outline-none focus:ring-1 focus:ring-mq-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-mq-text-muted">Gaja Gentle Hint (Sinhala)</label>
                        <input
                          type="text"
                          value={gajaHintText}
                          onChange={(e) => setGajaHintText(e.target.value)}
                          className="sinhala w-full rounded-xl border border-mq-border bg-white px-3 py-1.5 text-xs text-mq-text-strong focus:outline-none focus:ring-1 focus:ring-mq-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Micro-Steps & Cognitive Distractors */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-mq-text-strong">ADHD Micro-Step Breakdown & Options</h3>
                  <ol className="space-y-3">
                    {selectedBlueprint.blueprint.micro_steps.map((step) => (
                      <li key={step.step_order} className="rounded-2xl border border-mq-border bg-white p-4 shadow-xs">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-7 h-7 rounded-full bg-mq-primary text-white flex items-center justify-center font-bold text-xs">
                            {step.step_order}
                          </span>
                          <div>
                            <p className="sinhala font-bold text-sm text-mq-text-strong">{step.instruction_si}</p>
                            <p className="text-xs text-mq-text-muted">
                              {step.instruction_en} · <code className="text-[10px] font-mono">{step.action_type}</code> · Asset: {step.target_visual_asset}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {step.game_options.map((opt, idx) => (
                            <div
                              key={idx}
                              title={opt.distractor_rationale ?? 'Correct target value'}
                              className={`rounded-xl border px-3 py-1.5 text-xs flex items-center gap-2 ${
                                opt.is_correct
                                  ? 'border-mq-success bg-[var(--mq-success-bg)] text-mq-text-strong'
                                  : 'border-mq-border bg-white text-mq-text'
                              }`}
                            >
                              <span className="font-bold">{opt.text_en}</span>
                              {opt.is_correct ? (
                                <span className="text-[10px] font-bold text-mq-success uppercase">Correct</span>
                              ) : (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DISTRACTOR_STYLE[opt.distractor_type ?? ''] ?? ''}`}>
                                  {opt.distractor_type}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Actions Bar */}
                <div className="pt-4 border-t border-mq-border flex flex-wrap items-center gap-3">
                  <button
                    id="preview-as-learner-btn"
                    onClick={() => {
                      onPlay(selectedBlueprint);
                      setActiveTab('preview');
                    }}
                    className="btn btn-secondary flex items-center gap-1.5"
                  >
                    <Play size={16} /> Preview in Learner Runtime
                  </button>

                  <div className="flex-1" />

                  <button
                    id="reject-blueprint-btn"
                    disabled={loading || selectedBlueprint.blueprint.status === 'rejected'}
                    onClick={() => handleUpdateStatus('rejected')}
                    className="btn btn-secondary !text-mq-danger flex items-center gap-1.5"
                  >
                    <X size={16} /> Reject
                  </button>

                  <button
                    id="approve-blueprint-btn"
                    disabled={loading || selectedBlueprint.blueprint.status === 'approved'}
                    onClick={() => handleUpdateStatus('approved')}
                    className="btn btn-primary flex items-center gap-1.5"
                  >
                    <Check size={16} /> Approve Activity
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-mq-text-muted py-16 space-y-3">
                <Wand2 className="text-mq-primary/40" size={48} />
                <p className="font-semibold text-sm">Select or generate a blueprint to review.</p>
                <button
                  onClick={() => setActiveTab('bank')}
                  className="btn btn-secondary !text-xs !py-1.5 !px-3"
                >
                  Choose Question from Bank
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: LEARNER PREVIEW PLAYER */}
      {activeTab === 'preview' && (
        <div className="animate-fade-in">
          {selectedBlueprint ? (
            <div className="rounded-3xl overflow-hidden border border-mq-border shadow-xl">
              <GamePlayer
                envelope={selectedBlueprint}
                onExit={() => setActiveTab('review')}
              />
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-mq-border p-16 text-center text-mq-text-muted space-y-4 max-w-lg mx-auto">
              <Play size={48} className="mx-auto text-mq-primary/40" />
              <h3 className="font-bold text-lg text-mq-text-strong">No Active Activity Selected</h3>
              <p className="text-xs">
                To test the interactive gameplay runtime, choose a question from the Problem Bank and adapt it into a game blueprint.
              </p>
              <button
                onClick={() => setActiveTab('bank')}
                className="btn btn-primary !text-xs !py-2 !px-4 mx-auto flex items-center gap-1.5"
              >
                Go to Curriculum Problem Bank <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Companion Dressing Room Wardrobe Modal */}
      <CompanionWardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => setIsWardrobeOpen(false)}
      />

      {/* Teacher Re-tune Modal */}
      {isTuningModalOpen && selectedBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-mq-border pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-mq-primary" />
                <h3 className="font-extrabold text-base text-mq-text-strong">
                  Re-tune Cognitive Load & Micro-Steps
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTuningModalOpen(false)}
                className="p-1 rounded-full text-mq-text-muted hover:text-mq-text hover:bg-mq-surface-soft"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-mq-text-muted">
              Dynamically adjust scaffolding, distractors, or pacing for <strong>{selectedBlueprint.blueprint.source_question_id}</strong>. Micro-steps and distractors will be deterministically recalculated while keeping the story narrative and mascot dialogue intact.
            </p>

            <CognitiveLoadCustomizer
              settings={customAdhdSettings}
              onChangeSettings={setCustomAdhdSettings}
              behaviorProfile={selectedStudentProfile}
              baseCli={selectedBlueprint.cli_score}
            />

            <div className="flex items-center justify-between pt-3 border-t border-mq-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-mq-text-muted">Theme:</span>
                <select
                  value={gameTheme}
                  onChange={(e) => setGameTheme(e.target.value as GameTheme)}
                  className="rounded-xl border border-mq-border bg-white px-2.5 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value="VILLAGE_MARKET">🧺 Village Market (Pola)</option>
                  <option value="JUNGLE_ADVENTURE">🐘 Jungle Adventure (Sinharaja)</option>
                  <option value="SPACE_QUEST">🚀 Space Quest</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTuningModalOpen(false)}
                  className="btn btn-secondary !text-xs !py-2 !px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isTuning}
                  onClick={handleTuneBlueprint}
                  className="btn btn-primary !text-xs !py-2 !px-4 flex items-center gap-1.5 shadow-sm"
                >
                  {isTuning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isTuning ? 'Recalculating...' : 'Apply & Recalculate Blueprint'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdaptationStudio;

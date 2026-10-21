import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, ClipboardList, ShieldCheck, CheckCircle2, ArrowRight, CalendarDays, Users } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner } from '../types';
import type { AdhdInformationData, SupportInformation } from '../types/onboarding';
import { ADHD_DIAGNOSIS_STATUS_OPTIONS, ADHD_PRESENTATION_OPTIONS } from '../types/onboarding';
import { AdhdInformationStep } from '../components/onboarding/AdhdInformationStep';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { SnapIvProgressSection } from '../components/parent/SnapIvProgress';
import { readRememberedChild, rememberChild } from '../utils/rememberedChild';
import { LoadingState, EmptyState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.support;

const nameOf = (child: Learner) => child.preferredName || child.firstName;

const Card: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  title,
  action,
  children,
}) => (
  <section className="bg-white rounded-3xl border border-mq-border shadow-xs p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-mq-text-strong flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-mq-border/60 last:border-b-0">
    <dt className="text-base text-mq-text-muted">{label}</dt>
    <dd className="text-base font-semibold text-mq-text-strong">{value}</dd>
  </div>
);

const editButton = (label: string, onClick: () => void) => (
  <button
    type="button"
    onClick={onClick}
    className="btn btn-secondary min-h-[44px] px-4 rounded-full text-base inline-flex items-center gap-2"
  >
    {label}
  </button>
);

/* -------------------------------------------------------------------------------------------- */

export const ParentSupportInfoPage: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [info, setInfo] = useState<SupportInformation | null>(null);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'adhd' | null>(null);
  const [savingAdhd, setSavingAdhd] = useState(false);
  // Shows the confirmation passed back after saving SNAP-IV
  const [toast, setToast] = useState<string | null>(
    (useLocation().state as { toast?: string } | null)?.toast ?? null
  );

  const loadLearners = useCallback(async () => {
    setLoadingLearners(true);
    setError(null);
    const res = await learnerApi.listLearners();
    if (res.success && res.data) {
      const list = res.data;
      setLearners(list);
      setSelectedId((current) => {
        if (current && list.some((l) => l.learnerId === current)) return current;
        const remembered = readRememberedChild();
        if (remembered && list.some((l) => l.learnerId === remembered)) return remembered;
        return list[0]?.learnerId ?? null;
      });
    } else {
      setError(res.message || t.loadError);
    }
    setLoadingLearners(false);
  }, []);

  useEffect(() => {
    loadLearners();
  }, [loadLearners]);

  const child = learners.find((l) => l.learnerId === selectedId) || null;
  const started = Boolean(child && child.onboardingStatus !== 'NOT_STARTED');

  const loadInfo = useCallback(async () => {
    if (!selectedId || !started) {
      setInfo(null);
      return;
    }
    setLoadingInfo(true);
    const res = await onboardingApi.getSupportInformation(selectedId);
    setInfo(res.success && res.data ? res.data : null);
    if (!res.success) setError(res.message || t.loadError);
    setLoadingInfo(false);
  }, [selectedId, started]);

  useEffect(() => {
    setEditing(null);
    setError(null);
    loadInfo();
  }, [loadInfo]);

  const selectChild = (id: string) => {
    setSelectedId(id);
    rememberChild(id);
  };

  const afterSave = async () => {
    setEditing(null);
    setToast(t.saved);
    await loadInfo();
  };

  const saveAdhd = async (data: AdhdInformationData) => {
    if (!selectedId) return;
    setSavingAdhd(true);
    const res = await onboardingApi.saveAdhdInformation(selectedId, data);
    setSavingAdhd(false);
    if (res.success) await afterSave();
    else setError(res.message || t.saveError);
  };

  const adhd = info?.adhdInformation;
  const adhdStatus = ADHD_DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === adhd?.diagnosisStatus);
  const adhdType = ADHD_PRESENTATION_OPTIONS.find((o) => o.value === adhd?.reportedPresentation);
  const snap = info?.snapIv;

  return (
    <div className="space-y-5 animate-fade-in text-base">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-mq-text-strong">{t.title}</h1>
        <p className="text-base text-mq-text-muted leading-relaxed">{t.intro}</p>
      </header>

      {toast && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-mq-success/30 bg-mq-success-bg px-4 py-3 text-base text-mq-text-strong">
          <CheckCircle2 size={20} className="shrink-0 text-mq-success" />
          <span>{toast}</span>
        </p>
      )}

      {learners.length > 1 && (
        <ChildSwitcher learners={learners} selectedId={selectedId} onSelect={selectChild} />
      )}

      {loadingLearners && <LoadingState message={parentText.common.loading} minHeightClass="min-h-[200px]" />}
      {error && <ErrorAlert message={error} retryLabel={parentText.common.retry} onRetry={loadLearners} />}

      {!loadingLearners && learners.length === 0 && (
        <EmptyState
          icon={<Users size={36} />}
          title={parentText.overview.noChildrenTitle}
          description={parentText.overview.noChildrenText}
          action={<Link to="/learners" className="btn btn-primary min-h-[44px] px-6 rounded-full text-base">{parentText.overview.addFirstChild}</Link>}
        />
      )}

      {child && !started && (
        <section className="bg-white rounded-3xl border border-mq-border p-5 space-y-3">
          <h2 className="text-lg font-bold text-mq-text-strong">{t.notStartedTitle}</h2>
          <p className="text-base text-mq-text">{t.notStartedText(nameOf(child))}</p>
          <Link to={`/learners/${child.learnerId}/onboarding`} className="btn btn-primary min-h-[48px] px-6 rounded-full inline-flex items-center gap-2 text-base">
            <span>{parentText.overview.startAssessment}</span>
            <ArrowRight size={18} />
          </Link>
        </section>
      )}

      {child && started && loadingInfo && <LoadingState message={parentText.common.loading} minHeightClass="min-h-[160px]" />}

      {child && started && !loadingInfo && info && (
        <>
          {/* 1. ADHD information */}
          {editing === 'adhd' ? (
            <AdhdInformationStep
              standalone
              initialData={adhd}
              onSave={saveAdhd}
              onBack={() => setEditing(null)}
              isSaving={savingAdhd}
            />
          ) : (
            <Card
              icon={<Stethoscope size={20} className="text-mq-primary shrink-0" />}
              title={t.adhdTitle}
              action={editButton(adhd ? t.edit : t.add, () => setEditing('adhd'))}
            >
              {adhd ? (
                <dl>
                  <Row label={t.adhdDiagnosed} value={adhdStatus?.labelSi ?? '—'} />
                  {adhdType && <Row label={t.adhdType} value={adhdType.labelSi} />}
                  {adhd.diagnosisReportedMonth && <Row label={t.adhdMonth} value={adhd.diagnosisReportedMonth} />}
                </dl>
              ) : (
                <p className="text-base text-mq-text-muted">{t.notProvided}</p>
              )}
            </Card>
          )}

          {/* 2. SNAP-IV status, history over time and descriptive comparison (parent-reported; not a diagnosis) */}
          <Card
            icon={<ClipboardList size={20} className="text-mq-primary shrink-0" />}
            title={t.snapTitle}
            action={
              <Link
                to={`/learners/${child.learnerId}/snap-iv`}
                state={{ from: '/parent/dashboard/support-info' }}
                className="btn btn-secondary min-h-[44px] px-4 rounded-full text-base inline-flex items-center gap-2"
              >
                <span>{snap?.history.length ? t.snapFillAgain : t.snapFill}</span>
                <ArrowRight size={16} />
              </Link>
            }
          >
            <p className="text-base text-mq-text-strong font-semibold">{snap ? t.snapStatus[snap.status] : '—'}</p>
            {snap && snap.history.length > 0 ? (
              <SnapIvProgressSection history={snap.history} progress={snap.progress} />
            ) : (
              <p className="flex items-center gap-2 text-base text-mq-text-muted">
                <CalendarDays size={16} className="shrink-0" />
                {t.snapHistoryEmpty}
              </p>
            )}
            {!(snap && snap.history.length > 0) && (
              <p className="text-sm text-mq-text-muted leading-relaxed">{t.snapHistoryNotice}</p>
            )}
          </Card>
        </>
      )}

      <p className="flex items-start gap-2 rounded-2xl bg-mq-surface-soft border border-mq-border/70 px-4 py-3 text-sm text-mq-text-muted leading-relaxed">
        <ShieldCheck size={18} className="shrink-0 mt-0.5 text-mq-success" />
        <span>{t.privacy}</span>
      </p>
    </div>
  );
};

export default ParentSupportInfoPage;

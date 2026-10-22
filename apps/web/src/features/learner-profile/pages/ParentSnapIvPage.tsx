import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner } from '../types';
import type { SnapIvItemAnswer } from '../types/onboarding';
import { SnapIvStep } from '../components/onboarding/SnapIvStep';
import { snapIvDate } from '../utils/snapIvProgress';
import { LoadingState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.snap;
const BACK_TO = '/parent/dashboard';

/**
 * Optional SNAP-IV questionnaire opened from the parent dashboard (outside the onboarding sequence).
 * Uses the same parent-only endpoints and scoring as onboarding; it never changes the
 * parent-reported ADHD information or onboarding completion.
 *
 * Each save adds a new dated entry to the SNAP-IV history (earlier entries are never overwritten).
 * A repeat questionnaire starts blank, so the new answers describe the present rather than being
 * anchored to the previous ones.
 */
export const ParentSnapIvPage: React.FC = () => {
  const { learnerId } = useParams<{ learnerId: string }>();
  const navigate = useNavigate();
  // Return to the page that opened the questionnaire (home or ADHD & support information)
  const backTo = (useLocation().state as { from?: string } | null)?.from || BACK_TO;

  const [learner, setLearner] = useState<Learner | null>(null);
  const [savedResponses, setSavedResponses] = useState<SnapIvItemAnswer[] | undefined>(undefined);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!learnerId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [childRes, progRes, supportRes] = await Promise.all([
        learnerApi.getLearner(learnerId),
        onboardingApi.getProgress(learnerId),
        onboardingApi.getSupportInformation(learnerId),
      ]);
      if (!childRes.success || !childRes.data || !progRes.success || !progRes.data) {
        setErrorMessage(t.loadError);
        return;
      }
      setLearner(childRes.data);
      const latest = supportRes.success ? supportRes.data?.snapIv.history[0] : undefined;
      setLastCompletedAt(latest?.completedAt ?? null);
      // Repeat questionnaire: start blank (previous answers stay in the history)
      setSavedResponses(latest ? undefined : progRes.data.snapIvResponses ?? undefined);
    } catch {
      setErrorMessage(parentText.common.networkError);
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (responses: SnapIvItemAnswer[]) => {
    if (!learnerId || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await onboardingApi.submitSnapIv(learnerId, responses);
      if (res.success) {
        navigate(backTo, { state: { toast: t.saved } });
      } else {
        setErrorMessage(res.message || t.saveError);
      }
    } catch {
      setErrorMessage(t.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 min-h-[44px] text-base font-semibold text-mq-primary hover:underline"
      >
        <ArrowLeft size={18} />
        <span>{backTo === BACK_TO ? parentText.nav.short.home : parentText.nav.supportInfo}</span>
      </Link>

      {learner && (
        <p className="text-base text-mq-text-muted">
          {learner.preferredName || learner.firstName} • {parentText.common.grade(learner.grade)}
        </p>
      )}

      {isLoading && <LoadingState message={parentText.common.loading} minHeightClass="min-h-[200px]" />}

      {errorMessage && <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={load} />}

      {!isLoading && learner && lastCompletedAt && (
        <p role="note" className="flex items-start gap-2 rounded-2xl border border-mq-border bg-mq-surface-soft px-4 py-3 text-base text-mq-text">
          <History size={18} className="shrink-0 mt-0.5 text-mq-primary" />
          <span>{t.previousKept(snapIvDate(lastCompletedAt))}</span>
        </p>
      )}

      {!isLoading && learner && (
        <SnapIvStep
          standalone
          initialResponses={savedResponses}
          onSave={handleSave}
          onSaveAndExit={handleSave}
          onBack={() => navigate(backTo)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default ParentSnapIvPage;

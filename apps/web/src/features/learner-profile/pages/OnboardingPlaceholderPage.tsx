import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { PortalHeader } from '../../../shared/components/portal/PortalHeader';
import { OnboardingStatusBadge } from '../components/OnboardingStatusBadge';
import { LoadingState, ErrorAlert } from '../../../shared/components/ui/StateViews';
import { learnerApi } from '../services/learnerApi';
import { onboardingApi } from '../services/onboardingApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';
import type {
  OnboardingStepKey,
  OnboardingProgress,
  AdhdInformationData,
  AdhdInformationRecord,
  SnapIvStatus,
  LearningPreferencesData,
  SnapIvItemAnswer,
  SocialContextData,
  MathQuestion,
  MathItemAnswer,
  MathSubmissionExtras,
  OnboardingFullSummary,
} from '../types/onboarding';
import { isAdhdTypeReported } from '../types/onboarding';

import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { languageLabel } from '../components/parent/labels';
import { parentText } from '../../../shared/i18n/parentText';
import { AdhdInformationStep } from '../components/onboarding/AdhdInformationStep';
import { LearningPreferencesStep } from '../components/onboarding/LearningPreferencesStep';
import { SnapIvStep } from '../components/onboarding/SnapIvStep';
import { SocialContextStep } from '../components/onboarding/SocialContextStep';
import { ParentChildHandoverStep } from '../components/onboarding/ParentChildHandoverStep';
import { MathAssessmentStep } from '../components/onboarding/MathAssessmentStep';
import { OnboardingSummaryStep } from '../components/onboarding/OnboardingSummaryStep';

interface StepFlags {
  adhdDone: boolean;
  snapDone: boolean; // completed or skipped (SNAP-IV is optional)
  snapNotAsked: boolean; // parent reported the ADHD type, so SNAP-IV is offered from the dashboard instead
  prefsDone: boolean;
  socialDone: boolean;
  mathDone: boolean;
}

/**
 * First unfinished step in the parent sequence:
 * ADHD information -> SNAP-IV (optional; not asked when the ADHD type was reported) -> preferences
 * -> social context (optional) -> handover.
 * Mirrors the backend resolver, so resumed learners never repeat finished steps.
 */
const resolveNextStep = (flags: StepFlags, storedStep?: string): OnboardingStepKey => {
  if (flags.mathDone) return 'summary';
  if (!flags.adhdDone) return 'adhd_information';
  if (!flags.snapDone && !flags.snapNotAsked) return 'snap_iv';
  if (!flags.prefsDone) return 'preferences';
  // A parent who already moved past (or skipped) social context resumes at the handover.
  if (storedStep === 'handover' || storedStep === 'math_assessment') return 'handover';
  if (!flags.socialDone) return 'social_context';
  return 'handover';
};

export const OnboardingPlaceholderPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { learnerId } = useParams<{ learnerId: string }>();
  const navigate = useNavigate();

  const [learner, setLearner] = useState<Learner | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStepKey>('adhd_information');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  // Set when a parent opens ADHD information or SNAP-IV from the completed profile summary
  const [returnToSummary, setReturnToSummary] = useState(false);

  // Saved responses for resuming
  const [savedAdhd, setSavedAdhd] = useState<AdhdInformationRecord | null>(null);
  const [snapIvStatus, setSnapIvStatus] = useState<SnapIvStatus>('NOT_STARTED');
  const [savedPreferences, setSavedPreferences] = useState<Partial<LearningPreferencesData> | undefined>(undefined);
  const [savedSnapIv, setSavedSnapIv] = useState<SnapIvItemAnswer[] | undefined>(undefined);
  const [savedSocialContext, setSavedSocialContext] = useState<Partial<SocialContextData> | undefined>(undefined);

  // Math questions bank items
  const [mathQuestions, setMathQuestions] = useState<MathQuestion[]>([]);
  // Full summary for final step
  const [fullSummary, setFullSummary] = useState<OnboardingFullSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentFlags = (): StepFlags => ({
    adhdDone: Boolean(savedAdhd),
    snapDone: snapIvStatus !== 'NOT_STARTED',
    snapNotAsked: isAdhdTypeReported(savedAdhd),
    prefsDone: Boolean(savedPreferences),
    socialDone: Boolean(savedSocialContext),
    mathDone: progress?.status === 'COMPLETED',
  });

  const markCompleted = (step: string) =>
    setCompletedSteps((prev) => Array.from(new Set([...prev, step])));

  // Reloads the consolidated summary after an edit made from the completed profile summary
  const goBackToSummary = async () => {
    if (learnerId) {
      const sumRes = await onboardingApi.getSummary(learnerId);
      if (sumRes.success && sumRes.data) {
        setFullSummary(sumRes.data);
      }
    }
    setReturnToSummary(false);
    setCurrentStep('summary');
  };

  const openFromSummary = (step: OnboardingStepKey) => {
    setReturnToSummary(true);
    setCurrentStep(step);
  };

  // Initial Data Fetching
  const loadData = useCallback(async () => {
    if (!learnerId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch child profile
      const childRes = await learnerApi.getLearner(learnerId);
      if (!childRes.success || !childRes.data) {
        setErrorMessage(childRes.message || 'දරුවාගේ පැතිකඩ ලබාගැනීමට නොහැකි විය.');
        setIsLoading(false);
        return;
      }
      setLearner(childRes.data);

      // 2. Fetch or resume onboarding progress
      const progRes = await onboardingApi.getProgress(learnerId);
      if (progRes.success && progRes.data) {
        const p = progRes.data;
        setProgress(p);
        setCompletedSteps(p.completedSteps || []);

        if (p.learningPreferences) {
          setSavedPreferences(p.learningPreferences);
        }
        if (p.snapIvResponses) {
          setSavedSnapIv(p.snapIvResponses);
        }
        if (p.socialContext) {
          setSavedSocialContext(p.socialContext);
        }
        setSavedAdhd(p.adhdInformation ?? null);
        const resumedSnapStatus: SnapIvStatus =
          p.snapIvStatus ?? (p.snapIvCompleted ? 'COMPLETED' : 'NOT_STARTED');
        setSnapIvStatus(resumedSnapStatus);

        if (p.status === 'COMPLETED') {
          setCurrentStep('summary');
          const sumRes = await onboardingApi.getSummary(learnerId);
          if (sumRes.success && sumRes.data) {
            setFullSummary(sumRes.data);
          }
        } else {
          // Resume at the first unfinished step (also covers records saved in the previous order)
          setCurrentStep(
            resolveNextStep(
              {
                adhdDone: Boolean(p.adhdInformation),
                snapDone: resumedSnapStatus !== 'NOT_STARTED',
                snapNotAsked: isAdhdTypeReported(p.adhdInformation),
                prefsDone: Boolean(p.learningPreferences),
                socialDone: Boolean(p.socialContext),
                mathDone: false,
              },
              p.currentStep
            )
          );
        }
      }

      // 3. Pre-fetch grade-specific math questions
      const qRes = await onboardingApi.getMathQuestions(learnerId);
      if (qRes.success && qRes.data) {
        setMathQuestions(qRes.data);
      }
    } catch {
      setErrorMessage('සේවාදායකය සමඟ සම්බන්ධ වීමේදී දෝෂයක් හටගැනිණි.');
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Step 1: Parent-Reported ADHD Information
  const saveAdhd = async (data: AdhdInformationData): Promise<AdhdInformationRecord | null> => {
    if (!learnerId) return null;
    const res = await onboardingApi.saveAdhdInformation(learnerId, data);
    if (res.success && res.data) {
      setSavedAdhd(res.data.adhdInformation);
      markCompleted('adhd_information');
      return res.data.adhdInformation;
    }
    showToast(res.message || 'සුරැකීමට නොහැකි විය (Could not save).');
    return null;
  };

  const handleSaveAdhd = async (data: AdhdInformationData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const saved = await saveAdhd(data);
      if (saved) {
        showToast('තොරතුරු සුරකින ලදී (Information saved).');
        if (returnToSummary) {
          await goBackToSummary();
        } else {
          setCurrentStep(
            resolveNextStep({ ...currentFlags(), adhdDone: true, snapNotAsked: isAdhdTypeReported(saved) })
          );
        }
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdhdSaveAndExit = async (data: AdhdInformationData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      if (await saveAdhd(data)) {
        showToast('තොරතුරු සුරකින ලදී (Information saved).');
        navigate('/learners');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. සුරැකීමට නොහැකි විය.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Step 2: Optional SNAP-IV skip (previously saved responses are kept)
  const handleSkipSnapIv = async () => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.skipSnapIv(learnerId);
      if (res.success && res.data) {
        setSnapIvStatus(res.data.snapIvStatus);
        markCompleted('snap_iv');
        showToast(
          res.data.snapIvStatus === 'COMPLETED'
            ? 'කලින් සුරැකි පිළිතුරු එලෙසම තබා ඇත (Your earlier answers were kept).'
            : 'SNAP-IV මඟ හරින ලදී. පසුව සම්පූර්ණ කළ හැක (Skipped - you can complete it later).'
        );
        if (returnToSummary) {
          await goBackToSummary();
        } else {
          setCurrentStep(resolveNextStep({ ...currentFlags(), snapDone: true }));
        }
      } else {
        showToast(res.message || 'මඟ හැරීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Step 3: Learning Preferences
  const handleSavePreferences = async (data: LearningPreferencesData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.savePreferences(learnerId, data);
      if (res.success) {
        setSavedPreferences(data);
        markCompleted('preferences');
        setCurrentStep(resolveNextStep({ ...currentFlags(), prefsDone: true }));
        showToast('ඉගෙනුම් මනාපයන් සාර්ථකව සුරකින ලදී.');
      } else {
        showToast(res.message || 'සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePreferencesSaveAndExit = async (data: LearningPreferencesData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.savePreferences(learnerId, data);
      if (res.success) {
        setSavedPreferences(data);
        showToast('ඉගෙනුම් මනාපයන් සුරකින ලදී.');
        navigate('/learners');
      } else {
        showToast(res.message || 'සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. සුරැකීමට නොහැකි විය.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Step 2: SNAP-IV Questionnaire
  const handleSaveSnapIv = async (responses: SnapIvItemAnswer[]) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.submitSnapIv(learnerId, responses);
      if (res.success) {
        setSavedSnapIv(responses);
        setSnapIvStatus('COMPLETED');
        markCompleted('snap_iv');
        showToast('SNAP-IV ලකුණු සාර්ථකව සටහන් කරගන්නා ලදී.');
        if (returnToSummary) {
          await goBackToSummary();
        } else {
          setCurrentStep(resolveNextStep({ ...currentFlags(), snapDone: true }));
        }
      } else {
        showToast(res.message || 'SNAP-IV සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSnapIvSaveAndExit = async (responses: SnapIvItemAnswer[]) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.submitSnapIv(learnerId, responses);
      if (res.success) {
        setSavedSnapIv(responses);
        setSnapIvStatus('COMPLETED');
        showToast('SNAP-IV ලකුණු සුරකින ලදී.');
        navigate('/learners');
      } else {
        showToast(res.message || 'SNAP-IV සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. සුරැකීමට නොහැකි විය.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Step 4: Social Context (optional)
  const handleSaveSocialContext = async (data: SocialContextData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.saveSocialContext(learnerId, data);
      if (res.success) {
        setSavedSocialContext(data);
        markCompleted('social_context');
        setCurrentStep('handover');
        showToast('සමාජීය ඉගෙනුම් පසුබිම සටහන් කරගන්නා ලදී.');
      } else {
        showToast(res.message || 'සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSocialContextSaveAndExit = async (data: SocialContextData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.saveSocialContext(learnerId, data);
      if (res.success) {
        setSavedSocialContext(data);
        showToast('සමාජීය පසුබිම සුරකින ලදී.');
        navigate('/learners');
      } else {
        showToast(res.message || 'සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. සුරැකීමට නොහැකි විය.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Step 4: Handover continue
  const handleHandoverContinue = () => {
    setCurrentStep('math_assessment');
  };

  // Handle Step 5: Math Assessment Submit
  const handleMathSubmit = async (answers: MathItemAnswer[], extras?: MathSubmissionExtras) => {
    if (!learnerId || !learner || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.submitMathAssessment(
        learnerId,
        learner.grade,
        answers,
        extras
      );
      if (res.success && res.data) {
        setCompletedSteps((prev) =>
          Array.from(new Set([...prev, 'math_assessment', 'summary']))
        );
        // Refresh full summary
        const sumRes = await onboardingApi.getSummary(learnerId);
        if (sumRes.success && sumRes.data) {
          setFullSummary(sumRes.data);
        }
        setCurrentStep('summary');
        showToast('ගණිත ඇගයීම සාර්ථකව සම්පූර්ණ කරන ලදී!');
      } else {
        showToast(res.message || 'ඇගයීම සුරැකීමට නොහැකි විය.');
      }
    } catch {
      showToast('ජාල දෝෂයක් හටගැනිණි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMathSaveAndExit = async (_answers: MathItemAnswer[]) => {
    navigate('/learners');
  };

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner?.avatarId) || AVATAR_OPTIONS[0];

  const isMathAssessment = currentStep === 'math_assessment';

  return (
    <div className="min-h-screen bg-mq-bg text-mq-text selection:bg-mq-surface-blue pb-16">
      {/* Step Header: Distraction-free for Child Assessment, Portal Header for Parent Steps */}
      {isMathAssessment ? (
        <header className="bg-white/95 backdrop-blur-xs border-b border-teal-100 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-lg shrink-0 border border-teal-200">
                🌱
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-teal-950 block font-sinhala truncate">
                  The Living Canvas • ඔබේ පුංචි ලෝකය
                </span>
                <span className="text-[10px] text-teal-700/80 block truncate">
                  A Little World That Learns About Me • සන්සුන් ගවේෂණ පරිසරය
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/learners')}
              className="text-xs font-bold text-slate-500 hover:text-teal-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              Pause & Exit (පසුවට සුරකින්න)
            </button>
          </div>
        </header>
      ) : (
        <PortalHeader role="parent" />
      )}

      <main
        className={`mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 ${
          isMathAssessment ? 'max-w-7xl' : 'max-w-[1100px]'
        }`}
      >
        {/* Navigation Breadcrumb / Context Bar (Parent steps only) */}
        {!isMathAssessment && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              to="/learners"
              className="inline-flex items-center gap-2 text-xs font-bold text-mq-primary hover:text-mq-primary-hover transition-colors font-sinhala"
            >
              <ArrowLeft size={16} className="shrink-0" />
              <span>{parentText.onboarding.backToChildren}</span>
            </Link>

            {progress && progress.status === 'IN_PROGRESS' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-mq-surface-yellow text-mq-warning border border-mq-warning/30 font-sinhala shrink-0">
                <Clock size={13} className="shrink-0" />
                <span>{parentText.onboarding.progressSaved}</span>
              </span>
            )}
          </div>
        )}

        {/* Global Loading State */}
        {isLoading ? (
          <LoadingState message={parentText.onboarding.loading} />
        ) : errorMessage || !learner ? (
          <ErrorAlert
            message={errorMessage || parentText.onboarding.childNotFound}
            retryLabel={parentText.common.retry}
            onRetry={loadData}
          />
        ) : (
          <div className="space-y-6">
            {/* Child banner and stepper for parent steps; the summary has its own header */}
            {!isMathAssessment && currentStep !== 'summary' && (
              <>
                <div className="bg-white rounded-3xl border border-mq-border px-5 py-4 shadow-xs flex items-center gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <motion.div
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border ${avatar.bgColor} ${avatar.borderColor} shrink-0 cursor-default`}
                    >
                      <span>{avatar.icon}</span>
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <OnboardingStatusBadge
                          status={progress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'}
                        />
                      </div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong break-words leading-tight">
                        {learner.firstName}
                        {learner.preferredName && (
                          <span className="text-sm font-normal text-mq-text-muted ml-2">
                            ("{learner.preferredName}")
                          </span>
                        )}
                      </h1>
                      <p className="text-sm text-mq-text-muted mt-0.5">
                        {parentText.common.gradeAndAge(learner.grade, learner.age)} •{' '}
                        {parentText.onboarding.learningLanguage(languageLabel(learner.preferredLanguage))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stepper Navigation */}
                <OnboardingStepper
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                  hiddenSteps={
                    isAdhdTypeReported(savedAdhd) && snapIvStatus === 'NOT_STARTED' && currentStep !== 'snap_iv'
                      ? ['snap_iv']
                      : undefined
                  }
                  onSelectStep={(step) => {
                    // Allow jumping to already completed steps
                    if (completedSteps.includes(step)) {
                      setCurrentStep(step);
                    }
                  }}
                />
              </>
            )}

            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
                  className="fixed bottom-6 right-6 z-50 bg-mq-text-strong text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold font-sinhala"
                >
                  <CheckCircle2 size={16} className="text-mq-success" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Content with Subtle Motion Transitions (250ms, ADHD-friendly, respects reduced motion) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
                transition={{
                  duration: shouldReduceMotion ? 0.05 : 0.25,
                  ease: 'easeOut',
                }}
              >
                {/* Step 1: Parent-Reported ADHD Information */}
                {currentStep === 'adhd_information' && (
                  <AdhdInformationStep
                    initialData={savedAdhd}
                    onSave={handleSaveAdhd}
                    onSaveAndExit={handleAdhdSaveAndExit}
                    onBack={returnToSummary ? () => goBackToSummary() : undefined}
                    isSaving={isActionLoading}
                  />
                )}

                {/* Step 2: Optional SNAP-IV Questionnaire */}
                {currentStep === 'snap_iv' && (
                  <SnapIvStep
                    initialResponses={savedSnapIv}
                    onSave={handleSaveSnapIv}
                    onSaveAndExit={handleSnapIvSaveAndExit}
                    onSkip={handleSkipSnapIv}
                    onBack={() =>
                      returnToSummary ? goBackToSummary() : setCurrentStep('adhd_information')
                    }
                    isSaving={isActionLoading}
                  />
                )}

                {/* Step 3: Learning Preferences */}
                {currentStep === 'preferences' && (
                  <LearningPreferencesStep
                    initialData={savedPreferences}
                    onSave={handleSavePreferences}
                    onSaveAndExit={handlePreferencesSaveAndExit}
                    onBack={() =>
                      setCurrentStep(isAdhdTypeReported(savedAdhd) && snapIvStatus === 'NOT_STARTED' ? 'adhd_information' : 'snap_iv')
                    }
                    isSaving={isActionLoading}
                  />
                )}

                {/* Step 4: Social Learning Context (optional) */}
                {currentStep === 'social_context' && (
                  <SocialContextStep
                    initialData={savedSocialContext}
                    onSave={handleSaveSocialContext}
                    onSaveAndExit={handleSocialContextSaveAndExit}
                    onBack={() => setCurrentStep('preferences')}
                    onSkip={() => setCurrentStep('handover')}
                    isSaving={isActionLoading}
                  />
                )}

                {/* Step 4: Parent Child Handover */}
                {currentStep === 'handover' && (
                  <ParentChildHandoverStep
                    learner={learner}
                    onContinue={handleHandoverContinue}
                    onBack={() => setCurrentStep('social_context')}
                  />
                )}

                {/* Step 5: Mathematics Assessment */}
                {currentStep === 'math_assessment' && (
                  <MathAssessmentStep
                    grade={learner.grade}
                    preferredLanguage={learner.preferredLanguage}
                    primaryInstructionLanguage={learner.primaryInstructionLanguage}
                    sinhalaComprehension={learner.sinhalaComprehension}
                    englishComprehension={learner.englishComprehension}
                    learningPreferences={savedPreferences}
                    questions={mathQuestions}
                    onSubmit={handleMathSubmit}
                    onSaveAndExit={handleMathSaveAndExit}
                    onBack={() => setCurrentStep('handover')}
                    isSubmitting={isActionLoading}
                    avatarId={learner.avatarId}
                  />
                )}

                {/* Step 6: Summary & Baseline Profile */}
                {currentStep === 'summary' && fullSummary && (
                  <OnboardingSummaryStep
                    summary={fullSummary}
                    onEditAdhdInformation={() => openFromSummary('adhd_information')}
                    onCompleteSnapIv={() => openFromSummary('snap_iv')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default OnboardingPlaceholderPage;

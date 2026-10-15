import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  LearningPreferencesData,
  SnapIvItemAnswer,
  SocialContextData,
  MathQuestion,
  MathItemAnswer,
  OnboardingFullSummary,
} from '../types/onboarding';

import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { LearningPreferencesStep } from '../components/onboarding/LearningPreferencesStep';
import { SnapIvStep } from '../components/onboarding/SnapIvStep';
import { SocialContextStep } from '../components/onboarding/SocialContextStep';
import { ParentChildHandoverStep } from '../components/onboarding/ParentChildHandoverStep';
import { MathAssessmentStep } from '../components/onboarding/MathAssessmentStep';
import { OnboardingSummaryStep } from '../components/onboarding/OnboardingSummaryStep';

export const OnboardingPlaceholderPage: React.FC = () => {
  const { learnerId } = useParams<{ learnerId: string }>();
  const navigate = useNavigate();

  const [learner, setLearner] = useState<Learner | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStepKey>('preferences');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Saved responses for resuming
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

        if (p.status === 'COMPLETED') {
          setCurrentStep('summary');
          const sumRes = await onboardingApi.getSummary(learnerId);
          if (sumRes.success && sumRes.data) {
            setFullSummary(sumRes.data);
          }
        } else if (p.currentStep) {
          setCurrentStep(p.currentStep as OnboardingStepKey);
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

  // Handle Step 1: Learning Preferences
  const handleSavePreferences = async (data: LearningPreferencesData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.savePreferences(learnerId, data);
      if (res.success) {
        setSavedPreferences(data);
        setCompletedSteps((prev) => Array.from(new Set([...prev, 'preferences'])));
        setCurrentStep('snap_iv');
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
        setCompletedSteps((prev) => Array.from(new Set([...prev, 'snap_iv'])));
        setCurrentStep('social_context');
        showToast('SNAP-IV ලකුණු සාර්ථකව සටහන් කරගන්නා ලදී.');
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

  // Handle Step 3: Social Context
  const handleSaveSocialContext = async (data: SocialContextData) => {
    if (!learnerId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.saveSocialContext(learnerId, data);
      if (res.success) {
        setSavedSocialContext(data);
        setCompletedSteps((prev) => Array.from(new Set([...prev, 'social_context'])));
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
  const handleMathSubmit = async (answers: MathItemAnswer[]) => {
    if (!learnerId || !learner || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await onboardingApi.submitMathAssessment(
        learnerId,
        learner.grade,
        answers
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
        <header className="bg-white border-b border-mq-border/70 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-mq-surface-blue text-mq-primary font-bold flex items-center justify-center text-lg">
                🎯
              </div>
              <div>
                <span className="text-xs font-bold text-mq-text-strong block font-sinhala">
                  {learner?.firstName} ගේ ගණිත ඇගයීම (Math Assessment)
                </span>
                <span className="text-[10px] text-mq-text-muted">
                  Focus Mode • Minimal Distraction-Free Interface
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/learners')}
              className="text-xs font-bold text-mq-text-muted hover:text-mq-primary px-3 py-1.5 rounded-xl border border-mq-border hover:bg-mq-surface-soft transition-colors cursor-pointer"
            >
              Pause & Exit (පසුවට සුරකින්න)
            </button>
          </div>
        </header>
      ) : (
        <PortalHeader role="parent" />
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb / Context Bar (Parent steps only) */}
        {!isMathAssessment && (
          <div className="flex items-center justify-between">
            <Link
              to="/learners"
              className="inline-flex items-center gap-2 text-xs font-bold text-mq-primary hover:text-mq-primary-hover transition-colors font-sinhala"
            >
              <ArrowLeft size={16} />
              <span>මගේ දරුවන් වෙත ආපසු යන්න (Back to My Children)</span>
            </Link>

            {progress && progress.status === 'IN_PROGRESS' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-mq-surface-yellow text-mq-warning border border-mq-warning/30 font-sinhala">
                <Clock size={13} />
                <span>ප්‍රගතිය සුරැකිව පවතී (Resumable)</span>
              </span>
            )}
          </div>
        )}

        {/* Global Loading State */}
        {isLoading ? (
          <LoadingState message="ආරම්භක ඇගයීම් පද්ධතිය පූරණය වෙමින් පවතී..." />
        ) : errorMessage || !learner ? (
          <ErrorAlert
            message={errorMessage || 'දරුවාගේ තොරතුරු සොයාගත නොහැකි විය.'}
            onRetry={loadData}
          />
        ) : (
          <div className="space-y-6">
            {/* Child Profile Banner */}
            <div className="bg-white rounded-3xl border border-mq-border p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border ${avatar.bgColor} ${avatar.borderColor} shrink-0`}
                >
                  <span>{avatar.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-mq-primary">
                      {learner.preferredLanguage} මාධ්‍යය
                    </span>
                    <OnboardingStatusBadge
                      status={progress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'}
                    />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong mt-0.5">
                    {learner.firstName}
                    {learner.preferredName && (
                      <span className="text-sm font-normal text-mq-text-muted ml-2">
                        ("{learner.preferredName}")
                      </span>
                    )}
                  </h1>
                  <p className="text-xs text-mq-text-muted font-sinhala">
                    {learner.grade} ශ්‍රේණිය • වයස අවුරුදු {learner.age}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mq-text-muted block">
                  Learner ID
                </span>
                <span className="text-xs font-mono font-bold text-mq-text-strong block">
                  {learner.learnerId}
                </span>
              </div>
            </div>

            {/* Stepper Navigation */}
            <OnboardingStepper
              currentStep={currentStep}
              completedSteps={completedSteps}
              onSelectStep={(step) => {
                // Allow jumping to already completed steps
                if (completedSteps.includes(step)) {
                  setCurrentStep(step);
                }
              }}
            />

            {/* Toast Notification */}
            {toastMessage && (
              <div className="fixed bottom-6 right-6 z-50 bg-mq-text-strong text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold font-sinhala animate-fade-in">
                <CheckCircle2 size={16} className="text-mq-success" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Step 1: Learning Preferences */}
            {currentStep === 'preferences' && (
              <LearningPreferencesStep
                initialData={savedPreferences}
                onSave={handleSavePreferences}
                onSaveAndExit={handlePreferencesSaveAndExit}
                isSaving={isActionLoading}
              />
            )}

            {/* Step 2: SNAP-IV Questionnaire */}
            {currentStep === 'snap_iv' && (
              <SnapIvStep
                initialResponses={savedSnapIv}
                onSave={handleSaveSnapIv}
                onSaveAndExit={handleSnapIvSaveAndExit}
                onBack={() => setCurrentStep('preferences')}
                isSaving={isActionLoading}
              />
            )}

            {/* Step 3: Social Learning Context */}
            {currentStep === 'social_context' && (
              <SocialContextStep
                initialData={savedSocialContext}
                onSave={handleSaveSocialContext}
                onSaveAndExit={handleSocialContextSaveAndExit}
                onBack={() => setCurrentStep('snap_iv')}
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
                questions={mathQuestions}
                onSubmit={handleMathSubmit}
                onSaveAndExit={handleMathSaveAndExit}
                onBack={() => setCurrentStep('handover')}
                isSubmitting={isActionLoading}
              />
            )}

            {/* Step 6: Summary & Baseline Profile */}
            {currentStep === 'summary' && fullSummary && (
              <OnboardingSummaryStep summary={fullSummary} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default OnboardingPlaceholderPage;

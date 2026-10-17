import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Archive, UserCheck, RotateCcw } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import type {
  Learner,
  CreateLearnerData,
  UpdateLearnerData,
  DeletionRequest,
} from '../types';
import { LearnerCard } from '../components/LearnerCard';
import { LearnerModal } from '../components/LearnerModal';
import { ArchiveLearnerModal } from '../components/ArchiveLearnerModal';
import { RequestDeletionModal } from '../components/RequestDeletionModal';
import { PageHeader } from '../../../shared/components/PageHeader';
import {
  LoadingState,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
} from '../../../shared/components/ui/StateViews';

export const LearnersPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [activeLearners, setActiveLearners] = useState<Learner[]>([]);
  const [archivedLearners, setArchivedLearners] = useState<Learner[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<Record<string, DeletionRequest>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);

  // Archive Modal
  const [learnerToArchive, setLearnerToArchive] = useState<Learner | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);

  // Deletion Request Modal
  const [learnerToDelete, setLearnerToDelete] = useState<Learner | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Restore state
  const [restoringLearnerId, setRestoringLearnerId] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [activeRes, archivedRes, delReqRes] = await Promise.all([
        learnerApi.listLearners(false),
        learnerApi.listLearners(true),
        learnerApi.listDeletionRequests(),
      ]);

      if (activeRes.success && activeRes.data) {
        setActiveLearners(activeRes.data);
      } else {
        setErrorMessage(activeRes.message || 'Failed to load active learner profiles.');
      }

      if (archivedRes.success && archivedRes.data) {
        setArchivedLearners(archivedRes.data);
      }

      if (delReqRes.success && delReqRes.data) {
        const reqMap: Record<string, DeletionRequest> = {};
        delReqRes.data.forEach((req) => {
          reqMap[req.learnerId] = req;
        });
        setDeletionRequests(reqMap);
      }
    } catch {
      setErrorMessage('Network connection error while communicating with server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'parent') {
      fetchAllData();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchAllData]);

  const handleOpenAddModal = () => {
    setEditingLearner(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (learner: Learner) => {
    setEditingLearner(learner);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (
    data: CreateLearnerData | UpdateLearnerData
  ): Promise<boolean> => {
    if (editingLearner) {
      const res = await learnerApi.updateLearner(
        editingLearner.learnerId,
        data as UpdateLearnerData
      );
      if (res.success && res.data) {
        setSuccessToast(`"${res.data.firstName}" profile was updated successfully.`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchAllData();
        return true;
      }
      throw new Error(res.message || 'Failed to update child profile.');
    } else {
      const res = await learnerApi.createLearner(data as CreateLearnerData);
      if (res.success && res.data) {
        setSuccessToast(`"${res.data.firstName}" was registered successfully!`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchAllData();
        return true;
      }
      throw new Error(res.message || 'Failed to create child profile.');
    }
  };

  // Archive Handler
  const handleOpenArchiveModal = (learner: Learner) => {
    setLearnerToArchive(learner);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async (learner: Learner) => {
    const res = await learnerApi.archiveLearner(learner.learnerId);
    if (!res.success) {
      throw new Error(res.message || 'Failed to archive learner profile.');
    }
    setSuccessToast(`"${learner.firstName}" profile was archived successfully.`);
    setTimeout(() => setSuccessToast(null), 4000);
    await fetchAllData();
  };

  // Restore Handler
  const handleConfirmRestore = async (learner: Learner) => {
    setRestoringLearnerId(learner.learnerId);
    try {
      const res = await learnerApi.restoreLearner(learner.learnerId);
      if (res.success) {
        setSuccessToast(`"${learner.firstName}" was restored to active learners.`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchAllData();
      } else {
        setErrorMessage(res.message || 'Failed to restore learner profile.');
      }
    } catch {
      setErrorMessage('Network error while restoring profile.');
    } finally {
      setRestoringLearnerId(null);
    }
  };

  // Deletion Request Handler
  const handleOpenDeletionModal = (learner: Learner) => {
    setLearnerToDelete(learner);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitDeletionRequest = async (learner: Learner, reason?: string) => {
    const res = await learnerApi.requestPermanentDeletion(learner.learnerId, reason);
    if (!res.success) {
      throw new Error(res.message || 'Failed to submit permanent deletion request.');
    }
    setSuccessToast(
      `Permanent deletion request for "${learner.firstName}" was submitted for review.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
    await fetchAllData();
  };

  const displayedLearners = activeTab === 'active' ? activeLearners : archivedLearners;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Standardized Page Header */}
      <PageHeader
        role="parent"
        title="My Children"
        titleSi="මගේ දරුවන්"
        description="Register, archive, and manage child accounts for adaptive mathematics learning support."
        descriptionSi="MathQuest අනුවර්තී ගණිත ඉගෙනුම් සහාය සඳහා දරුවන්ගේ පැතිකඩ මෙතැනින් කළමනාකරණය කරන්න."
        actions={
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn btn-primary py-2.5 px-5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Child (නව දරුවෙකු එක් කරන්න)</span>
          </button>
        }
      />

      {/* Feedback Toasts / Banners */}
      {successToast && (
        <SuccessAlert
          message={successToast}
          onDismiss={() => setSuccessToast(null)}
        />
      )}

      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          messageSi="දරුවන්ගේ තොරතුරු ලබාගැනීමේදී දෝෂයක් හටගැනිණි."
          onRetry={fetchAllData}
        />
      )}

      {/* Active vs Archived Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-mq-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-mq-surface-blue text-mq-primary shadow-xs ring-1 ring-mq-primary/30'
              : 'text-mq-text-muted hover:text-mq-text-strong hover:bg-mq-surface-soft'
          }`}
        >
          <UserCheck size={16} />
          <span>Active Children (සක්‍රීය දරුවන්)</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'active'
                ? 'bg-mq-primary text-white'
                : 'bg-mq-surface-soft text-mq-text-muted border border-mq-border'
            }`}
          >
            {activeLearners.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'archived'
              ? 'bg-amber-50 text-amber-900 shadow-xs ring-1 ring-amber-300'
              : 'text-mq-text-muted hover:text-mq-text-strong hover:bg-mq-surface-soft'
          }`}
        >
          <Archive size={16} />
          <span>Archived Children (සංරක්ෂිත දරුවන්)</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'archived'
                ? 'bg-amber-600 text-white'
                : 'bg-mq-surface-soft text-mq-text-muted border border-mq-border'
            }`}
          >
            {archivedLearners.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LoadingState
          message="Loading child learner profiles..."
          messageSi="දරුවන්ගේ පැතිකඩ පූරණය වෙමින් පවතී..."
        />
      ) : displayedLearners.length === 0 ? (
        activeTab === 'active' ? (
          /* Empty Active State */
          <EmptyState
            icon={<Users size={36} />}
            title="No Active Children Found"
            titleSi="ක්‍රියාකාරී දරුවන් නොමැත"
            description={
              archivedLearners.length > 0
                ? `You have ${archivedLearners.length} archived child profile(s). Check the Archived Children tab to restore them.`
                : 'Register your child aged 6–10 (Grades 1–5) to start personalized ADHD mathematics learning support.'
            }
            descriptionSi="ඔබේ දරුවාගේ අවධානය සහ ගණිත කුසලතා මට්ටමට ගැළපෙන අනුවර්තී අධ්‍යාපනික අත්දැකීම ලබා දීමට පළමුව දරුවාගේ තොරතුරු ඇතුළත් කරන්න."
            action={
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn btn-primary py-2.5 px-6 rounded-full inline-flex items-center gap-2 text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Register First Child (පළමු දරුවා ලියාපදිංචි කරන්න)</span>
              </button>
            }
          />
        ) : (
          /* Empty Archived State */
          <EmptyState
            icon={<Archive size={36} />}
            title="No Archived Children"
            titleSi="සංරක්ෂිත දරුවන් කිසිවෙකු නැත"
            description="When you archive a child profile, they will appear here safely preserved with their learning history."
            descriptionSi="ඔබ දරුවෙකු සංරක්ෂණය කළ විට ඔවුන්ගේ පැතිකඩ සහ ඉගෙනුම් දත්ත මෙහි ආරක්ෂිතව පවතිනු ඇත."
          />
        )
      ) : (
        /* Learner Cards Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-mq-text-muted">
              {activeTab === 'active' ? 'Active' : 'Archived'} Children ({displayedLearners.length}) • {activeTab === 'active' ? 'සක්‍රීය' : 'සංරක්ෂිත'} දරුවන්
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedLearners.map((learner) => (
              <LearnerCard
                key={learner.learnerId}
                learner={learner}
                onEdit={handleOpenEditModal}
                onArchive={handleOpenArchiveModal}
                onRestore={handleConfirmRestore}
                onRequestDeletion={handleOpenDeletionModal}
                deletionRequest={deletionRequests[learner.learnerId] || null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <LearnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingLearner={editingLearner}
      />

      {/* Archive Modal */}
      <ArchiveLearnerModal
        isOpen={isArchiveModalOpen}
        learner={learnerToArchive}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setLearnerToArchive(null);
        }}
        onConfirmArchive={handleConfirmArchive}
      />

      {/* Request Permanent Deletion Modal */}
      <RequestDeletionModal
        isOpen={isDeleteModalOpen}
        learner={learnerToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setLearnerToDelete(null);
        }}
        onSubmitRequest={handleSubmitDeletionRequest}
      />
    </div>
  );
};

export default LearnersPage;


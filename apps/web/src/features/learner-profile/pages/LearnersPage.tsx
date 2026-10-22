import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Archive, UserCheck } from 'lucide-react';
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
import { parentText } from '../../../shared/i18n/parentText';

const t = parentText.children;

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
        setErrorMessage(t.loadError);
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
      setErrorMessage(parentText.common.networkError);
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

  const showToast = (message: string, durationMs = 4000) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), durationMs);
  };

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
        showToast(t.updated(res.data.firstName));
        await fetchAllData();
        return true;
      }
      throw new Error(res.message || 'Failed to update child profile.');
    } else {
      const res = await learnerApi.createLearner(data as CreateLearnerData);
      if (res.success && res.data) {
        showToast(t.created(res.data.firstName));
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
    showToast(t.archived(learner.firstName));
    await fetchAllData();
  };

  // Restore Handler
  const handleConfirmRestore = async (learner: Learner) => {
    try {
      const res = await learnerApi.restoreLearner(learner.learnerId);
      if (res.success) {
        showToast(t.restored(learner.firstName));
        await fetchAllData();
      } else {
        setErrorMessage(t.restoreError);
      }
    } catch {
      setErrorMessage(parentText.common.networkError);
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
    showToast(t.deletionRequested(learner.firstName), 5000);
    await fetchAllData();
  };

  const displayedLearners = activeTab === 'active' ? activeLearners : archivedLearners;

  const tabClass = (isActive: boolean, tone: 'primary' | 'amber') =>
    `inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
      isActive
        ? tone === 'primary'
          ? 'bg-mq-surface-blue text-mq-primary ring-1 ring-mq-primary/30'
          : 'bg-amber-50 text-amber-900 ring-1 ring-amber-300'
        : 'text-mq-text-muted hover:text-mq-text-strong hover:bg-mq-surface-soft'
    }`;

  const countClass = (isActive: boolean, tone: 'primary' | 'amber') =>
    `text-xs min-w-[24px] text-center px-2 py-0.5 rounded-full font-bold ${
      isActive
        ? tone === 'primary'
          ? 'bg-mq-primary text-white'
          : 'bg-amber-600 text-white'
        : 'bg-mq-surface-soft text-mq-text-muted border border-mq-border'
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="parent"
        title={t.title}
        description={t.description}
        actions={
          <button
            type="button"
            data-testid="add-child-button"
            onClick={handleOpenAddModal}
            className="btn btn-primary min-h-[44px] px-5 rounded-full inline-flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>{t.addChild}</span>
          </button>
        }
      />

      {successToast && (
        <SuccessAlert
          message={successToast}
          dismissLabel={parentText.common.dismiss}
          onDismiss={() => setSuccessToast(null)}
        />
      )}

      {errorMessage && (
        <ErrorAlert message={errorMessage} retryLabel={parentText.common.retry} onRetry={fetchAllData} />
      )}

      {/* Active vs archived */}
      <div role="tablist" className="flex flex-wrap items-center gap-2 border-b border-mq-border pb-3">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          className={tabClass(activeTab === 'active', 'primary')}
        >
          <UserCheck size={17} />
          <span>{t.tabActive}</span>
          <span className={countClass(activeTab === 'active', 'primary')}>{activeLearners.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'archived'}
          onClick={() => setActiveTab('archived')}
          className={tabClass(activeTab === 'archived', 'amber')}
        >
          <Archive size={17} />
          <span>{t.tabArchived}</span>
          <span className={countClass(activeTab === 'archived', 'amber')}>{archivedLearners.length}</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message={t.loading} />
      ) : displayedLearners.length === 0 ? (
        activeTab === 'active' ? (
          <EmptyState
            icon={<Users size={36} />}
            title={t.emptyActiveTitle}
            description={
              archivedLearners.length > 0 ? t.emptyActiveWithArchived(archivedLearners.length) : t.emptyActiveText
            }
            action={
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn btn-primary min-h-[44px] px-6 rounded-full inline-flex items-center gap-2 text-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>{t.addFirstChild}</span>
              </button>
            }
          />
        ) : (
          <EmptyState icon={<Archive size={36} />} title={t.emptyArchivedTitle} description={t.emptyArchivedText} />
        )
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
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
      )}

      <LearnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingLearner={editingLearner}
      />

      <ArchiveLearnerModal
        isOpen={isArchiveModalOpen}
        learner={learnerToArchive}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setLearnerToArchive(null);
        }}
        onConfirmArchive={handleConfirmArchive}
      />

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

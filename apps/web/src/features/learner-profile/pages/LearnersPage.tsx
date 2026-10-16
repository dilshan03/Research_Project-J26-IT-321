import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { LearnerCard } from '../components/LearnerCard';
import { LearnerModal } from '../components/LearnerModal';
import { PageHeader } from '../../../shared/components/PageHeader';
import {
  LoadingState,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
} from '../../../shared/components/ui/StateViews';

export const LearnersPage: React.FC = () => {
  const { user } = useAuth();

  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);

  const fetchLearners = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await learnerApi.listLearners();
      if (response.success && response.data) {
        setLearners(response.data);
      } else {
        setErrorMessage(response.message || 'Failed to load children profiles.');
      }
    } catch {
      setErrorMessage('Network connection error while communicating with server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'parent') {
      fetchLearners();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchLearners]);

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
        await fetchLearners();
        return true;
      }
      throw new Error(res.message || 'Failed to update child profile.');
    } else {
      const res = await learnerApi.createLearner(data as CreateLearnerData);
      if (res.success && res.data) {
        setSuccessToast(`"${res.data.firstName}" was registered successfully!`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchLearners();
        return true;
      }
      throw new Error(res.message || 'Failed to create child profile.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Standardized Page Header */}
      <PageHeader
        role="parent"
        title="My Children"
        titleSi="මගේ දරුවන්"
        description="Register and manage child accounts for adaptive mathematics learning support."
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
          messageSi="දරුවන්ගේ තොරතුරු ලබාගැනීමට නොහැකි විය."
          onRetry={fetchLearners}
        />
      )}

      {/* Content Area */}
      {isLoading ? (
        <LoadingState
          message="Loading child learner profiles..."
          messageSi="දරුවන්ගේ පැතිකඩ පූරණය වෙමින් පවතී..."
        />
      ) : learners.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<Users size={36} />}
          title="No Children Registered Yet"
          titleSi="තවමත් දරුවෙකු ලියාපදිංචි කර නැත"
          description="Register your child aged 6–10 (Grades 1–5) to start personalized ADHD mathematics learning support."
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
        /* Learner Cards Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-mq-text-muted">
              Registered Children ({learners.length}) • ලියාපදිංචි දරුවන්
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {learners.map((learner) => (
              <LearnerCard
                key={learner.learnerId}
                learner={learner}
                onEdit={handleOpenEditModal}
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
    </div>
  );
};

export default LearnersPage;

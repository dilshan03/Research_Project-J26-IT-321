import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { learnerApi } from '../services/learnerApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { LearnerCard } from '../components/LearnerCard';
import { LearnerModal } from '../components/LearnerModal';

export const ParentChildrenPage: React.FC = () => {
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
        setErrorMessage(response.message || 'දරුවන්ගේ තොරතුරු ලබාගැනීමට නොහැකි විය.');
      }
    } catch {
      setErrorMessage('සේවාදායකය සමඟ සම්බන්ධ වීමට නොහැකි විය (Network error).');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLearners();
  }, [fetchLearners]);

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
        setSuccessToast(`"${res.data.firstName}" දරුවාගේ තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී.`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchLearners();
        return true;
      }
      throw new Error(res.message || 'Failed to update child profile.');
    } else {
      const res = await learnerApi.createLearner(data as CreateLearnerData);
      if (res.success && res.data) {
        setSuccessToast(`"${res.data.firstName}" දරුවා සාර්ථකව ලියාපදිංචි කරන ලදී!`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchLearners();
        return true;
      }
      throw new Error(res.message || 'Failed to create child profile.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong">
            My Registered Children (මගේ දරුවන්)
          </h2>
          <p className="text-xs sm:text-sm text-mq-text-muted mt-0.5">
            Manage your child profiles, start or resume adaptive onboarding, and update grade details.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary py-2.5 px-5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Add Child Profile</span>
        </button>
      </div>

      {/* Feedback Toasts / Banners */}
      {successToast && (
        <div className="p-4 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-mq-success font-bold animate-fade-in shadow-xs">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchLearners}
            className="text-xs font-bold underline hover:text-mq-text-strong cursor-pointer"
          >
            නැවත උත්සාහ කරන්න (Retry)
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-mq-primary">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-xs sm:text-sm font-semibold">දරුවන්ගේ තොරතුරු ලබාගනිමින් පවතී...</p>
        </div>
      ) : learners.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-mq-border-strong p-8 sm:p-14 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-mq-surface-blue text-mq-primary flex items-center justify-center mx-auto text-3xl">
            👶
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-mq-text-strong font-sinhala">
              තවමත් දරුවන් ලියාපදිංචි කර නොමැත
            </h3>
            <p className="text-xs sm:text-sm text-mq-text-muted max-w-md mx-auto">
              MathQuest සමඟ ඔබේ දරුවාගේ ගණිත ඉගෙනුම් ගමන ආරම්භ කිරීමට පළමුව දරුවාගේ පැතිකඩක් එක් කරන්න.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAddModal}
              className="btn btn-primary py-2.5 px-6 rounded-full inline-flex items-center gap-2 text-xs sm:text-sm font-bold shadow-sm"
            >
              <Plus size={16} />
              <span>පළමු දරුවා ලියාපදිංචි කරන්න (Add First Child)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Learners Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {learners.map((learner) => (
            <LearnerCard
              key={learner.learnerId}
              learner={learner}
              onEdit={handleOpenEditModal}
            />
          ))}
        </div>
      )}

      {/* Modal for Creating & Updating Learner */}
      <LearnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingLearner={editingLearner}
      />
    </div>
  );
};

export default ParentChildrenPage;

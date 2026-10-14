import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/Navbar';
import { useAuth } from '../../auth/hooks/useAuth';
import { learnerApi } from '../services/learnerApi';
import type { Learner, CreateLearnerData, UpdateLearnerData } from '../types';
import { LearnerCard } from '../components/LearnerCard';
import { LearnerModal } from '../components/LearnerModal';

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
        setErrorMessage(response.message || 'දරුවන්ගේ තොරතුරු ලබාගැනීමට නොහැකි විය.');
      }
    } catch {
      setErrorMessage('සේවාදායකය සමඟ සම්බන්ධ වීමට නොහැකි විය (Network error).');
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

  // Guard for Teacher role
  if (user && user.role === 'teacher') {
    return (
      <div className="min-h-screen bg-mq-bg font-sans text-mq-text">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-mq-surface-soft text-mq-primary flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-mq-text-strong font-sinhala">
              ගුරු පිවිසුම (Teacher Portal)
            </h1>
            <p className="text-sm text-mq-text-muted max-w-md mx-auto">
              ළමා ඉගෙනුම් පැතිකඩ කළමනාකරණය දෙමාපිය ගිණුම් සඳහා පමණක් වෙන් කර ඇත. ගුරුවරුන් සඳහා වන පන්ති කාමර විශ්ලේෂණ ඉක්මනින් බලාපොරොත්තු වන්න.
            </p>
            <div className="pt-2">
              <Link to="/profile" className="btn btn-primary py-2 px-5 rounded-full text-sm inline-flex items-center gap-2">
                <span>පැතිකඩ වෙත ආපසු යන්න (Back to Profile)</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mq-bg font-sans text-mq-text selection:bg-mq-surface-blue">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mq-primary mb-1">
              <Users size={15} />
              <span>දෙමාපිය උපකරණ පුවරුව (Parent Portal)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong font-sinhala">
              මගේ දරුවන් (My Children)
            </h1>
            <p className="text-xs sm:text-sm text-mq-text-muted mt-1 font-sinhala">
              MathQuest අනුවර්තී ගණිත ඉගෙනුම් සහාය සඳහා දරුවන්ගේ පැතිකඩ මෙතැනින් කළමනාකරණය කරන්න.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary py-2.5 px-5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm self-start sm:self-auto font-sinhala shrink-0"
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>නව දරුවෙකු එක් කරන්න (Add Child)</span>
          </button>
        </div>

        {/* Feedback Toasts / Banners */}
        {successToast && (
          <div className="p-4 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-mq-success font-bold animate-fade-in shadow-xs">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="font-sinhala">{successToast}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-sinhala">{errorMessage}</span>
            </div>
            <button
              onClick={fetchLearners}
              className="text-xs font-bold underline hover:opacity-80 shrink-0"
            >
              නැවත උත්සාහ කරන්න (Retry)
            </button>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-mq-border p-12 flex flex-col items-center justify-center text-center space-y-3 shadow-sm min-h-[320px]">
            <Loader2 size={32} className="animate-spin text-mq-primary" />
            <p className="text-sm font-bold text-mq-text-strong font-sinhala">
              දරුවන්ගේ පැතිකඩ පූරණය වෙමින් පවතී...
            </p>
            <p className="text-xs text-mq-text-muted">
              Loading child learner profiles from MathQuest...
            </p>
          </div>
        ) : learners.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-mq-border p-8 sm:p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-mq-surface-soft border border-mq-border flex items-center justify-center text-4xl shadow-inner">
              <HeartHandshake size={36} className="text-mq-primary" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-mq-text-strong font-sinhala">
                තවමත් දරුවෙකු ලියාපදිංචි කර නැත
              </h3>
              <p className="text-xs sm:text-sm text-mq-text-muted font-sinhala leading-relaxed">
                ඔබේ දරුවාගේ අවධානය සහ ගණිත කුසලතා මට්ටමට ගැළපෙන අනුවර්තී අධ්‍යාපනික අත්දැකීම ලබා දීමට පළමුව දරුවාගේ තොරතුරු ඇතුළත් කරන්න.
              </p>
              <p className="text-xs text-mq-text-muted italic">
                Register your child aged 6–10 (Grades 1–5) to start personalized ADHD learning support.
              </p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="btn btn-primary py-3 px-6 rounded-full flex items-center gap-2 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all font-sinhala"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>පළමු දරුවා ලියාපදිංචි කරන්න (Register First Child)</span>
            </button>
          </div>
        ) : (
          /* Learner Cards Grid */
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-mq-text-muted">
                ලියාපදිංචි දරුවන් ({learners.length}) • Registered Learners
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
      </main>

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

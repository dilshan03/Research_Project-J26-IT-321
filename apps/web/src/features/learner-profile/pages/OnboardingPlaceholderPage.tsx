import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  ClipboardList,
  Compass,
  Calculator,
  BrainCircuit,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/Navbar';
import { learnerApi } from '../services/learnerApi';
import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';

export const OnboardingPlaceholderPage: React.FC = () => {
  const { learnerId } = useParams<{ learnerId: string }>();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learnerId) return;

    const fetchChild = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await learnerApi.getLearner(learnerId);
        if (res.success && res.data) {
          setLearner(res.data);
        } else {
          setError(res.message || 'දරුවාගේ තොරතුරු ලබාගැනීමට නොහැකි විය.');
        }
      } catch {
        setError('සේවාදායකය සමඟ සම්බන්ධතා දෝෂයකි.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChild();
  }, [learnerId]);

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === learner?.avatarId) || AVATAR_OPTIONS[0];

  return (
    <div className="min-h-screen bg-mq-bg font-sans text-mq-text selection:bg-mq-surface-blue">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back Link */}
        <Link
          to="/learners"
          className="inline-flex items-center gap-2 text-xs font-bold text-mq-text-muted hover:text-mq-primary transition-colors font-sinhala"
        >
          <ArrowLeft size={16} />
          <span>මගේ දරුවන් වෙත ආපසු යන්න (Back to My Children)</span>
        </Link>

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-mq-border p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 size={32} className="animate-spin text-mq-primary" />
            <p className="text-sm font-bold text-mq-text-strong font-sinhala">
              දරුවාගේ පැතිකඩ පූරණය වෙමින් පවතී...
            </p>
          </div>
        ) : error || !learner ? (
          <div className="bg-white rounded-3xl border border-mq-border p-8 text-center space-y-4">
            <AlertCircle size={32} className="text-mq-danger mx-auto" />
            <h2 className="text-lg font-bold text-mq-text-strong font-sinhala">
              {error || 'දරුවා සොයාගත නොහැකි විය.'}
            </h2>
            <Link to="/learners" className="btn btn-secondary text-xs py-2 px-4 rounded-full inline-block">
              දරුවන්ගේ ලැයිස්තුවට ආපසු යන්න
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Child Profile Banner */}
            <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm border ${avatar.bgColor} ${avatar.borderColor}`}
                >
                  <span>{avatar.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-mq-primary">
                      ළමා ඉගෙනුම් පැතිකඩ (Child Profile)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-mq-warning-bg text-mq-warning">
                      <Clock size={11} /> {learner.onboardingStatus}
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-mq-text-strong mt-0.5">
                    {learner.firstName}
                    {learner.preferredName && (
                      <span className="text-sm font-normal text-mq-text-muted ml-2">
                        ("{learner.preferredName}")
                      </span>
                    )}
                  </h1>
                  <p className="text-xs text-mq-text-muted font-sinhala mt-0.5">
                    {learner.grade} වන ශ්‍රේණිය (Grade {learner.grade}) • වයස අවුරුදු {learner.age} (Age {learner.age}) • {learner.preferredLanguage} මාධ්‍යය
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block">
                  Learner ID
                </span>
                <span className="text-xs font-mono font-bold text-mq-text-strong block">
                  {learner.learnerId}
                </span>
              </div>
            </div>

            {/* Onboarding Roadmap & Next Step Notice */}
            <div className="bg-white rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-mq-border/70 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-mq-surface-blue text-mq-primary mb-2">
                  <Sparkles size={14} />
                  <span>මීළඟ පියවර (Next Step in Development)</span>
                </div>
                <h2 className="text-xl font-bold text-mq-text-strong font-sinhala">
                  ආරම්භක ඇගයීම් හා ඉගෙනුම් පැතිකඩ නිර්මාණය (Learner Onboarding Pipeline)
                </h2>
                <p className="text-xs sm:text-sm text-mq-text-muted mt-1 font-sinhala leading-relaxed">
                  දරුවා වෙනුවෙන් සකස් කරන ලද අනුවර්තී ඉගෙනුම් ක්‍රියාවලිය සඳහා පහත පියවර 4 සම්පූර්ණ කිරීමට සූදානම් කෙරේ.
                </p>
              </div>

              {/* 4 Pipeline Stages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stage 1 */}
                <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-mq-surface-blue text-mq-primary flex items-center justify-center shrink-0 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-mq-text-strong font-sinhala flex items-center gap-1.5">
                      <Compass size={15} className="text-mq-primary" />
                      <span>ඉගෙනුම් මනාප (Learning Preferences)</span>
                    </h3>
                    <p className="text-xs text-mq-text-muted mt-1 font-sinhala">
                      ශ්‍රව්‍ය, දෘශ්‍ය ආකෘති, සංඥා හා වේග මනාපයන් තහවුරු කිරීම.
                    </p>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-mq-surface-green text-mq-accent-green flex items-center justify-center shrink-0 font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-mq-text-strong font-sinhala flex items-center gap-1.5">
                      <ClipboardList size={15} className="text-mq-accent-green" />
                      <span>SNAP-IV ප්‍රශ්නාවලිය (ADHD Assessment)</span>
                    </h3>
                    <p className="text-xs text-mq-text-muted mt-1 font-sinhala">
                      දෙමාපියන් සඳහා වන අවධානය හා ක්‍රියාකාරීත්වය මනින validated ප්‍රශ්නාවලිය.
                    </p>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-mq-surface-yellow text-mq-accent-yellow flex items-center justify-center shrink-0 font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-mq-text-strong font-sinhala flex items-center gap-1.5">
                      <Calculator size={15} className="text-mq-accent-yellow" />
                      <span>මූලික ගණිත ඇගයීම (Baseline Math Tasks)</span>
                    </h3>
                    <p className="text-xs text-mq-text-muted mt-1 font-sinhala">
                      {learner.grade} ශ්‍රේණියට ගැළපෙන අන්තර්ක්‍රියාකාරී සිංහල ගණිත ක්‍රියාකාරකම්.
                    </p>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-mq-surface-purple text-mq-accent-purple flex items-center justify-center shrink-0 font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-mq-text-strong font-sinhala flex items-center gap-1.5">
                      <BrainCircuit size={15} className="text-mq-accent-purple" />
                      <span>AI පැතිකඩ හා නිර්දේශ (ML & SHAP XAI)</span>
                    </h3>
                    <p className="text-xs text-mq-text-muted mt-1 font-sinhala">
                      අවධානය රඳවා ගැනීමේ මට්ටම, ගණිත කුසලතා හා පැහැදිලි කළ හැකි AI උපදෙස්.
                    </p>
                  </div>
                </div>
              </div>

              {/* Notice Card */}
              <div className="p-4 rounded-2xl bg-mq-surface-blue/50 border border-mq-primary/30 flex items-center justify-between gap-4">
                <div className="text-xs text-mq-text-strong font-sinhala">
                  <strong>සූදානම් කළ මාර්ගය:</strong> මෙම අතුරුමුහුණත මීළඟ සංවර්ධන කාර්යයේදී ක්‍රියාත්මක වන සම්පූර්ණ SNAP-IV හා ගණිත අභ්‍යාස පද්ධතියට සෘජුවම සම්බන්ධ වේ.
                </div>
                <Link
                  to="/learners"
                  className="btn btn-secondary text-xs py-2 px-4 rounded-full shrink-0 font-sinhala"
                >
                  දරුවන්ගේ ලැයිස්තුවට
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OnboardingPlaceholderPage;

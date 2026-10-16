import { Sparkles } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';

export const TeacherRecommendationsPage: React.FC = () => {
  const pedagogicalStrategies = [
    {
      code: 'VISUAL_MANIPULATIVES',
      title: 'Visual Representation & Concrete Manipulatives',
      titleSi: 'දෘශ්‍ය නිරූපණ සහ සැබෑ ද්‍රව්‍ය භාවිතය',
      desc: 'Use number lines, ten-frames, and pictorial counters before transitioning to abstract numerical equations.',
    },
    {
      code: 'CHUNKING_PACING',
      title: 'Chunked Tasks & Frequent Low-Stakes Breaks',
      titleSi: 'කාර්යයන් කොටස් වලට බෙදීම සහ කෙටි විවේක',
      desc: 'Limit single practice bursts to 3–5 structured questions. Prevent cognitive fatigue in learners with attention variance.',
    },
    {
      code: 'MULTIMODAL_INSTRUCTION',
      title: 'Multimodal Audio & Text Scaffolding',
      titleSi: 'බහුමාධ්‍ය ශ්‍රව්‍ය සහ පාඨ සහාය',
      desc: 'Pair written Sinhala mathematical word problems with synchronized audio prompts to ease working-memory load.',
    },
    {
      code: 'POSITIVE_FEEDBACK_LOOPS',
      title: 'Immediate Constructive Micro-Feedback',
      titleSi: 'ක්ෂණික ධනාත්මක ක්ෂුද්‍ර ප්‍රතිපෝෂණ',
      desc: 'Provide gentle encouragement upon intermediate steps rather than evaluating only the final calculation output.',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title="Teaching Recommendations"
        titleSi="ඉගැන්වීම් නිර්දේශ"
        description="Evidence-based pedagogical strategies and instructional guidelines for primary mathematics with ADHD support needs."
      />

      <div className="bg-white rounded-3xl border border-mq-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-mq-border">
          <Sparkles size={20} className="text-mq-accent-yellow" />
          <h2 className="text-lg font-extrabold text-mq-text-strong">
            ADHD-Informed Pedagogical Guidelines (ඉගැන්වීම් නිර්දේශ)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-mq-text-muted leading-relaxed">
          These evidence-based strategies are recommended by MathQuest’s Pedagogical Engine for primary mathematics instruction with ADHD support needs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {pedagogicalStrategies.map((strat) => (
            <div
              key={strat.code}
              className="p-5 rounded-2xl bg-mq-surface-soft/70 border border-mq-border space-y-2 hover:border-mq-primary/40 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-mq-primary">{strat.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-mq-border text-mq-text-muted">
                  {strat.code}
                </span>
              </div>
              <p className="text-xs font-bold text-mq-text font-sinhala">{strat.titleSi}</p>
              <p className="text-xs text-mq-text-muted leading-relaxed">{strat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherRecommendationsPage;

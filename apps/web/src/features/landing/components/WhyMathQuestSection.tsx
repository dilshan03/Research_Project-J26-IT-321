import imgLongInstructions from '../../../assets/images/public-pages/home/section-2-why/long-instructions.png';
import imgDifficultyStaying from '../../../assets/images/public-pages/home/section-2-why/difficulty-staying.png';
import imgSameSupport from '../../../assets/images/public-pages/home/section-2-why/same-support.png';
import imgCorrectIncorrect from '../../../assets/images/public-pages/home/section-2-why/correct-incorrect.png';

export const WhyMathQuestSection = () => {
  return (
    <section className="relative pt-8 pb-24 bg-white overflow-hidden">
      
      {/* --- Floating Background Graphics (Decorations) --- */}
      {/* Left Blob Text */}
      <div className="absolute top-10 left-[-2%] w-64 h-64 bg-mq-surface-soft rounded-full -z-10 animate-morph flex items-center justify-center opacity-80 rotate-[-12deg] p-8 text-center shadow-sm">
        <p className="text-mq-primary-dark font-extrabold text-xl leading-tight">
          Small <br/> Challenges <br/> Make Big <br/> Stories <span className="inline-block mt-1">😊</span>
        </p>
      </div>
      
      {/* Right Floating Text */}
      <div className="absolute top-16 right-[2%] w-64 -z-10 rotate-[8deg] text-center">
        <p className="text-mq-primary font-extrabold text-xl leading-tight mb-2">
          Every child <br/> learns differently <br/> and that's okay!
        </p>
        <svg className="w-8 h-8 mx-auto text-mq-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>


      <div className="max-w-[1400px] mx-auto px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
            <span className="px-5 py-2 bg-mq-surface-blue text-mq-primary font-bold rounded-full text-sm tracking-wide">
              Why MathQuest?
            </span>
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
          </div>
          
          <h2 className="text-[2.5rem] md:text-[3.2rem] font-extrabold text-mq-text-strong leading-[1.2] tracking-tight">
            Learning Mathematics <br className="hidden md:block" /> <span className="text-mq-primary">Shouldn't</span> Feel Overwhelming
          </h2>
          
          <p className="text-lg text-mq-text-muted font-medium">
            Many children, especially those who need ADHD-related learning support, face unique challenges when learning mathematics. MathQuest is designed to address these real-world difficulties.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Pink */}
          <div className="bg-mq-surface-pink rounded-[2rem] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-100">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgLongInstructions} alt="Long Instructions" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">Long Instructions</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              Traditional learning materials often have long and complex instructions, which can be difficult to follow.
            </p>
          </div>

          {/* Card 2: Blue */}
          <div className="bg-mq-surface-blue rounded-[2rem] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-200">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgDifficultyStaying} alt="Difficulty Staying Focused" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">Difficulty Staying Focused</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              Children with ADHD may find it hard to maintain attention for long periods, leading to unfinished tasks and frustration.
            </p>
          </div>

          {/* Card 3: Green */}
          <div className="bg-mq-surface-green rounded-[2rem] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-300">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgSameSupport} alt="Same Support for Everyone" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">Same Support for Everyone</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              Conventional systems often treat all learners the same, without considering individual learning needs, strengths, or challenges.
            </p>
          </div>

          {/* Card 4: Yellow */}
          <div className="bg-mq-surface-yellow rounded-[2rem] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-400">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgCorrectIncorrect} alt="Correct / Incorrect Is Not Enough" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">Correct / Incorrect Is Not Enough</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              A single correct or incorrect answer does not show the full picture of a learner's understanding, effort, or behaviour.
            </p>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-16 text-center space-y-6 animate-fade-in delay-500">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-mq-surface-blue rounded-full border border-mq-border shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            <span className="text-mq-primary-dark font-extrabold text-lg md:text-xl">
              Different learners need different levels of presentation, support and revision.
            </span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <p className="text-mq-text-muted font-bold">
            MathQuest adapts to each learner, helping them build confidence and make steady progress — one step at a time.
          </p>
        </div>

      </div>
    </section>
  );
};

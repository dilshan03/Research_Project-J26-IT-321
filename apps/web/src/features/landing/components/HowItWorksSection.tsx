import { User, BookOpen, BarChart2, Lightbulb } from 'lucide-react';

import imgProfile from '../../../assets/images/public-pages/home/section-3-how-it-works/profile.png';
import imgAdaptive from '../../../assets/images/public-pages/home/section-3-how-it-works/adaptive-content.png';
import imgBehaviour from '../../../assets/images/public-pages/home/section-3-how-it-works/behaviour-und.png';
import imgSupport from '../../../assets/images/public-pages/home/section-3-how-it-works/personalized-support.png';

export const HowItWorksSection = () => {
  return (
    <section className="relative pt-12 pb-0 bg-gradient-to-b from-mq-surface-soft to-white overflow-hidden">
      
      {/* --- Floating Background Graphics --- */}
      {/* Left Blob Text */}
      <div className="absolute top-20 left-[-3%] w-64 h-64 bg-white rounded-full -z-10 animate-morph flex items-center justify-center opacity-80 rotate-[-15deg] p-8 text-center shadow-sm">
        <p className="text-mq-primary/60 font-extrabold text-xl leading-tight">
          Observe <br/> Understand <br/> Adapt <br/> Support <br/> Grow <span className="inline-block mt-1 text-2xl">😊</span>
        </p>
      </div>
      
      {/* Right Floating Text */}
      <div className="absolute top-24 right-[2%] w-64 -z-10 rotate-[12deg] text-center">
        <p className="text-mq-primary/70 font-extrabold text-xl leading-tight mb-2">
          Different <br/> Steps, <br/> Brighter <br/> Tomorrows
        </p>
        <svg className="w-8 h-8 mx-auto text-mq-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6 mb-8 sm:mb-10 animate-fade-in">
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
            <span className="px-5 py-2 bg-mq-surface-blue text-mq-primary font-bold rounded-full text-sm tracking-wide">
              How It Works
            </span>
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
          </div>
          
          <h2 className="text-2xl sm:text-4xl md:text-[3.2rem] font-extrabold text-mq-text-strong leading-[1.2] tracking-tight">
            A Smarter Learning Journey <br className="hidden md:block"/> Designed <span className="text-mq-primary">Around the Learner</span>
          </h2>
          
          <p className="text-base sm:text-lg text-mq-text-muted font-medium">
            MathQuest combines learner data, adaptive content, behavioural insights and intelligent support to create a personalized mathematics learning experience.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          
          {/* Card 1: Profile */}
          <div className="relative bg-[#F4FBF7] rounded-[2rem] p-5 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-mq-success/10 z-10">
            <div className="w-10 h-10 rounded-full bg-mq-success text-white flex items-center justify-center font-bold text-xl mb-4 shadow-sm">1</div>
            <div className="w-full h-36 mb-2 flex items-center justify-center">
              <img src={imgProfile} alt="Learner Profile" className="w-[85%] h-auto object-contain animate-float" />
            </div>
            <h3 className="text-xl font-extrabold text-mq-text-strong mb-3">Learner Profile</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium mb-5 flex-grow">
              We understand each learner's performance, help-seeking behaviour, support response and learning readiness.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 px-4 py-2 bg-mq-success-bg text-mq-success font-bold rounded-full text-sm self-start">
              <User size={16} />
              Personalized from the start
            </div>
          </div>

          {/* Arrow 1 -> 2 */}
          <div className="hidden lg:block absolute top-[30%] left-[22%] w-[8%] -z-0">
             <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
               <path d="M0 20 Q 50 -10, 100 20" stroke="var(--mq-success)" strokeWidth="3" strokeDasharray="6 6" fill="none" strokeLinecap="round" />
               <path d="M90 10 L100 20 L90 30" stroke="var(--mq-success)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
          </div>

          {/* Card 2: Adaptive Content */}
          <div className="relative bg-mq-surface-blue rounded-[2rem] p-5 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-mq-primary/10 z-10 lg:mt-6">
            <div className="w-10 h-10 rounded-full bg-mq-info text-white flex items-center justify-center font-bold text-xl mb-4 shadow-sm">2</div>
            <div className="w-full h-36 mb-2 flex items-center justify-center">
              <img src={imgAdaptive} alt="Adaptive Content" className="w-[85%] h-auto object-contain animate-float delay-100" />
            </div>
            <h3 className="text-xl font-extrabold text-mq-text-strong mb-3">Adaptive Content</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium mb-5 flex-grow">
              Mathematics concepts are converted into short, step-by-step activities with bilingual (Sinhala & English) support, designed to reduce cognitive load.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 px-4 py-2 bg-white text-mq-info font-bold rounded-full text-sm self-start">
              <BookOpen size={16} />
              Simple. Clear. Bilingual.
            </div>
          </div>

          {/* Arrow 2 -> 3 */}
          <div className="hidden lg:block absolute top-[30%] left-[47%] w-[8%] -z-0">
             <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
               <path d="M0 20 Q 50 50, 100 20" stroke="var(--mq-info)" strokeWidth="3" strokeDasharray="6 6" fill="none" strokeLinecap="round" />
               <path d="M90 10 L100 20 L90 30" stroke="var(--mq-info)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
          </div>

          {/* Card 3: Behaviour */}
          <div className="relative bg-mq-surface-purple rounded-[2rem] p-5 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-mq-accent-purple/10 z-10">
            <div className="w-10 h-10 rounded-full bg-mq-accent-purple text-white flex items-center justify-center font-bold text-xl mb-4 shadow-sm">3</div>
            <div className="w-full h-36 mb-2 flex items-center justify-center">
              <img src={imgBehaviour} alt="Behaviour Understanding" className="w-[85%] h-auto object-contain animate-float delay-200" />
            </div>
            <h3 className="text-xl font-extrabold text-mq-text-strong mb-3">Behaviour Understanding</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium mb-5 flex-grow">
              We analyse gameplay interactions such as response time, attempts, pauses and other behavioural signals to understand the learner's current state.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 px-4 py-2 bg-white text-mq-accent-purple font-bold rounded-full text-sm self-start">
              <BarChart2 size={16} />
              Real-time insights
            </div>
          </div>

          {/* Arrow 3 -> 4 */}
          <div className="hidden lg:block absolute top-[30%] left-[72%] w-[8%] -z-0">
             <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
               <path d="M0 20 Q 50 -10, 100 20" stroke="var(--mq-accent-purple)" strokeWidth="3" strokeDasharray="6 6" fill="none" strokeLinecap="round" />
               <path d="M90 10 L100 20 L90 30" stroke="var(--mq-accent-purple)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
          </div>

          {/* Card 4: Support */}
          <div className="relative bg-mq-surface-yellow rounded-[2rem] p-5 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-mq-warning/10 z-10 lg:mt-6">
            <div className="w-10 h-10 rounded-full bg-mq-accent-yellow text-white flex items-center justify-center font-bold text-xl mb-4 shadow-sm">4</div>
            <div className="w-full h-36 mb-2 flex items-center justify-center">
              <img src={imgSupport} alt="Personalized Support" className="w-[85%] h-auto object-contain animate-float delay-300" />
            </div>
            <h3 className="text-xl font-extrabold text-mq-text-strong mb-3">Personalized Support</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium mb-5 flex-grow">
              Our intelligent agent estimates mastery and retention, and selects the right difficulty, hints, revision activities and encouragement — only when needed.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 px-4 py-2 bg-mq-warning-bg text-mq-warning font-bold rounded-full text-sm self-start">
              <Lightbulb size={16} />
              The right support, at the right time
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Text with Wave Background */}
      <div className="relative w-full mt-4 py-16 sm:py-24 px-4 sm:px-8">
        {/* SVG Wave Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 96C480 192 960 -32 1440 96V256C960 160 480 352 0 256V96Z" fill="#C5E2FA"></path>
          </svg>
        </div>
        
        <div className="max-w-[1400px] mx-auto text-center relative z-10 px-4">
          <div className="animate-fade-in delay-500">
            <p className="text-mq-text-soft uppercase tracking-widest text-xs sm:text-sm font-bold mb-3 flex items-center justify-center gap-3 sm:gap-4">
              <span className="w-8 sm:w-12 h-[2px] bg-mq-border-strong"></span>
              Same Goal
              <span className="w-8 sm:w-12 h-[2px] bg-mq-border-strong"></span>
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-mq-text-strong flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              <span>More Confident Learners, Brighter Futures</span>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </h2>
            <p className="text-mq-text-muted font-medium text-base sm:text-lg mt-4 sm:mt-6">
              Step by step, MathQuest helps every learner reach their full potential.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
};

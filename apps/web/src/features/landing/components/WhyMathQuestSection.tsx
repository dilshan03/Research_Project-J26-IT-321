import imgLongInstructions from '../../../assets/images/public-pages/home/section-2-why/long-instructions.png';
import imgDifficultyStaying from '../../../assets/images/public-pages/home/section-2-why/difficulty-staying.png';
import imgSameSupport from '../../../assets/images/public-pages/home/section-2-why/same-support.png';
import imgCorrectIncorrect from '../../../assets/images/public-pages/home/section-2-why/correct-incorrect.png';

import { publicText } from '../../../shared/i18n/publicText';

const t = publicText.why;

export const WhyMathQuestSection = () => {
  return (
    <section id="features" className="relative pt-8 pb-24 bg-white overflow-hidden scroll-mt-16">
      
      {/* --- Floating Background Graphics (Decorations) --- */}
      {/* Left Blob Text */}
      <div className="absolute top-10 left-[-2%] w-64 h-64 bg-mq-surface-soft rounded-full -z-10 animate-morph flex items-center justify-center opacity-80 rotate-[-12deg] p-8 text-center shadow-sm">
        <p className="text-mq-primary-dark font-extrabold text-xl leading-tight">
          {t.blobLeft.map((line, i) => (<span key={i}>{i > 0 && <br />}{line}</span>))} <span className="inline-block mt-1">😊</span>
        </p>
      </div>
      
      {/* Right Floating Text */}
      <div className="absolute top-16 right-[2%] w-64 -z-10 rotate-[8deg] text-center">
        <p className="text-mq-primary font-extrabold text-xl leading-tight mb-2">
          {t.blobRight.map((line, i) => (<span key={i}>{i > 0 && <br />}{line}</span>))}
        </p>
        <svg className="w-8 h-8 mx-auto text-mq-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>


      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6 mb-12 sm:mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
            <span className="px-5 py-2 bg-mq-surface-blue text-mq-primary font-bold rounded-full text-sm tracking-wide">
              {t.badge}
            </span>
            <span className="w-8 h-[2px] bg-mq-border-strong"></span>
          </div>
          
          <h2 className="text-2xl sm:text-4xl md:text-[3.2rem] font-extrabold text-mq-text-strong leading-[1.2] tracking-tight">
            {t.titleStart} <br className="hidden md:block" /> <span className="text-mq-primary">{t.titleHighlight}</span> {t.titleEnd}
          </h2>
          
          <p className="text-base sm:text-lg text-mq-text-muted font-medium">
            {t.intro}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Pink */}
          <div className="bg-mq-surface-pink rounded-[2rem] p-6 sm:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-100">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgLongInstructions} alt={t.cards[0].title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">{t.cards[0].title}</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              {t.cards[0].text}
            </p>
          </div>

          {/* Card 2: Blue */}
          <div className="bg-mq-surface-blue rounded-[2rem] p-6 sm:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-200">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgDifficultyStaying} alt={t.cards[1].title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">{t.cards[1].title}</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              {t.cards[1].text}
            </p>
          </div>

          {/* Card 3: Green */}
          <div className="bg-mq-surface-green rounded-[2rem] p-6 sm:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-300">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgSameSupport} alt={t.cards[2].title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">{t.cards[2].title}</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              {t.cards[2].text}
            </p>
          </div>

          {/* Card 4: Yellow */}
          <div className="bg-mq-surface-yellow rounded-[2rem] p-6 sm:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 shadow-sm animate-fade-in delay-400">
            <div className="w-full aspect-[4/3] rounded-2xl mb-6 overflow-hidden">
              <img src={imgCorrectIncorrect} alt={t.cards[3].title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <h3 className="text-[1.3rem] font-extrabold text-mq-text-strong mb-3 leading-snug">{t.cards[3].title}</h3>
            <p className="text-mq-text-muted text-[0.95rem] leading-relaxed font-medium">
              {t.cards[3].text}
            </p>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-12 sm:mt-16 text-center space-y-4 sm:space-y-6 animate-fade-in delay-500">
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-4 px-4 sm:px-8 py-3 sm:py-4 bg-mq-surface-blue rounded-2xl sm:rounded-full border border-mq-border shadow-sm max-w-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            <span className="text-mq-primary-dark font-extrabold text-base sm:text-lg md:text-xl text-center">
              {t.banner}
            </span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <p className="text-mq-text-muted font-bold text-sm sm:text-base">
            {t.closing}
          </p>
        </div>

      </div>
    </section>
  );
};

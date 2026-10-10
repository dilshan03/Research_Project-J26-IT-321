import { Play, Brain, BookOpen, Gamepad2, LineChart, ArrowRight, Heart } from 'lucide-react';

import heroImage from '../../../assets/images/public-pages/home/section-1-hero/home-hero.png';

export const HeroSection = () => {
  return (
    <section className="relative pt-4 sm:pt-6 pb-0 overflow-hidden bg-gradient-to-b from-mq-surface-soft to-mq-surface w-full max-w-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-12 items-center relative z-10 min-w-0">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-5 max-w-2xl min-w-0">
          {/* Badge */}
          <div className="badge animate-fade-in max-w-full inline-flex items-center text-xs sm:text-sm">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mq-danger fill-mq-danger shrink-0" />
            <span className="truncate">Designed for Every Learner &bull; Sinhala & English &bull; Primary Grades (1-5)</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.9rem] xl:text-[3.5rem] font-extrabold text-mq-text-strong leading-[1.18] sm:leading-[1.15] tracking-tight animate-fade-in delay-100 min-w-0">
            Math Learning <br />
            <span className="text-mq-secondary relative">
              That Adapts
            </span> <br />
            to Every Child
            <span className="inline-block ml-3 sm:ml-4 animate-bounce align-middle">
              <svg className="w-7 h-7 sm:w-9 sm:h-9 xl:w-10 xl:h-10" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg xl:text-[1.1rem] text-mq-text-muted max-w-xl leading-relaxed font-medium animate-fade-in delay-200">
            MathQuest provides short, step-by-step <strong className="text-mq-text-strong">Sinhala and English</strong> mathematics activities with personalized support for learners who need help maintaining attention and progressing at their own pace.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 animate-fade-in delay-300">
            <button className="btn btn-primary px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg">
              Start Learning <ArrowRight size={20} strokeWidth={3} />
            </button>
            <button className="btn btn-secondary px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg gap-3 hover:scale-105 transition-transform duration-300">
              <div className="bg-mq-primary p-1.5 rounded-full text-white">
                <Play size={16} className="fill-white" />
              </div>
              See How It Works
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-4 sm:pt-5 border-t border-mq-border">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 animate-fade-in delay-200 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-mq-surface-green rounded-full flex items-center justify-center text-mq-success">
                <Brain size={26} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-mq-text-strong leading-tight">Attention-<br />Friendly Design</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 animate-fade-in delay-300 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-mq-surface-purple rounded-full flex items-center justify-center text-mq-accent-purple">
                <BookOpen size={26} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-mq-text-strong leading-tight">Sinhala &<br />English Support</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 animate-fade-in delay-400 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-mq-surface-pink rounded-full flex items-center justify-center text-mq-danger">
                <Gamepad2 size={26} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-mq-text-strong leading-tight">Fun &<br />Engaging</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 animate-fade-in delay-500 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-mq-surface-blue rounded-full flex items-center justify-center text-mq-primary">
                <LineChart size={26} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-mq-text-strong leading-tight">Personalized<br />Learning</span>
            </div>
          </div>
        </div>

        {/* Right Column (Hero Graphic with Distinct Liquid Blobs) */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px] xl:max-w-[480px] aspect-square mx-auto flex items-center justify-center animate-fade-in delay-300 my-4 lg:my-0 p-2 min-w-0">

          {/* Transparent Liquid Blob 1 */}
          <div
            className="absolute inset-0 scale-105 bg-mq-primary/20 animate-morph-square -z-20"
            style={{ animationDuration: '12s' }}
          ></div>

          {/* Main Image masked as a Liquid Blob */}
          <div
            className="relative w-full h-full animate-morph-square overflow-hidden border-4 sm:border-[6px] border-white shadow-2xl z-10 bg-mq-surface-soft flex items-center justify-center"
            style={{ animationDuration: '9s', animationDirection: 'reverse' }}
          >
            <img
              src={heroImage}
              alt="MathQuest Interactive Learning"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 ease-out animate-float max-w-full"
            />
          </div>
        </div>
      </div>

      {/* Bottom Text with Wave Background */}
      <div className="relative w-full mt-2 sm:mt-0 py-12 sm:py-16 px-4 sm:px-8">
        {/* SVG Wave Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 96C480 192 960 -32 1440 96V256C960 160 480 352 0 256V96Z" fill="#C5E2FA"></path>
          </svg>
        </div>

        <div className="text-center animate-fade-in delay-500 relative z-10 max-w-4xl mx-auto px-4">
          <p className="text-mq-text-soft uppercase tracking-widest text-xs sm:text-sm font-bold mb-3 flex items-center justify-center gap-3 sm:gap-4">
            <span className="w-8 sm:w-12 h-[2px] bg-mq-border-strong"></span>
            More Than Just Correct Answers
            <span className="w-8 sm:w-12 h-[2px] bg-mq-border-strong"></span>
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-mq-text-strong flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            <span>A Kinder, Smarter Way to Learn Mathematics</span>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
          </h2>
        </div>
      </div>
    </section>
  );
};

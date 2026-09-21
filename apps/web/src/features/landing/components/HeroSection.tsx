import { Play, Brain, BookOpen, Gamepad2, LineChart, ArrowRight, Heart } from 'lucide-react';

import heroImage from '../../../assets/images/public-pages/home/section-1-hero/home-hero.png';

export const HeroSection = () => {
  return (
    <section className="relative pt-6 pb-0 overflow-hidden bg-gradient-to-b from-mq-surface-soft to-mq-surface">
      <div className="max-w-[1400px] mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Column */}
        <div className="space-y-5 max-w-2xl">
          {/* Badge */}
          <div className="badge animate-fade-in">
            <Heart className="w-4 h-4 text-mq-danger fill-mq-danger" />
            Designed for Every Learner &bull; Sinhala & English &bull; Primary Grades (1-5)
          </div>

          {/* Headline */}
          <h1 className="text-[2.8rem] md:text-[3.5rem] font-extrabold text-mq-text-strong leading-[1.15] tracking-tight animate-fade-in delay-100">
            Math Learning <br />
            <span className="text-mq-secondary relative">
              That Adapts
            </span> <br />
            to Every Child 
            <span className="inline-block ml-4 animate-bounce">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </span>
          </h1>

          {/* Description */}
          <p className="text-[1.1rem] text-mq-text-muted max-w-xl leading-relaxed font-medium animate-fade-in delay-200">
            MathQuest provides short, step-by-step <strong className="text-mq-text-strong">Sinhala and English</strong> mathematics activities with personalized support for learners who need help maintaining attention and progressing at their own pace.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-4 animate-fade-in delay-300">
            <button className="btn btn-primary px-8 py-4 text-lg">
              Start Learning <ArrowRight size={20} strokeWidth={3} />
            </button>
            <button className="btn btn-secondary px-8 py-4 text-lg gap-3 hover:scale-105 transition-transform duration-300">
              <div className="bg-mq-primary p-1.5 rounded-full text-white">
                <Play size={16} className="fill-white" />
              </div>
              See How It Works
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-5 border-t border-mq-border">
            <div className="flex flex-col items-center text-center space-y-3 animate-fade-in delay-200 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-14 h-14 bg-mq-surface-green rounded-full flex items-center justify-center text-mq-success">
                <Brain size={28} />
              </div>
              <span className="text-sm font-bold text-mq-text-strong leading-tight">Attention-<br/>Friendly Design</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 animate-fade-in delay-300 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-14 h-14 bg-mq-surface-purple rounded-full flex items-center justify-center text-mq-accent-purple">
                <BookOpen size={28} />
              </div>
              <span className="text-sm font-bold text-mq-text-strong leading-tight">Sinhala &<br/>English Support</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 animate-fade-in delay-400 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-14 h-14 bg-mq-surface-pink rounded-full flex items-center justify-center text-mq-danger">
                <Gamepad2 size={28} />
              </div>
              <span className="text-sm font-bold text-mq-text-strong leading-tight">Fun &<br/>Engaging</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 animate-fade-in delay-500 hover:-translate-y-2 transition-transform duration-300 cursor-pointer">
              <div className="w-14 h-14 bg-mq-surface-blue rounded-full flex items-center justify-center text-mq-primary">
                <LineChart size={28} />
              </div>
              <span className="text-sm font-bold text-mq-text-strong leading-tight">Personalized<br/>Learning</span>
            </div>
          </div>
        </div>

        {/* Right Column (Hero Graphic with Distinct Liquid Blobs) */}
        <div className="relative w-full max-w-[450px] lg:max-w-[500px] aspect-square mx-auto flex items-center justify-center animate-fade-in delay-300 mt-8 lg:-mt-12 p-2">
          
          {/* Transparent Liquid Blob 1 (Yatin dapu transparent layer eka) */}
          <div 
            className="absolute inset-[-4%] bg-mq-primary/20 animate-morph-square -z-20" 
            style={{ animationDuration: '12s' }}
          ></div>
          
          {/* Main Image masked as a Liquid Blob */}
          <div 
            className="relative w-full h-full animate-morph-square overflow-hidden border-[6px] border-white shadow-2xl z-10 bg-mq-surface-soft flex items-center justify-center"
            style={{ animationDuration: '9s', animationDirection: 'reverse' }}
          >
            <img 
              src={heroImage} 
              alt="MathQuest Interactive Learning" 
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 ease-out animate-float" 
            />
          </div>
        </div>
      </div>
      
      {/* Bottom Text with Wave Background */}
      <div className="relative w-full mt-0 py-16 px-8">
        {/* SVG Wave Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 96C480 192 960 -32 1440 96V256C960 160 480 352 0 256V96Z" fill="#C5E2FA"></path>
          </svg>
        </div>
        
        <div className="text-center animate-fade-in delay-500 relative z-10">
          <p className="text-mq-text-soft uppercase tracking-widest text-sm font-bold mb-3 flex items-center justify-center gap-4">
            <span className="w-12 h-[2px] bg-mq-border-strong"></span>
            More Than Just Correct Answers
            <span className="w-12 h-[2px] bg-mq-border-strong"></span>
          </p>
          <h2 className="text-3xl font-extrabold text-mq-text-strong flex items-center justify-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            A Kinder, Smarter Way to Learn Mathematics
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mq-accent-yellow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </h2>
        </div>
      </div>
    </section>
  );
};

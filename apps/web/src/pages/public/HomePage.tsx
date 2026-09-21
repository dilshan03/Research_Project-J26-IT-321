import { Navbar } from '../../shared/components/Navbar';
import { HeroSection } from '../../features/landing/components/HeroSection';
import { WhyMathQuestSection } from '../../features/landing/components/WhyMathQuestSection';
import { HowItWorksSection } from '../../features/landing/components/HowItWorksSection';

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-mq-text selection:bg-mq-surface-blue">
      <Navbar />
      <main>
        <HeroSection />
        <WhyMathQuestSection />
        <HowItWorksSection />
      </main>
    </div>
  );
};

export default HomePage;

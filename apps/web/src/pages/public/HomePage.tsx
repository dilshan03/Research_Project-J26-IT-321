import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../../shared/components/Navbar';
import { HeroSection } from '../../features/landing/components/HeroSection';
import { WhyMathQuestSection } from '../../features/landing/components/WhyMathQuestSection';
import { HowItWorksSection } from '../../features/landing/components/HowItWorksSection';
import { AboutSection, ContactSection } from '../../features/landing/components/AboutContactSection';

export const HomePage = () => {
  const { hash } = useLocation();

  // Scroll to the section named in the URL (#features, #how-it-works, #about, #contact), also after client-side navigation
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-white font-sans text-mq-text selection:bg-mq-surface-blue">
      <Navbar />
      <main>
        <HeroSection />
        <WhyMathQuestSection />
        <HowItWorksSection />
        <AboutSection />
        <ContactSection />
      </main>
    </div>
  );
};

export default HomePage;

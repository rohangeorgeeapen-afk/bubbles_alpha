"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    setShowScrollIndicator(true);

    const handleScroll = () => {
      setShowScrollIndicator(window.scrollY <= 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-base overflow-y-auto">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 md:pt-32 pb-20 md:pb-24 border-b border-border-subtle relative">
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col items-center mb-8">
            {/* Logo */}
            <div 
              className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-6 cursor-pointer group"
              onClick={(e) => {
                const img = e.currentTarget.querySelector('img');
                if (img) {
                  const currentRotation = parseInt(img.style.rotate || '0');
                  img.style.rotate = `${currentRotation + 360}deg`;
                }
              }}
            >
              <Image 
                src="/logo.png" 
                alt="Bubbles Logo"
                width={160}
                height={160}
                className="w-full h-full object-contain transition-all duration-500 ease-out group-hover:scale-110"
                style={{ transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), rotate 1s ease' }}
                priority
              />
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-none text-center text-text-primary">
                bubbles
              </h1>
              {/* Beta badge - info semantic color */}
              <span className="text-xs sm:text-sm font-medium px-2.5 py-1 bg-info-muted text-info rounded border border-info/30 uppercase tracking-wider">
                Beta
              </span>
            </div>
          </div>
          
          <p className="text-text-secondary text-base sm:text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed text-center px-2">
            Explore every question without losing your train of thought.
            <br />
            <span className="text-text-tertiary text-sm sm:text-base">Branch conversations naturally. Follow curiosity freely.</span>
          </p>
          
          <div className="flex justify-center">
            <CTAButton onClick={onGetStarted}>Get Started</CTAButton>
          </div>
        </div>
        
        <ScrollIndicator show={showScrollIndicator} onClick={scrollToFeatures} />
      </section>

      <FeaturesSection />
      <HowItWorksSection onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}

// PRIMARY CTA - Uses action-primary (cyan) because it's the main action
function CTAButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group relative px-6 sm:px-8 py-3 sm:py-3.5 bg-action-primary text-action-primary-text text-sm sm:text-base font-medium inline-flex items-center gap-2 touch-manipulation rounded-md transition-all duration-200 hover:bg-action-primary-hover shadow-depth-sm hover:shadow-depth-md"
    >
      <span className="relative z-10 flex items-center gap-2 tracking-wide">
        {children}
        <svg 
          className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </button>
  );
}

function ScrollIndicator({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center w-full absolute bottom-8 left-0 right-0">
      <button
        onClick={onClick}
        className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        aria-label="Scroll to features"
      >
        <div className="flex flex-col gap-1.5 group-hover:gap-2 transition-all duration-300">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div 
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse-subtle"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      </button>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: '/icon-curiosity.png',
      title: 'Follow Your Curiosity',
      description: 'Ask follow-up questions on any topic without derailing your main conversation',
    },
    {
      icon: '/icon-organized.png',
      title: 'Stay Organized',
      description: 'See your entire conversation tree at a glance. Navigate between topics effortlessly',
    },
    {
      icon: '/icon-context.png',
      title: 'Keep Context',
      description: 'Each branch maintains its own context. Return to any conversation thread anytime',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24 border-b border-border-subtle">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
        {features.map((feature, i) => (
          <div key={i} className="text-center group p-6 rounded-lg border border-transparent hover:border-border-default hover:bg-surface transition-all duration-200">
            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-6">
              <Image 
                src={feature.icon} 
                alt={feature.title}
                width={80}
                height={80}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <h3 className="text-text-primary text-lg sm:text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-text-tertiary text-sm sm:text-base leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection({ onGetStarted }: { onGetStarted: () => void }) {
  const steps = [
    { title: 'Ask your question', description: "Start with any question or topic you're curious about" },
    { title: 'Branch off naturally', description: 'When something sparks your curiosity, create a new branch to explore it' },
    { title: 'Navigate your knowledge tree', description: 'Switch between branches, zoom in on details, or step back to see the big picture' },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
        <h2 className="text-text-primary text-2xl sm:text-3xl md:text-4xl font-semibold mb-8 tracking-tight">How It Works</h2>
        <div className="space-y-4 text-left mb-10">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-lg border border-border-subtle bg-surface hover:border-border-default transition-colors duration-200">
              {/* Step numbers use text-tertiary - they're labels, not primary content */}
              <div className="flex-shrink-0 w-8 h-8 rounded border border-border-strong text-text-tertiary font-mono font-medium flex items-center justify-center text-sm">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h4 className="text-text-primary font-medium mb-1">{step.title}</h4>
                <p className="text-text-tertiary text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-text-secondary text-base sm:text-lg mb-6">Ready to think differently?</p>
        <CTAButton onClick={onGetStarted}>Start Exploring</CTAButton>
        <p className="text-text-disabled text-xs sm:text-sm mt-4 tracking-wide">Free to use • No credit card required</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 border-t border-border-subtle">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-text-disabled text-xs sm:text-sm font-mono">© 2025 Bubbles</p>
        <div className="flex items-center gap-6">
          {/* Links use text-tertiary, hover to text-secondary - subtle but accessible */}
          <a href="/privacy" className="text-text-tertiary hover:text-text-secondary transition-colors text-xs sm:text-sm">
            Privacy Policy
          </a>
          <a href="mailto:rohan@chynex.com" className="text-text-tertiary hover:text-text-secondary transition-colors text-xs sm:text-sm">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

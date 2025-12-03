"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Handle scroll to hide indicator
  useEffect(() => {
    setShowScrollIndicator(true);

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    window.scrollTo({
      top: window.innerHeight * 0.8,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] overflow-y-auto">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 md:pt-32 pb-20 md:pb-24 border-b border-[#2a2a2a] relative">
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col items-center mb-8">
            {/* Logo Image */}
            <div 
              className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-4 cursor-pointer group transition-all duration-500"
              style={{
                filter: 'drop-shadow(0 0 0 transparent)',
                transition: 'filter 0.5s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 12px 40px rgba(0, 213, 255, 0.5))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 0 transparent)';
              }}
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
                className="w-full h-full object-contain animate-bubble-pop transition-all duration-500 ease-out hover:scale-[1.4]"
                style={{ 
                  background: 'transparent',
                  transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), rotate 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                priority
              />
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <h1 
                className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-none text-center" 
                style={{ 
                  fontFamily: 'var(--font-montserrat), sans-serif', 
                  fontWeight: 700, 
                  backgroundImage: 'linear-gradient(to bottom, #ffffff 30%, #e0f2fe 70%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                bubbles
              </h1>
              <span className="text-xs sm:text-sm font-semibold px-2 py-1 bg-[#00D5FF]/20 text-[#00D5FF] rounded border border-[#00D5FF]/30">
                BETA
              </span>
            </div>
          </div>
          <p className="text-[#b4b4b4] text-base sm:text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed text-center px-2">
            Explore every question without losing your train of thought.
            <br />
            <span className="text-[#8e8e8e] text-sm sm:text-base">Branch conversations naturally. Follow curiosity freely.</span>
          </p>
          <div className="flex justify-center">
            <CTAButton onClick={onGetStarted}>Get Started</CTAButton>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <ScrollIndicator show={showScrollIndicator} onClick={scrollToFeatures} />
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works Section */}
      <HowItWorksSection onGetStarted={onGetStarted} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Sub-components
function CTAButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group relative px-6 sm:px-8 md:px-6 py-3 sm:py-3.5 md:py-2.5 bg-white text-[#212121] text-base sm:text-lg md:text-base rounded-xl font-semibold overflow-hidden inline-flex items-center gap-2 touch-manipulation"
      style={{
        transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 213, 255, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <svg 
          className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
          {[0, 0.3, 0.6].map((delay, i) => (
            <div 
              key={i}
              className="w-1 h-1 rounded-full bg-[#00D5FF] group-hover:w-1.5 group-hover:h-1.5 transition-all duration-300"
              style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${delay}s`
              }}
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
      rotation: '-rotate-6',
    },
    {
      icon: '/icon-organized.png',
      title: 'Stay Organized',
      description: 'See your entire conversation tree at a glance. Navigate between topics effortlessly',
      rotation: 'rotate-6',
    },
    {
      icon: '/icon-context.png',
      title: 'Keep Context',
      description: 'Each branch maintains its own context. Return to any conversation thread anytime',
      rotation: '-rotate-6',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24 border-b border-[#2a2a2a]">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
        {features.map((feature, i) => (
          <div key={i} className="text-center group">
            <Image 
              src={feature.icon} 
              alt={feature.title}
              width={80}
              height={80}
              className={`w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:${feature.rotation}`}
            />
            <h3 className="text-[#ececec] text-lg sm:text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-[#8e8e8e] text-sm sm:text-base leading-relaxed">{feature.description}</p>
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
        <h2 className="text-[#ececec] text-2xl sm:text-3xl md:text-4xl font-bold mb-6">How It Works</h2>
        <div className="space-y-4 sm:space-y-6 text-left mb-8 sm:mb-12">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 sm:gap-4 items-start">
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00D5FF] text-[#1a1a1a] font-bold flex items-center justify-center text-sm sm:text-base">
                {i + 1}
              </div>
              <div>
                <h4 className="text-[#ececec] font-semibold mb-1 text-sm sm:text-base">{step.title}</h4>
                <p className="text-[#8e8e8e] text-sm sm:text-base">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-[#b4b4b4] text-base sm:text-lg mb-6">Ready to think differently?</p>
        <CTAButton onClick={onGetStarted}>Start Exploring</CTAButton>
        <p className="text-[#6e6e6e] text-xs sm:text-sm mt-4">Free to use • No credit card required</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 border-t border-[#2a2a2a]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[#6e6e6e] text-xs sm:text-sm">
          © 2025 Bubbles. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a 
            href="/privacy" 
            className="text-[#8e8e8e] hover:text-[#ececec] transition-colors text-xs sm:text-sm"
          >
            Privacy Policy
          </a>
          <a 
            href="mailto:rohan@chynex.com" 
            className="text-[#8e8e8e] hover:text-[#ececec] transition-colors text-xs sm:text-sm"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

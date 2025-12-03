"use client";

import React, { useState, useEffect } from 'react';

export default function TypingIndicator() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return (
    <div 
      className="flex justify-start mb-4"
      role="status"
      aria-live="polite"
      aria-label="AI is typing"
    >
      <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-[#2f2f2f]">
        <div className="flex items-center gap-1.5">
          {prefersReducedMotion ? (
            <span className="text-[#b4b4b4] text-sm">AI is typing...</span>
          ) : (
            <>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

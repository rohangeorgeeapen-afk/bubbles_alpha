"use client";

import React, { useState, useEffect } from 'react';

export default function TypingIndicator() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return (
    <div className="flex justify-start mb-4" role="status" aria-live="polite" aria-label="AI is typing">
      <div className="max-w-[70%] rounded-md px-4 py-3 bg-surface border border-border-subtle">
        <div className="flex items-center gap-3">
          {prefersReducedMotion ? (
            <span className="text-text-tertiary text-sm">Thinking...</span>
          ) : (
            <>
              {/* Palantir-style geometric loader */}
              <div className="relative w-5 h-5">
                {/* Outer ring */}
                <div className="absolute inset-0 border border-text-tertiary/30 rounded-full animate-[spin_3s_linear_infinite]" />
                {/* Middle ring */}
                <div className="absolute inset-[3px] border border-text-tertiary/50 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                {/* Inner dot */}
                <div className="absolute inset-[6px] bg-text-tertiary/70 rounded-full animate-pulse" />
              </div>
              <span className="text-sm text-text-tertiary animate-pulse">Thinking...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

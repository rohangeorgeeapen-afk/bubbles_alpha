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
              {/* Smooth bouncing dots */}
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 bg-action-primary rounded-full"
                  style={{
                    animation: 'thinking-bounce 1.4s ease-in-out infinite',
                    animationDelay: '0ms',
                  }}
                />
                <div 
                  className="w-2 h-2 bg-action-primary rounded-full"
                  style={{
                    animation: 'thinking-bounce 1.4s ease-in-out infinite',
                    animationDelay: '160ms',
                  }}
                />
                <div 
                  className="w-2 h-2 bg-action-primary rounded-full"
                  style={{
                    animation: 'thinking-bounce 1.4s ease-in-out infinite',
                    animationDelay: '320ms',
                  }}
                />
              </div>
              <span 
                className="text-sm text-text-secondary"
                style={{
                  animation: 'thinking-fade 2s ease-in-out infinite',
                }}
              >
                Thinking
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

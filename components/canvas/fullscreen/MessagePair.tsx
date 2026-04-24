"use client";

import React, { useState, useEffect, memo } from 'react';
import { Copy, Check } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';

interface MessagePairProps {
  question: string;
  answer: string;
  isError?: boolean;
  isLoading?: boolean;
}

const MessagePair = memo(function MessagePair({ question, answer, isError, isLoading }: MessagePairProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isResponseHovered, setIsResponseHovered] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { console.error('Failed to copy:', err); }
  };

  return (
    <div 
      className={`mb-16 border border-border-subtle rounded-lg p-6 bg-surface/50 shadow-depth-md ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}
      style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
      role="article"
      aria-label="Conversation exchange"
    >
      {/* User Question - uses user-question color (brightest) */}
      <div className="mb-5">
        <div className="text-xl font-semibold text-user-question leading-snug whitespace-pre-wrap break-words">
          {question}
        </div>
      </div>

      <div className="border-t border-border-subtle mb-5" />

      {/* AI Response - uses ai-response color (slightly muted) */}
      <div 
        className={isError ? 'text-error' : ''}
        onMouseEnter={() => setIsResponseHovered(true)}
        onMouseLeave={() => setIsResponseHovered(false)}
      >
        {isLoading && !answer ? (
          <div className="flex items-center gap-3 py-2">
            <div className="flex items-center gap-1">
              <div 
                className="w-2 h-2 bg-action-primary rounded-full"
                style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '0ms' }}
              />
              <div 
                className="w-2 h-2 bg-action-primary rounded-full"
                style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '160ms' }}
              />
              <div 
                className="w-2 h-2 bg-action-primary rounded-full"
                style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '320ms' }}
              />
            </div>
            <span className="text-sm text-text-secondary" style={{ animation: 'thinking-fade 2s ease-in-out infinite' }}>
              Thinking
            </span>
          </div>
        ) : (
          <>
            <MarkdownContent content={answer} className="text-base leading-relaxed text-ai-response" />
            {/* Copy button - at end of response */}
            {answer && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleCopyResponse}
                  className={`p-1.5 rounded-md bg-void border border-border-subtle transition-all duration-200 ${
                    isResponseHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  } hover:bg-elevated hover:border-border-default`}
                  aria-label={isCopied ? 'Copied!' : 'Copy response'}
                  title={isCopied ? 'Copied!' : 'Copy'}
                >
                  {isCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-text-tertiary" />}
                </button>
              </div>
            )}
          </>
        )}
        
      </div>
    </div>
  );
});

export default MessagePair;

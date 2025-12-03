"use client";

import React, { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';

interface MessagePairProps {
  question: string;
  answer: string;
  isError?: boolean;
  messageId?: string;
  onRetry?: (messageId: string) => Promise<void>;
}

const MessagePair = memo(function MessagePair({ question, answer, isError, messageId, onRetry }: MessagePairProps) {
  const [isRetrying, setIsRetrying] = useState(false);
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

  const handleRetry = async () => {
    if (!messageId || !onRetry) return;
    setIsRetrying(true);
    try { await onRetry(messageId); } finally { setIsRetrying(false); }
  };

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
        className={`relative ${isError ? 'text-error' : ''}`}
        onMouseEnter={() => setIsResponseHovered(true)}
        onMouseLeave={() => setIsResponseHovered(false)}
      >
        <MarkdownContent content={answer} className="text-base leading-relaxed text-ai-response" />
        
        {/* Copy button - ghost action */}
        {answer && (
          <button
            onClick={handleCopyResponse}
            className={`absolute top-0 right-0 p-2 rounded-md bg-void border border-border-subtle transition-all duration-200 ${
              isResponseHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
            } hover:bg-elevated hover:border-border-default`}
            aria-label={isCopied ? 'Copied!' : 'Copy response'}
            title={isCopied ? 'Copied!' : 'Copy'}
          >
            {isCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-text-tertiary" />}
          </button>
        )}
        
        {/* Retry button for errors */}
        {isError && onRetry && messageId && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`mt-4 h-8 px-3 bg-error hover:bg-error/90 text-white rounded-md text-sm font-medium ${prefersReducedMotion ? '' : 'transition-colors'}`}
            aria-label="Retry sending message"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
});

export default MessagePair;

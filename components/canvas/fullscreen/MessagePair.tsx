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

const MessagePair = memo(function MessagePair({ 
  question, 
  answer, 
  isError,
  messageId,
  onRetry 
}: MessagePairProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isResponseHovered, setIsResponseHovered] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleRetry = async () => {
    if (!messageId || !onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry(messageId);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div 
      className={`mb-20 border border-[#00D5FF]/30 rounded-2xl p-6 bg-[#2a2a2a]/30 ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}
      style={{ 
        willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 213, 255, 0.05)'
      }}
      role="article"
      aria-label="Conversation exchange"
    >
      {/* User Question */}
      <div className="mb-5">
        <div className="text-[24px] font-semibold text-[#ececec] leading-[1.4] whitespace-pre-wrap break-words" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 213, 255, 0.1)' }}>
          {question}
        </div>
      </div>

      {/* Separator Line */}
      <div className="border-t border-[#4d4d4d] mb-6"></div>

      {/* AI Response */}
      <div 
        className={`relative ${isError ? 'text-red-400' : ''}`}
        onMouseEnter={() => setIsResponseHovered(true)}
        onMouseLeave={() => setIsResponseHovered(false)}
      >
        <MarkdownContent content={answer} className="text-[16px] leading-[1.7] text-[#ececec]" />
        
        {/* Copy button - appears on hover */}
        {answer && (
          <button
            onClick={handleCopyResponse}
            className={`absolute top-0 right-0 p-2 rounded-lg bg-[#2a2a2a] border border-[#4d4d4d] ${prefersReducedMotion ? '' : 'transition-all duration-200'} ${
              isResponseHovered 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 -translate-y-1 pointer-events-none'
            } hover:bg-[#3a3a3a] hover:border-[#00D5FF]/50`}
            aria-label={isCopied ? 'Copied!' : 'Copy response'}
            title={isCopied ? 'Copied!' : 'Copy response'}
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-[#28c840]" />
            ) : (
              <Copy className="w-4 h-4 text-[#ececec]" />
            )}
          </button>
        )}
        
        {isError && onRetry && messageId && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`mt-4 h-8 px-3 bg-red-700 hover:bg-red-600 ${prefersReducedMotion ? '' : 'hover:scale-105 active:scale-95'} text-white rounded-lg text-sm font-medium ${prefersReducedMotion ? '' : 'transition-all duration-200'}`}
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

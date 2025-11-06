"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onEscape?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  preservedMessage?: string;
  disabled?: boolean;
  isTransitioning?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onEscape,
  isLoading = false,
  placeholder = "Type your message... (Shift+Enter for new line)",
  autoFocus = true,
  preservedMessage = '',
  disabled = false,
  isTransitioning = false,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(preservedMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Detect viewport size and motion preferences
  useEffect(() => {
    const checkViewportSize = () => {
      setIsMobile(window.innerWidth < 768); // Mobile breakpoint at 768px
    };
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    checkViewportSize();
    window.addEventListener('resize', checkViewportSize);
    mediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
      window.removeEventListener('resize', checkViewportSize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Update input value when preservedMessage changes
  useEffect(() => {
    if (preservedMessage) {
      setInputValue(preservedMessage);
    }
  }, [preservedMessage]);

  // Auto-focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Reset to minimum height when transitioning ends
  useEffect(() => {
    if (!isTransitioning && inputRef.current) {
      const minHeight = isMobile ? 40 : 42;
      inputRef.current.style.height = `${minHeight}px`;
    }
  }, [isTransitioning, isMobile]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current && !isTransitioning) {
      const minHeight = isMobile ? 40 : 42;
      const maxHeight = isMobile ? 120 : 150;
      
      // Reset to auto to get the natural scroll height
      inputRef.current.style.height = 'auto';
      
      // Set height based on content, but never below minimum
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue, isMobile, isTransitioning]);

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    setInputValue('');
    
    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message on error
      setInputValue(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send message (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to exit fullscreen
    if (e.key === 'Escape' && onEscape) {
      onEscape();
    }
  };

  const isDisabled = isSubmitting || isLoading || disabled;
  const canSend = inputValue.trim() && !isDisabled;

  return (
    <div className={`border-t border-[#4d4d4d] bg-[#2a2a2a] ${isMobile ? 'px-3 py-3' : 'px-6 py-3'} flex-shrink-0`}>
      <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto relative`}>
        <label htmlFor="chat-input" className="sr-only">
          Type your message
        </label>
        <Textarea
          id="chat-input"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? "Message..." : placeholder}
          disabled={isDisabled}
          aria-label="Chat message input"
          aria-describedby="chat-input-help"
          className={`w-full ${isMobile ? 'max-h-[120px] text-base' : 'max-h-[150px] text-[15px]'} bg-[#2f2f2f] border border-[#565656] text-[#ececec] placeholder:text-[#8e8e8e] ${isMobile ? 'rounded-xl' : 'rounded-lg'} ${isMobile ? 'px-3 py-2.5 pr-12' : 'px-4 py-2 pr-11'} resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#6e6e6e] leading-normal overflow-y-auto ${prefersReducedMotion ? '' : 'transition-all duration-200'}`}
          style={{ 
            fontSize: isMobile ? '16px' : '15px',
            minHeight: isMobile ? '44px' : '42px',
            height: isMobile ? '44px' : '42px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          rows={1}
        />
        <span id="chat-input-help" className="sr-only">
          {isMobile ? 'Press Enter to send' : 'Press Enter to send, Shift+Enter for new line, Escape to close'}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label={isSubmitting || isLoading ? 'Sending message' : 'Send message'}
          className={`absolute right-0.5 top-0.5 ${isMobile ? 'h-[40px] w-[40px] rounded-lg' : 'h-[38px] w-[38px] rounded-md'} p-0 bg-[#ececec] hover:bg-[#d4d4d4] ${prefersReducedMotion ? '' : 'hover:scale-105 active:scale-95'} text-[#0d0d0d] disabled:opacity-30 disabled:cursor-not-allowed ${prefersReducedMotion ? '' : 'transition-all duration-200'} shadow-sm flex items-center justify-center`}
          style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, background-color' }}
          title="Send message (Enter)"
        >
          {isSubmitting || isLoading ? (
            <div 
              className={`${isMobile ? 'w-4.5 h-4.5' : 'w-4 h-4'} border-2 border-[#565656] border-t-[#0d0d0d] rounded-full animate-spin`}
              style={{ willChange: prefersReducedMotion ? 'auto' : 'transform' }}
              role="status"
              aria-label="Loading"
            ></div>
          ) : (
            <ArrowUp className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} ${prefersReducedMotion ? '' : 'transition-transform duration-200'}`} strokeWidth={2.5} />
          )}
        </Button>
      </div>
    </div>
  );
}

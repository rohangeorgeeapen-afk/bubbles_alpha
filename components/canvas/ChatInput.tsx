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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Detect motion preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
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
      const minHeight = 42;
      inputRef.current.style.height = `${minHeight}px`;
    }
  }, [isTransitioning]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current && !isTransitioning) {
      const minHeight = 42;
      const maxHeight = 150;
      
      // Reset to auto to get the natural scroll height
      inputRef.current.style.height = 'auto';
      
      // Set height based on content, but never below minimum
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue, isTransitioning]);

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
    <div className="border-t border-border-subtle bg-void px-6 py-3 flex-shrink-0 relative shadow-depth-lg">
      <div className="max-w-4xl mx-auto relative">
        <label htmlFor="chat-input" className="sr-only">Type your message</label>
        <Textarea
          id="chat-input"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          aria-label="Chat message input"
          aria-describedby="chat-input-help"
          className="w-full max-h-[150px] text-[15px] bg-surface border border-border-default text-text-primary placeholder:text-text-disabled rounded-md px-4 py-2.5 pr-12 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border-focus leading-normal overflow-y-auto transition-colors"
          style={{ fontSize: '15px', minHeight: '48px', height: '48px', scrollbarWidth: 'none' }}
          rows={1}
        />
        <span id="chat-input-help" className="sr-only">Press Enter to send, Shift+Enter for new line, Escape to close</span>
        <Button
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label={isSubmitting || isLoading ? 'Sending message' : 'Send message'}
          className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-md bg-action-primary hover:bg-action-primary-hover text-action-primary-text disabled:opacity-30 disabled:bg-elevated disabled:cursor-not-allowed ${prefersReducedMotion ? '' : 'transition-colors'} flex items-center justify-center`}
          title="Send message (Enter)"
        >
          {isSubmitting || isLoading ? (
            <div className="w-4 h-4 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" role="status" aria-label="Loading" />
          ) : (
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          )}
        </Button>
      </div>
    </div>
  );
}

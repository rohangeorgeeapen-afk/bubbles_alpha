"use client";

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onEscape?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  preservedMessage?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onEscape,
  isLoading = false,
  placeholder = "Type your message... (Shift+Enter for new line)",
  autoFocus = true,
  preservedMessage = '',
  disabled = false,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(preservedMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (preservedMessage) setInputValue(preservedMessage);
  }, [preservedMessage]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '24px';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 120);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message || isSubmitting || isLoading) return;
    setIsSubmitting(true);
    setInputValue('');
    try {
      await onSendMessage(message);
    } catch {
      setInputValue(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onEscape) onEscape();
  };

  const isDisabled = isSubmitting || isLoading || disabled;
  const canSend = inputValue.trim() && !isDisabled;

  // Button: 32px, Text box padding: 6px top + 6px bottom = 44px total
  // Footer padding: 12px top + 12px bottom = 68px total with 44px text box

  return (
    <div className="bg-void border-t border-border-subtle py-3 px-4">
      <div className="max-w-4xl mx-auto">
        <div 
          className="bg-surface border border-border-default rounded-lg focus-within:border-border-focus"
          style={{ padding: '5px 8px 5px 14px' }}
        >
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              rows={1}
              className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-disabled resize-none focus:outline-none align-middle"
              style={{ height: '30px', lineHeight: '30px', scrollbarWidth: 'none', padding: 0 }}
            />
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className="shrink-0 w-[30px] h-[30px] rounded-md bg-action-primary text-white flex items-center justify-center disabled:opacity-30 disabled:bg-elevated hover:bg-action-primary/90"
            >
              {isSubmitting || isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

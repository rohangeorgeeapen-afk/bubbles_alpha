"use client";

import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface CanvasEmptyStateProps {
  welcomeMessage: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onStartConversation: () => void;
  isLoading: boolean;
}

export default function CanvasEmptyState({
  welcomeMessage,
  searchTerm,
  onSearchTermChange,
  onStartConversation,
  isLoading,
}: CanvasEmptyStateProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '24px';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 96);
    textarea.style.height = `${newHeight}px`;
  }, [searchTerm]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">{welcomeMessage}</h1>
        <p className="text-base text-text-tertiary max-w-2xl mx-auto">
          Ask multiple follow-ups on any response without losing your thread
        </p>
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 bg-surface border border-border-default rounded-md focus-within:border-border-focus transition-colors pl-4 pr-2 py-2 shadow-depth-sm">
          <textarea
            ref={textareaRef}
            placeholder="Type your question..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              // Enter without Shift submits
              if (e.key === 'Enter' && !e.shiftKey && searchTerm.trim() && !isLoading) {
                e.preventDefault();
                onStartConversation();
              }
              // Shift+Enter adds new line (default behavior)
            }}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-base text-text-primary placeholder:text-text-disabled resize-none focus:outline-none"
            style={{ height: '24px', lineHeight: '24px', maxHeight: '96px', scrollbarWidth: 'none' }}
          />
          {isLoading ? (
            <div className="shrink-0 w-9 h-9 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" />
            </div>
          ) : (
            <button
              onClick={onStartConversation}
              disabled={!searchTerm.trim()}
              className="shrink-0 h-9 w-9 rounded-md bg-action-primary text-white flex items-center justify-center disabled:opacity-30 disabled:bg-elevated disabled:cursor-not-allowed hover:bg-action-primary/90 transition-colors"
              aria-label="Send message"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

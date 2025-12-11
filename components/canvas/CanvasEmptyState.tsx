"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
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
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
      <div className="text-center mb-10">
        {/* Primary text for main heading */}
        <h1 className="text-2xl font-semibold text-text-primary mb-2">{welcomeMessage}</h1>
        {/* Tertiary text for supporting copy */}
        <p className="text-base text-text-tertiary max-w-2xl mx-auto">
          Ask multiple follow-ups on any response without losing your thread
        </p>
      </div>
      <div className="w-full max-w-2xl">
        <div className="relative">
          <Input
            type="text"
            placeholder="Type your question..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim() && !isLoading) {
                onStartConversation();
              }
            }}
            disabled={isLoading}
            className="w-full h-14 bg-surface border border-border-default text-text-primary placeholder:text-text-disabled rounded-md px-5 pr-14 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border-focus transition-colors text-base touch-manipulation shadow-depth-sm"
            style={{ fontSize: '16px' }}
          />
          {isLoading ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" />
            </div>
          ) : (
            <button
              onClick={onStartConversation}
              disabled={!searchTerm.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 btn-primary p-0 flex items-center justify-center touch-manipulation disabled:opacity-30 disabled:bg-elevated disabled:cursor-not-allowed disabled:active:scale-100"
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

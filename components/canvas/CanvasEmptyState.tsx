"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
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
        <h1 className="text-2xl font-semibold text-[#ececec] mb-2">{welcomeMessage}</h1>
        <p className="text-base text-[#8e8e8e] max-w-2xl mx-auto whitespace-nowrap">
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
            className="w-full h-14 bg-[#2a2a2a] border border-[#4a4a4a] text-[#ececec] placeholder:text-[#6e6e6e] rounded-xl px-5 pr-14 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00D5FF]/50 transition-colors text-base touch-manipulation"
            style={{ fontSize: '16px' }}
          />
          {isLoading ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-[#4a4a4a] border-t-[#00D5FF] rounded-full animate-spin"></div>
            </div>
          ) : (
            <Button
              onClick={onStartConversation}
              disabled={!searchTerm.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-lg bg-[#00D5FF] hover:bg-[#00B8E6] text-[#0d0d0d] disabled:opacity-30 disabled:bg-[#4a4a4a] disabled:cursor-not-allowed transition-all flex items-center justify-center touch-manipulation"
              aria-label="Send message"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

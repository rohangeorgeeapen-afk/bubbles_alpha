"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, Maximize2, X, Copy, Check } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';

export interface ConversationNodeData extends Record<string, unknown> {
  question: string;
  response: string;
  timestamp: string;
  isStreaming?: boolean;
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onDelete?: (nodeId: string) => void;
  onMaximize?: (nodeId: string) => void;
}

export default function ConversationNode({ id, data }: NodeProps<any>) {
  const totalLength = data.question.length + data.response.length;
  const isLongContent = totalLength > 600;
  const [followUpText, setFollowUpText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const showFooter = isHovered || isInputFocused;
  
  const [isMac, setIsMac] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    setIsMac(window.navigator.userAgent.toLowerCase().includes('mac'));
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(data.response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmitFollowUp = async () => {
    if (followUpText.trim() && !isSubmitting) {
      const question = followUpText.trim();
      setFollowUpText('');
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      try {
        await data.onAddFollowUp(id, question);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      {/* Handles use border-strong - structural, not interactive */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-border-strong rounded-full" />
      
      {/* Card uses surface bg - elevated from canvas */}
      <Card 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        className={`w-[450px] bg-surface border border-border-default rounded-lg shadow-depth-lg overflow-hidden flex flex-col nowheel select-none ${
          prefersReducedMotion ? '' : 'transition-all duration-300'
        } ${isLongContent ? (showFooter ? 'h-[468px]' : 'h-[400px]') : ''}`}
        role="article"
        aria-label="Conversation node"
      >
        {/* Header - slightly darker than card body for depth */}
        <div className="h-8 bg-void border-b border-border-subtle flex items-center px-3 flex-shrink-0 justify-between relative">
          {data.onDelete && (
            <>
              {isMac ? (
                <div className="flex gap-2 nodrag nopan">
                  {/* macOS traffic lights - semantic colors */}
                  <button
                    onClick={() => data.onDelete?.(id)}
                    className={`w-3 h-3 rounded-full transition-colors group relative ${isHovered ? 'bg-error hover:bg-error/80' : 'bg-border-strong'}`}
                    aria-label="Delete node"
                    title="Delete"
                  >
                    {isHovered && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2 h-2 text-void" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                  <button className={`w-3 h-3 rounded-full cursor-default ${isHovered ? 'bg-warning' : 'bg-border-strong'}`} aria-hidden="true" />
                  <button
                    onClick={() => data.onMaximize?.(id)}
                    className={`w-3 h-3 rounded-full transition-colors group relative ${isHovered ? 'bg-success hover:bg-success/80 cursor-pointer' : 'bg-border-strong cursor-default'}`}
                    aria-label="Maximize"
                    title="Maximize"
                  >
                    {isHovered && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-2 h-2 text-void" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="ml-auto flex nodrag nopan">
                  <button className="w-8 h-8 flex items-center justify-center opacity-40 cursor-default" aria-hidden="true">
                    <div className="w-2.5 h-0.5 bg-text-tertiary" />
                  </button>
                  <button onClick={() => data.onMaximize?.(id)} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isHovered ? 'hover:bg-elevated cursor-pointer' : 'cursor-default'}`} aria-label="Maximize">
                    <Maximize2 className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button onClick={() => data.onDelete?.(id)} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isHovered ? 'hover:bg-error-muted' : ''}`} aria-label="Delete">
                    <X className="w-3.5 h-3.5 text-text-tertiary hover:text-error" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Content area */}
        <div className={`p-5 space-y-4 scrollbar-thin nodrag nopan select-text cursor-text ${isLongContent ? 'flex-1 overflow-y-auto' : ''}`}>
          {/* Question - uses user-question color (brightest text) */}
          <div className="nodrag nopan select-text cursor-text">
            <div className="text-lg font-semibold text-user-question whitespace-pre-wrap break-words leading-snug">
              {data.question}
            </div>
          </div>

          <div className="border-t border-border-subtle" />

          {/* Response - uses ai-response color (slightly muted) */}
          <div className="nodrag nopan select-text cursor-text relative">
            {data.response ? (
              <MarkdownContent content={data.response} className="text-[15px] text-ai-response leading-relaxed" />
            ) : data.isStreaming ? (
              <div className="flex items-center gap-3 py-3">
                {/* Palantir-style geometric loader */}
                <div className="relative w-5 h-5">
                  {/* Outer ring */}
                  <div className="absolute inset-0 border border-text-tertiary/30 rounded-full animate-[spin_3s_linear_infinite]" />
                  {/* Middle ring */}
                  <div className="absolute inset-[3px] border border-text-tertiary/50 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                  {/* Inner dot */}
                  <div className="absolute inset-[6px] bg-text-tertiary/70 rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-text-tertiary animate-pulse">Thinking...</span>
              </div>
            ) : null}
            
            {/* Streaming cursor */}
            {data.isStreaming && data.response && (
              <span className="inline-block w-0.5 h-4 bg-action-primary animate-pulse ml-0.5 align-middle" />
            )}
            
            {/* Copy button - ghost action, appears on hover, hidden while streaming */}
            {!data.isStreaming && data.response && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleCopyResponse}
                  className={`p-1.5 rounded-md bg-void border border-border-subtle transition-all duration-200 ${
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  } hover:bg-elevated hover:border-border-default nodrag nopan`}
                  aria-label={isCopied ? 'Copied!' : 'Copy response'}
                  title={isCopied ? 'Copied!' : 'Copy'}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-tertiary" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer with follow-up input - uses void bg for depth */}
        <div className={`border-t border-border-subtle bg-void select-none ${prefersReducedMotion ? '' : 'transition-all duration-300'} ${showFooter ? 'h-[60px] opacity-100' : 'h-0 opacity-0'}`}>
          <div className={`px-4 py-3 select-none ${prefersReducedMotion ? '' : 'transition-opacity duration-300'} ${showFooter ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative select-none">
              <Input
                type="text"
                placeholder="Ask a follow-up..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={async (e) => { if (e.key === 'Enter') await handleSubmitFollowUp(); }}
                disabled={isSubmitting}
                className="w-full h-8 bg-surface border border-border-default text-text-primary placeholder:text-text-disabled rounded-md px-3 pr-9 focus-visible:ring-0 focus-visible:border-border-focus transition-colors text-sm nodrag nopan"
              />
              {/* Submit button - primary action color */}
              <Button
                onClick={handleSubmitFollowUp}
                disabled={!followUpText.trim() || isSubmitting}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 rounded-md bg-action-primary hover:bg-action-primary-hover text-action-primary-text disabled:opacity-30 disabled:bg-elevated disabled:cursor-not-allowed transition-colors select-none"
              >
                {isSubmitting ? (
                  <div className="w-3 h-3 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-border-strong rounded-full" />
    </>
  );
}

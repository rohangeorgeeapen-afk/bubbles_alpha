"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, Maximize2, X, Copy, Check, GitBranch } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { useTextSelection, DisambiguationMenu } from './selection';
import HighlightedText from './selection/HighlightedText';
import type { ExploredSelection } from './types';

export interface ConversationNodeData extends Record<string, unknown> {
  question: string;
  response: string;
  timestamp: string;
  isStreaming?: boolean;
  exploredSelections?: ExploredSelection[];
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onBranchFromSelection?: (nodeId: string, selectedText: string, question: string, startOffset: number, endOffset: number, isFromQuestion: boolean) => Promise<void>;
  onNavigateToNode?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onMaximize?: (nodeId: string) => void;
}

export default function ConversationNode({ id, data }: NodeProps<any>) {
  const question = data.question || '';
  const response = data.response || '';
  const totalLength = question.length + response.length;
  const isLongContent = totalLength > 600;
  const [followUpText, setFollowUpText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Refs for text containers
  const questionRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Disambiguation menu state (for overlapping explored selections)
  const [disambiguationState, setDisambiguationState] = useState<{
    selections: ExploredSelection[];
    rect: DOMRect;
  } | null>(null);

  // Single text selection hook for both question and response
  const { selection: activeSelection, clearSelection: clearAllSelections } = useTextSelection({
    questionRef,
    responseRef,
    disabled: data.isStreaming,
  });

  // Handle branch button click - create branch with selected text + input text
  const handleBranchClick = useCallback(async () => {
    if (!activeSelection || !followUpText.trim() || !data.onBranchFromSelection) return;
    
    setIsSubmitting(true);
    try {
      await data.onBranchFromSelection(
        id,
        activeSelection.text,
        followUpText.trim(),
        activeSelection.startOffset,
        activeSelection.endOffset,
        activeSelection.isFromQuestion
      );
      setFollowUpText('');
      clearAllSelections();
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSelection, followUpText, data, id, clearAllSelections]);

  // Handle regular follow-up (no selection)
  const handleSubmitFollowUp = useCallback(async () => {
    if (!followUpText.trim() || isSubmitting) return;
    
    const q = followUpText.trim();
    setFollowUpText('');
    setIsSubmitting(true);
    try {
      await data.onAddFollowUp(id, q);
    } finally {
      setIsSubmitting(false);
    }
  }, [followUpText, isSubmitting, data, id]);

  // Handle highlight click (for explored selections)
  const handleHighlightClick = useCallback((selections: ExploredSelection[]) => {
    if (selections.length === 1) {
      data.onNavigateToNode?.(selections[0].childNodeId);
    } else {
      // For disambiguation, create a dummy rect at center of screen
      const rect = new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
      setDisambiguationState({ selections, rect });
    }
  }, [data]);

  // Handle single highlight click by childNodeId
  const handleResponseHighlightClick = useCallback((childNodeId: string) => {
    data.onNavigateToNode?.(childNodeId);
  }, [data]);

  const handleSelectBranch = useCallback((childNodeId: string) => {
    data.onNavigateToNode?.(childNodeId);
    setDisambiguationState(null);
  }, [data]);

  useEffect(() => {
    setIsMac(window.navigator.userAgent.toLowerCase().includes('mac'));
  }, []);

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Truncate selected text for display
  const truncatedSelection = activeSelection?.text 
    ? (activeSelection.text.length > 60 ? activeSelection.text.slice(0, 60) + '...' : activeSelection.text)
    : null;

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-border-strong rounded-full" />
      
      <Card 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        className={`relative w-[450px] bg-surface border border-border-default rounded-lg shadow-depth-lg overflow-hidden flex flex-col nowheel select-none ${isLongContent ? 'h-[468px]' : ''}`}
        role="article"
        aria-label="Conversation node"
      >
        {/* Header */}
        <div className="h-8 bg-void border-b border-border-subtle flex items-center px-3 flex-shrink-0 justify-between relative">
          {data.onDelete && (
            <>
              {isMac ? (
                <div className="flex gap-2 nodrag nopan">
                  <button
                    onClick={() => data.onDelete?.(id)}
                    className={`w-3 h-3 rounded-full transition-colors group relative ${isHovered ? 'bg-error hover:bg-error/80' : 'bg-border-strong'}`}
                    aria-label="Delete node"
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
        
        {/* Content area - stop mouseup propagation to prevent ReactFlow from clearing selection */}
        <div 
          className={`p-5 space-y-4 scrollbar-thin nodrag nopan select-text cursor-text relative ${isLongContent ? 'flex-1 overflow-y-auto' : ''}`}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {/* Question */}
          <div className="nodrag nopan select-text cursor-text" ref={questionRef}>
            <div className="text-lg font-semibold text-user-question whitespace-pre-wrap break-words leading-snug">
              {data.exploredSelections?.filter((s: ExploredSelection) => s.isFromQuestion).length > 0 ? (
                <HighlightedText
                  text={question}
                  selections={data.exploredSelections.filter((s: ExploredSelection) => s.isFromQuestion)}
                  onHighlightClick={handleHighlightClick}
                />
              ) : (
                question
              )}
            </div>
          </div>

          <div className="border-t border-border-subtle" />

          {/* Response */}
          <div className="nodrag nopan select-text cursor-text" ref={responseRef}>
            {response ? (
              <MarkdownContent 
                content={response} 
                className="text-[15px] text-ai-response leading-relaxed"
                highlights={data.exploredSelections?.filter((s: ExploredSelection) => !s.isFromQuestion).map((s: ExploredSelection) => ({
                  text: s.text,
                  startOffset: s.startOffset,
                  id: s.childNodeId,
                }))}
                onHighlightClick={handleResponseHighlightClick}
              />
            ) : data.isStreaming ? (
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-action-primary rounded-full" style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-action-primary rounded-full" style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '160ms' }} />
                  <div className="w-2 h-2 bg-action-primary rounded-full" style={{ animation: 'thinking-bounce 1.4s ease-in-out infinite', animationDelay: '320ms' }} />
                </div>
                <span className="text-sm text-text-secondary" style={{ animation: 'thinking-fade 2s ease-in-out infinite' }}>Thinking</span>
              </div>
            ) : null}
            
            {data.isStreaming && response && (
              <span className="inline-block w-0.5 h-4 bg-action-primary animate-pulse ml-0.5 align-middle" />
            )}
            
            {!data.isStreaming && response && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleCopyResponse}
                  className={`p-1.5 rounded-md bg-void border border-border-subtle transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} hover:bg-elevated hover:border-border-default nodrag nopan`}
                  aria-label={isCopied ? 'Copied!' : 'Copy response'}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-tertiary" />}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle bg-void select-none">
          {/* Selected text preview - always rendered, visibility controlled by CSS to avoid re-render clearing browser selection */}
          <div 
            className={`px-4 pt-2 pb-1 transition-all duration-150 ${
              activeSelection && data.onBranchFromSelection 
                ? 'opacity-100 max-h-10' 
                : 'opacity-0 max-h-0 overflow-hidden py-0'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <GitBranch className="w-3 h-3 text-action-primary flex-shrink-0" />
              <span className="text-text-tertiary truncate" title={activeSelection?.text || ''}>
                &ldquo;{truncatedSelection || ''}&rdquo;
              </span>
              <button 
                onClick={clearAllSelections}
                className="ml-auto p-0.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-secondary nodrag nopan"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Input row */}
          <div className="px-4 py-3 select-none">
            <div className="relative select-none flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder={activeSelection ? "Ask about this selection..." : "Ask a follow-up..."}
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && followUpText.trim()) {
                      if (activeSelection && data.onBranchFromSelection) {
                        await handleBranchClick();
                      } else {
                        await handleSubmitFollowUp();
                      }
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full h-8 bg-surface border border-border-default text-text-primary placeholder:text-text-disabled rounded-md px-3 pr-9 focus-visible:ring-0 focus-visible:border-border-focus transition-colors text-sm nodrag nopan"
                />
                {/* Submit/Branch button */}
                <Button
                  onClick={activeSelection && data.onBranchFromSelection ? handleBranchClick : handleSubmitFollowUp}
                  disabled={!followUpText.trim() || isSubmitting}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 p-0 rounded-md transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed ${
                    activeSelection && data.onBranchFromSelection
                      ? 'w-auto px-2 bg-action-primary/10 hover:bg-action-primary/20 text-action-primary border border-action-primary/30 disabled:bg-transparent'
                      : 'w-6 bg-action-primary hover:bg-action-primary-hover text-action-primary-text disabled:bg-elevated'
                  }`}
                  title={activeSelection ? "Branch from selection" : "Send"}
                >
                  {isSubmitting ? (
                    <div className="w-3 h-3 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" />
                  ) : activeSelection && data.onBranchFromSelection ? (
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" strokeWidth={2} />
                      <span className="text-xs font-medium">Branch</span>
                    </div>
                  ) : (
                    <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Disambiguation menu - positioned over the card */}
        {disambiguationState && (
          <DisambiguationMenu
            selections={disambiguationState.selections}
            anchorRect={disambiguationState.rect}
            onSelectBranch={handleSelectBranch}
            onDismiss={() => setDisambiguationState(null)}
          />
        )}
      </Card>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-border-strong rounded-full" />
    </>
  );
}

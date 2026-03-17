"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { ArrowUp, Maximize2, X, Copy, Check, GitBranch } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { useTextSelection, DisambiguationMenu } from './selection';
import HighlightedText from './selection/HighlightedText';
import type { ExploredSelection } from './types';
import { useCanvasCallbacks } from './contexts/CanvasCallbackContext';

export interface ConversationNodeData extends Record<string, unknown> {
  question: string;
  response: string;
  timestamp: string;
  isStreaming?: boolean;
  exploredSelections?: ExploredSelection[];
  /** The text that was selected to create this branch (shown as context) */
  selectionContext?: string;
}

export default function ConversationNode({ id, data }: NodeProps<any>) {
  // Get callbacks from context
  const {
    onAddFollowUp,
    onBranchFromSelection,
    onNavigateToNode,
    onDelete,
    onMaximize,
  } = useCanvasCallbacks();

  const question = data.question || '';
  const response = data.response || '';
  const totalLength = question.length + response.length;
  const isLongContent = totalLength > 600;
  const [followUpText, setFollowUpText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSelectionCopied, setIsSelectionCopied] = useState(false);
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
    if (!activeSelection || !followUpText.trim()) return;

    setIsSubmitting(true);
    try {
      await onBranchFromSelection(
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
  }, [activeSelection, followUpText, onBranchFromSelection, id, clearAllSelections]);

  // Handle regular follow-up (no selection)
  const handleSubmitFollowUp = useCallback(async () => {
    if (!followUpText.trim() || isSubmitting) return;

    const q = followUpText.trim();
    setFollowUpText('');
    setIsSubmitting(true);
    try {
      await onAddFollowUp(id, q);
    } finally {
      setIsSubmitting(false);
    }
  }, [followUpText, isSubmitting, onAddFollowUp, id]);

  // Handle highlight click (for explored selections)
  const handleHighlightClick = useCallback((selections: ExploredSelection[]) => {
    if (selections.length === 1) {
      onNavigateToNode(selections[0].childNodeId);
    } else {
      // For disambiguation, create a dummy rect at center of screen
      const rect = new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
      setDisambiguationState({ selections, rect });
    }
  }, [onNavigateToNode]);

  // Handle single highlight click by childNodeId
  const handleResponseHighlightClick = useCallback((childNodeId: string) => {
    onNavigateToNode(childNodeId);
  }, [onNavigateToNode]);

  const handleSelectBranch = useCallback((childNodeId: string) => {
    onNavigateToNode(childNodeId);
    setDisambiguationState(null);
  }, [onNavigateToNode]);

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
          {onDelete && (
            <>
              {isMac ? (
                <div className="flex gap-2 nodrag nopan">
                  <button
                    onClick={() => onDelete(id)}
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
                    onClick={() => onMaximize(id)}
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
                  <button onClick={() => onMaximize(id)} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isHovered ? 'hover:bg-elevated cursor-pointer' : 'cursor-default'}`} aria-label="Maximize">
                    <Maximize2 className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button onClick={() => onDelete(id)} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isHovered ? 'hover:bg-error-muted' : ''}`} aria-label="Delete">
                    <X className="w-3.5 h-3.5 text-text-tertiary hover:text-error" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Content area - stop mouseup propagation to prevent ReactFlow from clearing selection */}
        <div 
          className={`p-5 space-y-4 scrollbar-thin scrollbar-auto-hide nodrag nopan select-text cursor-text relative ${isLongContent ? 'flex-1 overflow-y-auto' : ''}`}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {/* Question */}
          <div className="nodrag nopan select-text cursor-text" ref={questionRef}>
            {/* Selection context - shown if this node was created from a text selection */}
            {data.selectionContext && (
              <div className="text-sm text-text-tertiary italic mb-2">
                &ldquo;{data.selectionContext}&rdquo;
              </div>
            )}
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
          {/* Selected text preview - only rendered when active */}
          {activeSelection && (
            <div className="px-4 pt-2 pb-1">
              <div className="flex items-center gap-2 text-xs">
                <GitBranch className="w-3 h-3 text-action-primary flex-shrink-0" />
                <span className="text-text-tertiary truncate flex-1 min-w-0" title={activeSelection?.text || ''}>
                  &ldquo;{truncatedSelection || ''}&rdquo;
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button 
                    onClick={async () => {
                      if (activeSelection?.text) {
                        await navigator.clipboard.writeText(activeSelection.text);
                        setIsSelectionCopied(true);
                        setTimeout(() => setIsSelectionCopied(false), 2000);
                      }
                    }}
                    className="p-0.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-secondary nodrag nopan"
                    title={isSelectionCopied ? "Copied!" : "Copy selected text"}
                  >
                    {isSelectionCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={clearAllSelections}
                    className="p-0.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-secondary nodrag nopan"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Input row */}
          <div className="p-4 select-none">
            {/* Textarea wrapper - flex container for vertical centering */}
            <div className="flex items-center gap-2 bg-surface border border-border-default rounded-md focus-within:border-border-focus transition-colors pl-3 pr-1.5 py-1.5">
              {/* Textarea */}
              <textarea
                placeholder={activeSelection ? "Ask about this selection..." : "Ask a follow-up..."}
                value={followUpText}
                onChange={(e) => {
                  setFollowUpText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && followUpText.trim()) {
                    e.preventDefault();
                    if (activeSelection) {
                      await handleBranchClick();
                    } else {
                      await handleSubmitFollowUp();
                    }
                  }
                }}
                disabled={isSubmitting}
                rows={1}
                className="flex-1 bg-transparent border-none text-text-primary placeholder:text-text-disabled focus:outline-none text-sm nodrag nopan resize-none overflow-y-auto"
                style={{ height: '24px', lineHeight: '24px', maxHeight: '96px' }}
              />
              {/* Submit/Branch button */}
              <Button
                onClick={activeSelection ? handleBranchClick : handleSubmitFollowUp}
                disabled={!followUpText.trim() || isSubmitting}
                className={`shrink-0 h-6 p-0 rounded-md transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed ${
                  activeSelection
                    ? 'w-auto px-2 bg-action-primary/10 hover:bg-action-primary/20 text-action-primary border border-action-primary/30 disabled:bg-transparent'
                    : 'w-6 bg-action-primary hover:bg-action-primary-hover text-action-primary-text disabled:bg-elevated'
                }`}
                title={activeSelection ? "Branch from selection (Enter)" : "Send (Enter)"}
              >
                {isSubmitting ? (
                  <div className="w-3 h-3 border-2 border-border-strong border-t-action-primary rounded-full animate-spin" />
                ) : activeSelection ? (
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

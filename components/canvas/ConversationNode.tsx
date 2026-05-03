"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AsciiBox } from '@/components/ui/ascii-box';

import MarkdownContent from '@/components/shared/MarkdownContent';
import { useTextSelection, DisambiguationMenu } from './selection';
import HighlightedText from './selection/HighlightedText';
import type { ExploredSelection } from './types';

export interface ConversationNodeData extends Record<string, unknown> {
  question: string;
  response: string;
  reasoning?: string;
  timestamp: string;
  isStreaming?: boolean;
  exploredSelections?: ExploredSelection[];
  /** The text that was selected to create this branch (shown as context) */
  selectionContext?: string;
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onBranchFromSelection?: (nodeId: string, selectedText: string, question: string, startOffset: number, endOffset: number, isFromQuestion: boolean) => Promise<void>;
  onNavigateToNode?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onMaximize?: (nodeId: string) => void;
}

export default function ConversationNode({ id, data }: NodeProps<any>) {
  // Debug: log exploredSelections
  console.log(`🔍 ConversationNode ${id} exploredSelections:`, data.exploredSelections);
  
  const question = data.question || '';
  const response = data.response || '';
  const reasoning: string = data.reasoning || '';
  const [showReasoning, setShowReasoning] = useState(false);
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

  // Title shows meta info (node number + short time), not the question itself —
  // the body already renders the question as the headline.
  const idMatch = String(id).match(/(\d+)$/);
  const nodeNum = idMatch ? idMatch[1] : id;
  const shortTime = (() => {
    const ts = data.timestamp;
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5); // HH:MM (24h)
  })();
  const titleLabel = shortTime ? `Q · #${nodeNum} · ${shortTime}` : `Q · #${nodeNum}`;

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-border-strong" />

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        className="relative w-[450px] h-[468px] bg-base nowheel select-none flex flex-col"
        role="article"
        aria-label="Conversation node"
      >
        <AsciiBox
          title={titleLabel}
          topRight={
            data.onDelete ? (
              <span className="inline-flex items-center gap-[1ch] nodrag nopan">
                <button
                  onClick={() => data.onMaximize?.(id)}
                  className="text-text-tertiary hover:text-action-primary"
                  aria-label="Maximize"
                >
                  □
                </button>
                <button
                  onClick={() => data.onDelete?.(id)}
                  className="text-text-tertiary hover:text-error"
                  aria-label="Delete node"
                >
                  x
                </button>
              </span>
            ) : undefined
          }
          variant={data.isStreaming ? 'accent' : 'default'}
          className="absolute inset-0 text-[13px]"
          contentClassName="flex flex-col h-full p-0 pl-[2ch] pr-[2ch] pt-[1lh] pb-[1lh] gap-[0.75lh]"
        >
          {/* Scrollable content: question / reasoning / response */}
          <div
            className="nodrag nopan select-text cursor-text flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-auto-hide pr-[1ch]"
            onMouseUp={(e) => e.stopPropagation()}
          >
            {/* Question */}
            <div className="nodrag nopan select-text cursor-text" ref={questionRef}>
              {data.selectionContext && (
                <div className="text-text-tertiary italic mb-[0.5lh]">
                  &gt; &ldquo;{data.selectionContext}&rdquo;
                </div>
              )}
              <div className="text-text-primary whitespace-pre-wrap break-words">
                <span className="text-action-primary">$&nbsp;</span>
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

            {/* Reasoning (thinking) — collapsible, scrolls inside the node */}
            {reasoning && (
              <div className="nodrag nopan mt-[1lh]">
                <button
                  onClick={() => setShowReasoning(v => !v)}
                  className="w-full flex items-center gap-2 text-text-tertiary hover:text-text-secondary"
                >
                  <span>{showReasoning ? '[-]' : '[+]'}</span>
                  <span>thinking{data.isStreaming && !response ? '…' : ''}</span>
                </button>
                {showReasoning && (
                  <div className="mt-[0.5lh] pl-[2ch] text-text-tertiary whitespace-pre-wrap select-text cursor-text border-l border-border-subtle">
                    {reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Response */}
            <div className="nodrag nopan select-text cursor-text mt-[1lh]" ref={responseRef}>
              {response ? (
                <MarkdownContent
                  content={response}
                  className="text-ai-response font-mono"
                  highlights={data.exploredSelections?.filter((s: ExploredSelection) => !s.isFromQuestion).map((s: ExploredSelection) => ({
                    text: s.text,
                    startOffset: s.startOffset,
                    id: s.childNodeId,
                    color: s.color,
                  }))}
                  onHighlightClick={handleResponseHighlightClick}
                />
              ) : data.isStreaming ? (
                <div className="text-action-primary">
                  <span className="animate-pulse">█</span>
                  <span className="ml-2 text-text-tertiary">awaiting tokens…</span>
                </div>
              ) : null}

              {data.isStreaming && response && (
                <span className="inline-block w-[1ch] text-action-primary animate-pulse align-baseline">█</span>
              )}

              {!data.isStreaming && response && (
                <div className="flex justify-end mt-[0.5lh]">
                  <button
                    onClick={handleCopyResponse}
                    className={`text-text-tertiary hover:text-text-secondary transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} nodrag nopan`}
                    aria-label={isCopied ? 'Copied!' : 'Copy response'}
                  >
                    {isCopied ? '[copied]' : '[copy]'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ASCII separator */}
          <div aria-hidden className="text-border-subtle whitespace-nowrap overflow-hidden select-none -mx-[2ch]">
            {'─'.repeat(400)}
          </div>

          {/* Selection preview */}
          {activeSelection && data.onBranchFromSelection && (
            <div className="flex items-center gap-2 text-text-tertiary -mt-[0.25lh]">
              <span>&gt;</span>
              <span className="truncate flex-1 min-w-0" title={activeSelection?.text || ''}>
                &ldquo;{truncatedSelection || ''}&rdquo;
              </span>
              <button
                onClick={async () => {
                  if (activeSelection?.text) {
                    await navigator.clipboard.writeText(activeSelection.text);
                    setIsSelectionCopied(true);
                    setTimeout(() => setIsSelectionCopied(false), 2000);
                  }
                }}
                className="hover:text-text-secondary nodrag nopan"
                title={isSelectionCopied ? 'Copied!' : 'Copy selected text'}
              >
                {isSelectionCopied ? '[copied]' : '[copy]'}
              </button>
              <button onClick={clearAllSelections} className="hover:text-text-secondary nodrag nopan">
                [x]
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex items-start gap-[1ch] select-none">
            <span className="text-action-primary flex-shrink-0 mt-[2px]">&gt;</span>
            <textarea
              placeholder={activeSelection ? 'ask about this selection…' : 'ask a follow-up…'}
              value={followUpText}
              onChange={(e) => {
                setFollowUpText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey && followUpText.trim()) {
                  e.preventDefault();
                  if (activeSelection && data.onBranchFromSelection) {
                    await handleBranchClick();
                  } else {
                    await handleSubmitFollowUp();
                  }
                }
              }}
              disabled={isSubmitting}
              rows={1}
              className="flex-1 bg-transparent border-none text-text-primary placeholder:text-text-disabled focus:outline-none nodrag nopan resize-none overflow-y-auto font-mono text-[13px]"
              style={{ minHeight: '1lh', maxHeight: '80px', lineHeight: '1.2' }}
            />
            <button
              onClick={activeSelection && data.onBranchFromSelection ? handleBranchClick : handleSubmitFollowUp}
              disabled={!followUpText.trim() || isSubmitting}
              className="flex-shrink-0 text-action-primary hover:text-action-primary-hover disabled:text-text-disabled disabled:cursor-not-allowed nodrag nopan"
              title={activeSelection ? 'Branch from selection (Enter)' : 'Send (Enter)'}
            >
              {isSubmitting ? '[...]' : activeSelection && data.onBranchFromSelection ? '[branch]' : '[send]'}
            </button>
          </div>
        </AsciiBox>

        {disambiguationState && (
          <DisambiguationMenu
            selections={disambiguationState.selections}
            anchorRect={disambiguationState.rect}
            onSelectBranch={handleSelectBranch}
            onDismiss={() => setDisambiguationState(null)}
          />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-border-strong" />
    </>
  );
}

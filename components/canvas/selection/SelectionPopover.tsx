"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitBranch, X } from 'lucide-react';
import type { TextSelectionState } from '../types';

interface SelectionPopoverProps {
  /** The current text selection */
  selection: TextSelectionState;
  /** Called when user submits a branch question */
  onBranch: (selectedText: string, question: string, startOffset: number, endOffset: number, isFromQuestion: boolean) => void;
  /** Called when popover is dismissed */
  onDismiss: () => void;
  /** Container element for positioning calculations */
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Popover that appears when text is selected, allowing user to create a branch
 * with a custom question about the selected text.
 */
export default function SelectionPopover({
  selection,
  onBranch,
  onDismiss,
  containerRef,
}: SelectionPopoverProps) {
  const [question, setQuestion] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate position relative to container
  useEffect(() => {
    if (!containerRef.current || !popoverRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const selectionRect = selection.rect;

    // Position below the selection, centered horizontally
    let top = selectionRect.bottom - containerRect.top + 8;
    let left = selectionRect.left - containerRect.left + (selectionRect.width / 2) - (popoverRect.width / 2);

    // Keep within container bounds
    const maxLeft = containerRect.width - popoverRect.width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    // If popover would go below container, position above selection
    if (top + popoverRect.height > containerRect.height) {
      top = selectionRect.top - containerRect.top - popoverRect.height - 8;
    }

    setPosition({ top, left });
  }, [selection.rect, containerRef]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

  const handleSubmit = () => {
    if (!question.trim()) return;
    onBranch(
      selection.text,
      question.trim(),
      selection.startOffset,
      selection.endOffset,
      selection.isFromQuestion
    );
  };

  const truncatedText = selection.text.length > 50 
    ? selection.text.substring(0, 50) + '...' 
    : selection.text;

  return (
    <div
      ref={popoverRef}
      data-selection-popover
      className="absolute z-50 w-72 bg-surface border border-border-default rounded-lg shadow-depth-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header with selected text preview */}
      <div className="px-3 py-2 bg-void border-b border-border-subtle flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-action-primary flex-shrink-0" />
          <span className="text-xs text-text-secondary truncate" title={selection.text}>
            &ldquo;{truncatedText}&rdquo;
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-elevated text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input area */}
      <div className="p-3 space-y-3">
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to know about this?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && question.trim()) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full h-9 bg-void border border-border-default text-text-primary placeholder:text-text-disabled rounded-md px-3 text-sm focus-visible:ring-0 focus-visible:border-border-focus"
        />
        <Button
          onClick={handleSubmit}
          disabled={!question.trim()}
          className="w-full h-8 bg-action-primary hover:bg-action-primary-hover text-action-primary-text rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GitBranch className="w-3.5 h-3.5 mr-2" />
          Branch
        </Button>
      </div>
    </div>
  );
}

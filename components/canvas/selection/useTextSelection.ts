"use client";

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import type { TextSelectionState } from '../types';

interface UseTextSelectionOptions {
  questionRef: RefObject<HTMLElement | null>;
  responseRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

/**
 * Single hook that handles text selection for both question and response areas.
 * Captures selection without interfering with browser behavior.
 * Preserves native browser selection highlight.
 */
export function useTextSelection({
  questionRef,
  responseRef,
  disabled = false,
}: UseTextSelectionOptions) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  const rafRef = useRef<number | null>(null);
  // Store the Range object to restore selection after React re-renders
  const savedRangeRef = useRef<Range | null>(null);

  // Get character offset within container
  const getTextOffset = useCallback((container: HTMLElement, node: Node, offset: number): number => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === node) return currentOffset + offset;
      currentOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }
    return currentOffset;
  }, []);

  // Restore the browser selection from saved range
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      try {
        const browserSelection = window.getSelection();
        if (browserSelection) {
          browserSelection.removeAllRanges();
          browserSelection.addRange(savedRangeRef.current);
        }
      } catch {
        // Range might be invalid if DOM changed, ignore
      }
    }
  }, []);

  // Check browser selection and determine which container it's in
  const captureSelection = useCallback((): TextSelectionState | null => {
    if (disabled) return null;

    const browserSelection = window.getSelection();
    if (!browserSelection || browserSelection.isCollapsed || browserSelection.rangeCount === 0) {
      return null;
    }

    const range = browserSelection.getRangeAt(0);
    const text = browserSelection.toString().trim();
    if (!text) return null;

    // Check if selection is in question container
    if (questionRef.current && questionRef.current.contains(range.commonAncestorContainer)) {
      const startOffset = getTextOffset(questionRef.current, range.startContainer, range.startOffset);
      const endOffset = getTextOffset(questionRef.current, range.endContainer, range.endOffset);
      const rect = range.getBoundingClientRect();
      // Save the range for restoration
      savedRangeRef.current = range.cloneRange();
      return { text, startOffset, endOffset, rect, isFromQuestion: true };
    }

    // Check if selection is in response container
    if (responseRef.current && responseRef.current.contains(range.commonAncestorContainer)) {
      const startOffset = getTextOffset(responseRef.current, range.startContainer, range.startOffset);
      const endOffset = getTextOffset(responseRef.current, range.endContainer, range.endOffset);
      const rect = range.getBoundingClientRect();
      // Save the range for restoration
      savedRangeRef.current = range.cloneRange();
      return { text, startOffset, endOffset, rect, isFromQuestion: false };
    }

    return null;
  }, [questionRef, responseRef, disabled, getTextOffset]);

  // Restore selection after state updates cause re-renders
  useEffect(() => {
    if (selection && savedRangeRef.current) {
      // Use microtask to restore after React's DOM updates
      queueMicrotask(() => {
        restoreSelection();
      });
    }
  }, [selection, restoreSelection]);

  // Listen for mouseup to capture selection or clear if clicking in content area without selecting
  useEffect(() => {
    if (disabled) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Cancel any pending update
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use rAF to let browser finalize selection before we read it
      rafRef.current = requestAnimationFrame(() => {
        const newSelection = captureSelection();
        if (newSelection) {
          // New valid selection - update state
          setSelection(newSelection);
          // Restore selection immediately after state update
          requestAnimationFrame(() => {
            restoreSelection();
          });
        } else {
          // No valid selection - only clear if the click was inside the content containers
          // (not in footer/input area)
          const target = e.target as Node;
          const isInQuestionArea = questionRef.current?.contains(target);
          const isInResponseArea = responseRef.current?.contains(target);
          
          if (isInQuestionArea || isInResponseArea) {
            // Clicked in content area without making a selection - clear
            setSelection(null);
            savedRangeRef.current = null;
          }
          // If clicked elsewhere (footer, input, etc.) - keep the selection
        }
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [disabled, captureSelection, questionRef, responseRef, restoreSelection]);

  // Clear when clicking outside the card
  useEffect(() => {
    if (!selection) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Find the card that contains our containers
      const questionCard = questionRef.current?.closest('[role="article"]');
      const responseCard = responseRef.current?.closest('[role="article"]');
      const card = questionCard || responseCard;
      
      if (card && !card.contains(e.target as Node)) {
        setSelection(null);
      }
    };

    // Delay adding listener to avoid clearing on the same interaction
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [selection, questionRef, responseRef]);

  // Clear when disabled
  useEffect(() => {
    if (disabled) setSelection(null);
  }, [disabled]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    savedRangeRef.current = null;
    // Also clear the browser's native selection
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ExploredSelection } from '../types';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  selections: ExploredSelection[];
}

interface HighlightOverlayProps {
  /** Ref to the text container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Array of explored selections to highlight */
  selections: ExploredSelection[];
  /** Called when a highlight is clicked */
  onHighlightClick: (selections: ExploredSelection[], rect: DOMRect) => void;
  /** Whether highlights are for question (true) or response (false) */
  isQuestion?: boolean;
}

/**
 * Renders semi-transparent highlight overlays on top of explored text selections.
 * Highlights are fully click-through to allow text selection.
 * Click detection is handled by checking if click position intersects highlights.
 */
export default function HighlightOverlay({
  containerRef,
  selections,
  onHighlightClick,
  isQuestion = false,
}: HighlightOverlayProps) {
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const highlightRectsRef = useRef<HighlightRect[]>([]);

  // Keep ref in sync for click handler
  useEffect(() => {
    highlightRectsRef.current = highlightRects;
  }, [highlightRects]);

  /**
   * Find a text node and offset for a given character position
   */
  const findTextPosition = useCallback((container: HTMLElement, targetOffset: number): { node: Node; offset: number } | null => {
    if (typeof document === 'undefined') return null;
    
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let node = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength >= targetOffset) {
        return {
          node,
          offset: targetOffset - currentOffset,
        };
      }
      currentOffset += nodeLength;
      node = walker.nextNode();
    }

    return null;
  }, []);

  /**
   * Calculate highlight rectangles for all selections
   */
  const calculateRects = useCallback(() => {
    if (typeof document === 'undefined' || !containerRef.current || selections.length === 0) {
      setHighlightRects([]);
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newRects: HighlightRect[] = [];

    // Filter selections for this container type (question vs response)
    const relevantSelections = selections.filter(s => 
      isQuestion ? s.isFromQuestion : !s.isFromQuestion
    );

    for (const selection of relevantSelections) {
      const startPos = findTextPosition(container, selection.startOffset);
      const endPos = findTextPosition(container, selection.endOffset);

      if (!startPos || !endPos) continue;

      try {
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);

        // Get all client rects (handles multi-line selections)
        const clientRects = Array.from(range.getClientRects());
        
        for (const rect of clientRects) {
          // Convert to container-relative coordinates
          const relativeRect: HighlightRect = {
            top: rect.top - containerRect.top + container.scrollTop,
            left: rect.left - containerRect.left + container.scrollLeft,
            width: rect.width,
            height: rect.height,
            selections: [selection],
          };

          // Check for overlapping rects and merge selections
          const overlappingIndex = newRects.findIndex(existing => 
            rectsOverlap(existing, relativeRect)
          );

          if (overlappingIndex >= 0) {
            // Merge selections for overlapping rects
            const existing = newRects[overlappingIndex];
            if (!existing.selections.includes(selection)) {
              existing.selections.push(selection);
            }
            // Expand rect to cover both
            const minLeft = Math.min(existing.left, relativeRect.left);
            const minTop = Math.min(existing.top, relativeRect.top);
            const maxRight = Math.max(existing.left + existing.width, relativeRect.left + relativeRect.width);
            const maxBottom = Math.max(existing.top + existing.height, relativeRect.top + relativeRect.height);
            existing.left = minLeft;
            existing.top = minTop;
            existing.width = maxRight - minLeft;
            existing.height = maxBottom - minTop;
          } else {
            newRects.push(relativeRect);
          }
        }
      } catch (e) {
        console.warn('Failed to create range for selection:', selection, e);
      }
    }

    setHighlightRects(newRects);
  }, [containerRef, selections, isQuestion, findTextPosition]);

  // Recalculate on selections change or resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    calculateRects();

    const resizeObserver = new ResizeObserver(() => {
      calculateRects();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateRects, containerRef]);

  // Recalculate on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => calculateRects();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, calculateRects]);

  // Track mousedown position to distinguish click from drag
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Handle mousedown on highlight - record position
  const handleHighlightMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Handle mouseup on highlight - check if it was a click vs drag
  const handleHighlightMouseUp = useCallback((e: React.MouseEvent, selections: ExploredSelection[]) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;

    if (!downPos) return;

    // Check if this was a click (mouse didn't move much) vs a drag (mouse moved)
    const dx = Math.abs(e.clientX - downPos.x);
    const dy = Math.abs(e.clientY - downPos.y);
    const isClick = dx < 5 && dy < 5;

    if (!isClick) return; // User was dragging to select, don't navigate

    // It's a click - navigate to the branch
    const domRect = new DOMRect(e.clientX - 10, e.clientY - 10, 20, 20);
    onHighlightClick(selections, domRect);
  }, [onHighlightClick]);

  if (highlightRects.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {highlightRects.map((rect, index) => (
        <div
          key={index}
          className="absolute bg-purple-500/25 rounded-sm cursor-pointer hover:bg-purple-500/35 transition-colors"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'auto', // Make this div clickable
          }}
          onMouseDown={handleHighlightMouseDown}
          onMouseUp={(e) => handleHighlightMouseUp(e, rect.selections)}
        />
      ))}
    </div>
  );
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(a: HighlightRect, b: HighlightRect): boolean {
  const tolerance = 2;
  return !(
    a.left + a.width + tolerance < b.left ||
    b.left + b.width + tolerance < a.left ||
    a.top + a.height + tolerance < b.top ||
    b.top + b.height + tolerance < a.top
  );
}

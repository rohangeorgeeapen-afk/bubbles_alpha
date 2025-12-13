"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import type { ExploredSelection } from '../types';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  selections: ExploredSelection[];
}

interface HighlightOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  selections: ExploredSelection[];
  onHighlightClick: (selections: ExploredSelection[], rect: DOMRect) => void;
  isQuestion?: boolean;
}

export default function HighlightOverlay({
  containerRef,
  selections,
  onHighlightClick,
  isQuestion = false,
}: HighlightOverlayProps) {
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const recalcCountRef = useRef(0);

  // Find text in container and return a Range
  const findTextRange = useCallback((container: HTMLElement, searchText: string): Range | null => {
    if (!searchText || typeof document === 'undefined') return null;

    const fullText = container.textContent || '';
    const searchIndex = fullText.indexOf(searchText);
    
    if (searchIndex === -1) return null;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;
    
    const searchEnd = searchIndex + searchText.length;
    let node = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent?.length || 0;
      const nodeEnd = currentOffset + nodeLength;

      if (!startNode && searchIndex >= currentOffset && searchIndex < nodeEnd) {
        startNode = node;
        startOffset = searchIndex - currentOffset;
      }

      if (searchEnd > currentOffset && searchEnd <= nodeEnd) {
        endNode = node;
        endOffset = searchEnd - currentOffset;
        break;
      }

      currentOffset = nodeEnd;
      node = walker.nextNode();
    }

    if (!startNode || !endNode) return null;

    try {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    } catch {
      return null;
    }
  }, []);

  // Calculate highlight positions
  const calculateRects = useCallback(() => {
    if (typeof document === 'undefined' || !containerRef.current || selections.length === 0) {
      setHighlightRects([]);
      return;
    }

    const container = containerRef.current;
    const newRects: HighlightRect[] = [];

    // Filter selections for this container type
    const relevantSelections = selections.filter(s => 
      isQuestion ? s.isFromQuestion : !s.isFromQuestion
    );

    if (relevantSelections.length === 0) {
      setHighlightRects([]);
      return;
    }

    // Get container rect FRESH each time
    const containerRect = container.getBoundingClientRect();

    for (const selection of relevantSelections) {
      const range = findTextRange(container, selection.text);
      if (!range) continue;

      try {
        const clientRects = Array.from(range.getClientRects());
        
        for (const rect of clientRects) {
          if (rect.width === 0 || rect.height === 0) continue;
          
          // Calculate position relative to container
          const relativeRect: HighlightRect = {
            top: rect.top - containerRect.top + container.scrollTop,
            left: rect.left - containerRect.left + container.scrollLeft,
            width: rect.width,
            height: rect.height,
            selections: [selection],
          };

          // Merge overlapping rects
          const overlappingIndex = newRects.findIndex(existing => rectsOverlap(existing, relativeRect));

          if (overlappingIndex >= 0) {
            const existing = newRects[overlappingIndex];
            if (!existing.selections.some(s => s.childNodeId === selection.childNodeId)) {
              existing.selections.push(selection);
            }
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
        console.warn('Failed to get rects:', e);
      }
    }

    setHighlightRects(newRects);
  }, [containerRef, selections, isQuestion, findTextRange]);

  // Use useLayoutEffect to calculate BEFORE paint
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    calculateRects();
  }, [calculateRects]);

  // Also recalculate after delays to handle layout shifts from canvas animations
  useEffect(() => {
    if (typeof window === 'undefined' || selections.length === 0) return;
    
    // Multiple recalculations to catch layout animations
    const timeouts = [
      setTimeout(calculateRects, 50),
      setTimeout(calculateRects, 200),
      setTimeout(calculateRects, 500),
    ];
    
    return () => timeouts.forEach(clearTimeout);
  }, [selections, calculateRects]);

  // Recalculate on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    container.addEventListener('scroll', calculateRects);
    return () => container.removeEventListener('scroll', calculateRects);
  }, [containerRef, calculateRects]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent, sels: ExploredSelection[]) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;
    if (!downPos) return;

    const dx = Math.abs(e.clientX - downPos.x);
    const dy = Math.abs(e.clientY - downPos.y);
    if (dx < 5 && dy < 5) {
      onHighlightClick(sels, new DOMRect(e.clientX - 10, e.clientY - 10, 20, 20));
    }
  }, [onHighlightClick]);

  if (highlightRects.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }} aria-hidden="true">
      {highlightRects.map((rect, index) => (
        <div
          key={`${rect.selections[0]?.childNodeId}-${index}`}
          className="absolute bg-purple-500/25 rounded-sm cursor-pointer hover:bg-purple-500/35 transition-colors"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'auto',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={(e) => handleMouseUp(e, rect.selections)}
        />
      ))}
    </div>
  );
}

function rectsOverlap(a: HighlightRect, b: HighlightRect): boolean {
  const tolerance = 2;
  return !(
    a.left + a.width + tolerance < b.left ||
    b.left + b.width + tolerance < a.left ||
    a.top + a.height + tolerance < b.top ||
    b.top + b.height + tolerance < a.top
  );
}

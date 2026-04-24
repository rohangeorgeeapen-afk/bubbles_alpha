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
  const [isVisible, setIsVisible] = useState(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate highlight positions
  const calculateRects = useCallback(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay || selections.length === 0) {
      setHighlightRects([]);
      return;
    }

    // Filter selections for this container type
    const relevantSelections = selections.filter(s => 
      isQuestion ? s.isFromQuestion : !s.isFromQuestion
    );

    if (relevantSelections.length === 0) {
      setHighlightRects([]);
      return;
    }

    const newRects: HighlightRect[] = [];
    const fullText = container.textContent || '';

    // Get overlay's position to calculate relative coordinates
    const overlayRect = overlay.getBoundingClientRect();

    for (const selection of relevantSelections) {
      const searchText = selection.text;
      if (!searchText) continue;

      // Find the best matching occurrence
      let bestIndex = -1;
      let searchPos = 0;
      
      while (true) {
        const idx = fullText.indexOf(searchText, searchPos);
        if (idx === -1) break;
        
        if (bestIndex === -1 || 
            Math.abs(idx - selection.startOffset) < Math.abs(bestIndex - selection.startOffset)) {
          bestIndex = idx;
        }
        searchPos = idx + 1;
      }

      if (bestIndex === -1) continue;

      // Find the text nodes for this range
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let currentOffset = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;
      const searchEnd = bestIndex + searchText.length;

      let node = walker.nextNode();
      while (node) {
        const nodeLength = node.textContent?.length || 0;
        const nodeEnd = currentOffset + nodeLength;

        if (!startNode && bestIndex >= currentOffset && bestIndex < nodeEnd) {
          startNode = node;
          startOffset = bestIndex - currentOffset;
        }

        if (searchEnd > currentOffset && searchEnd <= nodeEnd) {
          endNode = node;
          endOffset = searchEnd - currentOffset;
          break;
        }

        currentOffset = nodeEnd;
        node = walker.nextNode();
      }

      if (!startNode || !endNode) continue;

      try {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        // Get client rects and convert to overlay-relative coordinates
        const clientRects = Array.from(range.getClientRects());

        console.log('🎯 Highlight calc:', {
          text: searchText.substring(0, 20),
          overlayRect: { top: overlayRect.top, left: overlayRect.left },
          firstClientRect: clientRects[0] ? { top: clientRects[0].top, left: clientRects[0].left } : null,
        });

        for (const rect of clientRects) {
          if (rect.width < 1 || rect.height < 1) continue;

          // Position relative to the overlay element
          const relativeRect: HighlightRect = {
            top: rect.top - overlayRect.top,
            left: rect.left - overlayRect.left,
            width: rect.width,
            height: rect.height,
            selections: [selection],
          };
          
          console.log('📍 Relative rect:', relativeRect);

          // Merge overlapping rects
          const overlappingIndex = newRects.findIndex(existing => {
            const tolerance = 2;
            return !(
              existing.left + existing.width + tolerance < relativeRect.left ||
              relativeRect.left + relativeRect.width + tolerance < existing.left ||
              existing.top + existing.height + tolerance < relativeRect.top ||
              relativeRect.top + relativeRect.height + tolerance < existing.top
            );
          });

          if (overlappingIndex >= 0) {
            const existing = newRects[overlappingIndex];
            if (!existing.selections.some(s => s.childNodeId === selection.childNodeId)) {
              existing.selections.push(selection);
            }
          } else {
            newRects.push(relativeRect);
          }
        }
      } catch {
        // Ignore range errors
      }
    }

    setHighlightRects(newRects);
  }, [containerRef, selections, isQuestion]);

  // Wait for canvas to settle, then calculate and fade in
  useEffect(() => {
    setIsVisible(false);
    setHighlightRects([]);

    // Wait for canvas animations to complete
    const settleTimeout = setTimeout(() => {
      calculateRects();
      setTimeout(() => setIsVisible(true), 50);
    }, 800);

    return () => clearTimeout(settleTimeout);
  }, [calculateRects]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsVisible(false);
      setTimeout(() => {
        calculateRects();
        setIsVisible(true);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateRects]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent, sels: ExploredSelection[]) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;
    if (!downPos) return;

    if (Math.abs(e.clientX - downPos.x) < 5 && Math.abs(e.clientY - downPos.y) < 5) {
      onHighlightClick(sels, new DOMRect(e.clientX - 10, e.clientY - 10, 20, 20));
    }
  }, [onHighlightClick]);

  // Always render the overlay div so we can get its position
  return (
    <div 
      ref={overlayRef}
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isVisible && highlightRects.length > 0 ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden="true"
    >
      {highlightRects.map((rect, index) => (
        <div
          key={`${rect.selections[0]?.childNodeId}-${index}`}
          className="absolute bg-purple-500/25 rounded-sm cursor-pointer hover:bg-purple-500/35 transition-colors pointer-events-auto"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={(e) => handleMouseUp(e, rect.selections)}
        />
      ))}
    </div>
  );
}

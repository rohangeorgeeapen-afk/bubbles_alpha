"use client";

import React, { useMemo, useCallback } from 'react';
import type { ExploredSelection } from '../types';

interface HighlightedTextProps {
  /** The text content to render with highlights */
  text: string;
  /** Selections to highlight */
  selections: ExploredSelection[];
  /** Called when a highlight is clicked */
  onHighlightClick: (selections: ExploredSelection[]) => void;
  /** Additional className for the container */
  className?: string;
}

interface TextSegment {
  text: string;
  selections: ExploredSelection[];
  isHighlighted: boolean;
}

/**
 * Renders text with inline highlights for explored selections.
 * Uses native text wrapping instead of absolute positioning.
 */
export default function HighlightedText({
  text,
  selections,
  onHighlightClick,
  className = '',
}: HighlightedTextProps) {
  // Build segments of text with their associated selections
  const segments = useMemo(() => {
    console.log('🔵 HighlightedText:', { text: text?.substring(0, 50), selectionsCount: selections?.length });
    
    if (!text || selections.length === 0) {
      return [{ text, selections: [], isHighlighted: false }];
    }

    // Find all selection ranges in the text
    const ranges: { start: number; end: number; selection: ExploredSelection }[] = [];
    
    for (const selection of selections) {
      // Find the best match for this selection's text
      let bestIndex = -1;
      let searchPos = 0;
      
      while (true) {
        const idx = text.indexOf(selection.text, searchPos);
        if (idx === -1) break;
        
        // Pick the occurrence closest to the stored offset
        if (bestIndex === -1 || 
            Math.abs(idx - selection.startOffset) < Math.abs(bestIndex - selection.startOffset)) {
          bestIndex = idx;
        }
        searchPos = idx + 1;
      }
      
      if (bestIndex !== -1) {
        ranges.push({
          start: bestIndex,
          end: bestIndex + selection.text.length,
          selection,
        });
      }
    }

    if (ranges.length === 0) {
      return [{ text, selections: [], isHighlighted: false }];
    }

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    // Build segments, handling overlaps
    const segments: TextSegment[] = [];
    let currentPos = 0;

    for (const range of ranges) {
      // Add non-highlighted text before this range
      if (range.start > currentPos) {
        segments.push({
          text: text.slice(currentPos, range.start),
          selections: [],
          isHighlighted: false,
        });
      }

      // Add highlighted segment (skip if we've already passed this point due to overlap)
      if (range.start >= currentPos) {
        // Check for overlapping selections at this position
        const overlappingSelections = ranges
          .filter(r => r.start <= range.start && r.end > range.start)
          .map(r => r.selection);

        segments.push({
          text: text.slice(range.start, range.end),
          selections: overlappingSelections.length > 0 ? overlappingSelections : [range.selection],
          isHighlighted: true,
        });
        currentPos = range.end;
      }
    }

    // Add remaining text after last highlight
    if (currentPos < text.length) {
      segments.push({
        text: text.slice(currentPos),
        selections: [],
        isHighlighted: false,
      });
    }

    return segments;
  }, [text, selections]);

  const handleClick = useCallback((e: React.MouseEvent, sels: ExploredSelection[]) => {
    e.stopPropagation();
    onHighlightClick(sels);
  }, [onHighlightClick]);

  return (
    <span className={className}>
      {segments.map((segment, index) => 
        segment.isHighlighted ? (
          <mark
            key={index}
            onClick={(e) => handleClick(e, segment.selections)}
            className="bg-purple-500/50 hover:bg-purple-500/60 text-white rounded-sm cursor-pointer transition-colors px-0.5 -mx-0.5"
            style={{ backgroundColor: 'rgba(168, 85, 247, 0.5)', color: 'white' }}
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </span>
  );
}

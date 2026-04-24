"use client";

import React, { useRef, useEffect } from 'react';
import { GitBranch, X } from 'lucide-react';
import type { ExploredSelection } from '../types';

interface DisambiguationMenuProps {
  /** The selections that overlap at the clicked position */
  selections: ExploredSelection[];
  /** Position to show the menu (from click event) - not used anymore but kept for compatibility */
  anchorRect: DOMRect;
  /** Called when user selects a branch to navigate to */
  onSelectBranch: (childNodeId: string) => void;
  /** Called when menu is dismissed */
  onDismiss: () => void;
}

/**
 * Menu that appears when clicking on overlapping highlights,
 * allowing user to choose which branch to navigate to.
 * Positioned at the bottom of the content area for easy access.
 */
export default function DisambiguationMenu({
  selections,
  onSelectBranch,
  onDismiss,
}: DisambiguationMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    // Delay adding listener to avoid immediate dismiss
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

  const truncateText = (text: string, maxLength: number = 40) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-0 left-0 right-0 z-50 bg-surface border-t border-border-default shadow-depth-lg overflow-hidden animate-slide-up"
    >
      <div className="px-4 py-2 bg-void border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-tertiary font-medium">
          {selections.length} branches at this text
        </span>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-elevated text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="py-1 max-h-32 overflow-y-auto">
        {selections.map((selection) => (
          <button
            key={selection.childNodeId}
            onClick={() => onSelectBranch(selection.childNodeId)}
            className="w-full px-4 py-2.5 text-left hover:bg-elevated transition-colors flex items-center gap-3 group"
          >
            <GitBranch
              className="w-4 h-4 flex-shrink-0"
              style={{ color: selection.color || 'rgb(192, 132, 252)' }}
            />
            <span className="text-sm text-text-secondary group-hover:text-text-primary truncate">
              &ldquo;{truncateText(selection.text)}&rdquo;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

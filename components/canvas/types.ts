/**
 * Shared types for canvas components
 */

import { Node, Edge } from '@xyflow/react';

/**
 * Represents a text selection that has been branched into a child node.
 * Used to track and highlight explored concepts in responses.
 */
export interface ExploredSelection {
  /** The exact text that was selected */
  text: string;
  /** Character offset where selection starts (in rendered text) */
  startOffset: number;
  /** Character offset where selection ends (in rendered text) */
  endOffset: number;
  /** ID of the child node that explores this selection */
  childNodeId: string;
  /** True if selection was from the question, false/undefined for response */
  isFromQuestion?: boolean;
}

/**
 * Data for text selection state during user interaction
 */
export interface TextSelectionState {
  /** The selected text */
  text: string;
  /** Start offset in the text content */
  startOffset: number;
  /** End offset in the text content */
  endOffset: number;
  /** Bounding rect of the selection for popover positioning */
  rect: DOMRect;
  /** Whether selection is from question (true) or response (false) */
  isFromQuestion: boolean;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  nodeId?: string;
  isError?: boolean;
  retryData?: {
    userMessage: string;
  };
}

export interface FullscreenState {
  isFullscreen: boolean;
  activeNodeId: string | null;
  conversationThread: Message[];
  isTransitioning: boolean;
  transitionBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ConversationCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onUpdate?: (nodes: Node[], edges: Edge[]) => void;
  sidebarOpen?: boolean;
}

// Re-export for convenience
export type { Node, Edge };

/**
 * Shared types for canvas components
 */

import { Node, Edge } from '@xyflow/react';

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

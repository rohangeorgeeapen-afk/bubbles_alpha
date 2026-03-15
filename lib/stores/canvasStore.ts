import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

/**
 * Interface for fullscreen state
 */
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

/**
 * Interface for message structure
 */
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

/**
 * Interface for panning queue items
 */
export interface PanQueueItem {
  parentId: string;
  childId: string;
  nodes: Node[];
}

/**
 * Canvas store state interface
 */
interface CanvasState {
  // Streaming state
  isLoading: boolean;
  abortController: AbortController | null;

  // Fullscreen state
  fullscreenState: FullscreenState;
  isFullscreenLoading: boolean;
  animateToFullscreen: boolean;
  animateFromFullscreen: boolean;

  // Dialog state
  isAddingFollowUp: boolean;
  followUpParentId: string | null;
  followUpQuestion: string;
  showExitConfirmation: boolean;

  // Search state
  searchTerm: string;

  // Undo state
  showUndoToast: boolean;
  deletedState: { nodes: Node[]; edges: Edge[] } | null;
  undoTimeout: NodeJS.Timeout | null;

  // Network state
  isOnline: boolean;

  // Smart panning state
  isPanning: boolean;
  panQueue: PanQueueItem[];
  userInteracting: boolean;

  // Actions
  setIsLoading: (isLoading: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;

  setFullscreenState: (state: FullscreenState | ((prev: FullscreenState) => FullscreenState)) => void;
  setIsFullscreenLoading: (isLoading: boolean) => void;
  setAnimateToFullscreen: (animate: boolean) => void;
  setAnimateFromFullscreen: (animate: boolean) => void;

  setIsAddingFollowUp: (isAdding: boolean) => void;
  setFollowUpParentId: (parentId: string | null) => void;
  setFollowUpQuestion: (question: string) => void;
  setShowExitConfirmation: (show: boolean) => void;

  setSearchTerm: (term: string) => void;

  setShowUndoToast: (show: boolean) => void;
  setDeletedState: (state: { nodes: Node[]; edges: Edge[] } | null) => void;
  setUndoTimeout: (timeout: NodeJS.Timeout | null) => void;

  setIsOnline: (isOnline: boolean) => void;

  setIsPanning: (isPanning: boolean) => void;
  setPanQueue: (queue: PanQueueItem[] | ((prev: PanQueueItem[]) => PanQueueItem[])) => void;
  setUserInteracting: (interacting: boolean) => void;
}

/**
 * Canvas store - manages application-level state for the conversation canvas
 * Does NOT manage React Flow's internal node/edge state
 */
export const useCanvasStore = create<CanvasState>((set) => ({
  // Initial streaming state
  isLoading: false,
  abortController: null,

  // Initial fullscreen state
  fullscreenState: {
    isFullscreen: false,
    activeNodeId: null,
    conversationThread: [],
    isTransitioning: false,
  },
  isFullscreenLoading: false,
  animateToFullscreen: false,
  animateFromFullscreen: false,

  // Initial dialog state
  isAddingFollowUp: false,
  followUpParentId: null,
  followUpQuestion: '',
  showExitConfirmation: false,

  // Initial search state
  searchTerm: '',

  // Initial undo state
  showUndoToast: false,
  deletedState: null,
  undoTimeout: null,

  // Initial network state
  isOnline: true,

  // Initial smart panning state
  isPanning: false,
  panQueue: [],
  userInteracting: false,

  // Streaming actions
  setIsLoading: (isLoading) => set({ isLoading }),
  setAbortController: (controller) => set({ abortController: controller }),

  // Fullscreen actions
  setFullscreenState: (state) =>
    set((prev) => ({
      fullscreenState: typeof state === 'function' ? state(prev.fullscreenState) : state,
    })),
  setIsFullscreenLoading: (isLoading) => set({ isFullscreenLoading: isLoading }),
  setAnimateToFullscreen: (animate) => set({ animateToFullscreen: animate }),
  setAnimateFromFullscreen: (animate) => set({ animateFromFullscreen: animate }),

  // Dialog actions
  setIsAddingFollowUp: (isAdding) => set({ isAddingFollowUp: isAdding }),
  setFollowUpParentId: (parentId) => set({ followUpParentId: parentId }),
  setFollowUpQuestion: (question) => set({ followUpQuestion: question }),
  setShowExitConfirmation: (show) => set({ showExitConfirmation: show }),

  // Search actions
  setSearchTerm: (term) => set({ searchTerm: term }),

  // Undo actions
  setShowUndoToast: (show) => set({ showUndoToast: show }),
  setDeletedState: (state) => set({ deletedState: state }),
  setUndoTimeout: (timeout) => set({ undoTimeout: timeout }),

  // Network actions
  setIsOnline: (isOnline) => set({ isOnline: isOnline }),

  // Smart panning actions
  setIsPanning: (isPanning) => set({ isPanning }),
  setPanQueue: (queue) =>
    set((prev) => ({
      panQueue: typeof queue === 'function' ? queue(prev.panQueue) : queue,
    })),
  setUserInteracting: (interacting) => set({ userInteracting: interacting }),
}));

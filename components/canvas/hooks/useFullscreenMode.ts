import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { FullscreenState, Message } from '../types';

export interface UseFullscreenModeProps {
  nodes: Node[];
  edges: Edge[];
  reactFlowInstance: ReactFlowInstance | null;
  buildConversationThread: (nodeId: string, nodes: Node[], edges: Edge[]) => Message[];
  isOnline: boolean;
  onCreateNodeInBackground?: (params: {
    question: string;
    response: string;
    parentId: string;
  }) => Promise<string | undefined>;
}

export interface UseFullscreenModeReturn {
  // State
  fullscreenState: FullscreenState;
  isFullscreenLoading: boolean;
  animateToFullscreen: boolean;
  animateFromFullscreen: boolean;
  showExitConfirmation: boolean;

  // Actions
  enterFullscreenMode: (nodeId: string) => void;
  exitFullscreenMode: (force?: boolean) => void;
  handleFullscreenMessage: (message: string) => Promise<void>;
  setShowExitConfirmation: (show: boolean) => void;
}

/**
 * Hook for managing fullscreen chat mode
 *
 * Extracts fullscreen mode logic from ConversationCanvas.tsx including:
 * - Enter/exit fullscreen with animations
 * - Message handling in fullscreen mode
 * - Abort controller for API requests
 * - Window resize handling
 * - Body attribute management
 *
 * This hook handles its own API calls (non-streaming) and accepts a callback
 * for creating nodes in the background.
 */
export function useFullscreenMode({
  nodes,
  edges,
  reactFlowInstance,
  buildConversationThread,
  isOnline,
  onCreateNodeInBackground,
}: UseFullscreenModeProps): UseFullscreenModeReturn {

  // Fullscreen state management
  const [fullscreenState, setFullscreenState] = useState<FullscreenState>({
    isFullscreen: false,
    activeNodeId: null,
    conversationThread: [],
    isTransitioning: false,
  });
  const [isFullscreenLoading, setIsFullscreenLoading] = useState(false);
  const [animateToFullscreen, setAnimateToFullscreen] = useState(false);
  const [animateFromFullscreen, setAnimateFromFullscreen] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs for latest state
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Enter fullscreen mode with fade + scale animation
  const enterFullscreenMode = useCallback((nodeId: string) => {
    console.log('🔍 Entering fullscreen mode for node:', nodeId);

    // Build conversation thread from root to this node
    const thread = buildConversationThread(nodeId, nodesRef.current, edgesRef.current);

    // Get node position for transform origin
    const node = nodesRef.current.find((n: Node) => n.id === nodeId);
    if (!node || !reactFlowInstance) {
      console.warn('⚠️ Node or ReactFlow instance not found');
      return;
    }

    // Get the node's position in screen coordinates
    const viewport = reactFlowInstance.getViewport();
    const zoom = reactFlowInstance.getZoom();

    const screenX = node.position.x * zoom + viewport.x;
    const screenY = node.position.y * zoom + viewport.y;

    const transitionBounds = {
      x: screenX,
      y: screenY,
      width: 450 * zoom,
      height: 468 * zoom,
    };

    console.log('📐 ENTER - Node position:', transitionBounds);

    // Start with fullscreen view hidden (scale 0.95, opacity 0)
    setFullscreenState({
      isFullscreen: false,
      activeNodeId: nodeId,
      conversationThread: thread,
      isTransitioning: true,
      transitionBounds,
    });

    setAnimateToFullscreen(false);
    setAnimateFromFullscreen(false);

    // Trigger fade-in + scale animation
    requestAnimationFrame(() => {
      setAnimateToFullscreen(true);
    });

    // Mark as fully expanded after animation
    setTimeout(() => {
      setFullscreenState((prev: FullscreenState) => ({
        ...prev,
        isFullscreen: true,
        isTransitioning: false,
      }));
      setAnimateToFullscreen(false);
    }, 400);
  }, [buildConversationThread, reactFlowInstance]);

  // Exit fullscreen mode with fade + scale animation
  const exitFullscreenMode = useCallback((force: boolean = false) => {
    try {
      console.log('🔍 Exiting fullscreen mode');

      // Check if AI is generating response
      if (!force && isFullscreenLoading) {
        setShowExitConfirmation(true);
        return;
      }

      // Cancel any pending API request
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (abortError) {
          console.error('Error aborting request:', abortError);
        }
        abortControllerRef.current = null;
        setIsFullscreenLoading(false);
      }

      if (!fullscreenState.activeNodeId) {
        console.warn('⚠️ Cannot exit fullscreen: missing activeNodeId');
        setFullscreenState({
          isFullscreen: false,
          activeNodeId: null,
          conversationThread: [],
          isTransitioning: false,
        });
        return;
      }

      // Mark as transitioning
      setFullscreenState((prev: FullscreenState) => ({
        ...prev,
        isFullscreen: false,
        isTransitioning: true,
      }));

      setAnimateToFullscreen(false);

      // Trigger fade-out + scale animation
      requestAnimationFrame(() => {
        setAnimateFromFullscreen(true);
      });

      // Clear state after animation and pan to node
      setTimeout(() => {
        const activeNodeId = fullscreenState.activeNodeId;

        setFullscreenState({
          isFullscreen: false,
          activeNodeId: null,
          conversationThread: [],
          isTransitioning: false,
        });
        setAnimateFromFullscreen(false);

        // Pan to the node
        if (activeNodeId && reactFlowInstance) {
          const activeNode = nodesRef.current.find((n: Node) => n.id === activeNodeId);
          if (activeNode) {
            try {
              reactFlowInstance.fitView({
                nodes: [activeNode],
                duration: 500,
                padding: 0.3,
              });
            } catch (fitViewError) {
              console.error('Error panning to node:', fitViewError);
            }
          }
        }
      }, 400);
    } catch (error) {
      console.error('[Exit Fullscreen Error]', error);
      setFullscreenState({
        isFullscreen: false,
        activeNodeId: null,
        conversationThread: [],
        isTransitioning: false,
      });
      setAnimateFromFullscreen(false);
      setAnimateToFullscreen(false);
      setIsFullscreenLoading(false);
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (abortError) {
          // Ignore abort errors during cleanup
        }
        abortControllerRef.current = null;
      }
    }
  }, [fullscreenState.activeNodeId, reactFlowInstance, isFullscreenLoading]);

  // Handle message sending in fullscreen mode
  const handleFullscreenMessage = useCallback(async (message: string) => {
    if (!fullscreenState.activeNodeId) return;

    console.log('💬 Sending message in fullscreen mode:', message);

    // Check network status first
    if (!isOnline) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'No internet connection. Please check your network and try again.',
        timestamp: new Date().toLocaleString(),
        isError: true,
        retryData: { userMessage: message },
      };

      setFullscreenState((prev: FullscreenState) => ({
        ...prev,
        conversationThread: [...prev.conversationThread, errorMsg],
      }));
      return;
    }

    // 1. Add user message to chat immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleString(),
    };

    setFullscreenState((prev: FullscreenState) => ({
      ...prev,
      conversationThread: [...prev.conversationThread, userMessage],
    }));

    // 2. Show typing indicator for AI response
    setIsFullscreenLoading(true);

    try {
      // 3. Call API to generate AI response
      const conversationHistory = [...fullscreenState.conversationThread, userMessage];

      console.log('Sending request to /api/chat with messages:', conversationHistory);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      abortControllerRef.current = null;

      console.log('Response status:', response.status);

      if (!response.ok) {
        // Try to get a clean error message, but don't include raw HTML/JSON payloads
        let errorMessage = `Request failed (${response.status})`;
        try {
          const errorText = await response.text();
          console.error('API error response:', errorText.substring(0, 200));
          // Only use the error text if it's a clean JSON error message
          if (errorText.startsWith('{')) {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) errorMessage = errorJson.error;
          } else if (errorText.length < 200 && !errorText.includes('<')) {
            errorMessage = errorText;
          }
        } catch { /* ignore parsing errors */ }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API response data:', data);
      const aiResponse = data.response;

      // 4. Add AI response to chat when complete
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toLocaleString(),
      };

      setFullscreenState((prev: FullscreenState) => ({
        ...prev,
        conversationThread: [...prev.conversationThread, assistantMessage],
      }));

      // BUG 3 FIX: Create node in background and update activeNodeId for chaining
      if (onCreateNodeInBackground && fullscreenState.activeNodeId) {
        const newNodeId = await onCreateNodeInBackground({
          question: message,
          response: aiResponse,
          parentId: fullscreenState.activeNodeId,
        });

        // Update activeNodeId so next message chains off this response
        if (newNodeId) {
          setFullscreenState((prev: FullscreenState) => ({
            ...prev,
            activeNodeId: newNodeId,
          }));
        }
      }

      // Only set loading to false after node creation is complete
      setIsFullscreenLoading(false);
      abortControllerRef.current = null;

    } catch (error) {
      console.error('Error fetching AI response:', error);

      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      let isNetworkError = false;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
          isNetworkError = true;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          isNetworkError = true;
        } else if (error.message.includes('Request failed')) {
          errorMessage = `${error.message}. Please try again.`;
        } else {
          // Keep error messages short and user-friendly
          const msg = error.message.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
          errorMessage = `Error: ${msg}. Please try again.`;
        }
      }

      // Add error message to chat with retry capability
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toLocaleString(),
        isError: true,
        retryData: { userMessage: message },
      };

      setFullscreenState((prev: FullscreenState) => ({
        ...prev,
        conversationThread: [...prev.conversationThread, errorMsg],
      }));

      // Log error for debugging
      console.error('[Fullscreen Chat Error]', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        isNetworkError,
        timestamp: new Date().toISOString(),
      });

      // Set loading to false on error
      setIsFullscreenLoading(false);
      abortControllerRef.current = null;
    }
  }, [fullscreenState.activeNodeId, fullscreenState.conversationThread, onCreateNodeInBackground, isOnline]);

  // Handle window resize - recalculate animation bounds if in fullscreen
  useEffect(() => {
    const handleResize = () => {
      // If in fullscreen mode (not transitioning), update bounds for potential exit animation
      if (fullscreenState.isFullscreen && !fullscreenState.isTransitioning && fullscreenState.activeNodeId && reactFlowInstance) {
        const node = nodesRef.current.find((n: Node) => n.id === fullscreenState.activeNodeId);
        if (node) {
          const viewport = reactFlowInstance.getViewport();
          const zoom = reactFlowInstance.getZoom();

          const screenX = node.position.x * zoom + viewport.x;
          const screenY = node.position.y * zoom + viewport.y;

          const nodeWidth = 450;
          const nodeHeight = 468;

          const transitionBounds = {
            x: screenX,
            y: screenY,
            width: nodeWidth * zoom,
            height: nodeHeight * zoom,
          };

          setFullscreenState((prev: FullscreenState) => ({
            ...prev,
            transitionBounds,
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fullscreenState.isFullscreen, fullscreenState.isTransitioning, fullscreenState.activeNodeId, reactFlowInstance]);

  // Update body data attribute when fullscreen state changes (for hiding sidebar on mobile)
  useEffect(() => {
    if (fullscreenState.isFullscreen || fullscreenState.isTransitioning) {
      document.body.setAttribute('data-fullscreen', 'true');
    } else {
      document.body.removeAttribute('data-fullscreen');
    }
  }, [fullscreenState.isFullscreen, fullscreenState.isTransitioning]);

  return {
    // State
    fullscreenState,
    isFullscreenLoading,
    animateToFullscreen,
    animateFromFullscreen,
    showExitConfirmation,

    // Actions
    enterFullscreenMode,
    exitFullscreenMode,
    handleFullscreenMessage,
    setShowExitConfirmation,
  };
}

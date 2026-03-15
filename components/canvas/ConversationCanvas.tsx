"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ConversationNode, { ConversationNodeData } from './ConversationNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, Undo2 } from 'lucide-react';
import { getLayoutedElements } from '@/lib/utils/layout';
import { ViewportManager } from '@/lib/utils/viewport-manager';
import FullscreenChatView from './FullscreenChatView';
import { NODE_WIDTH, NODE_HEIGHT } from '@/lib/layout/constants';
import { useCanvasStore, Message } from '@/lib/stores/canvasStore';
import { CanvasActionsProvider } from '@/lib/contexts/canvasActionsContext';
import { useCanvasSearch } from '@/hooks/canvas/useCanvasSearch';

const nodeTypes = {
  conversation: ConversationNode as any,
};

interface ConversationCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onUpdate?: (nodes: Node[], edges: Edge[]) => void;
  sidebarOpen?: boolean;
}

// Inner component that uses ReactFlow hooks
function ConversationCanvasInner({
  initialNodes = [],
  initialEdges = [],
  onUpdate,
  sidebarOpen = true
}: ConversationCanvasProps = {}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // Get state and actions from Zustand store
  const {
    searchTerm,
    isAddingFollowUp,
    followUpParentId,
    followUpQuestion,
    isLoading,
    fullscreenState,
    isFullscreenLoading,
    animateToFullscreen,
    animateFromFullscreen,
    isOnline,
    showExitConfirmation,
    isPanning,
    showUndoToast,
    deletedState,
    setSearchTerm,
    setIsAddingFollowUp,
    setFollowUpParentId,
    setFollowUpQuestion,
    setIsLoading,
    setFullscreenState,
    setIsFullscreenLoading,
    setAnimateToFullscreen,
    setAnimateFromFullscreen,
    setIsOnline,
    setShowExitConfirmation,
    setIsPanning,
    setPanQueue,
    setUserInteracting,
    setShowUndoToast,
    setDeletedState,
    setUndoTimeout,
    abortController,
    setAbortController,
    panQueue,
    userInteracting,
  } = useCanvasStore();

  const nodeIdCounter = useRef(initialNodes.length);
  const hasInitialized = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(abortController);

  // Initialize ReactFlow instance for viewport control
  const reactFlowInstance = useReactFlow();

  // Panning queue management - now use refs to access Zustand state
  const panQueueRef = useRef(panQueue);
  const userInteractingRef = useRef(userInteracting);

  // Undo timeout ref
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync refs with Zustand state
  useEffect(() => {
    panQueueRef.current = panQueue;
  }, [panQueue]);

  useEffect(() => {
    userInteractingRef.current = userInteracting;
  }, [userInteracting]);

  // Sync abort controller ref with store
  useEffect(() => {
    abortControllerRef.current = abortController;
  }, [abortController]);
  
  // Process the next item in the panning queue
  const processPanQueue = useCallback(() => {
    // Don't process queue if user is interacting
    if (userInteractingRef.current) {
      console.log('🚫 User interacting, skipping queue processing');
      return;
    }

    if (panQueueRef.current.length === 0) {
      return;
    }

    const nextPan = panQueueRef.current[0];
    setPanQueue((prev) => prev.slice(1)); // Remove first item

    if (nextPan) {
      console.log('📋 Processing queued pan operation:', nextPan.parentId, '->', nextPan.childId);
      handleSmartPanningInternal(nextPan.parentId, nextPan.childId, nextPan.nodes);
    }
  }, [setPanQueue]);
  
  // Use refs to always have access to latest nodes and edges
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Custom node change handler - nodes are no longer draggable
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const getConversationHistory = (nodeId: string, currentNodes: Node[], currentEdges: Edge[]): Message[] => {
    const history: Message[] = [];
    let currentNodeId: string | null = nodeId;

    console.log('🔍 Getting conversation history for node:', nodeId);
    console.log('📊 Current nodes:', currentNodes.map(n => ({ id: n.id, q: n.data.question })));
    console.log('🔗 Current edges:', currentEdges);

    while (currentNodeId) {
      const currentNode = currentNodes.find((n) => n.id === currentNodeId);
      if (!currentNode) {
        console.log('❌ Node not found:', currentNodeId);
        break;
      }

      if (currentNode.type === 'conversation') {
        const nodeData = currentNode.data as unknown as ConversationNodeData;
        console.log('✅ Adding to history:', { q: nodeData.question, a: nodeData.response.substring(0, 50) });
        history.unshift(
          { role: 'user', content: nodeData.question },
          { role: 'assistant', content: nodeData.response }
        );
      }

      const parentEdge = currentEdges.find((e) => e.target === currentNodeId);
      console.log('🔼 Parent edge:', parentEdge);
      currentNodeId = parentEdge ? parentEdge.source : null;
    }

    console.log('📝 Final history length:', history.length);
    return history;
  };

  // Memoized conversation thread calculation for performance
  const conversationThreadCache = useRef<Map<string, Message[]>>(new Map());
  
  // Build conversation thread for fullscreen mode - with memoization
  const buildConversationThread = useCallback((
    activeNodeId: string,
    currentNodes: Node[],
    currentEdges: Edge[]
  ): Message[] => {
    // Create cache key from node IDs and edge IDs
    const cacheKey = `${activeNodeId}-${currentNodes.length}-${currentEdges.length}`;
    
    // Check cache first
    if (conversationThreadCache.current.has(cacheKey)) {
      const cached = conversationThreadCache.current.get(cacheKey);
      if (cached) return cached;
    }
    
    const thread: Message[] = [];
    let currentId: string | null = activeNodeId;
    
    // Traverse backwards to root to build the path
    const path: string[] = [];
    while (currentId) {
      path.unshift(currentId);
      const parentEdge = currentEdges.find(e => e.target === currentId);
      currentId = parentEdge ? parentEdge.source : null;
    }
    
    // Build messages from path
    path.forEach(nodeId => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node && node.type === 'conversation') {
        const nodeData = node.data as unknown as ConversationNodeData;
        thread.push(
          {
            id: `${nodeId}-q`,
            role: 'user',
            content: nodeData.question,
            timestamp: nodeData.timestamp,
            nodeId: nodeId
          },
          {
            id: `${nodeId}-a`,
            role: 'assistant',
            content: nodeData.response,
            timestamp: nodeData.timestamp,
            nodeId: nodeId
          }
        );
      }
    });
    
    // Store in cache (limit cache size to prevent memory issues)
    if (conversationThreadCache.current.size > 50) {
      // Clear oldest entries
      const firstKey = conversationThreadCache.current.keys().next().value;
      if (firstKey) {
        conversationThreadCache.current.delete(firstKey);
      }
    }
    conversationThreadCache.current.set(cacheKey, thread);
    
    return thread;
  }, []);

  // Enter fullscreen mode with fade + scale animation
  const enterFullscreenMode = useCallback((nodeId: string) => {
    console.log('🔍 Entering fullscreen mode for node:', nodeId);
    
    // Build conversation thread from root to this node
    const thread = buildConversationThread(nodeId, nodesRef.current, edgesRef.current);
    
    // Get node position for transform origin
    const node = nodesRef.current.find(n => n.id === nodeId);
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
      width: NODE_WIDTH * zoom,
      height: NODE_HEIGHT * zoom,
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
      setFullscreenState(prev => ({
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
        setAbortController(null);
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
      setFullscreenState(prev => ({
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
          const activeNode = nodesRef.current.find(n => n.id === activeNodeId);
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
        setAbortController(null);
      }
    }
  }, [fullscreenState.activeNodeId, reactFlowInstance, isFullscreenLoading, setShowExitConfirmation, setAbortController, setIsFullscreenLoading, setFullscreenState, setAnimateFromFullscreen, setAnimateToFullscreen]);

  // Internal function that performs the actual panning
  const handleSmartPanningInternal = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    try {
      // Check if ReactFlow instance is ready
      if (!reactFlowInstance) {
        console.warn('⚠️ ReactFlow instance not ready, skipping smart panning');
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify parentId and childId are provided
      if (!parentId || !childId) {
        console.warn('⚠️ Invalid node IDs provided:', { parentId, childId });
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify currentNodes array is valid
      if (!currentNodes || !Array.isArray(currentNodes) || currentNodes.length === 0) {
        console.warn('⚠️ Invalid nodes array provided');
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Get parent and child nodes with null checks
      const parentNode = currentNodes.find(n => n.id === parentId);
      const childNode = currentNodes.find(n => n.id === childId);

      // Null check: Parent node must exist
      if (!parentNode) {
        console.warn('⚠️ Parent node not found:', parentId);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Child node must exist
      if (!childNode) {
        console.warn('⚠️ Child node not found:', childId);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify node positions are valid
      if (!parentNode.position || typeof parentNode.position.x !== 'number' || typeof parentNode.position.y !== 'number') {
        console.warn('⚠️ Parent node has invalid position:', parentNode.position);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!childNode.position || typeof childNode.position.x !== 'number' || typeof childNode.position.y !== 'number') {
        console.warn('⚠️ Child node has invalid position:', childNode.position);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Calculate node bounds (width: 450px, height: 350-468px, using 468 for safety)
      const parentBounds = {
        x: parentNode.position.x,
        y: parentNode.position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };

      const childBounds = {
        x: childNode.position.x,
        y: childNode.position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };

      // Try-catch around viewport API calls
      let viewport, zoom, viewportWidth, viewportHeight;
      try {
        viewport = reactFlowInstance.getViewport();
        zoom = reactFlowInstance.getZoom();
        
        // Get viewport dimensions from the DOM
        const reactFlowWrapper = document.querySelector('.react-flow');
        viewportWidth = reactFlowWrapper?.clientWidth || window.innerWidth;
        viewportHeight = reactFlowWrapper?.clientHeight || window.innerHeight;
      } catch (viewportError) {
        console.warn('⚠️ Error getting viewport information:', viewportError);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Verify viewport data is valid
      if (!viewport || typeof zoom !== 'number' || !viewportWidth || !viewportHeight) {
        console.warn('⚠️ Invalid viewport data:', { viewport, zoom, viewportWidth, viewportHeight });
        setIsPanning(false);
        processPanQueue();
        return;
      }

      const viewportInfo = {
        x: viewport.x,
        y: viewport.y,
        zoom: zoom,
        width: viewportWidth,
        height: viewportHeight,
      };

      console.log('🔍 Smart Panning Check:', {
        parentId,
        childId,
        parentBounds,
        childBounds,
        viewportInfo,
      });

      // Try-catch around visibility check
      let visibilityResult;
      try {
        visibilityResult = ViewportManager.areBothNodesVisible(
          parentBounds,
          childBounds,
          viewportInfo,
          50 // 50px margin
        );
      } catch (visibilityError) {
        console.warn('⚠️ Error checking node visibility:', visibilityError);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      console.log('👁️ Visibility Result:', visibilityResult);

      if (!visibilityResult.isVisible) {
        // Try-catch around bounds calculation
        let combinedBounds;
        try {
          combinedBounds = ViewportManager.calculateCombinedBounds(
            parentBounds,
            childBounds,
            50 // 50px margin
          );
        } catch (boundsError) {
          console.warn('⚠️ Error calculating combined bounds:', boundsError);
          setIsPanning(false);
          processPanQueue();
          return;
        }

        console.log('📐 Combined Bounds:', combinedBounds);
        console.log('🎯 Panning to show both nodes...');

        // Try-catch around fitBounds call
        try {
          reactFlowInstance.fitBounds(
            {
              x: combinedBounds.x,
              y: combinedBounds.y,
              width: combinedBounds.width,
              height: combinedBounds.height,
            },
            {
              duration: 500,
              padding: 0.01, // 1% padding - minimal zoom out, keeps text very readable
            }
          );
          
          // After panning completes, process next item in queue
          setTimeout(() => {
            setIsPanning(false);
            processPanQueue();
          }, 500); // Match the animation duration
        } catch (fitBoundsError) {
          console.warn('⚠️ Error calling fitBounds:', fitBoundsError);
          setIsPanning(false);
          processPanQueue();
          return;
        }
      } else {
        console.log('✅ Both nodes already visible, no panning needed');
        setIsPanning(false);
        processPanQueue();
      }
    } catch (error) {
      // Catch-all for any unexpected errors
      console.warn('⚠️ Unexpected error in handleSmartPanning:', error);
      // Don't throw - panning failure shouldn't break node creation
      setIsPanning(false);
      processPanQueue();
    }
  }, [reactFlowInstance, processPanQueue]);

  // Public function that handles queueing
  const handleSmartPanning = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    // Don't pan if user is interacting
    if (userInteractingRef.current) {
      console.log('🚫 User interacting, skipping auto-pan');
      return;
    }

    // If panning is in progress, add to queue
    if (isPanning) {
      console.log('⏳ Panning in progress, adding to queue:', parentId, '->', childId);
      setPanQueue((prev) => [...prev, { parentId, childId, nodes: currentNodes }]);
      return;
    }

    // Otherwise, start panning immediately
    setIsPanning(true);
    handleSmartPanningInternal(parentId, childId, currentNodes);
  }, [isPanning, setPanQueue, setIsPanning]);

  // Notify parent of changes - strip out functions before saving
  // Use a ref to track the last saved state to avoid infinite loops
  const lastSavedState = useRef<string>('');
  
  useEffect(() => {
    if (onUpdate) {
      // Create a hash of the current state
      const currentState = JSON.stringify({ 
        nodeIds: nodes.map(n => n.id),
        edgeIds: edges.map(e => e.id),
        nodeCount: nodes.length 
      });
      
      // Only update if state actually changed
      if (currentState !== lastSavedState.current) {
        lastSavedState.current = currentState;
        
        // Remove non-serializable data (functions) before saving
        const serializableNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onAddFollowUp: undefined, // Remove function
            onMaximize: undefined, // Remove function
          }
        }));
        onUpdate(serializableNodes, edges);
      }
    }
  }, [nodes, edges, onUpdate]);

  const createConversationNode = useCallback(async (question: string, parentId: string | null) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleString();
    const nodeId = `conversation-${nodeIdCounter.current++}`;

    let conversationHistory: Message[] = [];
    if (parentId) {
      // Use refs to get the latest state
      conversationHistory = getConversationHistory(parentId, nodesRef.current, edgesRef.current);
    }
    conversationHistory.push({ role: 'user', content: question });

    let aiResponse = '';
    try {
      console.log('Sending request to /api/chat with messages:', conversationHistory);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to get AI response: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      aiResponse = data.response;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        aiResponse = 'Request timed out. Please try again.';
      } else {
        aiResponse = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
      }
    }

    const conversationNode: Node<ConversationNodeData> = {
      id: nodeId,
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question,
        response: aiResponse,
        timestamp,
        positioned: false,
      },
    };

    // Use functional updates to avoid stale closure issues
    // First update edges
    let updatedEdges: Edge[] = [];
    setEdges((currentEdges) => {
      const newEdges = [...currentEdges];
      if (parentId) {
        newEdges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId });
      }
      updatedEdges = newEdges;
      return newEdges;
    });

    // Then update nodes with the new edges
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes, conversationNode];

      const { nodes: layoutedNodes } = getLayoutedElements(newNodes, updatedEdges);

      // Update all nodes - callbacks are now provided via context
      const nodesWithoutCallbacks = layoutedNodes.map(node => ({
        ...node,
      }));
      
      // Trigger smart panning after layout (only for child nodes)
      if (parentId) {
        requestAnimationFrame(() => {
          // Try smart panning first
          handleSmartPanning(parentId, nodeId, nodesWithoutCallbacks);

          // Fallback: if smart panning fails, just pan to the new node
          setTimeout(() => {
            const newNode = nodesWithoutCallbacks.find(n => n.id === nodeId);
            if (newNode && reactFlowInstance) {
              try {
                reactFlowInstance.fitView({
                  nodes: [newNode],
                  duration: 300,
                  padding: 0.2,
                  maxZoom: 1,
                });
              } catch (e) {
                console.warn('Fallback pan failed:', e);
              }
            }
          }, 100);
        });
      }

      return nodesWithoutCallbacks;
    });

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getConversationHistory, setNodes, setEdges, handleSmartPanning, reactFlowInstance, setIsLoading]);

  // Delete node and all its descendants
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Save current state for undo
    setDeletedState({
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    
    // Find all descendant nodes recursively
    const findDescendants = (id: string, currentEdges: Edge[]): string[] => {
      const childEdges = currentEdges.filter(e => e.source === id);
      const childIds = childEdges.map(e => e.target);
      const allDescendants = [...childIds];
      
      // Recursively find descendants of children
      childIds.forEach(childId => {
        allDescendants.push(...findDescendants(childId, currentEdges));
      });
      
      return allDescendants;
    };
    
    // Get all nodes to delete (the node itself + all descendants)
    const nodesToDelete = [nodeId, ...findDescendants(nodeId, edgesRef.current)];
    
    // Remove edges connected to deleted nodes first
    const updatedEdges = edgesRef.current.filter(e => 
      !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
    );
    
    // Remove nodes and recalculate layout
    const remainingNodes = nodesRef.current.filter(n => !nodesToDelete.includes(n.id));
    
    // Recalculate layout for remaining nodes
    const { nodes: layoutedNodes } = getLayoutedElements(remainingNodes, updatedEdges);

    // Update nodes - callbacks provided via context
    const nodesWithoutCallbacks = layoutedNodes.map(node => ({
      ...node,
    }));

    setNodes(nodesWithoutCallbacks);
    setEdges(updatedEdges);
    
    // Show undo toast
    setShowUndoToast(true);

    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Hide toast after 5 seconds
    const timeout = setTimeout(() => {
      setShowUndoToast(false);
      setDeletedState(null);
    }, 5000);
    undoTimeoutRef.current = timeout;
    setUndoTimeout(timeout);
  }, [setNodes, setEdges, createConversationNode, enterFullscreenMode, setDeletedState, setShowUndoToast, setUndoTimeout]);
  
  // Undo delete
  const handleUndoDelete = useCallback(() => {
    if (deletedState) {
      setNodes(deletedState.nodes);
      setEdges(deletedState.edges);
      setShowUndoToast(false);
      setDeletedState(null);

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
        setUndoTimeout(null);
      }
    }
  }, [deletedState, setNodes, setEdges, setShowUndoToast, setDeletedState, setUndoTimeout]);

  // Create node in background (silent mode - no viewport changes)
  const createNodeInBackground = useCallback(async (question: string, aiResponse: string) => {
    try {
      if (!fullscreenState.activeNodeId) {
        console.warn('⚠️ Cannot create node: no active node ID');
        return;
      }
      
      const timestamp = new Date().toLocaleString();
      const nodeId = `conversation-${nodeIdCounter.current++}`;
      const parentId = fullscreenState.activeNodeId;
      
      console.log('🔧 Creating node in background:', { nodeId, parentId, question: question.substring(0, 50) });
      
      // Verify parent node exists
      const parentNode = nodesRef.current.find(n => n.id === parentId);
      if (!parentNode) {
        console.error('❌ Parent node not found:', parentId);
        console.log('Available nodes:', nodesRef.current.map(n => n.id));
        return;
      }
      console.log('✅ Parent node found:', { id: parentNode.id, position: parentNode.position });
      
      // Create conversation node
      const conversationNode: Node<ConversationNodeData> = {
        id: nodeId,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          question,
          response: aiResponse,
          timestamp,
          positioned: false,
        },
      };
      
      // Update edges and nodes together to ensure layout has correct edge information
      let updatedNodes: Node[] = [];
      
      setEdges((currentEdges) => {
        const newEdges = [...currentEdges];
        newEdges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId });
        
        // Update nodes with the new edge information
        setNodes((currentNodes) => {
          const newNodes = [...currentNodes, conversationNode];
          
          // Run layout algorithm with the updated edges
          const { nodes: layoutedNodes } = getLayoutedElements(newNodes, newEdges);

          // Update all nodes - callbacks provided via context
          const nodesWithoutCallbacks = layoutedNodes.map(node => ({
            ...node,
          }));

          console.log('✅ Node created in background, layout updated');
          console.log('📍 New node position:', nodesWithoutCallbacks.find(n => n.id === nodeId)?.position);

          updatedNodes = nodesWithoutCallbacks;
          return nodesWithoutCallbacks;
        });
        
        return newEdges;
      });
      
      // Update active node ID to newly created node
      // Don't rebuild the conversation thread here - it's already correct from handleFullscreenMessage
      setFullscreenState(prev => {
        console.log('✅ Active node updated to:', nodeId);
        
        return {
          ...prev,
          activeNodeId: nodeId,
        };
      });
    } catch (error) {
      // Log error but don't throw - messages are already preserved in the conversation thread
      console.error('[Create Node Error]', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      // Messages are already in the conversation thread, so they're preserved
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenState.activeNodeId, setNodes, setEdges, buildConversationThread]);

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
      
      setFullscreenState(prev => ({
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
    
    setFullscreenState(prev => ({
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
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setAbortController(null);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error (${response.status}): ${errorText || 'Unknown error'}`);
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
      
      setFullscreenState(prev => ({
        ...prev,
        conversationThread: [...prev.conversationThread, assistantMessage],
      }));
      
      // Now create the node in the background (task 5.2)
      await createNodeInBackground(message, aiResponse);
      
      // Only set loading to false after node creation is complete
      setIsFullscreenLoading(false);
      setAbortController(null);

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
        } else if (error.message.includes('API error')) {
          errorMessage = `${error.message}. Please try again.`;
        } else {
          errorMessage = `Error: ${error.message}. Please try again.`;
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
      
      setFullscreenState(prev => ({
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
      setAbortController(null);
    }
  }, [fullscreenState.activeNodeId, fullscreenState.conversationThread, createNodeInBackground, isOnline, setAbortController, setIsFullscreenLoading, setFullscreenState]);

  // Handle retry for failed messages
  const handleRetryMessage = useCallback(async (messageId: string) => {
    // Find the error message
    const errorMessage = fullscreenState.conversationThread.find(m => m.id === messageId);
    if (!errorMessage || !errorMessage.retryData) return;
    
    // Remove the error message from the thread
    setFullscreenState(prev => ({
      ...prev,
      conversationThread: prev.conversationThread.filter(m => m.id !== messageId),
    }));
    
    // Retry sending the message
    await handleFullscreenMessage(errorMessage.retryData.userMessage);
  }, [fullscreenState.conversationThread, handleFullscreenMessage]);

  // Restore callbacks to nodes on mount
  useEffect(() => {
    if (!hasInitialized.current && nodes.length > 0) {
      hasInitialized.current = true;
      // Nodes no longer need callbacks in data - they use context
      // Just trigger a re-render to ensure context is available
      setNodes([...nodes]);
    }
  }, [nodes, setNodes]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle window resize - recalculate animation bounds if in fullscreen
  useEffect(() => {
    const handleResize = () => {
      // If in fullscreen mode (not transitioning), update bounds for potential exit animation
      if (fullscreenState.isFullscreen && !fullscreenState.isTransitioning && fullscreenState.activeNodeId && reactFlowInstance) {
        const node = nodesRef.current.find(n => n.id === fullscreenState.activeNodeId);
        if (node) {
          const viewport = reactFlowInstance.getViewport();
          const zoom = reactFlowInstance.getZoom();
          
          const screenX = node.position.x * zoom + viewport.x;
          const screenY = node.position.y * zoom + viewport.y;

          const nodeWidth = NODE_WIDTH;
          const nodeHeight = NODE_HEIGHT;

          const transitionBounds = {
            x: screenX,
            y: screenY,
            width: nodeWidth * zoom,
            height: nodeHeight * zoom,
          };
          
          setFullscreenState(prev => ({
            ...prev,
            transitionBounds,
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fullscreenState.isFullscreen, fullscreenState.isTransitioning, fullscreenState.activeNodeId, reactFlowInstance]);

  const handleStartConversation = useCallback(async () => {
    const question = searchTerm.trim();
    if (!question) return;

    await createConversationNode(question, null);
    setSearchTerm('');
  }, [createConversationNode, searchTerm]);

  const handleSubmitFollowUp = useCallback(async () => {
    if (!followUpQuestion.trim() || !followUpParentId) return;

    await createConversationNode(followUpQuestion, followUpParentId);
    setIsAddingFollowUp(false);
    setFollowUpQuestion('');
    setFollowUpParentId(null);
  }, [followUpQuestion, followUpParentId, createConversationNode]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Handle user interaction to cancel auto-panning
  const handleUserInteraction = useCallback(() => {
    if (isPanning || panQueueRef.current.length > 0) {
      console.log('👤 User interaction detected, clearing pan queue');
      setUserInteracting(true);
      setPanQueue([]);
      setIsPanning(false);

      // Reset the flag after a short delay
      setTimeout(() => {
        setUserInteracting(false);
      }, 1000);
    }
  }, [isPanning, setUserInteracting, setPanQueue, setIsPanning]);

  // Use onMove to detect both pan and zoom interactions
  const onMove = useCallback(() => {
    handleUserInteraction();
  }, [handleUserInteraction]);

  // Use search hook to filter nodes
  const { filteredNodes } = useCanvasSearch(nodes, searchTerm);

  // Update body data attribute when fullscreen state changes (for hiding sidebar on mobile)
  useEffect(() => {
    if (fullscreenState.isFullscreen || fullscreenState.isTransitioning) {
      document.body.setAttribute('data-fullscreen', 'true');
    } else {
      document.body.removeAttribute('data-fullscreen');
    }
  }, [fullscreenState.isFullscreen, fullscreenState.isTransitioning]);

  // Create stable canvas actions for context
  const canvasActions = React.useMemo(
    () => ({
      onAddFollowUp: async (nodeId: string, question: string) => {
        await createConversationNode(question, nodeId);
      },
      onDelete: handleDeleteNode,
      onMaximize: enterFullscreenMode,
    }),
    [createConversationNode, handleDeleteNode, enterFullscreenMode]
  );

  return (
    <CanvasActionsProvider value={canvasActions}>
      <div className="w-full h-screen relative">
      {/* Render fullscreen chat view with smooth fade + scale animation */}
      {(fullscreenState.isFullscreen || fullscreenState.isTransitioning) && (
        <div
          className="absolute inset-0 z-40"
          style={{
            // Creative animation: Fade + Scale effect
            // Expand: fade in from 0 to 1, scale from 0.96 to 1
            // Collapse: fade out from 1 to 0, scale from 1 to 0.96
            opacity: animateToFullscreen 
              ? 1  // Fade in to full opacity
              : animateFromFullscreen
                ? 0  // Fade out to transparent
                : fullscreenState.isFullscreen
                  ? 1  // Fully visible
                  : 0,  // Start hidden
            
            transform: animateToFullscreen
              ? 'scale(1) translateZ(0)'  // Scale to full size
              : animateFromFullscreen
                ? 'scale(0.96) translateZ(0)'  // Scale down slightly
                : fullscreenState.isFullscreen
                  ? 'scale(1) translateZ(0)'  // Full size
                  : 'scale(0.96) translateZ(0)',  // Start slightly smaller
            
            // Smooth transition for both properties
            transition: (animateToFullscreen || animateFromFullscreen)
              ? 'opacity 400ms cubic-bezier(0.4, 0.0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0.0, 0.2, 1)'
              : 'none',
            
            willChange: (animateToFullscreen || animateFromFullscreen)
              ? 'opacity, transform'
              : 'auto',
            
            // Prevent interaction during fade out
            pointerEvents: animateFromFullscreen ? 'none' : 'auto',
          }}
        >
          <FullscreenChatView
            messages={fullscreenState.conversationThread}
            onSendMessage={handleFullscreenMessage}
            onClose={exitFullscreenMode}
            isLoading={isFullscreenLoading}
            onRetry={handleRetryMessage}
            isTransitioning={fullscreenState.isTransitioning}
            sidebarOpen={sidebarOpen}
          />
        </div>
      )}
      
      {/* Network status indicator */}
      {!isOnline && fullscreenState.isFullscreen && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 rounded-lg px-4 py-2 shadow-lg">
          <span className="text-white text-sm font-medium">No internet connection</span>
        </div>
      )}
      
      {/* Render canvas when not in fullscreen mode (including during exit transition setup) */}
      {!fullscreenState.isFullscreen && (
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMove={onMove}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1, minZoom: 0.5 }}
          minZoom={0.1}
          maxZoom={2}
          noWheelClassName="nowheel"
          noDragClassName="nodrag"
          noPanClassName="nopan"
          zoomOnScroll={true}
          panOnScroll={false}
          panOnDrag={true}
          nodesDraggable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          zoomActivationKeyCode={null}
          preventScrolling={true}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: false,
          }}
        >
        <Background variant={BackgroundVariant.Dots} color="rgba(255, 255, 255, 0.03)" gap={20} size={1} />
        {nodes.length > 0 && (
          <>
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
              <button
                onClick={() => reactFlowInstance.zoomIn()}
                className="w-10 h-10 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm border border-[#4a4a4a] shadow-md transition-all duration-200 hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 flex items-center justify-center"
                style={{ background: 'rgba(42, 42, 42, 0.8)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                }}
                aria-label="Zoom in"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              
              <button
                onClick={() => reactFlowInstance.zoomOut()}
                className="w-10 h-10 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm border border-[#4a4a4a] shadow-md transition-all duration-200 hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 flex items-center justify-center"
                style={{ background: 'rgba(42, 42, 42, 0.8)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                }}
                aria-label="Zoom out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              
              <button
                onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
                className="w-10 h-10 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm border border-[#4a4a4a] shadow-md transition-all duration-200 hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 flex items-center justify-center"
                style={{ background: 'rgba(42, 42, 42, 0.8)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                }}
                aria-label="Fit view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              </button>
            </div>
            <MiniMap 
              className="!bg-[#1a1a1a] !border-[#3a3a3a] !rounded-2xl !shadow-2xl !overflow-hidden backdrop-blur-sm" 
              maskColor="rgba(13, 13, 13, 0.85)"
              nodeColor="#2f2f2f"
              nodeStrokeColor="#4d4d4d"
              nodeBorderRadius={8}
              maskStrokeColor="#565656"
              maskStrokeWidth={2}
            />
          </>
        )}
        
        {/* ChatGPT-style centered input when no nodes */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-xl md:text-2xl font-normal text-[#ececec] mb-2">What&apos;s on your mind today?</h1>
            </div>
            <div className="w-full max-w-3xl">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ask anything"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim() && !isLoading) {
                      handleStartConversation();
                    }
                  }}
                  disabled={isLoading}
                  className="w-full h-12 md:h-14 bg-[#2f2f2f] border border-[#565656] text-[#ececec] placeholder:text-[#8e8e8e] rounded-3xl px-4 md:px-5 pr-12 md:pr-14 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base"
                  style={{ fontSize: '16px' }}
                />
                {isLoading ? (
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-[#565656] border-t-[#ececec] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Button
                    onClick={handleStartConversation}
                    disabled={!searchTerm.trim()}
                    className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-9 w-9 md:h-10 md:w-10 p-0 rounded-full bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}


        </ReactFlow>
      )}

      <Dialog open={isAddingFollowUp} onOpenChange={setIsAddingFollowUp}>
        <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#ececec] font-semibold text-lg">Add Follow-up Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter your follow-up question..."
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitFollowUp();
                }
              }}
              disabled={isLoading}
              className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] focus:border-[#565656] focus:ring-0 rounded-lg"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingFollowUp(false)} disabled={isLoading} className="border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSubmitFollowUp} disabled={isLoading || !followUpQuestion.trim()} className="bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium">
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation dialog */}
      <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#ececec] font-semibold text-lg">Exit Fullscreen?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#ececec] text-sm">
              AI is still generating a response. If you exit now, the response will be cancelled.
            </p>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowExitConfirmation(false)} 
                className="border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg"
              >
                Stay
              </Button>
              <Button 
                onClick={() => {
                  setShowExitConfirmation(false);
                  exitFullscreenMode(true);
                }} 
                className="bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Exit Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Delete Toast - positioned relative to canvas, not entire screen */}
      <div 
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          showUndoToast 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 backdrop-blur-sm">
          <span className="text-[#ececec] text-sm font-medium">
            Node deleted
          </span>
          <Button
            onClick={handleUndoDelete}
            className="h-8 px-4 bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </Button>
        </div>
      </div>
    </div>
    </CanvasActionsProvider>
  );
}

// Wrapper component that provides ReactFlow context
export default function ConversationCanvas(props: ConversationCanvasProps) {
  return (
    <ReactFlowProvider>
      <ConversationCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

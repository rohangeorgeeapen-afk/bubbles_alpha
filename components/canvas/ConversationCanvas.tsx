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
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ConversationNode, { ConversationNodeData } from './ConversationNode';
import { getLayoutedElements } from '@/lib/utils/layout';
import FullscreenChatView from './FullscreenChatView';

// Extracted components
import CanvasEmptyState from './CanvasEmptyState';
import CanvasControls from './CanvasControls';
import UndoToast from './UndoToast';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import { FollowUpDialog, ExitConfirmationDialog } from './CanvasDialogs';
import { useConversationHistory, useNetworkStatus, useSmartPanning } from './hooks';
import type { Message, FullscreenState, ConversationCanvasProps } from './types';

const nodeTypes = {
  conversation: ConversationNode as any,
};

// Inner component that uses ReactFlow hooks
function ConversationCanvasInner({ 
  initialNodes = [], 
  initialEdges = [],
  onUpdate,
  sidebarOpen = true
}: ConversationCanvasProps = {}) {
  console.log('🎨 ConversationCanvas: Rendering with', { nodeCount: initialNodes.length, edgeCount: initialEdges.length });
  
  // Fix any stuck streaming nodes on mount (nodes that were saved mid-stream)
  const fixedInitialNodes = React.useMemo(() => {
    return initialNodes.map(node => {
      if (node.data?.isStreaming) {
        console.warn(`⚠️ Fixing stuck streaming node on mount: ${node.id}`);
        return {
          ...node,
          data: {
            ...node.data,
            isStreaming: false,
            response: node.data.response || 'Response was interrupted. Please try again.',
          }
        };
      }
      return node;
    });
  }, [initialNodes]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(fixedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nodeIdCounter = useRef(initialNodes.length);
  const hasInitialized = useRef(false);
  
  // Welcome messages that rotate
  const welcomeMessages = [
    "What's on your mind?",
    "Let's explore something new",
    "Start a conversation",
    "What would you like to know?",
    "Ask me anything",
    "Let's dive into a topic",
    "What are you curious about?",
    "Begin your exploration",
    "What's your question?",
    "Let's get started",
  ];
  
  const [welcomeMessage] = useState(() => {
    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  });
  
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
  const isOnline = useNetworkStatus();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  // Smart panning hook
  const { handleSmartPanning, handleUserInteraction, reactFlowInstance } = useSmartPanning();
  
  // Undo delete functionality
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedState, setDeletedState] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to always have access to latest nodes and edges
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Refs for callbacks to avoid stale closures
  const handleDeleteNodeRef = useRef<(nodeId: string) => void>(() => {});
  const enterFullscreenModeRef = useRef<(nodeId: string) => void>(() => {});
  const createConversationNodeRef = useRef<(question: string, parentId: string | null) => Promise<void>>(async () => {});
  
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Custom node change handler - nodes are no longer draggable
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Use extracted conversation history hook
  const { getConversationHistory, buildConversationThread } = useConversationHistory();

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
        abortControllerRef.current = null;
      }
    }
  }, [fullscreenState.activeNodeId, reactFlowInstance, isFullscreenLoading]);

  // Smart panning is now handled by useSmartPanning hook

  // Notify parent of changes - strip out functions before saving
  // Use a ref to track the last saved state to avoid infinite loops
  const lastSavedState = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (onUpdate) {
      // Create a hash of the current state including node data
      const currentState = JSON.stringify({ 
        nodeIds: nodes.map(n => n.id),
        edgeIds: edges.map(e => e.id),
        nodeCount: nodes.length,
        // Include response data and streaming state to trigger saves
        nodeData: nodes.map(n => ({
          id: n.id,
          response: n.data?.response || '',
          isStreaming: n.data?.isStreaming || false,
        })),
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
        
        // Check if any node is currently streaming
        const isAnyStreaming = nodes.some(n => n.data?.isStreaming);
        
        // Clear any pending save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        if (isAnyStreaming) {
          // During streaming, debounce saves to every 2 seconds
          saveTimeoutRef.current = setTimeout(() => {
            onUpdate(serializableNodes, edges);
          }, 2000);
        } else {
          // Not streaming - save immediately
          onUpdate(serializableNodes, edges);
        }
      }
    }
    
  }, [nodes, edges, onUpdate]);
  
  // Save pending changes on unmount (e.g., when switching canvases)
  useEffect(() => {
    return () => {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save current state immediately on unmount
      if (onUpdate && nodesRef.current.length > 0) {
        const serializableNodes = nodesRef.current.map(node => ({
          ...node,
          data: {
            ...node.data,
            onAddFollowUp: undefined,
            onMaximize: undefined,
            // Mark any streaming nodes as interrupted
            isStreaming: false,
          }
        }));
        onUpdate(serializableNodes, edgesRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to update a specific node's data
  const updateNodeData = useCallback((nodeId: string, updates: Partial<ConversationNodeData>) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  const createConversationNode = useCallback(async (question: string, parentId: string | null) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleString();
    const nodeId = `conversation-${nodeIdCounter.current++}`;

    let conversationHistory: Message[] = [];
    if (parentId) {
      conversationHistory = getConversationHistory(parentId, nodesRef.current, edgesRef.current);
    }
    conversationHistory.push({ role: 'user', content: question });

    // Create node immediately with empty response and streaming flag
    const conversationNode: Node<ConversationNodeData> = {
      id: nodeId,
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question,
        response: '',
        timestamp,
        isStreaming: true,
        onAddFollowUp: async (nId: string, q: string) => {
          await createConversationNodeRef.current(q, nId);
        },
        onDelete: (nId: string) => handleDeleteNodeRef.current(nId),
        onMaximize: (nId: string) => enterFullscreenModeRef.current(nId),
        positioned: false,
      },
    };

    // Build the new edge if there's a parent
    const newEdge = parentId 
      ? { id: `${parentId}-${nodeId}`, source: parentId, target: nodeId }
      : null;

    // Calculate the updated edges using the ref (always current)
    const updatedEdges = newEdge 
      ? [...edgesRef.current, newEdge] 
      : [...edgesRef.current];

    // Capture parent position BEFORE layout for compensation
    const parentNodeBefore = parentId ? nodesRef.current.find(n => n.id === parentId) : null;
    const parentPosBefore = parentNodeBefore ? { ...parentNodeBefore.position } : null;
    
    // Capture current viewport
    const viewportBefore = reactFlowInstance ? {
      ...reactFlowInstance.getViewport(),
      zoom: reactFlowInstance.getZoom()
    } : null;

    // Update edges
    setEdges(updatedEdges);

    // Update nodes with layout
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes, conversationNode];
      const { nodes: layoutedNodes } = getLayoutedElements(newNodes, updatedEdges);
      
      const nodesWithCallback = layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: async (nId: string, q: string) => {
            await createConversationNodeRef.current(q, nId);
          },
          onDelete: (nId: string) => handleDeleteNodeRef.current(nId),
          onMaximize: (nId: string) => enterFullscreenModeRef.current(nId),
        }
      }));
      
      // Compensate for layout shift and pan to new node
      if (reactFlowInstance && viewportBefore) {
        const parentNodeAfter = parentId ? nodesWithCallback.find(n => n.id === parentId) : null;
        const newNode = nodesWithCallback.find(n => n.id === nodeId);
        
        if (parentId && parentPosBefore && parentNodeAfter && newNode) {
          // Calculate how much the parent shifted
          const shiftX = parentNodeAfter.position.x - parentPosBefore.x;
          const shiftY = parentNodeAfter.position.y - parentPosBefore.y;
          
          // Immediately adjust viewport to compensate for the shift (no animation)
          // This keeps the view stable while layout changes
          reactFlowInstance.setViewport({
            x: viewportBefore.x - shiftX * viewportBefore.zoom,
            y: viewportBefore.y - shiftY * viewportBefore.zoom,
            zoom: viewportBefore.zoom
          }, { duration: 0 });
          
          // Then smoothly pan to the new node
          requestAnimationFrame(() => {
            const nodeWidth = 450;
            const nodeHeight = 468;
            const centerX = newNode.position.x + nodeWidth / 2;
            const centerY = newNode.position.y + nodeHeight / 2;
            
            reactFlowInstance.setCenter(centerX, centerY, { 
              duration: 400,
              zoom: viewportBefore.zoom
            });
          });
        } else if (newNode) {
          // First node - just center on it
          requestAnimationFrame(() => {
            const nodeWidth = 450;
            const nodeHeight = 468;
            const centerX = newNode.position.x + nodeWidth / 2;
            const centerY = newNode.position.y + nodeHeight / 2;
            
            const targetZoom = Math.max(viewportBefore.zoom, 0.8);
            reactFlowInstance.setCenter(centerX, centerY, { 
              duration: 400,
              zoom: targetZoom
            });
          });
        }
      }
      
      return nodesWithCallback;
    });

    // Now stream the response
    let fullResponse = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for streaming
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, stream: true }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                updateNodeData(nodeId, { response: fullResponse });
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        fullResponse = fullResponse || 'Request timed out. Please try again.';
      } else if (!fullResponse) {
        fullResponse = `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Mark streaming complete
    updateNodeData(nodeId, { response: fullResponse, isStreaming: false });
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getConversationHistory, setNodes, setEdges, handleSmartPanning, reactFlowInstance, updateNodeData]);

  // Delete node and all its descendants
  const handleDeleteNode = useCallback((nodeId: string) => {
    try {
      // Get current state from refs (most up-to-date)
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      
      // Verify the node exists before attempting delete
      const nodeToDelete = currentNodes.find(n => n.id === nodeId);
      if (!nodeToDelete) {
        console.warn('⚠️ Node to delete not found:', nodeId);
        return;
      }
      
      // Save current state for undo
      setDeletedState({
        nodes: currentNodes,
        edges: currentEdges,
      });
      
      // Find all descendant nodes recursively with cycle protection
      const findDescendants = (id: string, edges: Edge[], visited: Set<string> = new Set()): string[] => {
        if (visited.has(id)) {
          console.warn('⚠️ Cycle detected during delete, breaking at:', id);
          return [];
        }
        visited.add(id);
        
        const childEdges = edges.filter(e => e.source === id);
        const childIds = childEdges.map(e => e.target);
        const allDescendants = [...childIds];
        
        // Recursively find descendants of children
        childIds.forEach(childId => {
          allDescendants.push(...findDescendants(childId, edges, visited));
        });
        
        return allDescendants;
      };
      
      // Get all nodes to delete (the node itself + all descendants)
      const nodesToDelete = new Set([nodeId, ...findDescendants(nodeId, currentEdges)]);
      
      // Remove edges connected to deleted nodes
      const updatedEdges = currentEdges.filter(e => 
        !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)
      );
      
      // Also remove any orphaned edges (edges pointing to non-existent nodes)
      const remainingNodeIds = new Set(
        currentNodes.filter(n => !nodesToDelete.has(n.id)).map(n => n.id)
      );
      const cleanedEdges = updatedEdges.filter(e => 
        remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
      );
      
      // Remove nodes
      const remainingNodes = currentNodes.filter(n => !nodesToDelete.has(n.id));
      
      // Recalculate layout for remaining nodes
      const { nodes: layoutedNodes } = getLayoutedElements(remainingNodes, cleanedEdges);
      
      // Update nodes with callbacks
      const nodesWithCallbacks = layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: async (nId: string, q: string) => {
            await createConversationNodeRef.current(q, nId);
          },
          onDelete: (nId: string) => handleDeleteNodeRef.current(nId),
          onMaximize: (nId: string) => enterFullscreenModeRef.current(nId),
        }
      }));
      
      setNodes(nodesWithCallbacks);
      setEdges(cleanedEdges);
      
      // Show undo toast
      setShowUndoToast(true);
      
      // Clear any existing timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      
      // Hide toast after 5 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedState(null);
      }, 5000);
    } catch (error) {
      console.error('[Delete Node Error]', error);
      // Still try to remove the node even if there's an error
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    }
  }, [setNodes, setEdges]);

  // Keep callback refs updated to avoid stale closures
  useEffect(() => {
    handleDeleteNodeRef.current = handleDeleteNode;
    enterFullscreenModeRef.current = enterFullscreenMode;
    createConversationNodeRef.current = createConversationNode;
  }, [handleDeleteNode, enterFullscreenMode, createConversationNode]);
  
  // Undo delete
  const handleUndoDelete = useCallback(() => {
    if (deletedState) {
      setNodes(deletedState.nodes);
      setEdges(deletedState.edges);
      setShowUndoToast(false);
      setDeletedState(null);
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  }, [deletedState, setNodes, setEdges]);

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
      
      // Use refs to get the most current state (avoid stale closure issues)
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      
      // Verify parent node exists in current state
      const parentNode = currentNodes.find(n => n.id === parentId);
      if (!parentNode) {
        console.error('❌ Parent node not found:', parentId);
        console.log('Available nodes:', currentNodes.map(n => n.id));
        return;
      }
      console.log('✅ Parent node found:', { id: parentNode.id, position: parentNode.position });
      
      // Check if this node already exists (prevent duplicates from race conditions)
      const existingNode = currentNodes.find(n => 
        n.data?.question === question && 
        n.data?.response === aiResponse &&
        currentEdges.some(e => e.source === parentId && e.target === n.id)
      );
      if (existingNode) {
        console.warn('⚠️ Node already exists, skipping duplicate creation');
        return;
      }
      
      // Create conversation node
      const conversationNode: Node<ConversationNodeData> = {
        id: nodeId,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          question,
          response: aiResponse,
          timestamp,
          isStreaming: false, // Explicitly set to false since response is already complete
          onAddFollowUp: async (nId: string, q: string) => {
            await createConversationNodeRef.current(q, nId);
          },
          onDelete: (nId: string) => handleDeleteNodeRef.current(nId),
          onMaximize: (nId: string) => enterFullscreenModeRef.current(nId),
          positioned: false,
        },
      };
      
      // Create the new edge
      const newEdge = { id: `${parentId}-${nodeId}`, source: parentId, target: nodeId };
      
      // Build new arrays first (avoid nested setState)
      const newNodes = [...currentNodes, conversationNode];
      const newEdges = [...currentEdges, newEdge];
      
      // Run layout algorithm
      const { nodes: layoutedNodes } = getLayoutedElements(newNodes, newEdges);
      
      // Update all nodes to have the callbacks
      const nodesWithCallback = layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: async (nId: string, q: string) => {
            await createConversationNodeRef.current(q, nId);
          },
          onDelete: (nId: string) => handleDeleteNodeRef.current(nId),
          onMaximize: (nId: string) => enterFullscreenModeRef.current(nId),
        }
      }));
      
      console.log('✅ Node created in background, layout updated');
      console.log('📍 New node position:', nodesWithCallback.find(n => n.id === nodeId)?.position);
      
      // Update state atomically (not nested)
      setNodes(nodesWithCallback);
      setEdges(newEdges);
      
      // Update active node ID to newly created node
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
      abortControllerRef.current = null;
    }
  }, [fullscreenState.activeNodeId, fullscreenState.conversationThread, createNodeInBackground, isOnline]);

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
      const nodesWithCallback = nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: async (nodeId: string, q: string) => {
            await createConversationNodeRef.current(q, nodeId);
          },
          onDelete: (nodeId: string) => handleDeleteNodeRef.current(nodeId),
          onMaximize: (nodeId: string) => enterFullscreenModeRef.current(nodeId),
        },
      }));
      setNodes(nodesWithCallback);
      
      // Initial fitView on mount when loading existing nodes
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.3, maxZoom: 1, duration: 300 });
        }, 100);
      }
    }
  }, [nodes, setNodes, reactFlowInstance]);

  // Network status is now handled by useNetworkStatus hook

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
          
          const nodeWidth = 450;
          const nodeHeight = 468;
          
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

  // Use onMove to detect both pan and zoom interactions (handleUserInteraction from hook)
  const onMove = useCallback(() => {
    handleUserInteraction();
  }, [handleUserInteraction]);

  const filteredNodes = searchTerm
    ? nodes.filter((node) => {
        if (node.type === 'conversation') {
          const nodeData = node.data as unknown as ConversationNodeData;
          return (
            nodeData.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeData.response.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      })
    : nodes;

  // Update body data attribute when fullscreen state changes (for hiding sidebar on mobile)
  useEffect(() => {
    if (fullscreenState.isFullscreen || fullscreenState.isTransitioning) {
      document.body.setAttribute('data-fullscreen', 'true');
    } else {
      document.body.removeAttribute('data-fullscreen');
    }
  }, [fullscreenState.isFullscreen, fullscreenState.isTransitioning]);

  return (
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
      <NetworkStatusIndicator 
        isOnline={isOnline} 
        show={fullscreenState.isFullscreen} 
      />
      

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
          minZoom={0.01}
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
        <Background variant={BackgroundVariant.Dots} color="rgba(14, 165, 233, 0.03)" gap={40} size={1} />
        {nodes.length > 0 && (
          <>
            <CanvasControls
              onZoomIn={() => reactFlowInstance.zoomIn()}
              onZoomOut={() => reactFlowInstance.zoomOut()}
              onFitView={() => reactFlowInstance.fitView({ padding: 0.2 })}
            />

            <MiniMap 
              className="!bg-[hsl(223,28%,10%)] !border-[hsl(220,18%,22%)] !rounded-lg !shadow-2xl !overflow-hidden backdrop-blur-sm" 
              maskColor="rgba(13, 17, 23, 0.6)"
              nodeColor="hsl(215, 20%, 65%)"
              nodeStrokeColor="hsl(215, 15%, 45%)"
              nodeBorderRadius={6}
              maskStrokeColor="hsl(220, 18%, 35%)"
              maskStrokeWidth={1}
            />
          </>
        )}
        

        {/* Empty canvas state */}
        {nodes.length === 0 && (
          <CanvasEmptyState
            welcomeMessage={welcomeMessage}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onStartConversation={handleStartConversation}
            isLoading={isLoading}
          />
        )}


        </ReactFlow>
      )}

      <FollowUpDialog
        open={isAddingFollowUp}
        onOpenChange={setIsAddingFollowUp}
        followUpQuestion={followUpQuestion}
        onFollowUpQuestionChange={setFollowUpQuestion}
        onSubmit={handleSubmitFollowUp}
        isLoading={isLoading}
      />

      <ExitConfirmationDialog
        open={showExitConfirmation}
        onOpenChange={setShowExitConfirmation}
        onConfirmExit={() => {
          setShowExitConfirmation(false);
          exitFullscreenMode(true);
        }}
      />


      {/* Undo Delete Toast */}
      <UndoToast show={showUndoToast} onUndo={handleUndoDelete} />
    </div>
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

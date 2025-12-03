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
import { getLayoutedElements } from '@/lib/utils/layout';
import { ViewportManager } from '@/lib/utils/viewport-manager';
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
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
        onAddFollowUp: async (nodeId: string, q: string) => {
          await createConversationNode(q, nodeId);
        },
        onDelete: handleDeleteNode,
        onMaximize: enterFullscreenMode,
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
      
      // Update all nodes to have the callback
      const nodesWithCallback = layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: async (nodeId: string, q: string) => {
            await createConversationNode(q, nodeId);
          },
          onDelete: handleDeleteNode,
          onMaximize: enterFullscreenMode,
        }
      }));
      
      // Trigger smart panning after layout (only for child nodes)
      if (parentId) {
        requestAnimationFrame(() => {
          // Try smart panning first
          handleSmartPanning(parentId, nodeId, nodesWithCallback);
          
          // Fallback: if smart panning fails, just pan to the new node
          setTimeout(() => {
            const newNode = nodesWithCallback.find(n => n.id === nodeId);
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
      
      return nodesWithCallback;
    });

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getConversationHistory, setNodes, setEdges, handleSmartPanning, reactFlowInstance]);

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
    
    // Update nodes with callbacks
    const nodesWithCallbacks = layoutedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddFollowUp: async (nodeId: string, q: string) => {
          await createConversationNode(q, nodeId);
        },
        onDelete: handleDeleteNode,
        onMaximize: enterFullscreenMode,
      }
    }));
    
    setNodes(nodesWithCallbacks);
    setEdges(updatedEdges);
    
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
  }, [setNodes, setEdges, createConversationNode, enterFullscreenMode]);
  
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
          onAddFollowUp: async (nodeId: string, q: string) => {
            await createConversationNode(q, nodeId);
          },
          onDelete: handleDeleteNode,
          onMaximize: enterFullscreenMode,
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
          
          // Update all nodes to have the callbacks
          const nodesWithCallback = layoutedNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onAddFollowUp: async (nodeId: string, q: string) => {
                await createConversationNode(q, nodeId);
              },
              onDelete: handleDeleteNode,
              onMaximize: enterFullscreenMode,
            }
          }));
          
          console.log('✅ Node created in background, layout updated');
          console.log('📍 New node position:', nodesWithCallback.find(n => n.id === nodeId)?.position);
          
          updatedNodes = nodesWithCallback;
          return nodesWithCallback;
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
            await createConversationNode(q, nodeId);
          },
          onDelete: handleDeleteNode,
          onMaximize: enterFullscreenMode,
        },
      }));
      setNodes(nodesWithCallback);
    }
  }, [nodes, createConversationNode, handleDeleteNode, enterFullscreenMode, setNodes]);

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
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1, minZoom: 0.01 }}
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
        <Background variant={BackgroundVariant.Dots} color="rgba(255, 255, 255, 0.03)" gap={20} size={1} />
        {nodes.length > 0 && (
          <>
            <CanvasControls
              onZoomIn={() => reactFlowInstance.zoomIn()}
              onZoomOut={() => reactFlowInstance.zoomOut()}
              onFitView={() => reactFlowInstance.fitView({ padding: 0.2 })}
            />

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

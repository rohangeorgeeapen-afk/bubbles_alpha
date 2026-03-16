import { useCallback, useRef, MutableRefObject } from 'react';
import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { ConversationNodeData } from '@/components/canvas/ConversationNode';
import { Message } from '@/lib/stores/canvasStore';
import { getLayoutedElements } from '@/lib/utils/layout';

interface NodeOperationsOptions {
  nodeIdCounter: MutableRefObject<number>;
  nodesRef: MutableRefObject<Node[]>;
  edgesRef: MutableRefObject<Edge[]>;
  undoTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  reactFlowInstance: ReactFlowInstance | null;
  getConversationHistory: (nodeId: string, currentNodes: Node[], currentEdges: Edge[]) => Message[];
  handleSmartPanning: (parentId: string, childId: string, currentNodes: Node[]) => void;
  aiStreamingSendMessage: (messages: Message[]) => Promise<{ response: string; error?: Error }>;
  fullscreenActiveNodeId: string | null;
  deletedState: { nodes: Node[]; edges: Edge[] } | null;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setIsLoading: (loading: boolean) => void;
  setDeletedState: (state: { nodes: Node[]; edges: Edge[] } | null) => void;
  setShowUndoToast: (show: boolean) => void;
  setUndoTimeout: (timeout: NodeJS.Timeout | null) => void;
  setFullscreenState: (state: any | ((prev: any) => any)) => void;
}

/**
 * Hook for managing node operations (create, delete, undo)
 *
 * Provides functionality to create conversation nodes, delete nodes with undo capability,
 * and handle background node creation for fullscreen mode.
 */
export function useNodeOperations(options: NodeOperationsOptions) {
  const {
    nodeIdCounter,
    nodesRef,
    edgesRef,
    undoTimeoutRef,
    reactFlowInstance,
    getConversationHistory,
    handleSmartPanning,
    aiStreamingSendMessage,
    fullscreenActiveNodeId,
    deletedState,
    setNodes,
    setEdges,
    setIsLoading,
    setDeletedState,
    setShowUndoToast,
    setUndoTimeout,
    setFullscreenState,
  } = options;

  /**
   * Create a new conversation node with AI response
   */
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

    // Use the AI streaming hook to get response
    const { response: aiResponse } = await aiStreamingSendMessage(conversationHistory);

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
  }, [
    nodeIdCounter,
    nodesRef,
    edgesRef,
    getConversationHistory,
    aiStreamingSendMessage,
    setNodes,
    setEdges,
    setIsLoading,
    handleSmartPanning,
    reactFlowInstance,
  ]);

  /**
   * Delete a node and all its descendants
   */
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
  }, [
    nodesRef,
    edgesRef,
    undoTimeoutRef,
    setNodes,
    setEdges,
    setDeletedState,
    setShowUndoToast,
    setUndoTimeout,
  ]);

  /**
   * Undo the last delete operation
   */
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
  }, [
    deletedState,
    undoTimeoutRef,
    setNodes,
    setEdges,
    setShowUndoToast,
    setDeletedState,
    setUndoTimeout,
  ]);

  /**
   * Create node in background (silent mode - no viewport changes)
   * Used for fullscreen mode
   */
  const createNodeInBackground = useCallback(async (question: string, aiResponse: string) => {
    try {
      if (!fullscreenActiveNodeId) {
        console.warn('⚠️ Cannot create node: no active node ID');
        return;
      }

      const timestamp = new Date().toLocaleString();
      const nodeId = `conversation-${nodeIdCounter.current++}`;
      const parentId = fullscreenActiveNodeId;

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
      setFullscreenState((prev: any) => {
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
  }, [
    fullscreenActiveNodeId,
    nodeIdCounter,
    nodesRef,
    setNodes,
    setEdges,
    setFullscreenState,
  ]);

  return {
    createConversationNode,
    handleDeleteNode,
    handleUndoDelete,
    createNodeInBackground,
  };
}

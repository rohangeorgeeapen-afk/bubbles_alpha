import { useCallback, useRef, useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/utils/layout';
import type { ConversationNodeData } from '../ConversationNode';
import type { Message } from '../types';

export interface UseNodeManagerProps {
  initialNodes: Node[];
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  reactFlowInstance: ReactFlowInstance | null;
  getConversationHistory: (parentId: string, nodes: Node[], edges: Edge[]) => Message[];
}

export interface StreamingCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface CreateNodeParams {
  question: string;
  parentId: string | null;
  onStream?: (callbacks: StreamingCallbacks) => Promise<string>;
}

export interface CreateNodeInBackgroundParams {
  question: string;
  response: string;
  parentId: string;
}

/**
 * Hook for managing node CRUD operations
 *
 * Extracts node management logic from ConversationCanvas.tsx including:
 * - Node creation with layout integration
 * - Node deletion with undo functionality
 * - Node data updates
 * - Node ID generation
 *
 * This hook does NOT handle streaming - streaming results are passed in
 * from the composition layer via the onStream callback.
 *
 * This hook is independent and does not import from:
 * - useStreamingChat (streaming passed in from outside)
 * - useLayoutEngine (we call getLayoutedElements directly)
 * - useCanvasPersistence (composition layer handles saving)
 */
export function useNodeManager({
  initialNodes,
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowInstance,
  getConversationHistory,
}: UseNodeManagerProps) {
  // Initialize counter to max existing ID + 1 to prevent ID collisions
  const nodeIdCounter = useRef(
    initialNodes.length === 0
      ? 0
      : initialNodes.reduce((max, node) => {
          const match = node.id.match(/^conversation-(\d+)$/);
          if (match) {
            return Math.max(max, parseInt(match[1], 10) + 1);
          }
          return max;
        }, 0)
  );

  // Undo delete functionality
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedState, setDeletedState] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for current state (to avoid stale closures)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  /**
   * Update a specific node's data
   */
  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<ConversationNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
        )
      );
    },
    [setNodes]
  );

  /**
   * Create a new conversation node
   *
   * This function:
   * 1. Creates the node with initial data
   * 2. Adds the edge to parent (if any)
   * 3. Runs layout calculation
   * 4. If onStream provided, calls it to get the response
   * 5. Updates node as streaming progresses
   */
  const createNode = useCallback(
    async ({ question, parentId, onStream }: CreateNodeParams) => {
      const timestamp = new Date().toLocaleString();
      const nodeId = `conversation-${nodeIdCounter.current++}`;

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
          exploredSelections: [],
          // Callbacks will be injected by composition layer
          onAddFollowUp: async () => {},
          positioned: false,
        } as any, // Callbacks injected later
      };

      // Build the new edge if there's a parent
      const newEdge = parentId
        ? { id: `${parentId}-${nodeId}`, source: parentId, target: nodeId }
        : null;

      // Calculate the updated edges
      const updatedEdges = newEdge ? [...edgesRef.current, newEdge] : [...edgesRef.current];

      // Update edges
      setEdges(updatedEdges);

      // Update nodes with layout
      setNodes((currentNodes) => {
        const newNodes = [...currentNodes, conversationNode];
        const { nodes: layoutedNodes } = getLayoutedElements(newNodes, updatedEdges);
        return layoutedNodes;
      });

      // If streaming callback provided, execute it
      if (onStream) {
        let fullResponse = '';
        try {
          await onStream({
            onChunk: (chunk) => {
              fullResponse += chunk;
              updateNodeData(nodeId, { response: fullResponse });
            },
            onComplete: (response) => {
              updateNodeData(nodeId, { response, isStreaming: false });
            },
            onError: (error) => {
              const errorResponse = fullResponse || `Sorry, an error occurred: ${error.message}`;
              updateNodeData(nodeId, { response: errorResponse, isStreaming: false });
            },
          });
        } catch (error) {
          console.error('Streaming error:', error);
          const errorResponse =
            fullResponse || `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
          updateNodeData(nodeId, { response: errorResponse, isStreaming: false });
        }
      } else {
        // No streaming - mark as not streaming immediately
        updateNodeData(nodeId, { isStreaming: false });
      }
    },
    [setNodes, setEdges, getConversationHistory, updateNodeData]
  );

  /**
   * Create a node in background (no viewport changes)
   *
   * Used for fullscreen mode where nodes are created silently
   * as the user chats.
   */
  const createNodeInBackground = useCallback(
    async ({ question, response, parentId }: CreateNodeInBackgroundParams) => {
      try {
        const timestamp = new Date().toLocaleString();
        const nodeId = `conversation-${nodeIdCounter.current++}`;

        console.log('🔧 Creating node in background:', {
          nodeId,
          parentId,
          question: question.substring(0, 50),
        });

        // Use refs to get the most current state
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;

        // Verify parent node exists
        const parentNode = currentNodes.find((n) => n.id === parentId);
        if (!parentNode) {
          console.error('❌ Parent node not found:', parentId);
          console.log('Available nodes:', currentNodes.map((n) => n.id));
          return;
        }

        // Check if this node already exists (prevent duplicates)
        const existingNode = currentNodes.find(
          (n) =>
            n.data?.question === question &&
            n.data?.response === response &&
            currentEdges.some((e) => e.source === parentId && e.target === n.id)
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
            response,
            timestamp,
            isStreaming: false,
            exploredSelections: [],
            // Callbacks will be injected by composition layer
            onAddFollowUp: async () => {},
            positioned: false,
          } as any,
        };

        // Create the new edge
        const newEdge = { id: `${parentId}-${nodeId}`, source: parentId, target: nodeId };
        const newEdges = [...currentEdges, newEdge];

        // Update state using callback form
        setNodes((currentNodesInCallback) => {
          const existingNodeIds = new Set(currentNodesInCallback.map((n) => n.id));

          // If the node already exists (race condition), skip
          if (existingNodeIds.has(nodeId)) {
            console.warn('⚠️ Node already exists in state, skipping');
            return currentNodesInCallback;
          }

          const mergedNodes = [...currentNodesInCallback, conversationNode];
          const { nodes: freshLayoutedNodes } = getLayoutedElements(mergedNodes, newEdges);

          return freshLayoutedNodes;
        });
        setEdges(newEdges);

        console.log('✅ Node created in background:', nodeId);
      } catch (error) {
        console.error('[Create Node Error]', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [setNodes, setEdges]
  );

  /**
   * Delete a node and all its descendants
   *
   * Saves the state for undo functionality.
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      try {
        // Get current state from refs
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;

        // Verify the node exists
        const nodeToDelete = currentNodes.find((n) => n.id === nodeId);
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
        const findDescendants = (
          id: string,
          edges: Edge[],
          visited: Set<string> = new Set()
        ): string[] => {
          if (visited.has(id)) {
            console.warn('⚠️ Cycle detected during delete, breaking at:', id);
            return [];
          }
          visited.add(id);

          const childEdges = edges.filter((e) => e.source === id);
          const childIds = childEdges.map((e) => e.target);
          const allDescendants = [...childIds];

          // Recursively find descendants of children
          childIds.forEach((childId) => {
            allDescendants.push(...findDescendants(childId, edges, visited));
          });

          return allDescendants;
        };

        // Get all nodes to delete
        const nodesToDelete = new Set([nodeId, ...findDescendants(nodeId, currentEdges)]);

        // Remove edges connected to deleted nodes
        const updatedEdges = currentEdges.filter(
          (e) => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)
        );

        // Also remove any orphaned edges
        const remainingNodeIds = new Set(currentNodes.filter((n) => !nodesToDelete.has(n.id)).map((n) => n.id));
        const cleanedEdges = updatedEdges.filter(
          (e) => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
        );

        // Update state
        setNodes((currentNodesState) => {
          const nodesToDeleteSet = new Set([nodeId, ...findDescendants(nodeId, edgesRef.current)]);

          const remainingNodesFromState = currentNodesState
            .filter((n) => !nodesToDeleteSet.has(n.id))
            .map((node) => {
              // Clean up exploredSelections that reference any deleted node
              if (node.data?.exploredSelections && (node.data.exploredSelections as any[]).length > 0) {
                const cleanedSelections = (node.data.exploredSelections as any[]).filter(
                  (sel: any) => !nodesToDeleteSet.has(sel.childNodeId)
                );
                if (cleanedSelections.length !== (node.data.exploredSelections as any[]).length) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      exploredSelections: cleanedSelections,
                    },
                  };
                }
              }
              return node;
            });

          const { nodes: freshLayoutedNodes } = getLayoutedElements(remainingNodesFromState, cleanedEdges);
          return freshLayoutedNodes;
        });
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
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      }
    },
    [setNodes, setEdges]
  );

  /**
   * Undo the last delete operation
   */
  const undoDelete = useCallback(() => {
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

  return {
    createNode,
    createNodeInBackground,
    updateNodeData,
    deleteNode,
    undoDelete,
    showUndoToast,
    deletedState,
    nodesRef,
    edgesRef,
  };
}

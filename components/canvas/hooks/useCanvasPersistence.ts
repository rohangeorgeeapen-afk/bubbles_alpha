import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';

export interface UseCanvasPersistenceProps {
  nodes: Node[];
  edges: Edge[];
  onUpdate: ((nodes: Node[], edges: Edge[]) => void) | undefined;
}

export interface UseCanvasPersistenceReturn {
  // Returns the current save version counter (for debugging)
  saveVersion: number;
}

/**
 * Hook for managing canvas persistence with optimized change detection
 *
 * Extracts save logic from ConversationCanvas.tsx including:
 * - Version-based change detection (faster than JSON.stringify)
 * - Debounced saves during streaming
 * - Immediate saves when not streaming
 * - Cleanup on unmount
 *
 * This hook is self-contained and does not import from other hooks
 * (useStreamingChat, useLayoutEngine).
 *
 * Change Detection Strategy:
 * Instead of expensive JSON.stringify on full node data, we hash only:
 * - Node IDs
 * - Edge IDs
 * - isStreaming status
 *
 * This is O(n) instead of O(n × response_length), solving Root Cause 4.
 */
export function useCanvasPersistence({
  nodes,
  edges,
  onUpdate,
}: UseCanvasPersistenceProps): UseCanvasPersistenceReturn {
  // Track last saved state with a lightweight hash
  const lastSavedHash = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveVersionRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // Update refs on every render for unmount cleanup
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  /**
   * Create a lightweight hash of state for change detection
   *
   * Only hashes: node IDs, edge IDs, and isStreaming status.
   * Does NOT include full response text (which can be large).
   */
  const createStateHash = (nodes: Node[], edges: Edge[]): string => {
    const nodeData = nodes.map((n) => ({
      id: n.id,
      isStreaming: n.data?.isStreaming || false,
    }));

    const edgeData = edges.map((e) => e.id);

    return JSON.stringify({ nodeData, edgeData });
  };

  /**
   * Strip callbacks from nodes to make them serializable
   */
  const stripCallbacks = (nodes: Node[]): Node[] => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAddFollowUp: undefined,
        onBranchFromSelection: undefined,
        onNavigateToNode: undefined,
        onDelete: undefined,
        onMaximize: undefined,
      },
    }));
  };

  /**
   * Main save effect - watches nodes and edges for changes
   */
  useEffect(() => {
    if (!onUpdate) return;

    // Create hash of current state
    const currentHash = createStateHash(nodes, edges);

    // Only proceed if state actually changed
    if (currentHash === lastSavedHash.current) return;

    lastSavedHash.current = currentHash;
    saveVersionRef.current++;

    // Prepare serializable nodes
    const serializableNodes = stripCallbacks(nodes);

    // Check if any node is currently streaming
    const isAnyStreaming = nodes.some((n) => n.data?.isStreaming);

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
  }, [nodes, edges, onUpdate]);

  /**
   * Cleanup effect - save on unmount
   */
  useEffect(() => {
    return () => {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save current state immediately on unmount
      if (onUpdate && nodesRef.current.length > 0) {
        const serializableNodes = nodesRef.current.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onAddFollowUp: undefined,
            onBranchFromSelection: undefined,
            onNavigateToNode: undefined,
            onDelete: undefined,
            onMaximize: undefined,
            // Mark any streaming nodes as interrupted
            isStreaming: false,
          },
        }));
        onUpdate(serializableNodes, edgesRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount/unmount

  return {
    saveVersion: saveVersionRef.current,
  };
}

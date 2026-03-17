import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/utils/layout';

export interface UseLayoutEngineProps {
  reactFlowInstance: ReactFlowInstance | null;
  nodeWidth?: number;
  nodeHeight?: number;
}

export interface CompensateViewportParams {
  parentId: string;
  newNodeId: string;
  nodesBeforeLayout: Node[];
  nodesAfterLayout: Node[];
  parentPosBefore: { x: number; y: number };
  viewportBefore: { x: number; y: number; zoom: number };
}

/**
 * Hook for managing layout calculations and viewport compensation
 *
 * Extracts layout logic from ConversationCanvas.tsx including:
 * - Layout recalculation using getLayoutedElements
 * - Viewport compensation to keep parent node stable on screen
 * - Node navigation with smooth animations
 *
 * This hook is stateless and operates on passed data.
 * It does not import from other hooks (useStreamingChat, useCanvasPersistence).
 */
export function useLayoutEngine({
  reactFlowInstance,
  nodeWidth = 450,
  nodeHeight = 468,
}: UseLayoutEngineProps) {
  /**
   * Recalculate layout for all nodes using the layout engine
   *
   * @param nodes - Array of nodes to layout
   * @param edges - Array of edges defining connections
   * @returns Array of nodes with updated positions
   */
  const recalculateLayout = useCallback((nodes: Node[], edges: Edge[]): Node[] => {
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
    return layoutedNodes;
  }, []);

  /**
   * Compensate viewport after layout to keep parent node stable on screen
   *
   * When a new node is added, the layout engine recalculates ALL node positions.
   * This can cause the parent node to move on screen, which is disorienting.
   * This function compensates by adjusting the viewport to keep the parent
   * in the same screen position, then smoothly centers on the new child node.
   *
   * IMPORTANT: This function must be called AFTER layout calculation, but the
   * parentPosBefore and viewportBefore must be captured BEFORE setNodes is called.
   *
   * Correct call order:
   * ```typescript
   * // 1. Capture state BEFORE layout
   * const parentPosBefore = parentNode ? { ...parentNode.position } : null;
   * const viewportBefore = reactFlowInstance ? {
   *   ...reactFlowInstance.getViewport(),
   *   zoom: reactFlowInstance.getZoom()
   * } : null;
   *
   * // 2. Run layout (inside setNodes or setState)
   * const layoutedNodes = recalculateLayout(newNodes, edges);
   *
   * // 3. Call this function to compensate viewport
   * compensateViewportAfterLayout({
   *   parentId,
   *   newNodeId,
   *   nodesBeforeLayout: oldNodes,
   *   nodesAfterLayout: layoutedNodes,
   *   parentPosBefore,
   *   viewportBefore,
   * });
   * ```
   *
   * @param params - Viewport compensation parameters
   */
  const compensateViewportAfterLayout = useCallback(
    (params: CompensateViewportParams) => {
      const {
        parentId,
        newNodeId,
        nodesAfterLayout,
        parentPosBefore,
        viewportBefore,
      } = params;

      if (!reactFlowInstance) return;

      const parentNodeAfter = nodesAfterLayout.find((n) => n.id === parentId);
      const newNode = nodesAfterLayout.find((n) => n.id === newNodeId);

      if (!parentNodeAfter || !newNode) return;

      // Calculate how much the parent moved during layout
      const shiftX = parentNodeAfter.position.x - parentPosBefore.x;
      const shiftY = parentNodeAfter.position.y - parentPosBefore.y;
      const newNodePos = { x: newNode.position.x, y: newNode.position.y };

      // Schedule viewport compensation outside React render cycle
      setTimeout(() => {
        // First, compensate for parent movement (instant, no animation)
        reactFlowInstance.setViewport(
          {
            x: viewportBefore.x - shiftX * viewportBefore.zoom,
            y: viewportBefore.y - shiftY * viewportBefore.zoom,
            zoom: viewportBefore.zoom,
          },
          { duration: 0 }
        );

        // Then, smoothly center on the new node
        requestAnimationFrame(() => {
          const centerX = newNodePos.x + nodeWidth / 2;
          const centerY = newNodePos.y + nodeHeight / 2;

          reactFlowInstance.setCenter(centerX, centerY, {
            duration: 400,
            zoom: viewportBefore.zoom,
          });
        });
      }, 0);
    },
    [reactFlowInstance, nodeWidth, nodeHeight]
  );

  /**
   * Navigate to a specific node with smooth animation
   *
   * Centers the viewport on the specified node.
   * Used when clicking on explored selection highlights.
   *
   * @param nodeId - ID of the node to navigate to
   * @param nodes - Array of all nodes
   */
  const navigateToNode = useCallback(
    (nodeId: string, nodes: Node[]) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !reactFlowInstance) return;

      // Center on the node with animation
      const centerX = node.position.x + nodeWidth / 2;
      const centerY = node.position.y + nodeHeight / 2;

      reactFlowInstance.setCenter(centerX, centerY, {
        duration: 500,
        zoom: Math.max(reactFlowInstance.getZoom(), 0.8),
      });
    },
    [reactFlowInstance, nodeWidth, nodeHeight]
  );

  /**
   * Center a new node when parent info is not available
   *
   * Used for the first node in the canvas or when the ReactFlow instance
   * is not yet ready during initial render.
   *
   * @param nodePosition - Position of the node to center on
   */
  const centerNewNode = useCallback(
    (nodePosition: { x: number; y: number }) => {
      if (!reactFlowInstance) return;

      setTimeout(() => {
        const centerX = nodePosition.x + nodeWidth / 2;
        const centerY = nodePosition.y + nodeHeight / 2;

        const currentZoom = reactFlowInstance.getZoom();
        const targetZoom = Math.max(currentZoom || 0.8, 0.8);

        reactFlowInstance.setCenter(centerX, centerY, {
          duration: 400,
          zoom: targetZoom,
        });
      }, 100);
    },
    [reactFlowInstance, nodeWidth, nodeHeight]
  );

  return {
    recalculateLayout,
    compensateViewportAfterLayout,
    navigateToNode,
    centerNewNode,
  };
}

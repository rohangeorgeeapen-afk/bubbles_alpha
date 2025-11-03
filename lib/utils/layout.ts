import { Node, Edge } from '@xyflow/react';
import { LayoutOrchestrator, DEFAULT_LAYOUT_CONFIG } from '@/lib/layout';

// Create a singleton instance of LayoutOrchestrator with default configuration
const layoutOrchestrator = new LayoutOrchestrator(DEFAULT_LAYOUT_CONFIG);

/**
 * Calculates optimal positions for all nodes in the conversation tree
 * 
 * This function uses the LayoutOrchestrator to apply a modified Reingold-Tilford
 * algorithm combined with collision detection and resolution. It ALWAYS recalculates
 * positions for ALL nodes to ensure optimal layout regardless of creation order.
 * 
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Object containing positioned nodes and unchanged edges
 */
export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  try {
    // Handle empty case
    if (nodes.length === 0) {
      return { nodes, edges };
    }

    // Use LayoutOrchestrator to calculate positions for ALL nodes
    // This ensures optimal layout regardless of node creation order
    const positionedNodes = layoutOrchestrator.layout(nodes, edges);

    return { nodes: positionedNodes, edges };
  } catch (error) {
    // Log error but don't throw - return original nodes to avoid breaking the UI
    console.error('[Layout Error]', error);
    console.warn('Layout calculation failed, returning original node positions');
    
    // Mark all nodes as positioned to prevent infinite layout loops
    const fallbackNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        positioned: true,
      },
    }));
    
    return { nodes: fallbackNodes, edges };
  }
};

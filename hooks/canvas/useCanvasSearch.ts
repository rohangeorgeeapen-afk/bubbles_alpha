import { useMemo } from 'react';
import { Node } from '@xyflow/react';
import { ConversationNodeData } from '@/components/canvas/ConversationNode';

/**
 * Hook for filtering canvas nodes based on search term
 *
 * @param nodes - Array of React Flow nodes to filter
 * @param searchTerm - Search query string
 * @returns Filtered array of nodes matching the search term
 */
export function useCanvasSearch(nodes: Node[], searchTerm: string) {
  const filteredNodes = useMemo(() => {
    if (!searchTerm) {
      return nodes;
    }

    return nodes.filter((node) => {
      if (node.type === 'conversation') {
        const nodeData = node.data as unknown as ConversationNodeData;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          nodeData.question.toLowerCase().includes(lowerSearchTerm) ||
          nodeData.response.toLowerCase().includes(lowerSearchTerm)
        );
      }
      return false;
    });
  }, [nodes, searchTerm]);

  return { filteredNodes };
}

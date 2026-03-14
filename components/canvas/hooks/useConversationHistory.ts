import { useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { Message } from '../types';
import type { ConversationNodeData } from '../ConversationNode';

/**
 * Hook for managing conversation history traversal and caching
 */
export function useConversationHistory() {
  // Memoized conversation thread calculation for performance
  const conversationThreadCache = useRef<Map<string, Message[]>>(new Map());

  /**
   * Get conversation history by traversing from a node back to root
   * Includes cycle detection to prevent infinite loops on corrupt data.
   */
  const getConversationHistory = useCallback((
    nodeId: string, 
    currentNodes: Node[], 
    currentEdges: Edge[]
  ): Message[] => {
    const history: Message[] = [];
    let currentNodeId: string | null = nodeId;
    const visited = new Set<string>();

    while (currentNodeId) {
      if (visited.has(currentNodeId)) {
        console.warn('⚠️ Cycle detected in conversation history at node:', currentNodeId);
        break;
      }
      visited.add(currentNodeId);

      const currentNode = currentNodes.find((n) => n.id === currentNodeId);
      if (!currentNode) break;

      if (currentNode.type === 'conversation') {
        const nodeData = currentNode.data as unknown as ConversationNodeData;
        history.unshift(
          { role: 'user', content: nodeData.question },
          { role: 'assistant', content: nodeData.response }
        );
      }

      const parentEdge = currentEdges.find((e) => e.target === currentNodeId);
      currentNodeId = parentEdge ? parentEdge.source : null;
    }

    return history;
  }, []);

  /**
   * Build conversation thread for fullscreen mode - with memoization.
   * Includes cycle detection to prevent infinite loops on corrupt data.
   */
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
    
    // Traverse backwards to root to build the path, with cycle detection
    const path: string[] = [];
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) {
        console.warn('⚠️ Cycle detected in conversation thread at node:', currentId);
        break;
      }
      visited.add(currentId);
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

  /**
   * Clear the conversation thread cache
   */
  const clearCache = useCallback(() => {
    conversationThreadCache.current.clear();
  }, []);

  return {
    getConversationHistory,
    buildConversationThread,
    clearCache,
  };
}

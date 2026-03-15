/**
 * TreeBuilder - Converts flat node/edge arrays into hierarchical tree structure
 *
 * This class takes React Flow nodes and edges and builds a tree data structure
 * suitable for layout algorithms. It handles:
 * - Building parent-child relationships from edges
 * - Identifying root nodes (nodes with no incoming edges)
 * - Detecting and breaking cycles in the graph
 */

import { Node, Edge, TreeNode, TreeStructure } from './types';
import { NODE_WIDTH, NODE_HEIGHT } from './constants';

export class TreeBuilder {
  // Cache for cycle detection to avoid redundant checks
  private reachabilityCache: Map<string, Set<string>> = new Map();

  /**
   * Build a tree structure from flat node and edge arrays
   * 
   * @param nodes - Array of React Flow nodes
   * @param edges - Array of React Flow edges
   * @returns TreeStructure with roots array and nodeMap for O(1) lookup
   */
  build(nodes: Node[], edges: Edge[]): TreeStructure {
    // Clear cache for new build
    this.reachabilityCache.clear();
    // Step 1: Create TreeNode for each input node
    const nodeMap = new Map<string, TreeNode>();
    
    nodes.forEach(node => {
      const treeNode: TreeNode = {
        id: node.id,
        children: [],
        parent: null,
        data: node,
        x: 0,
        y: 0,
        width: NODE_WIDTH,  // Fixed width for conversation nodes
        height: NODE_HEIGHT, // Fixed height for conversation nodes
        mod: 0,
        thread: null,
        ancestor: null as any, // Will be set to self during initialization
        change: 0,
        shift: 0,
        prelim: 0,
      };
      
      nodeMap.set(node.id, treeNode);
    });
    
    // Step 2: Build parent-child relationships from edges
    // Track which nodes have incoming edges (not roots)
    const nodesWithParents = new Set<string>();
    
    // Detect cycles while building relationships
    const cycleDetected = this.buildRelationshipsWithCycleDetection(edges, nodeMap, nodesWithParents);
    
    if (cycleDetected) {
      console.warn('⚠️ Cycles detected in graph and removed during tree building');
    }
    
    // Step 3: Identify root nodes (nodes with no incoming edges)
    const roots: TreeNode[] = [];
    
    nodeMap.forEach((treeNode, nodeId) => {
      if (!nodesWithParents.has(nodeId)) {
        roots.push(treeNode);
      }
    });
    
    // Step 4: Return tree structure
    return {
      roots,
      nodeMap,
    };
  }
  
  /**
   * Build parent-child relationships while detecting and breaking cycles
   * 
   * Uses depth-first search to detect cycles. When a cycle is found,
   * the edge that creates the cycle is skipped.
   * 
   * @param edges - Array of edges to process
   * @param nodeMap - Map of node IDs to TreeNodes
   * @param nodesWithParents - Set to track which nodes have parents
   * @returns true if any cycles were detected and broken
   */
  private buildRelationshipsWithCycleDetection(
    edges: Edge[],
    nodeMap: Map<string, TreeNode>,
    nodesWithParents: Set<string>
  ): boolean {
    let cycleDetected = false;
    
    // Process each edge
    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      // Skip if either node doesn't exist
      if (!sourceNode || !targetNode) {
        console.warn(`⚠️ Edge references non-existent node: ${edge.source} -> ${edge.target}`);
        continue;
      }
      
      // Check if adding this edge would create a cycle
      // A cycle exists if target can already reach source through existing children
      if (this.canReachThroughChildren(targetNode, sourceNode.id)) {
        console.warn(`⚠️ Cycle detected: skipping edge ${edge.source} -> ${edge.target}`);
        cycleDetected = true;
        continue;
      }
      
      // Add the relationship
      sourceNode.children.push(targetNode);
      targetNode.parent = sourceNode;
      nodesWithParents.add(edge.target);
    }
    
    return cycleDetected;
  }
  
  /**
   * Check if 'from' node can reach 'toId' node through existing children relationships
   * Uses memoization to avoid redundant checks for large trees
   * 
   * @param from - Starting node
   * @param toId - Target node ID to reach
   * @returns true if 'from' can reach 'toId' through its children
   */
  private canReachThroughChildren(from: TreeNode, toId: string): boolean {
    // If we reached the target, return true
    if (from.id === toId) {
      return true;
    }
    
    // Check cache first
    const cached = this.reachabilityCache.get(from.id);
    if (cached && cached.has(toId)) {
      return true;
    }
    
    // Build reachable set for this node if not cached
    if (!cached) {
      const reachable = new Set<string>();
      this.buildReachableSet(from, reachable);
      this.reachabilityCache.set(from.id, reachable);
      return reachable.has(toId);
    }
    
    return false;
  }

  /**
   * Build a set of all nodes reachable from a given node
   * @param from - Starting node
   * @param reachable - Set to accumulate reachable node IDs
   */
  private buildReachableSet(from: TreeNode, reachable: Set<string>): void {
    for (const child of from.children) {
      reachable.add(child.id);
      this.buildReachableSet(child, reachable);
    }
  }
}

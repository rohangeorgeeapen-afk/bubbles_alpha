/**
 * CoordinateTransformer - Converts relative tree coordinates to absolute canvas coordinates
 * 
 * This class takes the tree structure with relative positions (calculated by the layout
 * algorithm) and transforms them into absolute canvas coordinates. It handles:
 * - Converting relative positions to absolute positions
 * - Preserving existing root node positions
 * - Marking all nodes as positioned
 * - Handling multiple roots with different base positions
 */

import { Node, TreeNode, TreeStructure } from './types';

export class CoordinateTransformer {
  /**
   * Transform tree structure with relative coordinates to positioned nodes with absolute coordinates
   * 
   * @param tree - Tree structure with relative positions
   * @param rootPositions - Map of root node IDs to their absolute positions (to preserve existing positions)
   * @returns Array of positioned nodes with absolute coordinates
   */
  transform(
    tree: TreeStructure,
    rootPositions: Map<string, { x: number; y: number }>
  ): Node[] {
    const result: Node[] = [];
    
    // Process each root tree
    tree.roots.forEach(root => {
      // Get the base position for this root
      // If the root already has a position (from rootPositions), use it
      // Otherwise, default to (0, 100) for new roots
      const rootPos = rootPositions.get(root.id) || { x: 0, y: 100 };
      
      // Transform this root and all its descendants
      this.transformSubtree(root, rootPos.x, rootPos.y, result);
    });
    
    return result;
  }
  
  /**
   * Recursively transform a subtree from relative to absolute coordinates
   * 
   * @param node - Current node to transform
   * @param offsetX - X offset to add to relative position
   * @param offsetY - Y offset to add to relative position
   * @param result - Array to accumulate transformed nodes
   */
  private transformSubtree(
    node: TreeNode,
    offsetX: number,
    offsetY: number,
    result: Node[]
  ): void {
    // Convert relative position to absolute
    const absoluteX = node.x + offsetX;
    const absoluteY = node.y + offsetY;
    
    // Create the positioned node with updated coordinates
    // Preserve all original node data while updating position
    const positionedNode: Node = {
      ...node.data,
      position: { x: absoluteX, y: absoluteY },
      data: {
        ...node.data.data,
        positioned: true, // Mark as positioned by the algorithm
      },
    };
    
    result.push(positionedNode);
    
    // Recursively transform all children
    node.children.forEach(child => {
      this.transformSubtree(child, offsetX, offsetY, result);
    });
  }
}

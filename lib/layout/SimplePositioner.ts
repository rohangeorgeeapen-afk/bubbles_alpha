/**
 * SimplePositioner - Dead simple tree layout
 * 
 * Rules:
 * 1. Children are spaced horizontally with a fixed gap
 * 2. Parent is centered above children
 * 3. Each subtree is positioned to avoid overlaps
 */

import { TreeNode, TreeStructure, LayoutConfig } from './types';

export class SimplePositioner {
  private config: LayoutConfig;
  
  constructor(config: LayoutConfig) {
    this.config = config;
  }
  
  /**
   * Position all nodes in the tree
   */
  position(tree: TreeStructure): void {
    tree.roots.forEach(root => {
      this.positionSubtree(root, 0, 0);
    });
  }
  
  /**
   * Position a node and all its descendants
   * Returns the width of the subtree
   */
  private positionSubtree(node: TreeNode, x: number, y: number): number {
    node.y = y;
    
    if (node.children.length === 0) {
      // Leaf node
      node.x = x;
      return this.config.nodeWidth;
    }
    
    // Position all children first to calculate their widths
    const childY = y + this.config.nodeHeight + this.config.verticalSpacing;
    let currentX = x;
    const childWidths: number[] = [];
    
    node.children.forEach(child => {
      const width = this.positionSubtree(child, currentX, childY);
      childWidths.push(width);
      currentX += width + this.config.siblingSpacing;
    });
    
    // Total width of all children including gaps
    const totalChildrenWidth = childWidths.reduce((sum, w) => sum + w, 0) + 
                               (node.children.length - 1) * this.config.siblingSpacing;
    
    // Center parent above children
    const firstChildX = node.children[0].x;
    const lastChildX = node.children[node.children.length - 1].x;
    node.x = (firstChildX + lastChildX) / 2;
    
    // Return the width of this subtree (max of parent width or children width)
    return Math.max(this.config.nodeWidth, totalChildrenWidth);
  }
}

interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewportInfo {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

interface VisibilityResult {
  isVisible: boolean;
  reason?: string;
}

export class ViewportManager {
  /**
   * Check if a single node is fully visible within viewport bounds
   * @param nodeBounds - The bounds of the node to check
   * @param viewport - Current viewport information
   * @param margin - Buffer margin around the node (default: 50px)
   * @returns true if the node is fully visible, false otherwise
   */
  static isNodeVisible(
    nodeBounds: NodeBounds,
    viewport: ViewportInfo,
    margin: number = 50
  ): boolean {
    // Convert node coordinates to screen coordinates
    const nodeScreenX = nodeBounds.x * viewport.zoom + viewport.x;
    const nodeScreenY = nodeBounds.y * viewport.zoom + viewport.y;
    const nodeScreenWidth = nodeBounds.width * viewport.zoom;
    const nodeScreenHeight = nodeBounds.height * viewport.zoom;

    // Calculate node bounds with margin in screen space
    const nodeLeft = nodeScreenX - margin;
    const nodeRight = nodeScreenX + nodeScreenWidth + margin;
    const nodeTop = nodeScreenY - margin;
    const nodeBottom = nodeScreenY + nodeScreenHeight + margin;

    // Check if node is fully within viewport
    const isWithinLeft = nodeLeft >= 0;
    const isWithinRight = nodeRight <= viewport.width;
    const isWithinTop = nodeTop >= 0;
    const isWithinBottom = nodeBottom <= viewport.height;

    return isWithinLeft && isWithinRight && isWithinTop && isWithinBottom;
  }

  /**
   * Check if both parent and child nodes are visible
   * @param parentBounds - The bounds of the parent node
   * @param childBounds - The bounds of the child node
   * @param viewport - Current viewport information
   * @param margin - Buffer margin around nodes (default: 50px)
   * @returns Object with visibility status and optional reason
   */
  static areBothNodesVisible(
    parentBounds: NodeBounds,
    childBounds: NodeBounds,
    viewport: ViewportInfo,
    margin: number = 50
  ): VisibilityResult {
    const parentVisible = this.isNodeVisible(parentBounds, viewport, margin);
    const childVisible = this.isNodeVisible(childBounds, viewport, margin);

    if (parentVisible && childVisible) {
      return { isVisible: true };
    }

    if (!parentVisible && !childVisible) {
      return { 
        isVisible: false, 
        reason: 'Neither parent nor child node is visible in viewport' 
      };
    }

    if (!parentVisible) {
      return { 
        isVisible: false, 
        reason: 'Parent node is not visible in viewport' 
      };
    }

    return { 
      isVisible: false, 
      reason: 'Child node is not visible in viewport' 
    };
  }

  /**
   * Calculate the bounding box that contains both nodes
   * @param parentBounds - The bounds of the parent node
   * @param childBounds - The bounds of the child node
   * @param margin - Buffer margin around the combined bounds (default: 50px)
   * @returns Combined bounding box containing both nodes
   */
  static calculateCombinedBounds(
    parentBounds: NodeBounds,
    childBounds: NodeBounds,
    margin: number = 50
  ): NodeBounds {
    // Find the leftmost, rightmost, topmost, and bottommost edges
    const minX = Math.min(parentBounds.x, childBounds.x);
    const minY = Math.min(parentBounds.y, childBounds.y);
    
    const maxX = Math.max(
      parentBounds.x + parentBounds.width,
      childBounds.x + childBounds.width
    );
    const maxY = Math.max(
      parentBounds.y + parentBounds.height,
      childBounds.y + childBounds.height
    );

    // Calculate combined bounds with margin
    return {
      x: minX - margin,
      y: minY - margin,
      width: (maxX - minX) + (margin * 2),
      height: (maxY - minY) + (margin * 2),
    };
  }
}

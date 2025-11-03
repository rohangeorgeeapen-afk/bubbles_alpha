/**
 * LayoutOrchestrator - Simple tree layout
 */

import { TreeBuilder } from './TreeBuilder';
import { SimplePositioner } from './SimplePositioner';
import { CoordinateTransformer } from './CoordinateTransformer';
import { Node, Edge, LayoutConfig } from './types';

export class LayoutOrchestrator {
  private builder: TreeBuilder;
  private positioner: SimplePositioner;
  private transformer: CoordinateTransformer;
  private config: LayoutConfig;

  constructor(config: LayoutConfig) {
    this.config = config;
    this.builder = new TreeBuilder();
    this.positioner = new SimplePositioner(config);
    this.transformer = new CoordinateTransformer();
  }

  /**
   * Calculate layout for all nodes
   */
  layout(nodes: Node[], edges: Edge[]): Node[] {
    if (nodes.length === 0) return [];

    // 1. Build tree structure
    const tree = this.builder.build(nodes, edges);

    // 2. Position nodes
    this.positioner.position(tree);

    // 3. Transform to canvas coordinates
    const rootPositions = this.getRootPositions(nodes, edges);
    return this.transformer.transform(tree, rootPositions);
  }

  /**
   * Batched layout with debouncing
   */
  private pendingLayout: NodeJS.Timeout | null = null;
  
  layoutBatched(nodes: Node[], edges: Edge[]): Promise<Node[]> {
    return new Promise((resolve) => {
      if (this.pendingLayout) {
        clearTimeout(this.pendingLayout);
      }

      this.pendingLayout = setTimeout(() => {
        const result = this.layout(nodes, edges);
        this.pendingLayout = null;
        resolve(result);
      }, 50);
    });
  }

  /**
   * Preserve root node positions
   */
  private getRootPositions(
    nodes: Node[],
    edges: Edge[]
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const targetIds = new Set(edges.map(e => e.target));

    nodes.forEach(node => {
      const isRoot = !targetIds.has(node.id);
      if (isRoot && node.data?.positioned && node.position) {
        positions.set(node.id, node.position);
      }
    });

    return positions;
  }
}

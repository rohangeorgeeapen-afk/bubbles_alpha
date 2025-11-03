/**
 * Core data structures for the dynamic node placement system
 */

import { Node, Edge } from '@xyflow/react';

/**
 * TreeNode represents a node in the hierarchical tree structure
 * Used internally by the layout algorithm
 */
export interface TreeNode {
  id: string;
  children: TreeNode[];
  parent: TreeNode | null;
  data: any; // Original node data from React Flow
  
  // Position coordinates (relative within tree)
  x: number;
  y: number;
  
  // Node dimensions
  width: number;
  height: number;
  
  // Reingold-Tilford algorithm fields
  mod: number; // Modifier for positioning
  thread: TreeNode | null; // Thread to next node in contour
  ancestor: TreeNode; // Ancestor for apportion calculation
  change: number; // Change value for shift calculation
  shift: number; // Shift value for positioning
  prelim: number; // Preliminary x coordinate
}

/**
 * TreeStructure represents the complete tree with all roots and a lookup map
 */
export interface TreeStructure {
  roots: TreeNode[]; // Array of root nodes (nodes with no parent)
  nodeMap: Map<string, TreeNode>; // Map of node ID to TreeNode for O(1) lookup
}

/**
 * LayoutConfig defines all configuration parameters for the layout algorithm
 */
export interface LayoutConfig {
  // Node dimensions (fixed for conversation nodes)
  nodeWidth: number; // 450px
  nodeHeight: number; // 468px
  
  // Spacing configuration
  horizontalSpacing: number; // Minimum horizontal space between sibling nodes
  verticalSpacing: number; // Vertical space between parent and child levels
  siblingSpacing: number; // Space between siblings
  
  // Grid layout configuration (for large branching)
  gridThreshold: number; // Number of children before switching to grid layout
  
  // Collision resolution configuration
  maxIterations: number; // Maximum iterations for collision resolution
  
  // Spatial hash configuration (for efficient collision detection)
  spatialHashCellSize: number; // Size of spatial hash cells in pixels
}

/**
 * BoundingBox represents a rectangular area on the canvas
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Collision represents a detected collision between nodes or edges
 */
export interface Collision {
  type: 'node-overlap' | 'edge-intersection';
  node1: TreeNode;
  node2?: TreeNode; // For node-overlap collisions
  edge?: { source: TreeNode; target: TreeNode }; // For edge-intersection collisions
}

/**
 * Input types from React Flow
 */
export type { Node, Edge };

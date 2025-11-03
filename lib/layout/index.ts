/**
 * Simple Tree Layout System
 * 
 * Positions conversation nodes in a tree structure with consistent spacing.
 * No overlaps, no complicated algorithms.
 */

// Export types
export type {
  TreeNode,
  TreeStructure,
  LayoutConfig,
  Node,
  Edge,
} from './types';

// Export configuration
export {
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_CONFIG,
  createLayoutConfig,
} from './config';

// Export components
export { TreeBuilder } from './TreeBuilder';
export { SimplePositioner } from './SimplePositioner';
export { CoordinateTransformer } from './CoordinateTransformer';
export { LayoutOrchestrator } from './LayoutOrchestrator';

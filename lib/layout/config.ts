/**
 * Default configuration for the dynamic node placement system
 */

import { LayoutConfig } from './types';

/**
 * Default layout configuration constants
 * These values are optimized for conversation nodes (450px × 468px)
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  // Node dimensions - match actual ConversationNode size
  nodeWidth: 450,
  nodeHeight: 468,
  
  // Spacing configuration
  horizontalSpacing: 50, // Minimum horizontal space between sibling nodes
  verticalSpacing: 80, // Vertical space between parent and child levels
  siblingSpacing: 50, // Space between siblings (same as horizontalSpacing)
  
  // Grid layout configuration
  // When a parent has more than this many children, arrange them in a grid
  gridThreshold: 10,
  
  // Collision resolution configuration
  // Maximum number of iterations to attempt collision resolution
  maxIterations: 10,
  
  // Spatial hash configuration
  // Cell size for spatial hashing (used for efficient collision detection)
  // Larger cells = fewer cells but more nodes per cell
  // Smaller cells = more cells but fewer nodes per cell
  // 500px is a good balance for nodes of size 450×468
  spatialHashCellSize: 500,
};

/**
 * Create a custom layout configuration by merging with defaults
 */
export function createLayoutConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
  return {
    ...DEFAULT_LAYOUT_CONFIG,
    ...overrides,
  };
}

// Export as DEFAULT_CONFIG for backwards compatibility
export const DEFAULT_CONFIG = DEFAULT_LAYOUT_CONFIG;

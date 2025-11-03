# Implementation Plan

- [x] 1. Set up core data structures and configuration
  - Create TypeScript interfaces for TreeNode, TreeStructure, LayoutConfig, BoundingBox, and Collision types
  - Define default layout configuration constants (node dimensions, spacing values, thresholds)
  - _Requirements: 1.1, 2.1, 3.1, 6.1_

- [x] 2. Implement TreeBuilder
- [x] 2.1 Create TreeBuilder class with build method
  - Write logic to convert flat Node[] and Edge[] arrays into TreeNode objects
  - Build parent-child relationships from edges
  - Identify root nodes (nodes with no incoming edges)
  - Return TreeStructure with roots array and nodeMap
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2.2 Add cycle detection and handling
  - Detect cycles in the edge graph during tree building
  - Break cycles by removing the edge that creates the cycle
  - Log warnings when cycles are detected
  - _Requirements: 5.1, 5.2_

- [x] 2.3 Write unit tests for TreeBuilder
  - Test with single node, simple parent-child, multiple roots, deep hierarchy
  - Test cycle detection and breaking
  - _Requirements: 5.1, 5.2_

- [x] 3. Implement SpatialHash for efficient collision detection
- [x] 3.1 Create SpatialHash class
  - Implement constructor with configurable cell size
  - Write clear() method to reset the hash
  - Write insert() method to add nodes to appropriate cells
  - Write query() method to retrieve nodes in a bounding box
  - Implement getCellKey() helper for cell coordinate mapping
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 7.3_

- [x] 3.2 Write unit tests for SpatialHash
  - Test insertion and querying with various node positions
  - Verify nodes are inserted into correct cells
  - Test performance with 1000 nodes
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Implement InitialPositioner with Reingold-Tilford algorithm
- [x] 4.1 Create InitialPositioner class structure
  - Implement constructor accepting LayoutConfig
  - Write position() method that processes each root
  - Write initializeTreeNode() to set up Reingold-Tilford fields
  - _Requirements: 1.1, 2.1, 6.1, 6.2_

- [x] 4.2 Implement Reingold-Tilford core algorithm
  - Write firstWalk() method for post-order traversal
  - Write secondWalk() method for pre-order traversal with depth tracking
  - Implement apportion() method to balance subtrees
  - Implement executeShifts() method to apply accumulated shifts
  - Add helper methods for getting leftmost/rightmost children and siblings
  - _Requirements: 1.1, 2.1, 6.1, 6.2, 6.3_

- [x] 4.3 Add grid layout support for large branching
  - Write shouldUseGridLayout() to check if node exceeds threshold
  - Implement arrangeChildrenInGrid() for nodes with 10+ children
  - Calculate grid dimensions and center under parent
  - Integrate grid layout into firstWalk() logic
  - _Requirements: 1.1, 1.2, 1.3, 6.2_

- [x] 4.4 Write unit tests for InitialPositioner
  - Test single node, parent with 2 children, parent with 20 children
  - Test deep tree vertical spacing
  - Test grid layout activation and positioning
  - Verify symmetry for isomorphic subtrees
  - _Requirements: 1.1, 2.1, 6.1, 6.2_

- [x] 5. Implement CollisionDetector
- [x] 5.1 Create CollisionDetector class structure
  - Implement constructor with SpatialHash initialization
  - Write detectCollisions() main method
  - Implement insertAllNodes() and insertNodeAndDescendants() helpers
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 5.2 Implement node overlap detection
  - Write detectNodeOverlaps() method using spatial hash
  - Implement checkNodeOverlapsRecursive() to traverse tree
  - Write checkNodeOverlap() for AABB collision detection
  - Track checked pairs to avoid duplicate collision reports
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.3 Implement edge intersection detection
  - Write detectEdgeIntersections() method
  - Implement checkEdgeIntersectionsRecursive() to process all edges
  - Write checkEdgeAgainstSubtree() to test edge against nodes
  - Implement checkEdgeIntersection() with line-rectangle test
  - Write lineIntersectsRect() using Liang-Barsky or similar algorithm
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.4 Write unit tests for CollisionDetector
  - Test node overlap detection with overlapping and non-overlapping nodes
  - Test edge intersection detection
  - Verify spatial hash improves performance
  - Test with 1000 nodes to verify O(n) average case
  - _Requirements: 3.1, 4.1, 7.1, 7.2_

- [ ] 6. Implement CollisionResolver
- [x] 6.1 Create CollisionResolver class structure
  - Implement constructor accepting LayoutConfig
  - Write resolve() method with iterative collision resolution
  - Implement selectNodeToMove() to choose which node to adjust (prefer moving deeper nodes)
  - Write getDepth() helper to calculate node depth
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 6.2 Implement node overlap resolution
  - Write resolveNodeOverlap() method
  - Calculate separation vector and movement direction
  - Handle same-level vs different-level overlaps differently
  - Implement adjustSubtree() to recursively move all descendants
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 6.3 Implement edge intersection resolution
  - Write resolveEdgeIntersection() method
  - Calculate which side of edge to move node to
  - Move node horizontally to clear the edge
  - Adjust subtree accordingly
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.4 Write unit tests for CollisionResolver
  - Test simple overlap resolution
  - Test edge intersection resolution
  - Verify deeper nodes are moved before shallower nodes
  - Test convergence within max iterations
  - _Requirements: 3.1, 4.1_

- [x] 7. Implement CoordinateTransformer
- [x] 7.1 Create CoordinateTransformer class
  - Write transform() method to convert tree to positioned nodes
  - Implement transformSubtree() for recursive coordinate conversion
  - Handle multiple roots with different base positions
  - Preserve original node data while updating positions
  - Mark all nodes as positioned (positioned: true) after transformation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 9.1_

- [x] 7.2 Write unit tests for CoordinateTransformer
  - Test single tree transformation
  - Test multiple roots with different positions
  - Verify preserved root positions are respected
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implement LayoutOrchestrator
- [x] 8.1 Create LayoutOrchestrator class
  - Implement constructor to initialize all components with config
  - Write layout() method to coordinate the full pipeline (always recalculates entire tree)
  - Implement getRootPositions() to preserve existing root positions
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 8.2, 9.1, 9.2_

- [x] 8.2 Add batching support for performance
  - Implement layoutBatched() with debouncing
  - Use 50ms debounce timeout to batch rapid node additions
  - Return Promise for async layout calculation
  - _Requirements: 7.1, 7.2, 7.4, 9.1, 9.3_

- [x] 8.3 Write integration tests for LayoutOrchestrator
  - Test full pipeline with empty canvas, single node, simple tree
  - Test large tree (1 parent, 20 children, each with 20 children)
  - Test multiple roots
  - Test order independence with same tree structure, different creation orders
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 9. Integrate with ConversationCanvas
- [x] 9.1 Update getLayoutedElements function
  - Replace existing layout.ts implementation with LayoutOrchestrator
  - Create LayoutOrchestrator instance with proper configuration
  - Call layout() method to recalculate ALL node positions (not just new nodes)
  - Return all positioned nodes with updated coordinates
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 8.1, 8.2, 8.3, 9.1, 9.2_

- [x] 9.2 Update ConversationCanvas to handle automatic repositioning
  - Remove manuallyPositioned flag and related logic (nodes are no longer draggable by user)
  - Ensure positioned flag is properly set on all nodes after layout
  - Add smooth animation transitions when node positions change (300ms duration)
  - Update React Flow configuration to disable node dragging (nodesDraggable: false)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.4_

- [x] 9.3 Add error handling and logging
  - Add try-catch blocks around layout calculations
  - Log warnings for collision resolution failures
  - Log warnings for cycle detection
  - Handle performance degradation gracefully
  - _Requirements: 7.1, 7.2, 9.1, 9.2_

- [x] 10. Performance optimization and polish
- [x] 10.1 Add performance monitoring
  - Measure layout calculation time
  - Log warnings if layout takes longer than 500ms
  - Add performance metrics for debugging
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10.2 Optimize for large trees
  - Profile layout algorithm with 1000+ nodes
  - Identify and optimize bottlenecks
  - Consider Web Worker for heavy calculations if needed
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10.3 Add visual polish
  - Ensure smooth transitions when nodes are repositioned
  - Verify no visual glitches during layout updates
  - Test with various tree structures (wide, deep, unbalanced)
  - _Requirements: 1.1, 2.1, 6.1, 9.4_

- [x] 11. Testing and validation
- [x] 11.1 Manual testing with real usage scenarios
  - Create a tree with 1 parent and 25 children
  - Add children to multiple nodes at different depths
  - Test creating nodes in different orders
  - Verify no overlaps or edge intersections
  - Verify smooth animations when nodes reposition
  - Test that existing nodes move to accommodate new nodes
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1, 5.1, 8.1, 8.2, 8.3, 9.4_

- [x] 11.2 Performance validation
  - Measure layout time with 100 nodes (should be < 100ms)
  - Measure layout time with 1000 nodes (should be < 500ms)
  - Verify smooth user experience with rapid node creation
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 11.3 Edge case testing
  - Test very wide trees (1 parent, 50 children)
  - Test very deep trees (10+ levels)
  - Test unbalanced trees
  - Test rapid node creation (multiple nodes added quickly)
  - Verify animations don't conflict or cause visual glitches
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 8.1, 8.2, 8.3, 9.4_

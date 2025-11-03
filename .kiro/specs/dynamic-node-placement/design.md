# Design Document: Dynamic Node Placement System

## Overview

This design document describes a robust tree layout algorithm for positioning conversation nodes on an infinite canvas. The system uses a modified Reingold-Tilford algorithm combined with collision detection and resolution to create optimal, aesthetically pleasing layouts that support large-scale branching (20+ children per node) and deep hierarchies.

The design prioritizes:
- **Scalability**: Efficient handling of trees with 1000+ nodes
- **Aesthetics**: Balanced, compact layouts with clear visual hierarchy
- **Flexibility**: Support for manual positioning and dynamic updates
- **Robustness**: Order-independent results and graceful handling of edge cases

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                  ConversationCanvas                      │
│  (React component - manages nodes/edges state)          │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ calls when nodes change
                 ▼
┌─────────────────────────────────────────────────────────┐
│              LayoutOrchestrator                          │
│  (Coordinates layout process, handles batching)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ delegates to
                 ▼
┌─────────────────────────────────────────────────────────┐
│              TreeLayoutEngine                            │
│  (Core layout algorithm implementation)                 │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  1. TreeBuilder                              │      │
│  │     - Builds tree structure from nodes/edges │      │
│  │     - Identifies roots and relationships     │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  2. InitialPositioner                        │      │
│  │     - Applies modified Reingold-Tilford      │      │
│  │     - Calculates relative positions          │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  3. CollisionDetector                        │      │
│  │     - Spatial hashing for efficient checks   │      │
│  │     - Detects node overlaps                  │      │
│  │     - Detects edge-node intersections        │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  4. CollisionResolver                        │      │
│  │     - Adjusts positions to resolve conflicts │      │
│  │     - Maintains tree aesthetics              │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  5. CoordinateTransformer                    │      │
│  │     - Converts relative to absolute coords   │      │
│  │     - Applies final positioning              │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: Array of nodes and edges from React state
2. **Tree Construction**: Build hierarchical tree structure
3. **Initial Layout**: Apply Reingold-Tilford for base positioning
4. **Collision Detection**: Identify overlaps and intersections
5. **Collision Resolution**: Adjust positions iteratively
6. **Output**: Updated nodes with final positions

## Components and Interfaces

### 1. TreeBuilder

**Purpose**: Constructs a tree data structure from flat node/edge arrays.

```typescript
interface TreeNode {
  id: string;
  children: TreeNode[];
  parent: TreeNode | null;
  data: any; // Original node data
  x: number; // Relative x position
  y: number; // Relative y position
  mod: number; // Modifier for Reingold-Tilford
  thread: TreeNode | null; // For Reingold-Tilford
  ancestor: TreeNode; // For Reingold-Tilford
  change: number; // For Reingold-Tilford
  shift: number; // For Reingold-Tilford
  prelim: number; // Preliminary x coordinate
  width: number; // Node width (450)
  height: number; // Node height (468)
}

interface TreeStructure {
  roots: TreeNode[];
  nodeMap: Map<string, TreeNode>;
}

class TreeBuilder {
  build(nodes: Node[], edges: Edge[]): TreeStructure {
    // 1. Create TreeNode for each node
    // 2. Build parent-child relationships from edges
    // 3. Identify root nodes (nodes with no incoming edges)
    // 4. Return tree structure with roots and lookup map
  }
}
```

**Algorithm**:
1. Create a `TreeNode` for each input node
2. Build a map of node ID to TreeNode for O(1) lookup
3. Iterate through edges to establish parent-child relationships
4. Identify roots (nodes with no parent)
5. Return structure with roots array and node map

### 2. InitialPositioner

**Purpose**: Applies modified Reingold-Tilford algorithm for initial positioning.

```typescript
interface LayoutConfig {
  nodeWidth: number; // 450
  nodeHeight: number; // 468
  horizontalSpacing: number; // 50
  verticalSpacing: number; // 80
  siblingSpacing: number; // 50
}

class InitialPositioner {
  private config: LayoutConfig;
  
  constructor(config: LayoutConfig) {
    this.config = config;
  }
  
  position(tree: TreeStructure): void {
    // Apply Reingold-Tilford to each root
    tree.roots.forEach(root => {
      this.initializeTreeNode(root);
      this.firstWalk(root);
      this.secondWalk(root, 0, 0);
    });
  }
  
  private initializeTreeNode(node: TreeNode): void {
    // Initialize Reingold-Tilford fields
    node.ancestor = node;
    node.thread = null;
    node.mod = 0;
    node.change = 0;
    node.shift = 0;
    node.prelim = 0;
    
    // Recursively initialize children
    node.children.forEach(child => this.initializeTreeNode(child));
  }
  
  private firstWalk(node: TreeNode): void {
    // Post-order traversal to calculate preliminary positions
    // Special handling for nodes with many children (grid layout)
  }
  
  private shouldUseGridLayout(node: TreeNode): boolean {
    return node.children.length > this.config.gridThreshold;
  }
  
  private secondWalk(node: TreeNode, modSum: number, depth: number): void {
    // Pre-order traversal to calculate final relative positions
    // depth parameter tracks the level for vertical positioning
  }
  
  private apportion(node: TreeNode, defaultAncestor: TreeNode): TreeNode {
    // Balance subtrees to minimize width
  }
  
  private executeShifts(node: TreeNode): void {
    // Apply accumulated shifts to children
  }
}
```

**Modified Reingold-Tilford Algorithm**:

The classic Reingold-Tilford algorithm produces aesthetically pleasing tree layouts with the following properties:
- Parents are centered over their children
- Subtrees are as compact as possible
- Isomorphic subtrees have identical layouts
- Trees are drawn symmetrically

**Modifications for our use case**:
1. **Large branching factor**: When a node has 20+ children, arrange them in a grid pattern rather than a single row
2. **Fixed node sizes**: Account for actual node dimensions (450×468) rather than treating nodes as points
3. **Vertical spacing**: Ensure consistent vertical spacing between levels

**First Walk (Post-order)**:
```
function firstWalk(node):
  if node is leaf:
    if node has left sibling:
      node.prelim = left_sibling.prelim + spacing
    else:
      node.prelim = 0
  else:
    defaultAncestor = node.leftmost_child
    for each child of node:
      firstWalk(child)
      defaultAncestor = apportion(child, defaultAncestor)
    executeShifts(node)
    
    midpoint = (leftmost_child.prelim + rightmost_child.prelim) / 2
    
    if node has left sibling:
      node.prelim = left_sibling.prelim + spacing
      node.mod = node.prelim - midpoint
    else:
      node.prelim = midpoint
```

**Second Walk (Pre-order)**:
```
function secondWalk(node, modSum, depth):
  node.x = node.prelim + modSum
  node.y = depth * (nodeHeight + verticalSpacing)
  
  for each child of node:
    secondWalk(child, modSum + node.mod, depth + 1)
```

**Grid Layout for Large Branching**:
When a node has more than 10 children, arrange them in a grid:
```
function arrangeChildrenInGrid(node):
  if node.children.length <= gridThreshold:
    return // Use standard Reingold-Tilford for small branching
  
  childCount = node.children.length
  cols = ceil(sqrt(childCount))
  rows = ceil(childCount / cols)
  
  // Calculate grid dimensions
  gridWidth = cols * nodeWidth + (cols - 1) * horizontalSpacing
  gridHeight = rows * nodeHeight + (rows - 1) * verticalSpacing
  
  // Center the grid under the parent
  startX = -(gridWidth / 2)
  
  for i, child in enumerate(node.children):
    row = floor(i / cols)
    col = i % cols
    
    // Position child in grid
    child.prelim = startX + col * (nodeWidth + horizontalSpacing)
    child.y = node.y + nodeHeight + verticalSpacing + row * (nodeHeight + verticalSpacing)
```

Note: Grid layout is applied during firstWalk when a node has more than `gridThreshold` children. This overrides the standard Reingold-Tilford positioning for that subtree.

### 3. CollisionDetector

**Purpose**: Efficiently detects node overlaps and edge-node intersections.

```typescript
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Collision {
  type: 'node-overlap' | 'edge-intersection';
  node1: TreeNode;
  node2?: TreeNode;
  edge?: { source: TreeNode; target: TreeNode };
}

class CollisionDetector {
  private spatialHash: SpatialHash;
  
  constructor(cellSize: number = 500) {
    this.spatialHash = new SpatialHash(cellSize);
  }
  
  detectCollisions(tree: TreeStructure): Collision[] {
    // 1. Clear and rebuild spatial hash with all nodes
    this.spatialHash.clear();
    this.insertAllNodes(tree);
    
    // 2. Check for node overlaps using spatial hash
    const nodeCollisions = this.detectNodeOverlaps(tree);
    
    // 3. Check for edge-node intersections (edges are implicit in tree structure)
    const edgeCollisions = this.detectEdgeIntersections(tree);
    
    // 4. Return combined list of collisions
    return [...nodeCollisions, ...edgeCollisions];
  }
  
  private insertAllNodes(tree: TreeStructure): void {
    // Recursively insert all nodes into spatial hash
    tree.roots.forEach(root => this.insertNodeAndDescendants(root));
  }
  
  private insertNodeAndDescendants(node: TreeNode): void {
    this.spatialHash.insert(node);
    node.children.forEach(child => this.insertNodeAndDescendants(child));
  }
  
  private detectNodeOverlaps(tree: TreeStructure): Collision[] {
    // Use spatial hash to find overlapping nodes
    const collisions: Collision[] = [];
    const checked = new Set<string>();
    
    tree.roots.forEach(root => {
      this.checkNodeOverlapsRecursive(root, checked, collisions);
    });
    
    return collisions;
  }
  
  private checkNodeOverlapsRecursive(
    node: TreeNode, 
    checked: Set<string>, 
    collisions: Collision[]
  ): void {
    // Query spatial hash for nearby nodes
    const nearby = this.spatialHash.query({
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    });
    
    // Check each nearby node for overlap
    nearby.forEach(other => {
      if (node.id !== other.id) {
        const pairKey = [node.id, other.id].sort().join('-');
        if (!checked.has(pairKey) && this.checkNodeOverlap(node, other)) {
          checked.add(pairKey);
          collisions.push({
            type: 'node-overlap',
            node1: node,
            node2: other
          });
        }
      }
    });
    
    // Recursively check children
    node.children.forEach(child => {
      this.checkNodeOverlapsRecursive(child, checked, collisions);
    });
  }
  
  private detectEdgeIntersections(tree: TreeStructure): Collision[] {
    // Check each parent-child edge against all nodes
    const collisions: Collision[] = [];
    
    tree.roots.forEach(root => {
      this.checkEdgeIntersectionsRecursive(root, tree, collisions);
    });
    
    return collisions;
  }
  
  private checkEdgeIntersectionsRecursive(
    node: TreeNode,
    tree: TreeStructure,
    collisions: Collision[]
  ): void {
    // Check edges from this node to its children
    node.children.forEach(child => {
      const edge = { source: node, target: child };
      
      // Check this edge against all nodes
      tree.roots.forEach(root => {
        this.checkEdgeAgainstSubtree(edge, root, collisions);
      });
      
      // Recursively check child's edges
      this.checkEdgeIntersectionsRecursive(child, tree, collisions);
    });
  }
  
  private checkEdgeAgainstSubtree(
    edge: { source: TreeNode; target: TreeNode },
    node: TreeNode,
    collisions: Collision[]
  ): void {
    if (this.checkEdgeIntersection(edge, node)) {
      collisions.push({
        type: 'edge-intersection',
        node1: node,
        edge: edge
      });
    }
    
    // Check against children
    node.children.forEach(child => {
      this.checkEdgeAgainstSubtree(edge, child, collisions);
    });
  }
  
  private checkNodeOverlap(node1: TreeNode, node2: TreeNode): boolean {
    // AABB collision detection
  }
  
  private checkEdgeIntersection(
    edge: { source: TreeNode; target: TreeNode },
    node: TreeNode
  ): boolean {
    // Don't check intersection with source or target nodes
    if (node === edge.source || node === edge.target) {
      return false;
    }
    
    // Line-rectangle intersection test
    // Edge goes from center of source to center of target
    const x1 = edge.source.x + edge.source.width / 2;
    const y1 = edge.source.y + edge.source.height / 2;
    const x2 = edge.target.x + edge.target.width / 2;
    const y2 = edge.target.y + edge.target.height / 2;
    
    return this.lineIntersectsRect(x1, y1, x2, y2, node);
  }
  
  private lineIntersectsRect(
    x1: number, y1: number, 
    x2: number, y2: number, 
    node: TreeNode
  ): boolean {
    // Check if line segment intersects with rectangle
    // Uses Liang-Barsky algorithm or similar
  }
}

class SpatialHash {
  private cells: Map<string, TreeNode[]>;
  private cellSize: number;
  
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  clear(): void {
    this.cells.clear();
  }
  
  insert(node: TreeNode): void {
    // Insert node into all cells it overlaps
    const minCellX = Math.floor(node.x / this.cellSize);
    const maxCellX = Math.floor((node.x + node.width) / this.cellSize);
    const minCellY = Math.floor(node.y / this.cellSize);
    const maxCellY = Math.floor((node.y + node.height) / this.cellSize);
    
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.getCellKey(cx * this.cellSize, cy * this.cellSize);
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key)!.push(node);
      }
    }
  }
  
  query(bounds: BoundingBox): TreeNode[] {
    // Return all nodes that might overlap with bounds
    const minCellX = Math.floor(bounds.x / this.cellSize);
    const maxCellX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const minCellY = Math.floor(bounds.y / this.cellSize);
    const maxCellY = Math.floor((bounds.y + bounds.height) / this.cellSize);
    
    const nodes = new Set<TreeNode>();
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.getCellKey(cx * this.cellSize, cy * this.cellSize);
        const cellNodes = this.cells.get(key);
        if (cellNodes) {
          cellNodes.forEach(node => nodes.add(node));
        }
      }
    }
    
    return Array.from(nodes);
  }
  
  private getCellKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
```

**Spatial Hashing**:
- Divide the canvas into a grid of cells (500×500 pixels)
- Each node is inserted into all cells it overlaps
- When checking for collisions, only check nodes in nearby cells
- Reduces collision detection from O(n²) to O(n) average case

**AABB Collision Detection**:
```
function checkNodeOverlap(node1, node2):
  return !(
    node1.x + node1.width < node2.x ||
    node1.x > node2.x + node2.width ||
    node1.y + node1.height < node2.y ||
    node1.y > node2.y + node2.height
  )
```

**Line-Rectangle Intersection**:
```
function checkEdgeIntersection(edge, node):
  // Edge is a line from source center to target center
  // Node is a rectangle (x, y, width, height)
  
  // Don't check intersection with source or target nodes
  if node === edge.source or node === edge.target:
    return false
  
  // Calculate edge line endpoints (center of nodes)
  x1 = edge.source.x + edge.source.width / 2
  y1 = edge.source.y + edge.source.height / 2
  x2 = edge.target.x + edge.target.width / 2
  y2 = edge.target.y + edge.target.height / 2
  
  // Check if line intersects the node rectangle
  return lineIntersectsRect(x1, y1, x2, y2, node.x, node.y, node.width, node.height)
```

### 4. CollisionResolver

**Purpose**: Adjusts node positions to resolve collisions while maintaining aesthetics.

```typescript
interface ResolutionStrategy {
  resolve(collision: Collision, tree: TreeStructure): void;
}

class CollisionResolver {
  private maxIterations: number = 10;
  private config: LayoutConfig;
  
  constructor(config: LayoutConfig) {
    this.config = config;
  }
  
  resolve(tree: TreeStructure): void {
    const detector = new CollisionDetector(this.config.spatialHashCellSize);
    
    for (let i = 0; i < this.maxIterations; i++) {
      const collisions = detector.detectCollisions(tree);
      
      if (collisions.length === 0) {
        break; // No more collisions
      }
      
      // Resolve each collision
      collisions.forEach(collision => {
        if (collision.type === 'node-overlap') {
          this.resolveNodeOverlap(collision);
        } else {
          this.resolveEdgeIntersection(collision);
        }
      });
    }
  }
  
  private resolveNodeOverlap(collision: Collision): void {
    // Strategy: Move the node that is deeper in the tree
    
    const { node1, node2 } = collision;
    
    const nodeToMove = this.selectNodeToMove(node1, node2);
    const fixedNode = nodeToMove === node1 ? node2 : node1;
    
    // Store original position for delta calculation
    const originalX = nodeToMove.x;
    
    // Calculate separation vector
    const dx = nodeToMove.x - fixedNode.x;
    const dy = nodeToMove.y - fixedNode.y;
    
    // Move horizontally if nodes are on same level, otherwise move vertically
    if (Math.abs(dy) < this.config.verticalSpacing / 2) {
      // Same level - move horizontally
      const direction = dx >= 0 ? 1 : -1;
      nodeToMove.x = fixedNode.x + direction * (fixedNode.width + this.config.horizontalSpacing);
    } else {
      // Different levels - adjust horizontal position
      const direction = dx >= 0 ? 1 : -1;
      nodeToMove.x += direction * (this.config.horizontalSpacing / 2);
    }
    
    // Recursively adjust children to maintain tree structure
    const deltaX = nodeToMove.x - originalX;
    this.adjustSubtree(nodeToMove, deltaX, 0);
  }
  
  private resolveEdgeIntersection(collision: Collision): void {
    // Strategy: Move the intersecting node horizontally
    
    const { node1, edge } = collision;
    
    // Calculate which side of the edge the node should move to
    const edgeMidX = (edge.source.x + edge.target.x) / 2;
    const direction = node1.x < edgeMidX ? -1 : 1;
    
    // Move node to clear the edge
    node1.x += direction * (this.config.horizontalSpacing);
    
    // Adjust subtree
    this.adjustSubtree(node1, direction * this.config.horizontalSpacing, 0);
  }
  
  private selectNodeToMove(node1: TreeNode, node2: TreeNode): TreeNode {
    // Move the node that is deeper in the tree
    const depth1 = this.getDepth(node1);
    const depth2 = this.getDepth(node2);
    
    return depth1 > depth2 ? node1 : node2;
  }
  
  private adjustSubtree(node: TreeNode, dx: number, dy: number): void {
    // Recursively adjust all descendants
    node.children.forEach(child => {
      child.x += dx;
      child.y += dy;
      this.adjustSubtree(child, dx, dy);
    });
  }
  
  private getDepth(node: TreeNode): number {
    let depth = 0;
    let current = node;
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    return depth;
  }
}
```

**Resolution Strategies**:

1. **Node Overlap Resolution**:
   - Identify which node to move (prefer moving deeper nodes, never move manually positioned nodes)
   - Calculate separation vector
   - Move node horizontally if on same level, otherwise adjust horizontal position
   - Recursively adjust entire subtree to maintain structure

2. **Edge Intersection Resolution**:
   - Move the intersecting node perpendicular to the edge
   - Adjust subtree accordingly
   - Prefer moving nodes away from the tree center

3. **Iterative Resolution**:
   - Resolve collisions iteratively (max 10 iterations)
   - Each iteration resolves all detected collisions
   - Stop when no collisions remain or max iterations reached

### 5. CoordinateTransformer

**Purpose**: Converts relative coordinates to absolute canvas coordinates.

```typescript
class CoordinateTransformer {
  transform(tree: TreeStructure, rootPositions: Map<string, { x: number; y: number }>): Node[] {
    const result: Node[] = [];
    
    tree.roots.forEach(root => {
      const rootPos = rootPositions.get(root.id) || { x: 0, y: 100 };
      this.transformSubtree(root, rootPos.x, rootPos.y, result);
    });
    
    return result;
  }
  
  private transformSubtree(
    node: TreeNode,
    offsetX: number,
    offsetY: number,
    result: Node[]
  ): void {
    // Convert relative position to absolute
    const absoluteX = node.x + offsetX;
    const absoluteY = node.y + offsetY;
    
    result.push({
      ...node.data,
      position: { x: absoluteX, y: absoluteY },
      data: {
        ...node.data.data,
        positioned: true,
      },
    });
    
    // Recursively transform children
    node.children.forEach(child => {
      this.transformSubtree(child, offsetX, offsetY, result);
    });
  }
}
```

### 6. LayoutOrchestrator

**Purpose**: Coordinates the entire layout process and handles batching.

```typescript
class LayoutOrchestrator {
  private builder: TreeBuilder;
  private positioner: InitialPositioner;
  private detector: CollisionDetector;
  private resolver: CollisionResolver;
  private transformer: CoordinateTransformer;
  private pendingLayout: NodeJS.Timeout | null = null;
  
  constructor(config: LayoutConfig) {
    this.builder = new TreeBuilder();
    this.positioner = new InitialPositioner(config);
    this.detector = new CollisionDetector(config.spatialHashCellSize);
    this.resolver = new CollisionResolver(config);
    this.transformer = new CoordinateTransformer();
  }
  
  layout(nodes: Node[], edges: Edge[]): Node[] {
    // 1. Build tree structure
    const tree = this.builder.build(nodes, edges);
    
    // 2. Apply initial positioning
    this.positioner.position(tree);
    
    // 3. Detect and resolve collisions
    this.resolver.resolve(tree);
    
    // 4. Transform to absolute coordinates
    const positioned = this.transformer.transform(tree, this.getRootPositions(nodes, edges));
    
    return positioned;
  }
  
  layoutBatched(nodes: Node[], edges: Edge[]): Promise<Node[]> {
    // Debounce layout calculations when multiple nodes are added quickly
    return new Promise((resolve) => {
      if (this.pendingLayout) {
        clearTimeout(this.pendingLayout);
      }
      
      this.pendingLayout = setTimeout(() => {
        const result = this.layout(nodes, edges);
        this.pendingLayout = null;
        resolve(result);
      }, 50); // 50ms debounce
    });
  }
  
  private getRootPositions(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
    // Preserve positions of existing root nodes
    const positions = new Map();
    
    // Find nodes that have no incoming edges (roots)
    const nodeIds = new Set(nodes.map(n => n.id));
    const targetIds = new Set(edges.map(e => e.target));
    
    nodes.forEach(node => {
      const isRoot = !targetIds.has(node.id);
      if (node.data?.positioned && isRoot) {
        positions.set(node.id, node.position);
      }
    });
    
    return positions;
  }
}
```

## Data Models

### Node Data Structure

```typescript
interface ConversationNodeData {
  question: string;
  response: string;
  timestamp: string;
  positioned: boolean; // Has this node been positioned by the algorithm?
  onAddFollowUp: (nodeId: string, question: string) => void;
  onDelete: (nodeId: string) => void;
  onMaximize: (nodeId: string) => void;
}
```

### Layout Configuration

```typescript
interface LayoutConfig {
  nodeWidth: number; // 450
  nodeHeight: number; // 468
  horizontalSpacing: number; // 50 - minimum space between sibling nodes
  verticalSpacing: number; // 80 - space between parent and child levels
  siblingSpacing: number; // 50 - space between siblings
  gridThreshold: number; // 10 - number of children before switching to grid layout
  gridColumns: number; // sqrt(childCount) - columns in grid layout
  maxIterations: number; // 10 - max collision resolution iterations
  spatialHashCellSize: number; // 500 - size of spatial hash cells
}
```

## Error Handling

### Collision Resolution Failure

If collision resolution doesn't converge after max iterations:
- Log warning with details of remaining collisions
- Return best-effort layout
- Don't block user interaction

### Invalid Tree Structure

If edges create cycles or invalid relationships:
- Detect cycles during tree building
- Break cycles by removing the edge that creates the cycle
- Log warning for debugging

### Performance Degradation

If layout calculation takes too long (>500ms):
- Use Web Worker for layout calculation to avoid blocking UI
- Show loading indicator
- Allow user to cancel and use previous layout

### Unresolvable Collisions

If collisions cannot be resolved after max iterations:
- Return best-effort layout
- Log warning with collision details
- Continue with user interaction (don't block)

## Testing Strategy

### Unit Tests

1. **TreeBuilder**:
   - Test with single node
   - Test with simple parent-child relationship
   - Test with multiple roots
   - Test with deep hierarchy
   - Test with cycles (should break cycles)

2. **InitialPositioner**:
   - Test with single node (should position at origin)
   - Test with parent and 2 children (children should be side-by-side)
   - Test with parent and 20 children (should use grid layout)
   - Test with deep tree (should maintain vertical spacing)
   - Test symmetry (isomorphic subtrees should have identical layouts)

3. **CollisionDetector**:
   - Test node overlap detection (overlapping and non-overlapping cases)
   - Test edge intersection detection (intersecting and non-intersecting cases)
   - Test spatial hash (verify correct cell assignment)
   - Test performance with 1000 nodes

4. **CollisionResolver**:
   - Test simple overlap resolution
   - Test edge intersection resolution
   - Test convergence (should resolve all collisions within max iterations)
   - Test that deeper nodes are moved before shallower nodes

5. **CoordinateTransformer**:
   - Test single tree transformation
   - Test multiple roots
   - Test with preserved root positions

### Integration Tests

1. **Full Layout Pipeline**:
   - Test with empty canvas (no nodes)
   - Test with single node
   - Test with simple tree (1 parent, 3 children)
   - Test with large tree (1 parent, 20 children, each with 20 children)
   - Test with multiple roots
   - Test order independence (same tree, different creation orders)

2. **Dynamic Updates**:
   - Test adding node to existing tree
   - Test deleting node from tree
   - Test adding multiple nodes in quick succession (batching)

3. **Node Repositioning**:
   - Test that existing nodes are repositioned when new nodes are added
   - Test that all nodes in affected subtrees are recalculated
   - Test smooth animation of position changes

### Performance Tests

1. **Scalability**:
   - Measure layout time for 100 nodes
   - Measure layout time for 1000 nodes
   - Verify O(n log n) or better complexity

2. **Collision Detection**:
   - Measure collision detection time with spatial hash
   - Compare with naive O(n²) approach
   - Verify spatial hash provides significant speedup

### Visual Tests

1. **Aesthetics**:
   - Verify parents are centered over children
   - Verify consistent spacing
   - Verify no overlaps or intersections
   - Verify balanced layouts

2. **Edge Cases**:
   - Very wide trees (1 parent, 50 children)
   - Very deep trees (10 levels)
   - Unbalanced trees (one branch much deeper than others)
   - Rapid node creation (multiple nodes added quickly)

## Performance Considerations

### Time Complexity

- **Tree Building**: O(n) where n is number of nodes
- **Initial Positioning**: O(n) for Reingold-Tilford
- **Collision Detection**: O(n) average case with spatial hashing, O(n²) worst case
- **Collision Resolution**: O(k * n) where k is number of iterations (typically k < 10)
- **Overall**: O(n) to O(n log n) for typical cases

### Space Complexity

- **Tree Structure**: O(n) for nodes
- **Spatial Hash**: O(n) for node references
- **Overall**: O(n)

### Optimization Techniques

1. **Spatial Hashing**: Reduces collision detection from O(n²) to O(n)
2. **Batching**: Debounce layout calculations when multiple nodes added quickly
3. **Incremental Updates**: Only recalculate affected subtrees when possible
4. **Web Workers**: Offload heavy calculations to background thread
5. **Memoization**: Cache subtree bounds and other computed values

### Memory Management

- Clear spatial hash after each layout calculation
- Avoid creating unnecessary intermediate objects
- Use object pooling for frequently created objects (TreeNode, BoundingBox)

## Animation Strategy

When nodes are repositioned, the system provides smooth visual feedback:

1. **Position Changes**: When the layout algorithm calculates new positions, React Flow's built-in animation system handles the transitions
2. **Animation Duration**: 300ms with easing function for natural movement
3. **Coordinated Movement**: Multiple nodes animate simultaneously when repositioned
4. **No User Dragging**: Nodes are not draggable by users - all positioning is automatic

**Implementation in React Flow**:
```typescript
// In ConversationCanvas component
<ReactFlow
  nodes={nodes}
  nodesDraggable={false}  // Disable user dragging
  // ... other props
>
```

React Flow automatically animates node position changes when the `position` property updates, providing smooth transitions without additional code.

## Migration Plan

### Phase 1: Implement Core Algorithm
- Implement TreeBuilder, InitialPositioner, CoordinateTransformer
- Replace existing layout.ts with new implementation
- Test with simple trees

### Phase 2: Add Collision Detection
- Implement CollisionDetector with spatial hashing
- Implement basic CollisionResolver
- Test with complex trees

### Phase 3: Optimize and Polish
- Add batching to LayoutOrchestrator
- Optimize performance for large trees
- Add comprehensive error handling

### Phase 4: Integration
- Integrate with ConversationCanvas component
- Disable node dragging (nodesDraggable: false)
- Remove manual positioning logic
- Test with real user workflows and verify smooth animations

## Future Enhancements

1. **Alternative Layout Algorithms**:
   - Radial layout for highly branched nodes
   - Force-directed layout for more organic appearance
   - User-selectable layout styles

2. **Smart Zoom**:
   - Automatically zoom to fit new nodes
   - Maintain focus on active conversation branch

3. **Layout Hints**:
   - Allow users to specify preferred child arrangement
   - Support for "important" branches that get more space

4. **Persistent Layout**:
   - Save layout preferences per canvas
   - Remember manual adjustments across sessions

5. **Collaborative Editing**:
   - Handle concurrent node creation by multiple users
   - Merge layout changes from different users

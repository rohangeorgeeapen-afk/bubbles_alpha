# Edge Case Testing Guide

## Overview

This document provides comprehensive testing procedures for edge cases in the Dynamic Node Placement System. Edge cases are scenarios that test the boundaries and limits of the system's capabilities.

## Test Categories

1. **Extreme Tree Structures**
2. **Rapid Operations**
3. **Animation Conflicts**
4. **Boundary Conditions**
5. **Error Scenarios**

---

## 1. Extreme Tree Structures

### Test 1.1: Very Wide Tree (50+ Children)

**Objective**: Verify the system handles extreme branching (Requirement 1.1, 1.2)

**Setup**:
1. Create a root node
2. Add 50 children to the root node
3. Observe layout and performance

**Expected Behavior**:
- ✅ All 50 children are positioned correctly
- ✅ Grid layout is used (threshold is 10 children)
- ✅ No overlaps between nodes
- ✅ Layout completes in reasonable time (< 100ms)
- ✅ Grid is centered under parent
- ✅ Spacing is consistent

**Validation**:
```javascript
// Check node count
expect(nodes.length).toBe(51); // 1 parent + 50 children

// Check for grid layout (children should be in multiple rows)
const children = nodes.filter(n => edges.some(e => e.source === rootId && e.target === n.id));
const yPositions = new Set(children.map(c => c.position.y));
expect(yPositions.size).toBeGreaterThan(1); // Multiple rows

// Check for no overlaps
const overlapResult = validateNoOverlaps(nodes);
expect(overlapResult.passed).toBe(true);
```

**Performance Metrics**:
- Layout time: _______ ms (should be < 100ms)
- Collision resolution iterations: _______
- Remaining collisions: _______ (should be 0 or minimal)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 1.2: Very Deep Tree (10+ Levels)

**Objective**: Verify the system handles deep hierarchies (Requirement 2.1, 2.2)

**Setup**:
1. Create a root node
2. Create a chain of 10+ nodes (each node has 1 child)
3. Add 2-3 siblings at various depths
4. Observe layout and spacing

**Expected Behavior**:
- ✅ All 10+ levels are properly spaced vertically
- ✅ Vertical spacing is consistent (80px between levels)
- ✅ No overlaps at any depth
- ✅ Tree remains readable at all depths
- ✅ Siblings at each level are properly positioned

**Validation**:
```javascript
// Check depth
const maxDepth = calculateTreeMetrics(nodes, edges).maxDepth;
expect(maxDepth).toBeGreaterThanOrEqual(10);

// Check vertical spacing consistency
const nodesByDepth = groupNodesByDepth(nodes, edges);
for (let depth = 0; depth < maxDepth - 1; depth++) {
  const currentLevel = nodesByDepth[depth];
  const nextLevel = nodesByDepth[depth + 1];
  
  if (currentLevel.length > 0 && nextLevel.length > 0) {
    const spacing = nextLevel[0].position.y - currentLevel[0].position.y;
    expect(spacing).toBeCloseTo(468 + 80, 10); // nodeHeight + verticalSpacing
  }
}
```

**Performance Metrics**:
- Node count: _______
- Layout time: _______ ms (should be < 200ms for ~20 nodes)
- Max depth achieved: _______

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 1.3: Unbalanced Tree

**Objective**: Verify the system handles asymmetric structures (Requirement 6.1, 6.2)

**Setup**:
1. Create a root node
2. Add 10 children to the root
3. Add 20 children to only the leftmost child
4. Add 1 child to only the rightmost child
5. Observe layout balance

**Expected Behavior**:
- ✅ Layout handles asymmetry gracefully
- ✅ No overlaps despite unbalanced structure
- ✅ Parent nodes are centered over their children
- ✅ Layout is visually balanced
- ✅ Heavy branch doesn't cause issues for light branch

**Validation**:
```javascript
// Check that parent is centered over children
function checkParentCentering(parentId, nodes, edges) {
  const parent = nodes.find(n => n.id === parentId);
  const children = nodes.filter(n => edges.some(e => e.source === parentId && e.target === n.id));
  
  if (children.length === 0) return true;
  
  const childrenXPositions = children.map(c => c.position.x + 225); // Center of node
  const minX = Math.min(...childrenXPositions);
  const maxX = Math.max(...childrenXPositions);
  const childrenCenter = (minX + maxX) / 2;
  const parentCenter = parent.position.x + 225;
  
  const tolerance = 50; // Allow 50px tolerance
  return Math.abs(parentCenter - childrenCenter) < tolerance;
}

expect(checkParentCentering(rootId, nodes, edges)).toBe(true);
```

**Performance Metrics**:
- Node count: _______
- Layout time: _______ ms
- Visual balance score: _______ (subjective, 1-10)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 1.4: Multiple Root Nodes

**Objective**: Verify the system handles multiple independent trees

**Setup**:
1. Create 3 separate root nodes (no connections between them)
2. Add 5-10 children to each root
3. Observe layout and spacing

**Expected Behavior**:
- ✅ Each tree is laid out independently
- ✅ Trees don't overlap with each other
- ✅ Each tree maintains proper internal structure
- ✅ Root positions are preserved if already positioned

**Validation**:
```javascript
// Check for multiple roots
const roots = nodes.filter(n => !edges.some(e => e.target === n.id));
expect(roots.length).toBe(3);

// Check that trees don't overlap
const tree1Nodes = getSubtreeNodes(roots[0].id, nodes, edges);
const tree2Nodes = getSubtreeNodes(roots[1].id, nodes, edges);
const tree3Nodes = getSubtreeNodes(roots[2].id, nodes, edges);

// Check no overlaps between trees
expect(checkTreesNoOverlap(tree1Nodes, tree2Nodes)).toBe(true);
expect(checkTreesNoOverlap(tree2Nodes, tree3Nodes)).toBe(true);
expect(checkTreesNoOverlap(tree1Nodes, tree3Nodes)).toBe(true);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

## 2. Rapid Operations

### Test 2.1: Rapid Node Creation (15+ nodes quickly)

**Objective**: Verify batching and animation coordination (Requirement 8.2, 9.4)

**Setup**:
1. Create a root node
2. Rapidly add 15 children by clicking "Add Follow-up" as fast as possible
3. Observe animations and layout updates

**Expected Behavior**:
- ✅ Animations don't conflict or overlap
- ✅ Layout updates are batched (50ms debounce)
- ✅ Final layout is correct
- ✅ No visual glitches
- ✅ Smooth user experience
- ✅ Console shows batched calculations

**Validation**:
```javascript
// Monitor console for batching logs
// Should see fewer layout calculations than node additions

// Check final layout
expect(nodes.length).toBe(16); // 1 root + 15 children
expect(validateLayout(nodes, edges).passed).toBe(true);
```

**Performance Metrics**:
- Time to add all nodes: _______ seconds
- Number of layout calculations: _______ (should be < 15 due to batching)
- Final layout time: _______ ms

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 2.2: Rapid Node Deletion

**Objective**: Verify deletion handling and layout updates

**Setup**:
1. Create a tree with 20 nodes
2. Rapidly delete 5 nodes in quick succession
3. Observe layout updates

**Expected Behavior**:
- ✅ Deleted nodes and descendants are removed
- ✅ Layout recalculates for remaining nodes
- ✅ No orphaned nodes
- ✅ Smooth animations
- ✅ Undo functionality works

**Validation**:
```javascript
// Check that descendants are also deleted
const initialCount = nodes.length;
deleteNode(nodeId); // Node with 3 descendants
expect(nodes.length).toBe(initialCount - 4); // Node + 3 descendants

// Check undo
undoDelete();
expect(nodes.length).toBe(initialCount);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 2.3: Rapid Viewport Changes During Layout

**Objective**: Verify user interactions don't break animations

**Setup**:
1. Create a tree with 20 nodes
2. Add 5 new nodes in quick succession
3. While animations are running:
   - Zoom in/out
   - Pan the canvas
   - Try to add another node

**Expected Behavior**:
- ✅ Animations complete smoothly despite user interaction
- ✅ No visual artifacts or glitches
- ✅ User interactions work correctly
- ✅ Layout remains correct after all animations complete
- ✅ Auto-panning is cancelled when user interacts

**Validation**:
```javascript
// Visual inspection required
// Check console for any errors
// Verify final layout is correct
expect(validateLayout(nodes, edges).passed).toBe(true);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

## 3. Animation Conflicts

### Test 3.1: Simultaneous Multi-Node Repositioning

**Objective**: Verify coordinated animations (Requirement 9.4)

**Setup**:
1. Create a tree with 1 parent and 10 children
2. Add a new child (this will cause all existing children to reposition)
3. Observe animations

**Expected Behavior**:
- ✅ All affected nodes animate simultaneously
- ✅ Animation duration is 300ms for all nodes
- ✅ Animations are coordinated (no staggering)
- ✅ No visual glitches or jumps
- ✅ Final positions are correct

**Validation**:
```javascript
// Monitor animation timing
// All nodes should start and end animation at the same time

// Check final positions
expect(validateLayout(nodes, edges).passed).toBe(true);
expect(validateSpacing(nodes).passed).toBe(true);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 3.2: Animation During Fullscreen Transition

**Objective**: Verify animations don't conflict with fullscreen mode

**Setup**:
1. Create a tree with 10 nodes
2. Add a new node to trigger repositioning
3. Immediately enter fullscreen mode on a node
4. Observe behavior

**Expected Behavior**:
- ✅ Fullscreen transition works smoothly
- ✅ Background layout updates complete
- ✅ No visual glitches
- ✅ Exiting fullscreen shows correct layout

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

## 4. Boundary Conditions

### Test 4.1: Empty Canvas

**Objective**: Verify system handles empty state

**Setup**:
1. Start with no nodes
2. Observe UI and behavior

**Expected Behavior**:
- ✅ No errors in console
- ✅ Layout calculation handles empty array
- ✅ UI shows appropriate empty state
- ✅ Adding first node works correctly

**Validation**:
```javascript
const result = layout([], []);
expect(result).toEqual([]);
expect(result.length).toBe(0);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### Test 4.2: Single Node

**Objective**: Verify system handles single node

**Setup**:
1. Create a single root node
2. Observe positioning

**Expected Behavior**:
- ✅ Node is positioned at default location
- ✅ No errors in console
- ✅ Layout calculation is fast (< 10ms)
- ✅ Adding children works correctly

**Validation**:
```javascript
const result = layout([rootNode], []);
expect(result.length).toBe(1);
expect(result[0].data.positioned).toBe(true);
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### Test 4.3: Maximum Branching (100+ Children)

**Objective**: Test extreme branching beyond typical use

**Setup**:
1. Create a root node
2. Add 100 children to the root
3. Observe layout and performance

**Expected Behavior**:
- ⚠️ System may struggle but should not crash
- ⚠️ Layout may take longer than typical
- ✅ No browser freeze
- ✅ Best-effort layout is produced
- ✅ Warning logged if collisions remain

**Performance Metrics**:
- Layout time: _______ ms
- Remaining collisions: _______
- Browser responsiveness: _______ (1-10 scale)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
```
[Add observations here]
```

---

### Test 4.4: Maximum Depth (20+ Levels)

**Objective**: Test extreme depth beyond typical use

**Setup**:
1. Create a chain of 20+ nodes
2. Observe layout and performance

**Expected Behavior**:
- ✅ All levels are positioned correctly
- ✅ Vertical spacing is consistent
- ✅ Performance is acceptable
- ✅ No stack overflow or recursion errors

**Performance Metrics**:
- Node count: _______
- Layout time: _______ ms
- Max depth achieved: _______

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

## 5. Error Scenarios

### Test 5.1: Circular References (Cycles)

**Objective**: Verify cycle detection and handling

**Setup**:
1. Manually create edges that form a cycle (if possible)
2. Observe system behavior

**Expected Behavior**:
- ✅ Cycle is detected during tree building
- ✅ Cycle is broken (edge removed)
- ✅ Warning is logged
- ✅ Layout continues with acyclic graph

**Note**: The UI may prevent cycle creation, so this may need to be tested programmatically.

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### Test 5.2: Invalid Node Data

**Objective**: Verify system handles malformed data gracefully

**Setup**:
1. Attempt to create nodes with missing or invalid data
2. Observe error handling

**Expected Behavior**:
- ✅ Errors are caught and logged
- ✅ System doesn't crash
- ✅ User sees appropriate error message
- ✅ Other nodes continue to work

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### Test 5.3: Network Errors During Node Creation

**Objective**: Verify error handling for API failures

**Setup**:
1. Disconnect network
2. Try to create a new node
3. Observe error handling

**Expected Behavior**:
- ✅ Error message is displayed
- ✅ Node is not created
- ✅ Existing nodes remain intact
- ✅ User can retry after reconnecting

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

## Automated Edge Case Tests

The following edge cases are covered by automated tests in `lib/layout/__tests__/performance.test.ts`:

- ✅ Empty tree
- ✅ Single node
- ✅ Very wide tree (50 children)
- ✅ Very deep tree (10+ levels)
- ✅ Unbalanced tree
- ✅ Collision detection with large trees

Run automated tests:
```bash
npm test -- lib/layout/__tests__/performance.test.ts
```

---

## Summary Checklist

After completing all edge case tests:

### Extreme Structures
- [ ] Very wide tree (50+ children)
- [ ] Very deep tree (10+ levels)
- [ ] Unbalanced tree
- [ ] Multiple root nodes

### Rapid Operations
- [ ] Rapid node creation
- [ ] Rapid node deletion
- [ ] Rapid viewport changes during layout

### Animation Conflicts
- [ ] Simultaneous multi-node repositioning
- [ ] Animation during fullscreen transition

### Boundary Conditions
- [ ] Empty canvas
- [ ] Single node
- [ ] Maximum branching (100+ children)
- [ ] Maximum depth (20+ levels)

### Error Scenarios
- [ ] Circular references
- [ ] Invalid node data
- [ ] Network errors

---

## Test Results Summary

| Category | Tests Passed | Tests Failed | Notes |
|----------|--------------|--------------|-------|
| Extreme Structures | __ / 4 | __ / 4 | |
| Rapid Operations | __ / 3 | __ / 3 | |
| Animation Conflicts | __ / 2 | __ / 2 | |
| Boundary Conditions | __ / 4 | __ / 4 | |
| Error Scenarios | __ / 3 | __ / 3 | |
| **Total** | **__ / 16** | **__ / 16** | |

---

## Issues Found

| Issue # | Description | Severity | Test Case | Status |
|---------|-------------|----------|-----------|--------|
| | | | | |

---

**Testing Date**: _______________
**Tester**: _______________
**Browser**: _______________
**Version**: _______________

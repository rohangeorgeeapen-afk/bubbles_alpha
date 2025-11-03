# Manual Testing Guide - Dynamic Node Placement System

This guide provides step-by-step instructions for manually testing the dynamic node placement system to verify all requirements are met.

## Prerequisites

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Open browser DevTools Console to monitor performance logs

## Test Suite 11.1: Real Usage Scenarios

### Test 1.1: Create a tree with 1 parent and 25 children

**Objective**: Verify the system can handle large branching (Requirement 1.1, 1.2, 1.3)

**Steps**:
1. Start a new conversation with any question (e.g., "Hello")
2. Wait for the AI response
3. Click "Add Follow-up" on the root node 25 times, asking different questions each time
   - Suggested questions: "Question 1", "Question 2", ... "Question 25"
4. Wait for all nodes to be created and positioned

**Expected Results**:
- ✅ All 25 child nodes are visible and properly positioned
- ✅ No nodes overlap with each other
- ✅ Children are arranged in a grid layout (since count > 10)
- ✅ Grid is centered under the parent node
- ✅ Minimum spacing of 50px horizontally and 80px vertically is maintained
- ✅ Layout completes within reasonable time (< 500ms for 26 nodes)

**Verification Checklist**:
- [ ] All 25 children are visible
- [ ] No overlapping nodes
- [ ] Grid layout is used (not a single row)
- [ ] Parent is centered over children
- [ ] Spacing looks consistent
- [ ] No console errors

---

### Test 1.2: Add children to multiple nodes at different depths

**Objective**: Verify deep hierarchy support (Requirement 2.1, 2.2)

**Steps**:
1. Start with the tree from Test 1.1 (1 parent + 25 children)
2. Select 5 different child nodes at random
3. Add 3-5 follow-up questions to each selected node
4. Observe the layout as nodes are added

**Expected Results**:
- ✅ New nodes are positioned correctly at depth 2
- ✅ No overlaps occur at any depth level
- ✅ Vertical spacing is consistent between levels
- ✅ Existing nodes reposition smoothly to accommodate new nodes
- ✅ Animations are smooth (300ms duration)

**Verification Checklist**:
- [ ] Nodes at depth 2 are properly positioned
- [ ] No overlaps at any level
- [ ] Consistent vertical spacing
- [ ] Smooth repositioning animations
- [ ] No visual glitches

---

### Test 1.3: Test creating nodes in different orders

**Objective**: Verify order-independent placement (Requirement 5.1, 5.2, 5.3)

**Steps**:
1. **Scenario A**: Create parent → Create all children in sequence
   - Start new conversation
   - Add 10 children to root, one by one
   
2. **Scenario B**: Create parent → Create child → Add children to that child → Add more children to parent
   - Start new conversation
   - Add 1 child to root
   - Add 5 children to that child
   - Add 9 more children to root (total 10)
   
3. Compare the final layouts of both scenarios

**Expected Results**:
- ✅ Both scenarios produce similar final layouts
- ✅ Nodes with same structure are positioned similarly
- ✅ Layout is optimal regardless of creation order
- ✅ No orphaned or misplaced nodes

**Verification Checklist**:
- [ ] Scenario A layout looks optimal
- [ ] Scenario B layout looks optimal
- [ ] Both layouts are similar in structure
- [ ] No positioning artifacts

---

### Test 1.4: Verify no overlaps or edge intersections

**Objective**: Verify collision prevention (Requirement 3.1, 3.2, 3.3, 4.1, 4.2)

**Steps**:
1. Create a complex tree with multiple branches:
   - Root node
   - 5 children on root
   - 3-5 children on each of those 5 nodes
   - 2-3 children on some of the grandchildren
2. Zoom in to 200% and inspect node boundaries
3. Check that edges don't pass through nodes

**Expected Results**:
- ✅ No nodes overlap (minimum 50px horizontal, 80px vertical spacing)
- ✅ No edges pass through nodes (except source/target)
- ✅ All nodes are clearly readable
- ✅ Visual hierarchy is clear

**Verification Checklist**:
- [ ] No overlapping nodes at any zoom level
- [ ] No edge-node intersections
- [ ] Spacing is visually consistent
- [ ] Tree structure is clear

---

### Test 1.5: Verify smooth animations when nodes reposition

**Objective**: Verify animation quality (Requirement 8.2, 9.4)

**Steps**:
1. Create a tree with 1 parent and 5 children
2. Add a new child to the parent
3. Observe how existing children reposition
4. Repeat several times, adding children one by one

**Expected Results**:
- ✅ Existing nodes animate smoothly to new positions
- ✅ Animation duration is 300ms
- ✅ Multiple nodes animate simultaneously without conflicts
- ✅ No visual glitches or jumps
- ✅ Animations feel natural and coordinated

**Verification Checklist**:
- [ ] Smooth animation transitions
- [ ] No jerky movements
- [ ] Coordinated multi-node animations
- [ ] No visual artifacts

---

### Test 1.6: Test that existing nodes move to accommodate new nodes

**Objective**: Verify automatic repositioning (Requirement 8.1, 8.3)

**Steps**:
1. Create a tree with 1 parent and 10 children
2. Note the positions of the children
3. Add 5 more children to the parent
4. Observe how the original 10 children reposition

**Expected Results**:
- ✅ Original children move to make room for new children
- ✅ Layout remains optimal and balanced
- ✅ All nodes maintain proper spacing
- ✅ Tree width/height adjusts as needed
- ✅ Repositioning is smooth and coordinated

**Verification Checklist**:
- [ ] Original nodes reposition automatically
- [ ] Layout remains balanced
- [ ] No overlaps after repositioning
- [ ] Smooth coordinated movement

---

## Test Suite 11.2: Performance Validation

### Test 2.1: Measure layout time with 100 nodes

**Objective**: Verify performance with medium-sized trees (Requirement 7.1)

**Steps**:
1. Open browser DevTools Console
2. Create a tree structure with ~100 nodes:
   - 1 root
   - 10 children on root
   - 9 children on each of those (90 more nodes)
3. Monitor console for performance logs
4. Note the layout calculation time

**Expected Results**:
- ✅ Layout calculation completes in < 100ms
- ✅ No noticeable lag or delay
- ✅ UI remains responsive during calculation

**Performance Metrics**:
- Layout time: _______ ms (should be < 100ms)
- Node count: _______ (should be ~100)

**Verification Checklist**:
- [ ] Layout time < 100ms
- [ ] No UI lag
- [ ] Console shows performance metrics

---

### Test 2.2: Measure layout time with 1000 nodes

**Objective**: Verify performance with large trees (Requirement 7.2)

**Steps**:
1. Open browser DevTools Console
2. Create a tree structure with ~1000 nodes:
   - 1 root
   - 20 children on root
   - 20 children on each of those (400 nodes)
   - 10 children on each of those (4000 nodes - may need to reduce)
   - Adjust to get close to 1000 nodes
3. Monitor console for performance logs
4. Note the layout calculation time

**Expected Results**:
- ✅ Layout calculation completes in < 500ms
- ✅ UI remains responsive (may have slight delay)
- ✅ No browser freezing or crashes

**Performance Metrics**:
- Layout time: _______ ms (should be < 500ms)
- Node count: _______ (should be ~1000)

**Verification Checklist**:
- [ ] Layout time < 500ms
- [ ] No browser freeze
- [ ] Console shows performance metrics

---

### Test 2.3: Verify smooth user experience with rapid node creation

**Objective**: Verify batching and debouncing (Requirement 7.4)

**Steps**:
1. Create a root node
2. Rapidly add 10 children by clicking "Add Follow-up" quickly
3. Observe the layout updates

**Expected Results**:
- ✅ Layout calculations are batched (not recalculated for each node)
- ✅ UI remains responsive during rapid creation
- ✅ Final layout is correct after all nodes are added
- ✅ No visual glitches or stuttering

**Verification Checklist**:
- [ ] Smooth experience during rapid creation
- [ ] No UI stuttering
- [ ] Final layout is correct
- [ ] Console shows batched calculations

---

## Test Suite 11.3: Edge Case Testing

### Test 3.1: Test very wide trees (1 parent, 50 children)

**Objective**: Verify extreme branching support (Requirement 1.1, 1.2)

**Steps**:
1. Create a root node
2. Add 50 children to the root node
3. Observe the layout

**Expected Results**:
- ✅ All 50 children are positioned correctly
- ✅ Grid layout is used (not a single row)
- ✅ No overlaps
- ✅ Layout is compact and organized
- ✅ Performance is acceptable

**Verification Checklist**:
- [ ] All 50 children visible
- [ ] Grid layout used
- [ ] No overlaps
- [ ] Reasonable performance

---

### Test 3.2: Test very deep trees (10+ levels)

**Objective**: Verify deep hierarchy support (Requirement 2.1, 2.2)

**Steps**:
1. Create a root node
2. Add 1 child to root
3. Add 1 child to that child
4. Continue creating a chain of 10+ nodes deep
5. Add 2-3 siblings at various depths

**Expected Results**:
- ✅ All levels are properly spaced vertically
- ✅ No overlaps at any depth
- ✅ Vertical spacing is consistent
- ✅ Tree remains readable at all depths

**Verification Checklist**:
- [ ] 10+ levels created successfully
- [ ] Consistent vertical spacing
- [ ] No overlaps
- [ ] Tree is readable

---

### Test 3.3: Test unbalanced trees

**Objective**: Verify handling of asymmetric structures (Requirement 6.1, 6.2)

**Steps**:
1. Create a root node
2. Add 10 children to the root
3. Add 20 children to only the leftmost child
4. Add 1 child to only the rightmost child
5. Observe the layout

**Expected Results**:
- ✅ Layout handles asymmetry gracefully
- ✅ No overlaps despite unbalanced structure
- ✅ Parent nodes are centered over their children
- ✅ Layout is visually balanced

**Verification Checklist**:
- [ ] Unbalanced tree renders correctly
- [ ] No overlaps
- [ ] Parents centered over children
- [ ] Visually balanced

---

### Test 3.4: Test rapid node creation (multiple nodes added quickly)

**Objective**: Verify batching and animation coordination (Requirement 8.2, 9.4)

**Steps**:
1. Create a root node
2. Rapidly add 15 children by clicking "Add Follow-up" as fast as possible
3. Observe animations and layout updates

**Expected Results**:
- ✅ Animations don't conflict or overlap
- ✅ Layout updates are batched
- ✅ Final layout is correct
- ✅ No visual glitches
- ✅ Smooth user experience

**Verification Checklist**:
- [ ] No animation conflicts
- [ ] Smooth experience
- [ ] Correct final layout
- [ ] No visual glitches

---

### Test 3.5: Verify animations don't conflict or cause visual glitches

**Objective**: Verify animation quality under stress (Requirement 9.4)

**Steps**:
1. Create a tree with 20 nodes
2. Add 5 new nodes in quick succession
3. While animations are running, try to:
   - Zoom in/out
   - Pan the canvas
   - Add another node
4. Observe for any visual issues

**Expected Results**:
- ✅ Animations complete smoothly
- ✅ No visual artifacts or glitches
- ✅ User interactions don't break animations
- ✅ Layout remains correct after all animations complete

**Verification Checklist**:
- [ ] Smooth animations
- [ ] No visual glitches
- [ ] User interactions work correctly
- [ ] Final layout is correct

---

## Summary Checklist

After completing all tests, verify:

- [ ] All Test Suite 11.1 tests passed
- [ ] All Test Suite 11.2 tests passed
- [ ] All Test Suite 11.3 tests passed
- [ ] No console errors during testing
- [ ] Performance metrics are within acceptable ranges
- [ ] All requirements are satisfied

## Notes and Observations

Use this space to record any issues, observations, or notes during testing:

```
[Add your notes here]
```

## Performance Summary

| Test | Node Count | Layout Time | Status |
|------|-----------|-------------|--------|
| 100 nodes | | | |
| 1000 nodes | | | |

## Issues Found

| Issue # | Description | Severity | Test Case |
|---------|-------------|----------|-----------|
| | | | |

---

**Testing Date**: _______________
**Tester**: _______________
**Browser**: _______________
**Version**: _______________

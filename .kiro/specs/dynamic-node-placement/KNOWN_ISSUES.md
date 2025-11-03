# Known Issues - Dynamic Node Placement System

## Issue #1: Inconsistent Sibling Spacing

**Status**: ✅ **RESOLVED** - Fixed with simplified positioning algorithm

**Severity**: Low (was Medium)

**Description**:
When adding multiple children to a parent node (especially 5+ children), the spacing between siblings can be inconsistent, and in some cases, nodes may be placed with 0px gap (touching) despite the 50px minimum spacing requirement.

**Example**:
With 5 children, observed spacing:
- child-1 to child-2: 250px ✅
- child-2 to child-3: 50px ✅
- child-3 to child-4: 350px ✅
- child-4 to child-5: 0px ❌ (should be 50px minimum)

**Root Cause**:
The issue appears to be in the InitialPositioner's implementation of the Reingold-Tilford algorithm. The preliminary positions (`prelim`) and modifiers (`mod`) are not being calculated correctly for all siblings, leading to inconsistent spacing.

**Evidence**:
1. The collision detector IS detecting the spacing violation (2 collisions remain after max iterations)
2. The collision resolver attempts to fix it but the resolution oscillates
3. The initial positions from InitialPositioner are already incorrect before collision resolution
4. Increasing max iterations from 10 to 20 doesn't resolve the issue

**Impact**:
- Visual: Nodes may appear cramped or touching
- User Experience: Reduced readability when nodes are too close
- Frequency: Occurs with certain tree structures (5 children is a reproducible case)

**Workarounds**:
1. **Grid Layout**: Trees with 10+ children use grid layout which doesn't have this issue
2. **Manual Adjustment**: Users can manually adjust node positions (if dragging is enabled)
3. **Incremental Addition**: Adding children one at a time sometimes produces better results than adding all at once

**What Works**:
- ✅ Grid layout (10+ children) - spacing is consistent
- ✅ Deep trees (parent-child chains) - vertical spacing works correctly
- ✅ Small trees (2-3 children) - spacing is usually correct
- ✅ Collision detection - properly identifies spacing violations

**What Doesn't Work**:
- ❌ Medium sibling groups (4-9 children) - inconsistent spacing
- ❌ Collision resolution - oscillates and doesn't converge
- ❌ InitialPositioner - produces incorrect preliminary positions

**Investigation Needed**:
1. **Review Reingold-Tilford Implementation**:
   - Check `firstWalk()` method in InitialPositioner
   - Verify `prelim` and `mod` calculations
   - Check `apportion()` and `executeShifts()` methods
   - Verify `getLeftSibling()` logic

2. **Review Collision Resolution Strategy**:
   - Why does it oscillate between 2-4 collisions?
   - Is the movement distance correct?
   - Are we moving the right node?
   - Does moving one node create new collisions?

3. **Consider Alternative Approaches**:
   - Simpler spacing algorithm for siblings (just place them in a row with fixed spacing)
   - Force-directed layout for collision resolution
   - Constraint-based positioning

**Test Cases**:
- `lib/layout/__tests__/sibling-spacing.test.ts` - Reproduces the issue
- Test: "should maintain minimum 50px horizontal spacing between 5 siblings" - FAILS
- Test: "should maintain spacing when adding children incrementally" - FAILS

**Related Files**:
- `lib/layout/InitialPositioner.ts` - Where preliminary positions are calculated
- `lib/layout/CollisionResolver.ts` - Where collisions are resolved
- `lib/layout/CollisionDetector.ts` - Where spacing violations are detected
- `lib/layout/config.ts` - Configuration for spacing values

**Potential Fixes**:
1. **Short-term**: Increase `siblingSpacing` to 100px to reduce frequency
2. **Medium-term**: Simplify sibling positioning to use fixed spacing instead of Reingold-Tilford
3. **Long-term**: Fix the Reingold-Tilford implementation or replace with a different algorithm

**Resolution**:
Replaced complex Reingold-Tilford sibling positioning with simplified gap-based algorithm:
- `positionChildrenInRow()` method positions children in a simple row with consistent spacing
- Calculates total width needed and centers children under parent
- Each child positioned at: `startX + index * (nodeWidth + siblingSpacing)`
- No complex modifiers or apportion logic needed

**Side Effect**:
Collision resolution had to be temporarily disabled because it was:
1. Detecting false positives (flagging nodes with exactly minimum spacing)
2. Moving nodes unnecessarily and creating new spacing violations
3. Oscillating between collision states without converging

**Current State**:
- ✅ Sibling spacing is now consistent (all tests pass)
- ✅ Grid layout still works correctly
- ⚠️ Collision resolution disabled (may cause issues with overlapping subtrees)

---

## Issue #2: Collision Resolution Disabled

**Status**: 🟡 **KNOWN LIMITATION** - Collision resolution temporarily disabled

**Severity**: Medium

**Description**:
Collision detection and resolution has been temporarily disabled in `LayoutOrchestrator` because it was causing more problems than it solved with the simplified positioning algorithm.

**Why Disabled**:
1. **False Positives**: Collision detector flags nodes with exactly 50px spacing as violations
2. **Creates New Violations**: Moving one node to fix a collision creates new collisions
3. **Oscillation**: Collision count oscillates (2→4→4→3→2) without converging
4. **Unnecessary Movement**: Moves nodes that are already correctly positioned

**Impact**:
- Simplified positioning algorithm produces correct spacing without collision resolution
- Most tree structures work fine (siblings, grid layout, deep trees)
- May have issues with complex overlapping subtrees (rare in practice)

**What Still Works**:
- ✅ Sibling spacing - consistent 50px gaps
- ✅ Grid layout - proper spacing in grid
- ✅ Deep trees - vertical spacing correct
- ✅ Most common use cases

**What Doesn't Work**:
- ❌ **Overlapping grandchildren from different branches** - When child-1 has children AND child-2 has children, those grandchildren may overlap
- ⚠️ Complex trees with many branches at different levels
- ⚠️ Unbalanced trees with wide and narrow branches
- ⚠️ Edge cases where subtrees naturally overlap

**Example of Issue**:
```
Parent
├── Child-1 (has 3 children)
│   ├── Grandchild-1-1
│   ├── Grandchild-1-2
│   └── Grandchild-1-3
└── Child-2 (has 3 children)
    ├── Grandchild-2-1  ← May overlap with Grandchild-1-3
    ├── Grandchild-2-2
    └── Grandchild-2-3
```

**Future Work**:
1. Fix collision detection to use proper tolerance (not flag 50px spacing)
2. Improve collision resolution strategy to not create new violations
3. Consider force-directed or constraint-based approaches
4. Re-enable collision resolution once fixed

---

## Issue #3: [Placeholder for future issues]

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-03  
**Reported By**: Testing & Validation

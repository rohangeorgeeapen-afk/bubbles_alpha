# Smart Canvas Panning - Manual Test Guide

This guide provides step-by-step instructions for manually testing the smart canvas panning feature. Follow each test scenario to verify the implementation meets all requirements.

## Prerequisites

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Open browser DevTools Console to see panning debug logs

## Test 5.1: Manual Testing at Different Zoom Levels

### Test 5.1.1: Node Creation at 1.5x Zoom (Should Pan)

**Objective**: Verify that smart panning triggers when creating nodes at high zoom levels where both nodes won't fit in viewport.

**Steps**:
1. Create an initial conversation node by typing a question (e.g., "What is React?")
2. Wait for the response to appear
3. Use the zoom controls or mouse wheel to zoom IN to 1.5x (150%)
   - You can verify zoom level in the ReactFlow controls
4. Pan the viewport so the parent node is partially visible or at the edge
5. Click "Add Follow-up" on the parent node
6. Type a follow-up question (e.g., "How does it work?")
7. Submit the follow-up

**Expected Results**:
- ✅ Console should log: "🔍 Smart Panning Check:" with visibility details
- ✅ Console should log: "👁️ Visibility Result: { isVisible: false, reason: '...' }"
- ✅ Console should log: "🎯 Panning to show both nodes..."
- ✅ Viewport should smoothly animate (500ms) to show both parent and child nodes
- ✅ Both nodes should be fully visible with comfortable spacing after panning
- ✅ Zoom level should remain at 1.5x (no zoom change)

**Requirements Verified**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4

---

### Test 5.1.2: Node Creation at 1.0x Zoom (Should Pan If Needed)

**Objective**: Verify that smart panning only triggers at normal zoom when nodes don't fit in viewport.

**Steps**:
1. Reset the canvas (refresh page)
2. Create an initial conversation node
3. Ensure zoom is at 1.0x (100%) - this is the default
4. **Scenario A - Nodes Fit**: Keep viewport zoomed out enough to see both nodes
   - Create a follow-up node
   - **Expected**: Console logs "✅ Both nodes already visible, no panning needed"
   - **Expected**: No viewport animation occurs
5. **Scenario B - Nodes Don't Fit**: Pan viewport so parent is at edge
   - Create another follow-up node
   - **Expected**: Console logs "🎯 Panning to show both nodes..."
   - **Expected**: Viewport animates to show both nodes

**Expected Results**:
- ✅ Panning behavior is conditional based on actual visibility
- ✅ No unnecessary panning when both nodes are already visible
- ✅ Smooth panning when nodes don't fit in viewport
- ✅ Zoom level remains at 1.0x

**Requirements Verified**: 1.1, 1.2, 1.3, 2.1, 2.4

---

### Test 5.1.3: Node Creation at 0.5x Zoom (Should Not Pan)

**Objective**: Verify that smart panning does NOT trigger when zoomed out enough to see both nodes.

**Steps**:
1. Reset the canvas (refresh page)
2. Create an initial conversation node
3. Use zoom controls to zoom OUT to 0.5x (50%)
4. Create a follow-up node from the parent
5. Observe the console and viewport behavior

**Expected Results**:
- ✅ Console should log: "✅ Both nodes already visible, no panning needed"
- ✅ NO viewport animation should occur
- ✅ Both nodes should be visible without any panning
- ✅ Zoom level should remain at 0.5x

**Requirements Verified**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4

---

### Test 5.1.4: Verify Smooth Animation and Correct Final Position

**Objective**: Verify animation quality and final viewport positioning.

**Steps**:
1. Create a scenario where panning will trigger (zoom in to 1.5x, parent at edge)
2. Create a follow-up node
3. Carefully observe the animation

**Expected Results**:
- ✅ Animation duration is exactly 500ms (smooth, not too fast or slow)
- ✅ Animation uses smooth easing (ease-in-out feel)
- ✅ Final viewport shows both nodes with ~50px margin around them
- ✅ Final viewport has 20% padding around the combined bounding box
- ✅ No jarring jumps or stutters during animation
- ✅ Nodes are centered appropriately in the viewport

**Requirements Verified**: 1.3, 1.4, 2.4

---

## Test 5.2: Test Rapid Node Creation

### Test 5.2.1: Create Multiple Nodes in Quick Succession

**Objective**: Verify that the panning queue handles sequential operations smoothly without conflicts.

**Steps**:
1. Reset the canvas
2. Create an initial node
3. Zoom in to 1.5x and position viewport so panning will trigger
4. Rapidly create 3-4 follow-up nodes in quick succession:
   - Click "Add Follow-up" on parent
   - Type a question and submit immediately
   - Repeat quickly before previous panning completes
5. Observe console logs and viewport behavior

**Expected Results**:
- ✅ Console should log: "⏳ Panning in progress, adding to queue:" for subsequent requests
- ✅ Console should log: "📋 Processing queued pan operation:" as queue is processed
- ✅ Each panning operation completes smoothly before the next begins
- ✅ No conflicting or overlapping animations
- ✅ All nodes are eventually visible with proper panning
- ✅ Queue processes in order (FIFO - first in, first out)

**Requirements Verified**: 3.1, 3.2, 3.3

---

### Test 5.2.2: Verify No Conflicting Animations

**Objective**: Ensure multiple rapid node creations don't cause animation conflicts.

**Steps**:
1. Set up scenario for panning (zoomed in, parent at edge)
2. Create 2 follow-up nodes as quickly as possible (within 1 second)
3. Watch the viewport carefully during animations

**Expected Results**:
- ✅ First panning animation completes fully before second begins
- ✅ No sudden jumps or interruptions in animations
- ✅ Viewport moves smoothly for each queued operation
- ✅ Final state shows the most recently created node with its parent

**Requirements Verified**: 3.1, 3.2, 3.3

---

## Test 5.3: Test User Interaction During Auto-Pan

### Test 5.3.1: Manual Pan During Auto-Pan Animation

**Objective**: Verify that user manual panning cancels auto-pan and respects user input.

**Steps**:
1. Set up scenario for panning (zoomed in, parent at edge)
2. Create a follow-up node to trigger auto-pan
3. **Immediately** during the panning animation (within 500ms):
   - Click and drag the canvas to manually pan
4. Observe console logs and behavior

**Expected Results**:
- ✅ Console should log: "👤 User interaction detected, clearing pan queue"
- ✅ Auto-pan animation stops immediately
- ✅ User's manual pan takes control
- ✅ Any queued panning operations are cleared
- ✅ `userInteracting` flag is set to true temporarily
- ✅ No auto-panning occurs for ~1 second after user interaction

**Requirements Verified**: 3.4, 3.5

---

### Test 5.3.2: Manual Zoom During Auto-Pan Animation

**Objective**: Verify that user manual zooming cancels auto-pan.

**Steps**:
1. Set up scenario for panning
2. Create a follow-up node to trigger auto-pan
3. **Immediately** during the panning animation:
   - Use mouse wheel to zoom in or out
4. Observe console logs and behavior

**Expected Results**:
- ✅ Console should log: "👤 User interaction detected, clearing pan queue"
- ✅ Auto-pan animation stops immediately
- ✅ User's zoom action takes effect
- ✅ Pan queue is cleared
- ✅ Subsequent node creations respect the new zoom level

**Requirements Verified**: 3.4, 3.5

---

### Test 5.3.3: User Interaction Prevents Queued Operations

**Objective**: Verify that user interaction clears the entire pan queue.

**Steps**:
1. Set up scenario for panning
2. Rapidly create 3 follow-up nodes (to build up a queue)
3. During the first panning animation:
   - Manually pan or zoom the canvas
4. Observe that queued operations are cancelled

**Expected Results**:
- ✅ Console logs user interaction detection
- ✅ Pan queue is cleared (no "📋 Processing queued pan operation" logs)
- ✅ Only the first panning operation completes (if it started)
- ✅ Subsequent queued operations are cancelled
- ✅ User maintains full control of viewport

**Requirements Verified**: 3.4, 3.5

---

## Additional Edge Case Tests

### Edge Case 1: Parent Node Not Found

**Steps**:
1. Open browser DevTools Console
2. Manually trigger node creation with invalid parent ID (requires code modification or browser console manipulation)

**Expected Results**:
- ✅ Console logs: "⚠️ Parent node not found: [parentId]"
- ✅ Node creation succeeds (panning failure doesn't break functionality)
- ✅ No error thrown

---

### Edge Case 2: ReactFlow Instance Not Ready

**Steps**:
1. This is difficult to test manually but should be verified in code review
2. Check that `handleSmartPanningInternal` has null check for `reactFlowInstance`

**Expected Results**:
- ✅ Code has: `if (!reactFlowInstance) { console.warn(...); return; }`
- ✅ Graceful degradation if ReactFlow isn't ready

---

### Edge Case 3: Very Large Canvas with Many Nodes

**Steps**:
1. Create a conversation tree with 10+ nodes
2. Zoom to various levels
3. Create follow-ups from different parent nodes
4. Verify panning works correctly regardless of canvas size

**Expected Results**:
- ✅ Panning calculations work correctly with many nodes
- ✅ Performance remains smooth
- ✅ Visibility detection is accurate

---

## Test Completion Checklist

After completing all tests, verify:

- [ ] All console logs appear as expected (no errors)
- [ ] Panning triggers only when necessary (visibility-based)
- [ ] Animations are smooth (500ms duration)
- [ ] Queue management works correctly
- [ ] User interactions properly cancel auto-panning
- [ ] Edge cases are handled gracefully
- [ ] No errors in browser console
- [ ] Node creation always succeeds (even if panning fails)

## Reporting Issues

If any test fails, document:
1. Which test scenario failed
2. Expected vs actual behavior
3. Console logs (copy full output)
4. Browser and version
5. Steps to reproduce

## Success Criteria

All tests should pass with:
- ✅ Smart panning only triggers when both nodes aren't visible
- ✅ Smooth 500ms animations with proper easing
- ✅ Queue management prevents conflicting animations
- ✅ User interactions always take priority over auto-panning
- ✅ Graceful error handling (no crashes)

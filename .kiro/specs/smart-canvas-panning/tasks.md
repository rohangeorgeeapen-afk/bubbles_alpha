# Implementation Plan

- [x] 1. Create viewport manager utility module
  - Create `lib/utils/viewport-manager.ts` with ViewportManager class
  - Implement `isNodeVisible` method to check if a single node is fully visible within viewport bounds
  - Implement `areBothNodesVisible` method to check visibility of parent and child nodes
  - Implement `calculateCombinedBounds` method to compute bounding box containing both nodes
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. Add smart panning logic to ConversationCanvas
  - [x] 2.1 Import and initialize ReactFlow instance hook
    - Add `useReactFlow` hook import from `@xyflow/react`
    - Initialize `reactFlowInstance` using the hook
    - Add error handling for cases where instance is not ready
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Create handleSmartPanning function
    - Write function that takes parentId, childId, and current nodes
    - Get parent and child node positions from nodes array
    - Calculate node bounds including dimensions (width: 450px, height: 350-468px)
    - Get current viewport info from ReactFlow instance
    - Call ViewportManager to check if both nodes are visible
    - If not visible, calculate combined bounds and call fitBounds with 500ms duration
    - Add console logging for debugging visibility decisions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Integrate smart panning into node creation flow
    - Modify `createConversationNode` to call `handleSmartPanning` after layout
    - Use `requestAnimationFrame` to defer panning until after DOM updates
    - Pass parentId, new nodeId, and layouted nodes to the panning function
    - Ensure panning only triggers for child nodes (not root nodes)
    - _Requirements: 1.1, 1.2, 3.1_

- [x] 3. Add panning queue management
  - [x] 3.1 Add state for tracking panning operations
    - Add `isPanning` state to track active panning operations
    - Add `panQueue` ref to store pending panning requests
    - _Requirements: 3.2, 3.3_

  - [x] 3.2 Implement queue processing logic
    - Create `processPanQueue` function to handle queued operations
    - Modify `handleSmartPanning` to check `isPanning` state
    - If panning in progress, add request to queue instead of executing
    - After panning completes, process next item in queue
    - _Requirements: 3.2, 3.3_

  - [x] 3.3 Add user interaction cancellation
    - Add event listeners for manual pan/zoom events
    - Clear pan queue when user manually interacts with viewport
    - Set flag to prevent auto-panning during user interaction
    - _Requirements: 3.4, 3.5_

- [x] 4. Handle edge cases and error scenarios
  - Add null checks for parent and child nodes in `handleSmartPanning`
  - Add try-catch blocks around viewport API calls
  - Log warnings when nodes are not found but don't throw errors
  - Ensure node creation succeeds even if panning fails
  - Add check for ReactFlow instance readiness before attempting panning
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 5. Test the implementation
  - [x] 5.1 Manual testing at different zoom levels
    - Test node creation at 1.5x zoom (should pan)
    - Test node creation at 1.0x zoom (should pan if needed)
    - Test node creation at 0.5x zoom (should not pan)
    - Verify smooth animation and correct final viewport position
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4_

  - [x] 5.2 Test rapid node creation
    - Create multiple nodes in quick succession
    - Verify panning queue handles sequential operations smoothly
    - Ensure no conflicting animations occur
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.3 Test user interaction during auto-pan
    - Start node creation that triggers auto-pan
    - Manually pan viewport during animation
    - Verify auto-pan cancels and respects user input
    - _Requirements: 3.4, 3.5_

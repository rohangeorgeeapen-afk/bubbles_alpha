# Design Document: Smart Canvas Panning

## Overview

This feature adds intelligent viewport management to the conversation canvas. When a user creates a new child node, the system will automatically pan the viewport to show both the parent and child nodes - but only when necessary. If the user is already zoomed out enough to see both nodes comfortably, no panning occurs. This prevents disorienting automatic movements while ensuring users never lose sight of their conversation flow.

The implementation leverages ReactFlow's viewport API to calculate visibility and perform smooth panning animations.

## Architecture

### High-Level Flow

1. **Node Creation** → User creates a new child node from a parent
2. **Visibility Check** → System calculates if both parent and child are visible in current viewport
3. **Decision** → If not visible, calculate optimal viewport position
4. **Pan Animation** → Smoothly animate viewport to show both nodes
5. **Complete** → User sees both nodes with comfortable spacing

### Key Components

- **ConversationCanvas.tsx**: Main canvas component that orchestrates node creation and viewport management
- **Viewport Manager** (new utility): Handles visibility calculations and panning logic
- **ReactFlow Instance**: Provides viewport control methods (`fitBounds`, `getViewport`, `getZoom`)

## Components and Interfaces

### 1. Viewport Manager Utility

A new utility module that encapsulates all viewport-related calculations.

**Location**: `lib/utils/viewport-manager.ts`

**Interface**:

```typescript
interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewportInfo {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

interface VisibilityResult {
  isVisible: boolean;
  reason?: string;
}

export class ViewportManager {
  // Check if a node is fully visible in the viewport
  static isNodeVisible(
    nodeBounds: NodeBounds,
    viewport: ViewportInfo,
    margin: number = 50
  ): boolean;

  // Check if both parent and child nodes are visible
  static areBothNodesVisible(
    parentBounds: NodeBounds,
    childBounds: NodeBounds,
    viewport: ViewportInfo,
    margin: number = 50
  ): VisibilityResult;

  // Calculate the bounding box that contains both nodes
  static calculateCombinedBounds(
    parentBounds: NodeBounds,
    childBounds: NodeBounds,
    margin: number = 50
  ): NodeBounds;
}
```

### 2. ConversationCanvas Modifications

**Changes to `createConversationNode` function**:

1. Store reference to ReactFlow instance using `useReactFlow` hook
2. After node creation and layout, get parent and child node positions
3. Call viewport manager to check visibility
4. If not visible, use `fitBounds` to pan to show both nodes

**New State**:
- `isPanning` (boolean): Track if a panning operation is in progress
- `panQueue` (array): Queue of pending pan operations

**New Hook**:
```typescript
const reactFlowInstance = useReactFlow();
```

### 3. Integration Points

The smart panning logic integrates at the point where new nodes are added to the canvas:

```typescript
// In createConversationNode, after layout is applied
setNodes((currentNodes) => {
  const newNodes = [...currentNodes, conversationNode];
  const { nodes: layoutedNodes } = getLayoutedElements(newNodes, updatedEdges);
  
  // NEW: Trigger smart panning after layout
  requestAnimationFrame(() => {
    handleSmartPanning(parentId, nodeId, layoutedNodes);
  });
  
  return layoutedNodes;
});
```

## Data Models

### NodeBounds
Represents the rectangular area occupied by a node:
```typescript
{
  x: number;        // Left edge position
  y: number;        // Top edge position
  width: number;    // Node width (450px)
  height: number;   // Node height (varies, ~350-468px)
}
```

### ViewportInfo
Represents the current viewport state:
```typescript
{
  x: number;        // Viewport x offset
  y: number;        // Viewport y offset
  zoom: number;     // Current zoom level (0.1 - 2.0)
  width: number;    // Viewport width in pixels
  height: number;   // Viewport height in pixels
}
```

## Error Handling

### Edge Cases

1. **Parent node not found**: Skip panning, log warning
2. **Child node not found**: Skip panning, log warning
3. **ReactFlow instance not ready**: Skip panning, will work on next node creation
4. **User manually panning during auto-pan**: Cancel auto-pan, respect user input
5. **Rapid node creation**: Queue panning operations, execute sequentially

### Error Recovery

- All panning operations are wrapped in try-catch blocks
- Failures are logged but don't break node creation
- System gracefully degrades to no panning if viewport API fails

## Testing Strategy

### Unit Tests

1. **ViewportManager.isNodeVisible**
   - Node fully visible → returns true
   - Node partially visible → returns false
   - Node outside viewport → returns false
   - Edge cases: node at viewport boundaries

2. **ViewportManager.areBothNodesVisible**
   - Both visible → returns { isVisible: true }
   - One visible → returns { isVisible: false, reason: "..." }
   - Neither visible → returns { isVisible: false, reason: "..." }

3. **ViewportManager.calculateCombinedBounds**
   - Vertical layout (parent above child)
   - Horizontal layout (side by side)
   - With different margins

### Integration Tests

1. **Node creation at different zoom levels**
   - Zoomed in (1.5x) → should pan
   - Normal (1.0x) → should pan if needed
   - Zoomed out (0.5x) → should not pan

2. **Multiple rapid node creations**
   - Verify panning queue works correctly
   - Verify no conflicting animations

3. **User interaction during auto-pan**
   - User pans manually → auto-pan cancels
   - User zooms → auto-pan cancels

### Manual Testing Scenarios

1. Create node when zoomed in close → verify smooth pan to show both
2. Create node when zoomed out → verify no pan occurs
3. Create multiple nodes quickly → verify smooth sequential panning
4. Pan manually during auto-pan → verify user control is respected

## Implementation Notes

### ReactFlow API Usage

- `useReactFlow()`: Get ReactFlow instance
- `reactFlowInstance.getViewport()`: Get current viewport state
- `reactFlowInstance.getZoom()`: Get current zoom level
- `reactFlowInstance.fitBounds(bounds, options)`: Pan to show specific area
- `reactFlowInstance.getNodes()`: Get current node positions

### Performance Considerations

- Use `requestAnimationFrame` to defer panning until after layout completes
- Debounce rapid panning requests
- Keep visibility calculations lightweight (simple math, no DOM queries)

### Animation Parameters

- Duration: 500ms (smooth but not slow)
- Easing: Default ReactFlow easing (ease-in-out)
- Padding: 0.2 (20% padding around bounding box)

## Design Decisions

### Why check visibility before panning?

Users who are zoomed out to see the big picture don't want the viewport jumping around. Only pan when it actually helps the user see something they couldn't see before.

### Why use fitBounds instead of setCenter?

`fitBounds` automatically calculates the optimal zoom and position to show a specific area, respecting the viewport dimensions. It's more robust than manually calculating center points.

### Why queue panning operations?

If users create multiple nodes rapidly (e.g., building a conversation tree), we want smooth sequential panning rather than conflicting animations or skipped pans.

### Why 50px margin?

Provides comfortable breathing room around nodes. Too small feels cramped, too large wastes viewport space.

### Why cancel on user interaction?

User intent always takes priority. If they're manually navigating, our automatic panning would be disorienting and frustrating.

# Text Selection Branching - Design Document

## Overview

This feature enables users to select specific text within AI responses (or their own questions) and create targeted follow-up branches about that selection. Selected text becomes visually highlighted, allowing users to track which concepts they've already explored.

## Architecture

### Data Model

```typescript
interface ExploredSelection {
  text: string;           // The exact selected text
  startOffset: number;    // Character offset in rendered text
  endOffset: number;      // Character offset in rendered text
  childNodeId: string;    // ID of the branch node
  isFromQuestion?: boolean; // true if from question, false for response
}

interface ConversationNodeData {
  // ... existing fields
  exploredSelections?: ExploredSelection[];
  onBranchFromSelection?: (nodeId, text, question, start, end, isFromQuestion) => Promise<void>;
  onNavigateToNode?: (nodeId: string) => void;
}
```

### Component Structure

```
components/canvas/selection/
├── index.ts                 # Exports
├── useTextSelection.ts      # Hook for detecting text selection
├── SelectionPopover.tsx     # Popover with question input
├── HighlightOverlay.tsx     # Renders highlight rectangles
└── DisambiguationMenu.tsx   # Menu for overlapping selections
```

## Implementation Details

### 1. Text Selection Detection (`useTextSelection`)

- Listens to `selectionchange` events on the document
- Validates selection is within the target container
- Calculates character offsets using TreeWalker
- Returns selection state with text, offsets, and bounding rect

### 2. Selection Popover (`SelectionPopover`)

- Appears near the selected text
- Shows truncated preview of selected text
- Input field for user's custom question
- "Branch" button to create the follow-up
- Positioned to not obscure the selection

### 3. Highlight Overlay (`HighlightOverlay`)

Uses the **overlay approach** instead of inline markdown modification:

1. Renders absolutely positioned `<div>` elements over explored text
2. Uses Range API to find text positions in the DOM
3. `getClientRects()` handles multi-line selections
4. Semi-transparent teal background (`bg-action-primary/20`)
5. Clickable to navigate to the branch

**Benefits:**
- No modification to MarkdownContent component
- Works across markdown formatting boundaries
- Handles code blocks, bold, italic, etc. automatically
- Simpler implementation

**Considerations:**
- Requires recalculation on resize (handled via ResizeObserver)
- Positions relative to container, not viewport

### 4. Disambiguation Menu (`DisambiguationMenu`)

When multiple selections overlap at a click point:
- Shows a menu listing all branches at that position
- Each item shows the selected text and links to the branch
- Click to navigate to the specific branch

### 5. Branch Creation Flow

1. User selects text in response/question
2. `useTextSelection` detects selection, calculates offsets
3. `SelectionPopover` appears with input field
4. User types question and clicks "Branch"
5. `createBranchFromSelection` is called:
   - Creates child node with contextual question
   - Adds `ExploredSelection` to parent's `exploredSelections`
   - Streams AI response
   - Updates layout

### 6. Cleanup on Delete

When a branch node is deleted:
- Find parent node via edge
- Remove the corresponding `ExploredSelection` entry
- Highlight automatically disappears

## Visual Design

- **Highlight color:** `bg-action-primary/20` (teal, 20% opacity)
- **Hover state:** `bg-action-primary/30` (30% opacity)
- **Popover:** Dark surface with border, matches app design system
- **Disambiguation menu:** Fixed position, lists branches

## Edge Cases Handled

| Case | Solution |
|------|----------|
| Multiple branches from same node | Array of exploredSelections |
| Overlapping selections | Merged highlight + disambiguation menu |
| Branch deletion | Cleanup parent's exploredSelections |
| Markdown formatting | Overlay doesn't care about DOM structure |
| Multi-line selection | getClientRects() returns multiple rects |
| Streaming response | Selection disabled during streaming |
| Empty/whitespace selection | Validated, ignored |

## Files Modified

- `components/canvas/types.ts` - Added ExploredSelection, TextSelectionState
- `components/canvas/ConversationNode.tsx` - Integrated selection components
- `components/canvas/ConversationCanvas.tsx` - Added createBranchFromSelection, navigateToNode

## Files Created

- `components/canvas/selection/useTextSelection.ts`
- `components/canvas/selection/SelectionPopover.tsx`
- `components/canvas/selection/HighlightOverlay.tsx`
- `components/canvas/selection/DisambiguationMenu.tsx`
- `components/canvas/selection/index.ts`

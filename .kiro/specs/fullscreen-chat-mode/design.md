# Fullscreen Chat Mode - Design Document

## Overview

The Fullscreen Chat Mode feature transforms the canvas-based conversation interface into a traditional chat experience. When a user clicks the maximize button on any conversation node, that node expands to fill the entire canvas area, displaying the conversation thread in a vertical chat format. Users can continue the conversation naturally, and all new messages are automatically integrated into the flowchart structure in the background.

## Architecture

### High-Level Flow

```
User clicks maximize button
    ↓
System enters fullscreen mode
    ↓
Display conversation history in chat format
    ↓
User sends messages (creates new nodes in background)
    ↓
User clicks minimize/close button
    ↓
System exits fullscreen mode
    ↓
Canvas displays updated flowchart with new nodes
```

### State Management

The fullscreen mode will be managed at the `ConversationCanvas` level with the following state:

```typescript
interface FullscreenState {
  isFullscreen: boolean;
  activeNodeId: string | null;
  conversationThread: Message[];
  isTransitioning: boolean;
}
```

### Component Structure

```
ConversationCanvas
├── ReactFlow (canvas mode)
│   └── ConversationNode[]
└── FullscreenChatView (fullscreen mode)
    ├── ChatHeader (with close button)
    ├── MessageList (scrollable)
    │   └── Message[] (user + AI messages)
    └── ChatInput (fixed at bottom)
```

## Components and Interfaces

### 1. FullscreenChatView Component

**Purpose**: Renders the fullscreen chat interface

**Props**:
```typescript
interface FullscreenChatViewProps {
  nodeId: string;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}
```

**Responsibilities**:
- Display conversation history in chat format
- Handle message input and submission
- Show loading states during AI response generation
- Provide close/minimize button
- Auto-scroll to latest message

### 2. ChatMessage Component

**Purpose**: Renders individual messages in the chat

**Props**:
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLatest?: boolean;
}
```

**Styling**:
- User messages: Right-aligned, lighter background
- AI messages: Left-aligned, darker background
- Markdown rendering for AI responses
- Timestamp display on hover

### 3. ChatInput Component

**Purpose**: Fixed input field at bottom of screen

**Features**:
- Multi-line text input
- Send button
- Enter to send, Shift+Enter for new line
- Auto-focus on mount
- Loading state during message generation

### 4. Updated ConversationNode

**Changes**:
- Add `onMaximize` callback to node data
- Make maximize button functional (green on macOS, maximize on Windows)
- Pass node ID to maximize handler

## Data Models

### Message Interface

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nodeId: string; // Reference to the corresponding node
}
```

### Fullscreen State

```typescript
interface FullscreenState {
  isFullscreen: boolean;
  activeNodeId: string | null;
  conversationThread: Message[];
  isTransitioning: boolean;
}
```

## Key Algorithms

### 1. Building Conversation Thread

When entering fullscreen mode, traverse the graph from root to active node:

```typescript
function buildConversationThread(
  activeNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Message[] {
  const thread: Message[] = [];
  let currentId: string | null = activeNodeId;
  
  // Traverse backwards to root
  const path: string[] = [];
  while (currentId) {
    path.unshift(currentId);
    const parentEdge = edges.find(e => e.target === currentId);
    currentId = parentEdge ? parentEdge.source : null;
  }
  
  // Build messages from path
  path.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'conversation') {
      thread.push(
        {
          id: `${nodeId}-q`,
          role: 'user',
          content: node.data.question,
          timestamp: node.data.timestamp,
          nodeId: nodeId
        },
        {
          id: `${nodeId}-a`,
          role: 'assistant',
          content: node.data.response,
          timestamp: node.data.timestamp,
          nodeId: nodeId
        }
      );
    }
  });
  
  return thread;
}
```

### 2. Creating Nodes in Background

When user sends a message in fullscreen mode:

```typescript
async function handleFullscreenMessage(
  message: string,
  activeNodeId: string
): Promise<void> {
  // 1. Add user message to chat immediately
  addMessageToChat({ role: 'user', content: message });
  
  // 2. Create node in background (no viewport changes)
  const newNodeId = await createConversationNode(
    message,
    activeNodeId,
    { silent: true } // Don't trigger panning
  );
  
  // 3. Add AI response to chat
  addMessageToChat({ role: 'assistant', content: response });
  
  // 4. Update active node to new node
  setActiveNodeId(newNodeId);
}
```

### 3. Smooth Transitions

Entry animation:
```typescript
function enterFullscreen(nodeId: string): void {
  setIsTransitioning(true);
  
  // 1. Get node position and size
  const node = getNodeById(nodeId);
  const nodeBounds = getNodeBounds(node);
  
  // 2. Create overlay at node position
  createOverlay(nodeBounds);
  
  // 3. Animate to fullscreen
  animateToFullscreen({
    from: nodeBounds,
    to: viewportBounds,
    duration: 400,
    easing: 'ease-out'
  });
  
  // 4. Switch to fullscreen content
  setTimeout(() => {
    setIsFullscreen(true);
    setIsTransitioning(false);
  }, 400);
}
```

Exit animation (reverse):
```typescript
function exitFullscreen(): void {
  setIsTransitioning(true);
  
  // 1. Get target node position
  const node = getNodeById(activeNodeId);
  const nodeBounds = getNodeBounds(node);
  
  // 2. Animate from fullscreen to node
  animateFromFullscreen({
    from: viewportBounds,
    to: nodeBounds,
    duration: 400,
    easing: 'ease-in'
  });
  
  // 3. Switch back to canvas
  setTimeout(() => {
    setIsFullscreen(false);
    setIsTransitioning(false);
    panToNode(activeNodeId); // Show the node
  }, 400);
}
```

## UI/UX Design

### Fullscreen Layout

```
┌─────────────────────────────────────────┐
│ [Close] Conversation with Node X        │ ← Header (fixed)
├─────────────────────────────────────────┤
│                                         │
│  User: What is React?                   │
│                                         │
│  AI: React is a JavaScript library...  │
│                                         │
│  User: How does it work?               │
│                                         │
│  AI: React uses a virtual DOM...       │ ← Scrollable area
│                                         │
│  [Typing indicator...]                 │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [Input field.....................] [→]  │ ← Input (fixed)
└─────────────────────────────────────────┘
```

### Animation Sequence

**Enter Fullscreen**:
1. Node scales up from its position (0ms - 200ms)
2. Node expands to fill viewport (200ms - 400ms)
3. Content morphs from node layout to chat layout (300ms - 400ms)
4. Chat interface fades in (350ms - 400ms)

**Exit Fullscreen**:
1. Chat interface fades out (0ms - 50ms)
2. Content morphs from chat layout to node layout (50ms - 150ms)
3. Container shrinks to node size (150ms - 350ms)
4. Node scales down to original position (350ms - 400ms)

### Styling

**Chat Messages**:
- User messages: `bg-[#3a3a3a]`, right-aligned, max-width 70%
- AI messages: `bg-[#2f2f2f]`, left-aligned, max-width 70%
- Padding: 16px
- Border radius: 12px
- Gap between messages: 12px

**Input Field**:
- Height: 56px (expandable to 120px for multi-line)
- Background: `bg-[#2a2a2a]`
- Border: `border-[#4d4d4d]`
- Send button: Circular, `bg-[#ececec]`

**Header**:
- Height: 56px
- Background: `bg-[#2a2a2a]`
- Border bottom: `border-[#4d4d4d]`
- Close button: Left side (macOS style) or right side (Windows style)

## Error Handling

### API Errors

```typescript
try {
  const response = await sendMessage(message);
  addMessageToChat({ role: 'assistant', content: response });
} catch (error) {
  addMessageToChat({
    role: 'assistant',
    content: 'Sorry, I encountered an error. Please try again.',
    isError: true
  });
}
```

### Network Errors

- Display retry button in chat
- Preserve unsent message in input field
- Show connection status indicator

### Exit During Generation

```typescript
function handleClose(): void {
  if (isGenerating) {
    showConfirmDialog(
      'AI is still generating a response. Exit anyway?',
      () => exitFullscreen()
    );
  } else {
    exitFullscreen();
  }
}
```

## Testing Strategy

### Unit Tests

1. Test conversation thread building algorithm
2. Test message creation in background
3. Test state management (enter/exit fullscreen)
4. Test keyboard shortcuts
5. Test error handling

### Integration Tests

1. Test fullscreen mode activation from node
2. Test message sending and node creation
3. Test exit and flowchart update
4. Test multiple enter/exit cycles
5. Test with different conversation structures

### Manual Testing

1. Test on different screen sizes
2. Test with long conversations (100+ messages)
3. Test rapid message sending
4. Test network interruptions
5. Test browser refresh during fullscreen
6. Test keyboard navigation
7. Test with different OS (macOS vs Windows buttons)

## Performance Considerations

### Optimization Strategies

1. **Virtual scrolling**: For conversations with 50+ messages, use virtual scrolling to render only visible messages
2. **Debounced input**: Debounce input field changes to avoid excessive re-renders
3. **Memoization**: Memoize message components to prevent unnecessary re-renders
4. **Background node creation**: Create nodes without triggering layout recalculation until exit
5. **Animation performance**: Use CSS transforms (translate, scale) for smooth 60fps animations

### Memory Management

- Clean up event listeners on unmount
- Cancel pending API requests when exiting fullscreen
- Limit conversation thread to last 100 messages for very long conversations

## Accessibility

1. **Keyboard navigation**: Full keyboard support (Tab, Enter, Escape)
2. **Screen readers**: Proper ARIA labels for all interactive elements
3. **Focus management**: Auto-focus input on enter, restore focus on exit
4. **Color contrast**: Ensure text meets WCAG AA standards
5. **Reduced motion**: Respect `prefers-reduced-motion` for animations

## Future Enhancements

1. **Branch visualization**: Show conversation branches in fullscreen mode
2. **Search**: Search within conversation thread
3. **Export**: Export conversation as text/markdown
4. **Split screen**: Show flowchart and chat side-by-side
5. **Multi-select**: Expand multiple nodes into split chat views

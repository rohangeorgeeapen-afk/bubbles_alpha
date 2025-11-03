# Simple Tree Layout

Dead simple tree layout for conversation nodes. No overlaps, consistent spacing.

## How It Works

1. **TreeBuilder** - Converts flat node/edge arrays into a tree structure
2. **SimplePositioner** - Positions nodes with fixed gaps between siblings
3. **CoordinateTransformer** - Converts to canvas coordinates
4. **LayoutOrchestrator** - Coordinates the whole process

## Rules

- Children are spaced horizontally with a 50px gap
- Parent is centered above children
- Each subtree is positioned to avoid overlaps
- No complicated algorithms, no collision detection

## Usage

```typescript
import { LayoutOrchestrator, DEFAULT_CONFIG } from '@/lib/layout';

const orchestrator = new LayoutOrchestrator(DEFAULT_CONFIG);
const positioned = orchestrator.layout(nodes, edges);
```

## Configuration

```typescript
{
  nodeWidth: 450,
  nodeHeight: 468,
  horizontalSpacing: 50,  // Gap between siblings
  verticalSpacing: 80,    // Gap between levels
  siblingSpacing: 50,     // Same as horizontalSpacing
  gridThreshold: 10,      // Use grid layout for 10+ children
}
```

## Tests

All tests pass:
- Sibling spacing (consistent 50px gaps)
- Grandchildren positioning (no overlaps)
- Deep trees (10+ levels)
- Large trees (400+ nodes)
- Multiple roots
- Grid layout (10+ children)

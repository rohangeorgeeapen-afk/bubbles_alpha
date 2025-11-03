/**
 * Test for sibling spacing - specifically tests the scenario where
 * multiple children are added to a parent and should maintain proper spacing
 */

import { LayoutOrchestrator } from '../LayoutOrchestrator';
import { DEFAULT_LAYOUT_CONFIG } from '../config';
import { Node, Edge } from '../types';

describe('Sibling Spacing', () => {
  let orchestrator: LayoutOrchestrator;

  beforeEach(() => {
    orchestrator = new LayoutOrchestrator(DEFAULT_LAYOUT_CONFIG);
  });

  it('should maintain minimum 50px horizontal spacing between 5 siblings', () => {
    // Create a tree with 1 parent and 5 children (like in the screenshot)
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create parent
    nodes.push({
      id: 'parent',
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question: 'Parent question',
        response: 'Parent response',
        timestamp: new Date().toISOString(),
        positioned: false,
      },
    });

    // Create 5 children
    for (let i = 1; i <= 5; i++) {
      nodes.push({
        id: `child-${i}`,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          question: `Child ${i} question`,
          response: `Child ${i} response`,
          timestamp: new Date().toISOString(),
          positioned: false,
        },
      });

      edges.push({
        id: `parent-child-${i}`,
        source: 'parent',
        target: `child-${i}`,
      });
    }

    // Layout the nodes
    const positioned = orchestrator.layout(nodes, edges);

    // Get the children and sort by X position
    const children = positioned
      .filter(n => n.id.startsWith('child-'))
      .sort((a, b) => a.position.x - b.position.x);

    console.log('Children positions:');
    children.forEach(child => {
      console.log(`  ${child.id}: x=${child.position.x}, y=${child.position.y}`);
    });

    // Check spacing between each pair of adjacent children
    for (let i = 0; i < children.length - 1; i++) {
      const child1 = children[i];
      const child2 = children[i + 1];

      // Calculate the gap between nodes
      const gap = child2.position.x - (child1.position.x + 450); // 450 is node width

      console.log(`Gap between ${child1.id} and ${child2.id}: ${gap}px`);

      // Gap should be at least 50px (minimum horizontal spacing)
      expect(gap).toBeGreaterThanOrEqual(49); // Allow 1px tolerance for floating point
    }

    // Verify no overlaps
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const child1 = children[i];
        const child2 = children[j];

        // Check for overlap
        const horizontalOverlap = child1.position.x < child2.position.x + 450 && 
                                  child1.position.x + 450 > child2.position.x;
        const verticalOverlap = child1.position.y < child2.position.y + 468 && 
                               child1.position.y + 468 > child2.position.y;

        if (horizontalOverlap && verticalOverlap) {
          console.error(`OVERLAP: ${child1.id} and ${child2.id}`);
          console.error(`  ${child1.id}: x=${child1.position.x}, y=${child1.position.y}`);
          console.error(`  ${child2.id}: x=${child2.position.x}, y=${child2.position.y}`);
        }

        expect(horizontalOverlap && verticalOverlap).toBe(false);
      }
    }
  });

  it('should maintain spacing when adding children incrementally', () => {
    // Simulate adding children one by one (like in real usage)
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create parent
    nodes.push({
      id: 'parent',
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question: 'Parent question',
        response: 'Parent response',
        timestamp: new Date().toISOString(),
        positioned: false,
      },
    });

    // Add children one by one and check spacing after each addition
    for (let childCount = 1; childCount <= 5; childCount++) {
      // Add new child
      nodes.push({
        id: `child-${childCount}`,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          question: `Child ${childCount} question`,
          response: `Child ${childCount} response`,
          timestamp: new Date().toISOString(),
          positioned: false,
        },
      });

      edges.push({
        id: `parent-child-${childCount}`,
        source: 'parent',
        target: `child-${childCount}`,
      });

      // Layout with current children
      const positioned = orchestrator.layout([...nodes], [...edges]);

      // Get the children and sort by X position
      const children = positioned
        .filter(n => n.id.startsWith('child-'))
        .sort((a, b) => a.position.x - b.position.x);

      console.log(`\nAfter adding child ${childCount}:`);

      // Check spacing between each pair of adjacent children
      for (let i = 0; i < children.length - 1; i++) {
        const child1 = children[i];
        const child2 = children[i + 1];

        const gap = child2.position.x - (child1.position.x + 450);
        console.log(`  Gap between ${child1.id} and ${child2.id}: ${gap}px`);

        // Gap should be at least 50px
        expect(gap).toBeGreaterThanOrEqual(49); // Allow 1px tolerance
      }
    }
  });

  it('should handle 10+ children with grid layout and proper spacing', () => {
    // Create a tree with 15 children (triggers grid layout)
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push({
      id: 'parent',
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question: 'Parent question',
        response: 'Parent response',
        timestamp: new Date().toISOString(),
        positioned: false,
      },
    });

    for (let i = 1; i <= 15; i++) {
      nodes.push({
        id: `child-${i}`,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          question: `Child ${i} question`,
          response: `Child ${i} response`,
          timestamp: new Date().toISOString(),
          positioned: false,
        },
      });

      edges.push({
        id: `parent-child-${i}`,
        source: 'parent',
        target: `child-${i}`,
      });
    }

    const positioned = orchestrator.layout(nodes, edges);
    const children = positioned.filter(n => n.id.startsWith('child-'));

    // Check that no children overlap
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const child1 = children[i];
        const child2 = children[j];

        const horizontalOverlap = child1.position.x < child2.position.x + 450 && 
                                  child1.position.x + 450 > child2.position.x;
        const verticalOverlap = child1.position.y < child2.position.y + 468 && 
                               child1.position.y + 468 > child2.position.y;

        expect(horizontalOverlap && verticalOverlap).toBe(false);
      }
    }

    // Check spacing for nodes on the same row
    const nodesByRow = new Map<number, typeof children>();
    children.forEach(child => {
      const row = Math.round(child.position.y / 100); // Group by approximate Y position
      if (!nodesByRow.has(row)) {
        nodesByRow.set(row, []);
      }
      nodesByRow.get(row)!.push(child);
    });

    nodesByRow.forEach((rowNodes, row) => {
      const sorted = rowNodes.sort((a, b) => a.position.x - b.position.x);
      console.log(`\nRow ${row} (${sorted.length} nodes):`);

      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].position.x - (sorted[i].position.x + 450);
        console.log(`  Gap: ${gap}px`);
        expect(gap).toBeGreaterThanOrEqual(49); // Allow 1px tolerance
      }
    });
  });
});

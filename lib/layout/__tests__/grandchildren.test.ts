/**
 * Test grandchildren positioning
 */

import { LayoutOrchestrator } from '../LayoutOrchestrator';
import { DEFAULT_CONFIG } from '../config';
import { Node, Edge } from '../types';

describe('Grandchildren Positioning', () => {
  let orchestrator: LayoutOrchestrator;

  beforeEach(() => {
    orchestrator = new LayoutOrchestrator(DEFAULT_CONFIG);
  });

  it('should position grandchildren without overlaps', () => {
    // Create a tree: root -> 3 children, each child has 2 grandchildren
    const nodes: Node[] = [
      { id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'child-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'child-2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'child-3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-1-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-1-2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-2-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-2-2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-3-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      { id: 'gc-3-2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'child-1' },
      { id: 'e2', source: 'root', target: 'child-2' },
      { id: 'e3', source: 'root', target: 'child-3' },
      { id: 'e4', source: 'child-1', target: 'gc-1-1' },
      { id: 'e5', source: 'child-1', target: 'gc-1-2' },
      { id: 'e6', source: 'child-2', target: 'gc-2-1' },
      { id: 'e7', source: 'child-2', target: 'gc-2-2' },
      { id: 'e8', source: 'child-3', target: 'gc-3-1' },
      { id: 'e9', source: 'child-3', target: 'gc-3-2' },
    ];

    const positioned = orchestrator.layout(nodes, edges);
    const posMap = new Map(positioned.map(n => [n.id, n.position]));

    // Check all grandchildren for overlaps
    const grandchildren = ['gc-1-1', 'gc-1-2', 'gc-2-1', 'gc-2-2', 'gc-3-1', 'gc-3-2'];
    
    for (let i = 0; i < grandchildren.length; i++) {
      for (let j = i + 1; j < grandchildren.length; j++) {
        const pos1 = posMap.get(grandchildren[i])!;
        const pos2 = posMap.get(grandchildren[j])!;
        
        const gap = Math.abs(pos2.x - pos1.x);
        
        console.log(`Gap between ${grandchildren[i]} and ${grandchildren[j]}: ${gap}px`);
        
        // Should have at least 50px gap
        expect(gap).toBeGreaterThanOrEqual(49);
      }
    }
  });
});

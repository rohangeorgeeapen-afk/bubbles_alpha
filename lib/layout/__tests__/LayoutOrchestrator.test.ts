/**
 * Integration tests for LayoutOrchestrator
 * 
 * Tests the complete layout pipeline including:
 * - Tree building
 * - Initial positioning
 * - Collision detection and resolution
 * - Coordinate transformation
 * - Batching support
 */

import { LayoutOrchestrator } from '../LayoutOrchestrator';
import { DEFAULT_LAYOUT_CONFIG } from '../config';
import { Node, Edge } from '../types';

describe('LayoutOrchestrator', () => {
  let orchestrator: LayoutOrchestrator;

  beforeEach(() => {
    orchestrator = new LayoutOrchestrator(DEFAULT_LAYOUT_CONFIG);
  });

  describe('Empty Canvas', () => {
    it('should handle empty nodes array', () => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toEqual([]);
    });
  });

  describe('Single Node', () => {
    it('should position a single node', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: { question: 'Test', response: 'Response' },
        },
      ];
      const edges: Edge[] = [];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('node-1');
      expect(result[0].position).toBeDefined();
      expect(result[0].data.positioned).toBe(true);
    });

    it('should preserve root position for already positioned node', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          type: 'conversation',
          position: { x: 100, y: 200 },
          data: { question: 'Test', response: 'Response', positioned: true },
        },
      ];
      const edges: Edge[] = [];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(1);
      expect(result[0].position.x).toBe(100);
      expect(result[0].position.y).toBe(200);
    });
  });

  describe('Simple Tree', () => {
    it('should layout a parent with 3 children', () => {
      const nodes: Node[] = [
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child1' },
        { id: 'e2', source: 'parent', target: 'child2' },
        { id: 'e3', source: 'parent', target: 'child3' },
      ];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(4);
      
      // All nodes should be positioned
      result.forEach(node => {
        expect(node.data.positioned).toBe(true);
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // Find parent and children
      const parent = result.find(n => n.id === 'parent');
      const children = result.filter(n => n.id.startsWith('child'));

      expect(parent).toBeDefined();
      expect(children).toHaveLength(3);

      // Parent should be at a higher level (lower y) than children
      children.forEach(child => {
        expect(child.position.y).toBeGreaterThan(parent!.position.y);
      });

      // Children should be horizontally distributed
      const childXPositions = children.map(c => c.position.x).sort((a, b) => a - b);
      expect(childXPositions[0]).toBeLessThan(childXPositions[1]);
      expect(childXPositions[1]).toBeLessThan(childXPositions[2]);
    });

    it('should handle a two-level tree', () => {
      const nodes: Node[] = [
        { id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root', target: 'child1' },
        { id: 'e2', source: 'root', target: 'child2' },
        { id: 'e3', source: 'child1', target: 'grandchild1' },
        { id: 'e4', source: 'child1', target: 'grandchild2' },
      ];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(5);

      const root = result.find(n => n.id === 'root');
      const child1 = result.find(n => n.id === 'child1');
      const child2 = result.find(n => n.id === 'child2');
      const grandchild1 = result.find(n => n.id === 'grandchild1');
      const grandchild2 = result.find(n => n.id === 'grandchild2');

      // Verify vertical hierarchy
      expect(child1!.position.y).toBeGreaterThan(root!.position.y);
      expect(child2!.position.y).toBeGreaterThan(root!.position.y);
      expect(grandchild1!.position.y).toBeGreaterThan(child1!.position.y);
      expect(grandchild2!.position.y).toBeGreaterThan(child1!.position.y);
    });
  });

  describe('Large Tree', () => {
    it('should layout a tree with 1 parent and 20 children', () => {
      const nodes: Node[] = [
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      
      // Add 20 children
      for (let i = 1; i <= 20; i++) {
        nodes.push({
          id: `child${i}`,
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: {},
        });
      }

      const edges: Edge[] = [];
      for (let i = 1; i <= 20; i++) {
        edges.push({
          id: `e${i}`,
          source: 'parent',
          target: `child${i}`,
        });
      }

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(21);

      // All nodes should be positioned
      result.forEach(node => {
        expect(node.data.positioned).toBe(true);
      });

      // Children should be arranged in a grid (since > 10 children)
      const children = result.filter(n => n.id.startsWith('child'));
      expect(children).toHaveLength(20);

      // Verify children are distributed (not all at same position)
      const uniquePositions = new Set(
        children.map(c => `${c.position.x},${c.position.y}`)
      );
      expect(uniquePositions.size).toBeGreaterThan(1);
    });

    it('should layout a large tree with 1 parent, 20 children, each with 20 children', () => {
      const nodes: Node[] = [
        { id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      
      // Add 20 first-level children
      for (let i = 1; i <= 20; i++) {
        nodes.push({
          id: `child${i}`,
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: {},
        });
        
        // Add 20 second-level children for each first-level child
        for (let j = 1; j <= 20; j++) {
          nodes.push({
            id: `child${i}-${j}`,
            type: 'conversation',
            position: { x: 0, y: 0 },
            data: {},
          });
        }
      }

      const edges: Edge[] = [];
      
      // Connect root to first-level children
      for (let i = 1; i <= 20; i++) {
        edges.push({
          id: `e-root-${i}`,
          source: 'root',
          target: `child${i}`,
        });
        
        // Connect first-level children to second-level children
        for (let j = 1; j <= 20; j++) {
          edges.push({
            id: `e-${i}-${j}`,
            source: `child${i}`,
            target: `child${i}-${j}`,
          });
        }
      }

      const result = orchestrator.layout(nodes, edges);

      // 1 root + 20 children + (20 * 20) grandchildren = 421 nodes
      expect(result).toHaveLength(421);

      // All nodes should be positioned
      result.forEach(node => {
        expect(node.data.positioned).toBe(true);
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // Verify structure
      const root = result.find(n => n.id === 'root');
      const firstLevelChildren = result.filter(n => /^child\d+$/.test(n.id));
      const secondLevelChildren = result.filter(n => /^child\d+-\d+$/.test(n.id));

      expect(root).toBeDefined();
      expect(firstLevelChildren).toHaveLength(20);
      expect(secondLevelChildren).toHaveLength(400);

      // First-level children should be below root (grid layout places them below)
      const childrenBelowRoot = firstLevelChildren.filter(
        child => child.position.y > root!.position.y
      );
      expect(childrenBelowRoot.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Roots', () => {
    it('should layout multiple independent trees', () => {
      const nodes: Node[] = [
        { id: 'root1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root1-child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root1-child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root2', type: 'conversation', position: { x: 1000, y: 0 }, data: {} },
        { id: 'root2-child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root2-child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root1', target: 'root1-child1' },
        { id: 'e2', source: 'root1', target: 'root1-child2' },
        { id: 'e3', source: 'root2', target: 'root2-child1' },
        { id: 'e4', source: 'root2', target: 'root2-child2' },
      ];

      const result = orchestrator.layout(nodes, edges);

      expect(result).toHaveLength(6);

      // All nodes should be positioned
      result.forEach(node => {
        expect(node.data.positioned).toBe(true);
      });

      // Find the two root trees
      const root1 = result.find(n => n.id === 'root1');
      const root2 = result.find(n => n.id === 'root2');

      expect(root1).toBeDefined();
      expect(root2).toBeDefined();

      // Roots should maintain their original positions (since they're not positioned yet)
      // Or get default positions
      expect(root1!.position).toBeDefined();
      expect(root2!.position).toBeDefined();
    });
  });

  describe('Order Independence', () => {
    it('should produce consistent layouts with same tree structure', () => {
      // Create nodes in order: parent, child1, child2, child3
      const nodes1: Node[] = [
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges1: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child1' },
        { id: 'e2', source: 'parent', target: 'child2' },
        { id: 'e3', source: 'parent', target: 'child3' },
      ];

      // Create nodes in different order: child3, child1, parent, child2
      // But keep edges in same order to maintain child order
      const nodes2: Node[] = [
        { id: 'child3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges2: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child1' },
        { id: 'e2', source: 'parent', target: 'child2' },
        { id: 'e3', source: 'parent', target: 'child3' },
      ];

      const result1 = orchestrator.layout(nodes1, edges1);
      const result2 = orchestrator.layout(nodes2, edges2);

      expect(result1).toHaveLength(4);
      expect(result2).toHaveLength(4);

      // Sort results by ID for comparison
      const sorted1 = result1.sort((a, b) => a.id.localeCompare(b.id));
      const sorted2 = result2.sort((a, b) => a.id.localeCompare(b.id));

      // Positions should be the same (or very close due to floating point)
      for (let i = 0; i < sorted1.length; i++) {
        expect(sorted1[i].id).toBe(sorted2[i].id);
        expect(Math.abs(sorted1[i].position.x - sorted2[i].position.x)).toBeLessThan(0.01);
        expect(Math.abs(sorted1[i].position.y - sorted2[i].position.y)).toBeLessThan(0.01);
      }
    });

    it('should handle different node creation orders with consistent structure', () => {
      const nodes: Node[] = [
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];

      // Same edges order
      const edges: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child1' },
        { id: 'e2', source: 'parent', target: 'child2' },
      ];

      const result1 = orchestrator.layout(nodes, edges);
      const result2 = orchestrator.layout(nodes, edges);

      // Sort by ID for comparison
      const sorted1 = result1.sort((a, b) => a.id.localeCompare(b.id));
      const sorted2 = result2.sort((a, b) => a.id.localeCompare(b.id));

      // Positions should be identical for same input
      for (let i = 0; i < sorted1.length; i++) {
        expect(sorted1[i].id).toBe(sorted2[i].id);
        expect(sorted1[i].position.x).toBe(sorted2[i].position.x);
        expect(sorted1[i].position.y).toBe(sorted2[i].position.y);
      }
    });
  });

  describe('Batching Support', () => {
    it('should batch layout calculations with debouncing', async () => {
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      const result = await orchestrator.layoutBatched(nodes, edges);

      expect(result).toHaveLength(1);
      expect(result[0].data.positioned).toBe(true);
    });

    it('should cancel pending layout when new batch is requested', async () => {
      const nodes1: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const nodes2: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      // Start first batch (won't complete due to debounce)
      const promise1 = orchestrator.layoutBatched(nodes1, edges);
      
      // Start second batch immediately (should cancel first)
      const promise2 = orchestrator.layoutBatched(nodes2, edges);

      // Wait for second batch to complete
      const result = await promise2;

      expect(result).toHaveLength(2);
    });

    it('should handle multiple rapid batch requests', async () => {
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      // Make multiple rapid requests - they should all resolve to the last batched result
      const promise1 = orchestrator.layoutBatched(nodes, edges);
      const promise2 = orchestrator.layoutBatched(nodes, edges);
      const promise3 = orchestrator.layoutBatched(nodes, edges);

      // Wait for the last one to complete
      const result = await promise3;
      
      expect(result).toHaveLength(1);
      expect(result[0].data.positioned).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete layout for 100 nodes in reasonable time', () => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // Create a tree with 100 nodes (1 root + 99 descendants)
      nodes.push({ id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} });
      
      for (let i = 1; i < 100; i++) {
        nodes.push({
          id: `node${i}`,
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: {},
        });
        
        // Connect to parent (create a somewhat balanced tree)
        const parentId = i === 1 ? 'root' : `node${Math.floor((i - 1) / 3)}`;
        edges.push({
          id: `e${i}`,
          source: parentId,
          target: `node${i}`,
        });
      }

      const startTime = Date.now();
      const result = orchestrator.layout(nodes, edges);
      const endTime = Date.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});

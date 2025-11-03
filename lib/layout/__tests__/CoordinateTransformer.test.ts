/**
 * Unit tests for CoordinateTransformer
 * 
 * Tests the conversion of relative tree coordinates to absolute canvas coordinates,
 * including handling of multiple roots and preserved root positions.
 */

import { CoordinateTransformer } from '../CoordinateTransformer';
import { TreeBuilder } from '../TreeBuilder';
import { Node, Edge, TreeNode } from '../types';

describe('CoordinateTransformer', () => {
  let transformer: CoordinateTransformer;
  let builder: TreeBuilder;

  beforeEach(() => {
    transformer = new CoordinateTransformer();
    builder = new TreeBuilder();
  });

  describe('Single Tree Transformation', () => {
    it('should transform a single node with default root position', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: { question: 'Test', response: 'Response' },
        },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);
      
      // Set relative position
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('node-1');
      // Default root position is (0, 100)
      expect(result[0].position).toEqual({ x: 0, y: 100 });
      expect(result[0].data.positioned).toBe(true);
    });

    it('should transform a simple parent-child tree', () => {
      const nodes: Node[] = [
        {
          id: 'parent',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: { question: 'Parent', response: 'Response' },
        },
        {
          id: 'child',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: { question: 'Child', response: 'Response' },
        },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 100;
      tree.roots[0].children[0].y = 548; // nodeHeight (468) + verticalSpacing (80)

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(2);
      
      const parent = result.find(n => n.id === 'parent');
      const child = result.find(n => n.id === 'child');
      
      expect(parent?.position).toEqual({ x: 0, y: 100 });
      expect(child?.position).toEqual({ x: 100, y: 648 });
      expect(parent?.data.positioned).toBe(true);
      expect(child?.data.positioned).toBe(true);
    });

    it('should transform a tree with multiple children', () => {
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

      const tree = builder.build(nodes, edges);
      
      // Set relative positions (simulating layout algorithm output)
      tree.roots[0].x = 500;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 0;
      tree.roots[0].children[0].y = 548;
      tree.roots[0].children[1].x = 500;
      tree.roots[0].children[1].y = 548;
      tree.roots[0].children[2].x = 1000;
      tree.roots[0].children[2].y = 548;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(4);
      
      const parent = result.find(n => n.id === 'parent');
      const child1 = result.find(n => n.id === 'child1');
      const child2 = result.find(n => n.id === 'child2');
      const child3 = result.find(n => n.id === 'child3');
      
      expect(parent?.position).toEqual({ x: 500, y: 100 });
      expect(child1?.position).toEqual({ x: 0, y: 648 });
      expect(child2?.position).toEqual({ x: 500, y: 648 });
      expect(child3?.position).toEqual({ x: 1000, y: 648 });
    });

    it('should preserve original node data', () => {
      const originalData = {
        question: 'Test Question',
        response: 'Test Response',
        timestamp: '2024-01-01',
        customField: 'custom value',
      };
      
      const nodes: Node[] = [
        {
          id: 'node-1',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: originalData,
        },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result[0].data.question).toBe('Test Question');
      expect(result[0].data.response).toBe('Test Response');
      expect(result[0].data.timestamp).toBe('2024-01-01');
      expect(result[0].data.customField).toBe('custom value');
      expect(result[0].data.positioned).toBe(true);
    });
  });

  describe('Multiple Roots with Different Positions', () => {
    it('should handle multiple roots with default positions', () => {
      const nodes: Node[] = [
        { id: 'root1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[1].x = 0;
      tree.roots[1].y = 0;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(2);
      
      // Both roots should get default position (0, 100)
      const root1 = result.find(n => n.id === 'root1');
      const root2 = result.find(n => n.id === 'root2');
      
      expect(root1?.position).toEqual({ x: 0, y: 100 });
      expect(root2?.position).toEqual({ x: 0, y: 100 });
    });

    it('should handle multiple roots with custom positions', () => {
      const nodes: Node[] = [
        { id: 'root1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root1', target: 'child1' },
        { id: 'e2', source: 'root2', target: 'child2' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 0;
      tree.roots[0].children[0].y = 548;
      
      tree.roots[1].x = 0;
      tree.roots[1].y = 0;
      tree.roots[1].children[0].x = 0;
      tree.roots[1].children[0].y = 548;

      // Provide custom root positions
      const rootPositions = new Map<string, { x: number; y: number }>();
      rootPositions.set('root1', { x: 100, y: 200 });
      rootPositions.set('root2', { x: 1000, y: 300 });
      
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(4);
      
      const root1 = result.find(n => n.id === 'root1');
      const root2 = result.find(n => n.id === 'root2');
      const child1 = result.find(n => n.id === 'child1');
      const child2 = result.find(n => n.id === 'child2');
      
      // Roots should use custom positions
      expect(root1?.position).toEqual({ x: 100, y: 200 });
      expect(root2?.position).toEqual({ x: 1000, y: 300 });
      
      // Children should be offset from their root's position
      expect(child1?.position).toEqual({ x: 100, y: 748 });
      expect(child2?.position).toEqual({ x: 1000, y: 848 });
    });

    it('should handle mix of preserved and new root positions', () => {
      const nodes: Node[] = [
        { id: 'root1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'root3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[1].x = 0;
      tree.roots[1].y = 0;
      tree.roots[2].x = 0;
      tree.roots[2].y = 0;

      // Only provide position for root1 and root2
      const rootPositions = new Map<string, { x: number; y: number }>();
      rootPositions.set('root1', { x: 100, y: 200 });
      rootPositions.set('root2', { x: 500, y: 600 });
      
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(3);
      
      const root1 = result.find(n => n.id === 'root1');
      const root2 = result.find(n => n.id === 'root2');
      const root3 = result.find(n => n.id === 'root3');
      
      // root1 and root2 should use preserved positions
      expect(root1?.position).toEqual({ x: 100, y: 200 });
      expect(root2?.position).toEqual({ x: 500, y: 600 });
      
      // root3 should use default position
      expect(root3?.position).toEqual({ x: 0, y: 100 });
    });
  });

  describe('Preserved Root Positions', () => {
    it('should respect preserved root positions', () => {
      const nodes: Node[] = [
        {
          id: 'root',
          type: 'conversation',
          position: { x: 500, y: 300 },
          data: { positioned: true },
        },
        {
          id: 'child',
          type: 'conversation',
          position: { x: 0, y: 0 },
          data: {},
        },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root', target: 'child' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 100;
      tree.roots[0].children[0].y = 548;

      // Preserve the root's existing position
      const rootPositions = new Map<string, { x: number; y: number }>();
      rootPositions.set('root', { x: 500, y: 300 });
      
      const result = transformer.transform(tree, rootPositions);

      const root = result.find(n => n.id === 'root');
      const child = result.find(n => n.id === 'child');
      
      // Root should maintain its preserved position
      expect(root?.position).toEqual({ x: 500, y: 300 });
      
      // Child should be offset from the preserved root position
      expect(child?.position).toEqual({ x: 600, y: 848 });
    });

    it('should apply offset to entire subtree based on root position', () => {
      const nodes: Node[] = [
        { id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root', target: 'child1' },
        { id: 'e2', source: 'root', target: 'child2' },
        { id: 'e3', source: 'child1', target: 'grandchild' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = -250;
      tree.roots[0].children[0].y = 548;
      tree.roots[0].children[1].x = 250;
      tree.roots[0].children[1].y = 548;
      tree.nodeMap.get('child1')!.children[0].x = -250;
      tree.nodeMap.get('child1')!.children[0].y = 1096;

      // Set custom root position
      const rootPositions = new Map<string, { x: number; y: number }>();
      rootPositions.set('root', { x: 1000, y: 500 });
      
      const result = transformer.transform(tree, rootPositions);

      const root = result.find(n => n.id === 'root');
      const child1 = result.find(n => n.id === 'child1');
      const child2 = result.find(n => n.id === 'child2');
      const grandchild = result.find(n => n.id === 'grandchild');
      
      // All nodes should be offset by the root position (1000, 500)
      expect(root?.position).toEqual({ x: 1000, y: 500 });
      expect(child1?.position).toEqual({ x: 750, y: 1048 });
      expect(child2?.position).toEqual({ x: 1250, y: 1048 });
      expect(grandchild?.position).toEqual({ x: 750, y: 1596 });
    });
  });

  describe('Deep Tree Transformation', () => {
    it('should transform a deep tree structure correctly', () => {
      const nodes: Node[] = [
        { id: 'level0', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'level0', target: 'level1' },
        { id: 'e2', source: 'level1', target: 'level2' },
        { id: 'e3', source: 'level2', target: 'level3' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set relative positions (each level 548 pixels down)
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 0;
      tree.roots[0].children[0].y = 548;
      tree.nodeMap.get('level1')!.children[0].x = 0;
      tree.nodeMap.get('level1')!.children[0].y = 1096;
      tree.nodeMap.get('level2')!.children[0].x = 0;
      tree.nodeMap.get('level2')!.children[0].y = 1644;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(4);
      
      const level0 = result.find(n => n.id === 'level0');
      const level1 = result.find(n => n.id === 'level1');
      const level2 = result.find(n => n.id === 'level2');
      const level3 = result.find(n => n.id === 'level3');
      
      expect(level0?.position).toEqual({ x: 0, y: 100 });
      expect(level1?.position).toEqual({ x: 0, y: 648 });
      expect(level2?.position).toEqual({ x: 0, y: 1196 });
      expect(level3?.position).toEqual({ x: 0, y: 1744 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tree', () => {
      const tree = builder.build([], []);
      const rootPositions = new Map<string, { x: number; y: number }>();
      
      const result = transformer.transform(tree, rootPositions);

      expect(result).toHaveLength(0);
    });

    it('should mark all nodes as positioned', () => {
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'node1', target: 'node2' },
        { id: 'e2', source: 'node2', target: 'node3' },
      ];

      const tree = builder.build(nodes, edges);
      
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = 0;
      tree.roots[0].children[0].y = 548;
      tree.nodeMap.get('node2')!.children[0].x = 0;
      tree.nodeMap.get('node2')!.children[0].y = 1096;

      const rootPositions = new Map<string, { x: number; y: number }>();
      const result = transformer.transform(tree, rootPositions);

      // All nodes should be marked as positioned
      result.forEach(node => {
        expect(node.data.positioned).toBe(true);
      });
    });

    it('should handle negative relative positions', () => {
      const nodes: Node[] = [
        { id: 'parent', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'parent', target: 'child' },
      ];

      const tree = builder.build(nodes, edges);
      
      // Set negative relative position for child
      tree.roots[0].x = 0;
      tree.roots[0].y = 0;
      tree.roots[0].children[0].x = -500;
      tree.roots[0].children[0].y = 548;

      const rootPositions = new Map<string, { x: number; y: number }>();
      rootPositions.set('parent', { x: 1000, y: 500 });
      
      const result = transformer.transform(tree, rootPositions);

      const parent = result.find(n => n.id === 'parent');
      const child = result.find(n => n.id === 'child');
      
      expect(parent?.position).toEqual({ x: 1000, y: 500 });
      expect(child?.position).toEqual({ x: 500, y: 1048 }); // 1000 + (-500), 500 + 548
    });
  });
});

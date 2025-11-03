/**
 * Unit tests for TreeBuilder
 * 
 * Tests the conversion of flat node/edge arrays into hierarchical tree structure
 * including cycle detection and handling.
 */

import { TreeBuilder } from '../TreeBuilder';
import { Node, Edge } from '../types';

describe('TreeBuilder', () => {
  let builder: TreeBuilder;

  beforeEach(() => {
    builder = new TreeBuilder();
  });

  describe('Single Node', () => {
    it('should handle a single node with no edges', () => {
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

      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('node-1');
      expect(tree.roots[0].children).toHaveLength(0);
      expect(tree.roots[0].parent).toBeNull();
      expect(tree.nodeMap.size).toBe(1);
      expect(tree.nodeMap.get('node-1')).toBe(tree.roots[0]);
    });
  });

  describe('Simple Parent-Child Relationship', () => {
    it('should build a simple parent-child tree', () => {
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

      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('parent');
      expect(tree.roots[0].children).toHaveLength(1);
      expect(tree.roots[0].children[0].id).toBe('child');
      expect(tree.roots[0].children[0].parent).toBe(tree.roots[0]);
    });

    it('should handle parent with multiple children', () => {
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

      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('parent');
      expect(tree.roots[0].children).toHaveLength(3);
      
      const childIds = tree.roots[0].children.map(c => c.id);
      expect(childIds).toContain('child1');
      expect(childIds).toContain('child2');
      expect(childIds).toContain('child3');
    });
  });

  describe('Multiple Roots', () => {
    it('should identify multiple root nodes', () => {
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

      expect(tree.roots).toHaveLength(2);
      
      const rootIds = tree.roots.map(r => r.id);
      expect(rootIds).toContain('root1');
      expect(rootIds).toContain('root2');
    });
  });

  describe('Deep Hierarchy', () => {
    it('should build a deep tree structure', () => {
      const nodes: Node[] = [
        { id: 'level0', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'level4', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'level0', target: 'level1' },
        { id: 'e2', source: 'level1', target: 'level2' },
        { id: 'e3', source: 'level2', target: 'level3' },
        { id: 'e4', source: 'level3', target: 'level4' },
      ];

      const tree = builder.build(nodes, edges);

      expect(tree.roots).toHaveLength(1);
      
      let current = tree.roots[0];
      expect(current.id).toBe('level0');
      
      current = current.children[0];
      expect(current.id).toBe('level1');
      
      current = current.children[0];
      expect(current.id).toBe('level2');
      
      current = current.children[0];
      expect(current.id).toBe('level3');
      
      current = current.children[0];
      expect(current.id).toBe('level4');
      expect(current.children).toHaveLength(0);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect and break a simple cycle', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'node1', target: 'node2' },
        { id: 'e2', source: 'node2', target: 'node1' }, // Creates cycle
      ];

      const tree = builder.build(nodes, edges);

      // Should have broken the cycle
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warningMessage = consoleWarnSpy.mock.calls[0]?.[0] || '';
      expect(warningMessage).toContain('Cycle');
      
      // Should have one root (the cycle was broken)
      expect(tree.roots).toHaveLength(1);
      
      consoleWarnSpy.mockRestore();
    });

    it('should detect and break a three-node cycle', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'node3', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'node1', target: 'node2' },
        { id: 'e2', source: 'node2', target: 'node3' },
        { id: 'e3', source: 'node3', target: 'node1' }, // Creates cycle
      ];

      const tree = builder.build(nodes, edges);

      // Should have detected the cycle
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warningMessage = consoleWarnSpy.mock.calls[0]?.[0] || '';
      expect(warningMessage).toContain('Cycle');
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle self-loop (node pointing to itself)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'node1', target: 'node1' }, // Self-loop
      ];

      const tree = builder.build(nodes, edges);

      // Should detect the self-loop as a cycle
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warningMessage = consoleWarnSpy.mock.calls[0]?.[0] || '';
      expect(warningMessage).toContain('Cycle');
      
      // Node should be a root with no children
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('node1');
      expect(tree.roots[0].children).toHaveLength(0);
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty nodes and edges arrays', () => {
      const tree = builder.build([], []);

      expect(tree.roots).toHaveLength(0);
      expect(tree.nodeMap.size).toBe(0);
    });

    it('should handle edges referencing non-existent nodes', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'node1', target: 'nonexistent' },
        { id: 'e2', source: 'nonexistent', target: 'node1' },
      ];

      const tree = builder.build(nodes, edges);

      // Should warn about non-existent nodes
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Should still build a valid tree with the existing node
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('node1');
      
      consoleWarnSpy.mockRestore();
    });

    it('should set correct node dimensions', () => {
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);

      const treeNode = tree.roots[0];
      expect(treeNode.width).toBe(450);
      expect(treeNode.height).toBe(468);
    });

    it('should initialize Reingold-Tilford fields', () => {
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);

      const treeNode = tree.roots[0];
      expect(treeNode.mod).toBe(0);
      expect(treeNode.thread).toBeNull();
      expect(treeNode.change).toBe(0);
      expect(treeNode.shift).toBe(0);
      expect(treeNode.prelim).toBe(0);
    });

    it('should preserve original node data', () => {
      const originalData = { question: 'Test Question', response: 'Test Response', custom: 'value' };
      const nodes: Node[] = [
        { id: 'node1', type: 'conversation', position: { x: 100, y: 200 }, data: originalData },
      ];
      const edges: Edge[] = [];

      const tree = builder.build(nodes, edges);

      const treeNode = tree.roots[0];
      expect(treeNode.data.data).toBe(originalData);
      expect(treeNode.data.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('Complex Tree Structures', () => {
    it('should handle a tree with multiple branches at different levels', () => {
      const nodes: Node[] = [
        { id: 'root', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'child2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild1-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild1-2', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
        { id: 'grandchild2-1', type: 'conversation', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'root', target: 'child1' },
        { id: 'e2', source: 'root', target: 'child2' },
        { id: 'e3', source: 'child1', target: 'grandchild1-1' },
        { id: 'e4', source: 'child1', target: 'grandchild1-2' },
        { id: 'e5', source: 'child2', target: 'grandchild2-1' },
      ];

      const tree = builder.build(nodes, edges);

      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].id).toBe('root');
      expect(tree.roots[0].children).toHaveLength(2);
      
      const child1 = tree.nodeMap.get('child1');
      expect(child1?.children).toHaveLength(2);
      
      const child2 = tree.nodeMap.get('child2');
      expect(child2?.children).toHaveLength(1);
    });
  });
});

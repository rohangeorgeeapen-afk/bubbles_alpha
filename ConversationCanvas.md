"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ConversationNode, { ConversationNodeData } from './ConversationNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, Undo2 } from 'lucide-react';
import { getLayoutedElements } from '@/lib/utils/layout';
import { ViewportManager } from '@/lib/utils/viewport-manager';

const nodeTypes = {
  conversation: ConversationNode as any,
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onUpdate?: (nodes: Node[], edges: Edge[]) => void;
}

// Inner component that uses ReactFlow hooks
function ConversationCanvasInner({ 
  initialNodes = [], 
  initialEdges = [],
  onUpdate 
}: ConversationCanvasProps = {}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nodeIdCounter = useRef(initialNodes.length);
  const hasInitialized = useRef(false);
  
  // Initialize ReactFlow instance for viewport control
  const reactFlowInstance = useReactFlow();
  
  // Panning queue management
  const [isPanning, setIsPanning] = useState(false);
  const panQueue = useRef<Array<{ parentId: string; childId: string; nodes: Node[] }>>([]);
  const userInteracting = useRef(false);
  
  // Undo delete functionality
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedState, setDeletedState] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Process the next item in the panning queue
  const processPanQueue = useCallback(() => {
    // Don't process queue if user is interacting
    if (userInteracting.current) {
      console.log('🚫 User interacting, skipping queue processing');
      return;
    }
    
    if (panQueue.current.length === 0) {
      return;
    }
    
    const nextPan = panQueue.current.shift();
    if (nextPan) {
      console.log('📋 Processing queued pan operation:', nextPan.parentId, '->', nextPan.childId);
      handleSmartPanningInternal(nextPan.parentId, nextPan.childId, nextPan.nodes);
    }
  }, []);
  
  // Use refs to always have access to latest nodes and edges
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Custom node change handler to track manual positioning
  const handleNodesChange = useCallback((changes: any) => {
    // Mark nodes as manually positioned when they're dragged
    const updatedChanges = changes.map((change: any) => {
      if (change.type === 'position' && change.dragging) {
        return {
          ...change,
          position: change.position,
        };
      }
      return change;
    });
    
    onNodesChange(updatedChanges);
    
    // After position changes, mark nodes as MANUALLY positioned
    changes.forEach((change: any) => {
      if (change.type === 'position' && !change.dragging && change.position) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === change.id
              ? { ...node, data: { ...node.data, positioned: true, manuallyPositioned: true } }
              : node
          )
        );
      }
    });
  }, [onNodesChange, setNodes]);

  const getConversationHistory = (nodeId: string, currentNodes: Node[], currentEdges: Edge[]): Message[] => {
    const history: Message[] = [];
    let currentNodeId: string | null = nodeId;

    console.log('🔍 Getting conversation history for node:', nodeId);
    console.log('📊 Current nodes:', currentNodes.map(n => ({ id: n.id, q: n.data.question })));
    console.log('🔗 Current edges:', currentEdges);

    while (currentNodeId) {
      const currentNode = currentNodes.find((n) => n.id === currentNodeId);
      if (!currentNode) {
        console.log('❌ Node not found:', currentNodeId);
        break;
      }

      if (currentNode.type === 'conversation') {
        const nodeData = currentNode.data as unknown as ConversationNodeData;
        console.log('✅ Adding to history:', { q: nodeData.question, a: nodeData.response.substring(0, 50) });
        history.unshift(
          { role: 'user', content: nodeData.question },
          { role: 'assistant', content: nodeData.response }
        );
      }

      const parentEdge = currentEdges.find((e) => e.target === currentNodeId);
      console.log('🔼 Parent edge:', parentEdge);
      currentNodeId = parentEdge ? parentEdge.source : null;
    }

    console.log('📝 Final history length:', history.length);
    return history;
  };

  // Internal function that performs the actual panning
  const handleSmartPanningInternal = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    try {
      // Check if ReactFlow instance is ready
      if (!reactFlowInstance) {
        console.warn('⚠️ ReactFlow instance not ready, skipping smart panning');
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify parentId and childId are provided
      if (!parentId || !childId) {
        console.warn('⚠️ Invalid node IDs provided:', { parentId, childId });
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify currentNodes array is valid
      if (!currentNodes || !Array.isArray(currentNodes) || currentNodes.length === 0) {
        console.warn('⚠️ Invalid nodes array provided');
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Get parent and child nodes with null checks
      const parentNode = currentNodes.find(n => n.id === parentId);
      const childNode = currentNodes.find(n => n.id === childId);

      // Null check: Parent node must exist
      if (!parentNode) {
        console.warn('⚠️ Parent node not found:', parentId);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Child node must exist
      if (!childNode) {
        console.warn('⚠️ Child node not found:', childId);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Null check: Verify node positions are valid
      if (!parentNode.position || typeof parentNode.position.x !== 'number' || typeof parentNode.position.y !== 'number') {
        console.warn('⚠️ Parent node has invalid position:', parentNode.position);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!childNode.position || typeof childNode.position.x !== 'number' || typeof childNode.position.y !== 'number') {
        console.warn('⚠️ Child node has invalid position:', childNode.position);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Calculate node bounds (width: 450px, height: 350-468px, using 468 for safety)
      const parentBounds = {
        x: parentNode.position.x,
        y: parentNode.position.y,
        width: 450,
        height: 468,
      };

      const childBounds = {
        x: childNode.position.x,
        y: childNode.position.y,
        width: 450,
        height: 468,
      };

      // Try-catch around viewport API calls
      let viewport, zoom, viewportWidth, viewportHeight;
      try {
        viewport = reactFlowInstance.getViewport();
        zoom = reactFlowInstance.getZoom();
        
        // Get viewport dimensions from the DOM
        const reactFlowWrapper = document.querySelector('.react-flow');
        viewportWidth = reactFlowWrapper?.clientWidth || window.innerWidth;
        viewportHeight = reactFlowWrapper?.clientHeight || window.innerHeight;
      } catch (viewportError) {
        console.warn('⚠️ Error getting viewport information:', viewportError);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      // Verify viewport data is valid
      if (!viewport || typeof zoom !== 'number' || !viewportWidth || !viewportHeight) {
        console.warn('⚠️ Invalid viewport data:', { viewport, zoom, viewportWidth, viewportHeight });
        setIsPanning(false);
        processPanQueue();
        return;
      }

      const viewportInfo = {
        x: viewport.x,
        y: viewport.y,
        zoom: zoom,
        width: viewportWidth,
        height: viewportHeight,
      };

      console.log('🔍 Smart Panning Check:', {
        parentId,
        childId,
        parentBounds,
        childBounds,
        viewportInfo,
      });

      // Try-catch around visibility check
      let visibilityResult;
      try {
        visibilityResult = ViewportManager.areBothNodesVisible(
          parentBounds,
          childBounds,
          viewportInfo,
          50 // 50px margin
        );
      } catch (visibilityError) {
        console.warn('⚠️ Error checking node visibility:', visibilityError);
        setIsPanning(false);
        processPanQueue();
        return;
      }

      console.log('👁️ Visibility Result:', visibilityResult);

      if (!visibilityResult.isVisible) {
        // Try-catch around bounds calculation
        let combinedBounds;
        try {
          combinedBounds = ViewportManager.calculateCombinedBounds(
            parentBounds,
            childBounds,
            50 // 50px margin
          );
        } catch (boundsError) {
          console.warn('⚠️ Error calculating combined bounds:', boundsError);
          setIsPanning(false);
          processPanQueue();
          return;
        }

        console.log('📐 Combined Bounds:', combinedBounds);
        console.log('🎯 Panning to show both nodes...');

        // Try-catch around fitBounds call
        try {
          reactFlowInstance.fitBounds(
            {
              x: combinedBounds.x,
              y: combinedBounds.y,
              width: combinedBounds.width,
              height: combinedBounds.height,
            },
            {
              duration: 500,
              padding: 0.01, // 1% padding - minimal zoom out, keeps text very readable
            }
          );
          
          // After panning completes, process next item in queue
          setTimeout(() => {
            setIsPanning(false);
            processPanQueue();
          }, 500); // Match the animation duration
        } catch (fitBoundsError) {
          console.warn('⚠️ Error calling fitBounds:', fitBoundsError);
          setIsPanning(false);
          processPanQueue();
          return;
        }
      } else {
        console.log('✅ Both nodes already visible, no panning needed');
        setIsPanning(false);
        processPanQueue();
      }
    } catch (error) {
      // Catch-all for any unexpected errors
      console.warn('⚠️ Unexpected error in handleSmartPanning:', error);
      // Don't throw - panning failure shouldn't break node creation
      setIsPanning(false);
      processPanQueue();
    }
  }, [reactFlowInstance, processPanQueue]);

  // Public function that handles queueing
  const handleSmartPanning = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    // Don't pan if user is interacting
    if (userInteracting.current) {
      console.log('🚫 User interacting, skipping auto-pan');
      return;
    }
    
    // If panning is in progress, add to queue
    if (isPanning) {
      console.log('⏳ Panning in progress, adding to queue:', parentId, '->', childId);
      panQueue.current.push({ parentId, childId, nodes: currentNodes });
      return;
    }
    
    // Otherwise, start panning immediately
    setIsPanning(true);
    handleSmartPanningInternal(parentId, childId, currentNodes);
  }, [isPanning, handleSmartPanningInternal]);

  // Notify parent of changes - strip out functions before saving
  // Use a ref to track the last saved state to avoid infinite loops
  const lastSavedState = useRef<string>('');
  
  useEffect(() => {
    if (onUpdate && nodes.length > 0) {
      // Create a hash of the current state
      const currentState = JSON.stringify({ 
        nodeIds: nodes.map(n => n.id),
        edgeIds: edges.map(e => e.id),
        nodeCount: nodes.length 
      });
      
      // Only update if state actually changed
      if (currentState !== lastSavedState.current) {
        lastSavedState.current = currentState;
        
        // Remove non-serializable data (functions) before saving
        const serializableNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onAddFollowUp: undefined, // Remove function
          }
        }));
        onUpdate(serializableNodes, edges);
      }
    }
  }, [nodes, edges, onUpdate]);

  const createConversationNode = useCallback(async (question: string, parentId: string | null) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleString();
    const nodeId = `conversation-${nodeIdCounter.current++}`;

    let conversationHistory: Message[] = [];
    if (parentId) {
      // Use refs to get the latest state
      conversationHistory = getConversationHistory(parentId, nodesRef.current, edgesRef.current);
    }
    conversationHistory.push({ role: 'user', content: question });

    let aiResponse = '';
    try {
      console.log('Sending request to /api/chat with messages:', conversationHistory);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to get AI response: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      aiResponse = data.response;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        aiResponse = 'Request timed out. Please try again.';
      } else {
        aiResponse = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
      }
    }

    const conversationNode: Node<ConversationNodeData> = {
      id: nodeId,
      type: 'conversation',
      position: { x: 0, y: 0 },
      data: {
        question,
        response: aiResponse,
        timestamp,
        onAddFollowUp: (nodeId: string, q: string) => {
          createConversationNode(q, nodeId);
        },
        onDelete: handleDeleteNode,
        positioned: false,
        manuallyPositioned: false,
      },
    };

    // Use functional updates to avoid stale closure issues
    // First update edges
    let updatedEdges: Edge[] = [];
    setEdges((currentEdges) => {
      const newEdges = [...currentEdges];
      if (parentId) {
        newEdges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId });
      }
      updatedEdges = newEdges;
      return newEdges;
    });

    // Then update nodes with the new edges
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes, conversationNode];

      const { nodes: layoutedNodes } = getLayoutedElements(newNodes, updatedEdges);
      
      // Update all nodes to have the callback
      const nodesWithCallback = layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: (nodeId: string, q: string) => {
            createConversationNode(q, nodeId);
          },
          onDelete: handleDeleteNode,
        }
      }));
      
      // Trigger smart panning after layout (only for child nodes)
      if (parentId) {
        requestAnimationFrame(() => {
          handleSmartPanning(parentId, nodeId, nodesWithCallback);
        });
      }
      
      return nodesWithCallback;
    });

    setIsLoading(false);
  }, [getConversationHistory, setNodes, setEdges, handleSmartPanning]);

  // Delete node and all its descendants
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Save current state for undo
    setDeletedState({
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    
    // Find all descendant nodes recursively
    const findDescendants = (id: string, currentEdges: Edge[]): string[] => {
      const childEdges = currentEdges.filter(e => e.source === id);
      const childIds = childEdges.map(e => e.target);
      const allDescendants = [...childIds];
      
      // Recursively find descendants of children
      childIds.forEach(childId => {
        allDescendants.push(...findDescendants(childId, currentEdges));
      });
      
      return allDescendants;
    };
    
    // Get all nodes to delete (the node itself + all descendants)
    const nodesToDelete = [nodeId, ...findDescendants(nodeId, edgesRef.current)];
    
    // Remove nodes
    setNodes(nds => nds.filter(n => !nodesToDelete.includes(n.id)));
    
    // Remove edges connected to deleted nodes
    setEdges(eds => eds.filter(e => 
      !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
    ));
    
    // Show undo toast
    setShowUndoToast(true);
    
    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    // Hide toast after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoToast(false);
      setDeletedState(null);
    }, 5000);
  }, [setNodes, setEdges]);
  
  // Undo delete
  const handleUndoDelete = useCallback(() => {
    if (deletedState) {
      setNodes(deletedState.nodes);
      setEdges(deletedState.edges);
      setShowUndoToast(false);
      setDeletedState(null);
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  }, [deletedState, setNodes, setEdges]);

  // Restore callbacks to nodes on mount
  useEffect(() => {
    if (!hasInitialized.current && nodes.length > 0) {
      hasInitialized.current = true;
      const nodesWithCallback = nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onAddFollowUp: (nodeId: string, q: string) => {
            createConversationNode(q, nodeId);
          },
          onDelete: handleDeleteNode,
        },
      }));
      setNodes(nodesWithCallback);
    }
  }, [nodes, createConversationNode, handleDeleteNode, setNodes]);

  const handleStartConversation = useCallback(async () => {
    const question = searchTerm.trim();
    if (!question) return;

    await createConversationNode(question, null);
    setSearchTerm('');
  }, [createConversationNode, searchTerm]);

  const handleSubmitFollowUp = useCallback(async () => {
    if (!followUpQuestion.trim() || !followUpParentId) return;

    await createConversationNode(followUpQuestion, followUpParentId);
    setIsAddingFollowUp(false);
    setFollowUpQuestion('');
    setFollowUpParentId(null);
  }, [followUpQuestion, followUpParentId, createConversationNode]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Handle user interaction to cancel auto-panning
  const handleUserInteraction = useCallback(() => {
    if (isPanning || panQueue.current.length > 0) {
      console.log('👤 User interaction detected, clearing pan queue');
      userInteracting.current = true;
      panQueue.current = [];
      setIsPanning(false);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        userInteracting.current = false;
      }, 1000);
    }
  }, [isPanning]);

  // Use onMove to detect both pan and zoom interactions
  const onMove = useCallback(() => {
    handleUserInteraction();
  }, [handleUserInteraction]);

  const filteredNodes = searchTerm
    ? nodes.filter((node) => {
        if (node.type === 'conversation') {
          const nodeData = node.data as unknown as ConversationNodeData;
          return (
            nodeData.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeData.response.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      })
    : nodes;

  return (
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMove={onMove}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1, minZoom: 0.5 }}
        minZoom={0.1}
        maxZoom={2}
        noWheelClassName="nowheel"
        noDragClassName="nodrag"
        noPanClassName="nopan"
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        nodesDraggable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="rgba(255, 255, 255, 0.03)" gap={20} size={1} />
        {nodes.length > 0 && (
          <>
            <Controls 
              className="!bg-transparent !border-none !shadow-none"
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
            <MiniMap 
              className="!bg-[#1a1a1a] !border-[#3a3a3a] !rounded-2xl !shadow-2xl !overflow-hidden backdrop-blur-sm" 
              maskColor="rgba(13, 13, 13, 0.85)"
              nodeColor="#2f2f2f"
              nodeStrokeColor="#4d4d4d"
              nodeBorderRadius={8}
              maskStrokeColor="#565656"
              maskStrokeWidth={2}
            />
          </>
        )}
        
        {/* ChatGPT-style centered input when no nodes */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-normal text-[#ececec] mb-2">What&apos;s on your mind today?</h1>
            </div>
            <div className="w-full max-w-3xl px-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ask anything"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim() && !isLoading) {
                      handleStartConversation();
                    }
                  }}
                  disabled={isLoading}
                  className="w-full h-14 bg-[#2f2f2f] border border-[#565656] text-[#ececec] placeholder:text-[#8e8e8e] rounded-3xl px-5 pr-14 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                />
                {isLoading ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-[#565656] border-t-[#ececec] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Button
                    onClick={handleStartConversation}
                    disabled={!searchTerm.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-full bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}


      </ReactFlow>

      <Dialog open={isAddingFollowUp} onOpenChange={setIsAddingFollowUp}>
        <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#ececec] font-semibold text-lg">Add Follow-up Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter your follow-up question..."
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitFollowUp();
                }
              }}
              disabled={isLoading}
              className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] focus:border-[#565656] focus:ring-0 rounded-lg"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingFollowUp(false)} disabled={isLoading} className="border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSubmitFollowUp} disabled={isLoading || !followUpQuestion.trim()} className="bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium">
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Delete Toast - positioned relative to canvas, not entire screen */}
      {showUndoToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4">
            <span className="text-[#ececec] text-sm font-medium">
              Node deleted
            </span>
            <Button
              onClick={handleUndoDelete}
              className="h-8 px-4 bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component that provides ReactFlow context
export default function ConversationCanvas(props: ConversationCanvasProps) {
  return (
    <ReactFlowProvider>
      <ConversationCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

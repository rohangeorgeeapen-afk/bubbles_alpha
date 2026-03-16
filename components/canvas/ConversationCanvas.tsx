"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ConversationNode, { ConversationNodeData } from './ConversationNode';
import FullscreenChatView from './FullscreenChatView';

// Extracted components
import CanvasEmptyState from './CanvasEmptyState';
import CanvasControls from './CanvasControls';
import UndoToast from './UndoToast';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import { FollowUpDialog, ExitConfirmationDialog } from './CanvasDialogs';

// Extracted hooks
import {
  useConversationHistory,
  useNetworkStatus,
  useSmartPanning,
  useStreamingChat,
  useNodeManager,
  useFullscreenMode,
  useCanvasPersistence,
} from './hooks';

import type { ConversationCanvasProps } from './types';

const nodeTypes = {
  conversation: ConversationNode as any,
};

// Inner component that uses ReactFlow hooks
function ConversationCanvasInner({
  initialNodes = [],
  initialEdges = [],
  onUpdate,
  sidebarOpen = true
}: ConversationCanvasProps = {}) {

  // Fix any stuck streaming nodes on mount (nodes that were saved mid-stream)
  const fixedInitialNodes = React.useMemo(() => {
    return initialNodes.map(node => {
      if (node.data?.isStreaming) {
        console.warn(`⚠️ Fixing stuck streaming node on mount: ${node.id}`);
        return {
          ...node,
          data: {
            ...node.data,
            isStreaming: false,
            response: node.data.response || 'Response was interrupted. Please try again.',
          }
        };
      }
      return node;
    });
  }, [initialNodes]);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(fixedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);

  // Welcome message
  const welcomeMessages = [
    "What's on your mind?",
    "Let's explore something new",
    "Start a conversation",
    "What would you like to know?",
    "Ask me anything",
    "Let's dive into a topic",
    "What are you curious about?",
    "Begin your exploration",
    "What's your question?",
    "Let's get started",
  ];

  const [welcomeMessage] = useState(() => {
    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  });

  // Initialize hooks
  const isOnline = useNetworkStatus();
  const { getConversationHistory, buildConversationThread } = useConversationHistory();
  const { handleSmartPanning, handleUserInteraction, reactFlowInstance } = useSmartPanning();
  const { streamChatResponse, abortStream } = useStreamingChat();

  // Node Manager hook
  const {
    createNode,
    createNodeInBackground,
    updateNodeData,
    deleteNode,
    undoDelete,
    showUndoToast,
    nodesRef,
    edgesRef
  } = useNodeManager({
    initialNodes: fixedInitialNodes,
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    getConversationHistory,
  });

  // Fullscreen Mode hook
  const {
    fullscreenState,
    isFullscreenLoading,
    animateToFullscreen,
    animateFromFullscreen,
    showExitConfirmation,
    enterFullscreenMode,
    exitFullscreenMode,
    handleFullscreenMessage,
    setShowExitConfirmation,
  } = useFullscreenMode({
    nodes,
    edges,
    reactFlowInstance,
    buildConversationThread,
    isOnline,
    onCreateNodeInBackground: createNodeInBackground,
  });

  // Persistence hook
  useCanvasPersistence({
    nodes,
    edges,
    onUpdate
  });

  // Custom node change handler
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Composition layer: Wire createNode with streaming
  const createConversationNode = useCallback(async (question: string, parentId: string | null) => {
    setIsLoading(true);

    try {
      await createNode({
        question,
        parentId,
        onStream: async (callbacks: any) => {
          const conversationHistory = parentId
            ? getConversationHistory(parentId, nodesRef.current, edgesRef.current)
            : [];
          conversationHistory.push({ role: 'user', content: question });

          return await streamChatResponse(
            { messages: conversationHistory, stream: true },
            callbacks
          );
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [createNode, getConversationHistory, streamChatResponse, nodesRef, edgesRef]);

  // Composition layer: Wire createBranchFromSelection with streaming
  const createBranchFromSelection = useCallback(async (
    parentNodeId: string,
    selectedText: string,
    question: string,
    startOffset: number,
    endOffset: number,
    isFromQuestion: boolean
  ) => {
    console.log('🌿 Creating branch from selection:', { parentNodeId, selectedText, question });

    // Placeholder selection that will be updated with real childNodeId
    const exploredSelection = {
      text: selectedText,
      startOffset,
      endOffset,
      childNodeId: '', // Will be updated after createNode
      isFromQuestion,
    };

    // Update parent node with placeholder selection
    setNodes((currentNodes: Node[]) =>
      currentNodes.map((node: Node) => {
        if (node.id === parentNodeId) {
          const existingSelections = (node.data as ConversationNodeData).exploredSelections || [];
          return {
            ...node,
            data: {
              ...node.data,
              exploredSelections: [...existingSelections, exploredSelection],
            },
          };
        }
        return node;
      })
    );

    // Create child node with streaming
    const childNodeId = await createNode({
      question,
      parentId: parentNodeId,
      onStream: async (callbacks: any) => {
        const conversationHistory = getConversationHistory(parentNodeId, nodesRef.current, edgesRef.current);
        const contextForAI = `Regarding "${selectedText}": ${question}`;
        conversationHistory.push({ role: 'user', content: contextForAI });

        return await streamChatResponse(
          { messages: conversationHistory, stream: true },
          callbacks
        );
      },
    });

    // Update the exploredSelection with the real childNodeId
    setNodes((currentNodes: Node[]) =>
      currentNodes.map((node: Node) => {
        if (node.id === parentNodeId) {
          const selections = (node.data as ConversationNodeData).exploredSelections || [];
          const updatedSelections = selections.map(sel =>
            sel.childNodeId === '' && sel.text === selectedText
              ? { ...sel, childNodeId }
              : sel
          );
          return {
            ...node,
            data: {
              ...node.data,
              exploredSelections: updatedSelections,
            },
          };
        }
        return node;
      })
    );
  }, [createNode, getConversationHistory, streamChatResponse, setNodes, nodesRef, edgesRef]);

  // Refs for callbacks to avoid stale closures
  const handleDeleteNodeRef = useRef<(nodeId: string) => void>(() => {});
  const enterFullscreenModeRef = useRef<(nodeId: string) => void>(() => {});
  const createConversationNodeRef = useRef<(question: string, parentId: string | null) => Promise<void>>(async () => {});
  const createBranchFromSelectionRef = useRef<any>(() => {});
  const navigateToNodeRef = useRef<(nodeId: string) => void>(() => {});

  // Keep callback refs updated
  useEffect(() => {
    handleDeleteNodeRef.current = deleteNode;
    enterFullscreenModeRef.current = enterFullscreenMode;
    createConversationNodeRef.current = createConversationNode;
    createBranchFromSelectionRef.current = createBranchFromSelection;
    // navigateToNode is not yet implemented in this simplified version
  }, [deleteNode, enterFullscreenMode, createConversationNode, createBranchFromSelection]);

  // Restore callbacks to nodes on mount
  useEffect(() => {
    if (!hasInitialized.current && nodes.length > 0) {
      hasInitialized.current = true;
      setNodes((currentNodes: Node[]) =>
        currentNodes.map((node: Node) => ({
          ...node,
          data: {
            ...node.data,
            onAddFollowUp: async (nodeId: string, q: string) => {
              await createConversationNodeRef.current(q, nodeId);
            },
            onBranchFromSelection: async (nodeId: string, text: string, q: string, start: number, end: number, fromQ: boolean) => {
              await createBranchFromSelectionRef.current(nodeId, text, q, start, end, fromQ);
            },
            onNavigateToNode: (nodeId: string) => navigateToNodeRef.current(nodeId),
            onDelete: (nodeId: string) => handleDeleteNodeRef.current(nodeId),
            onMaximize: (nodeId: string) => enterFullscreenModeRef.current(nodeId),
          },
        }))
      );

      // Initial fitView on mount
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.3, maxZoom: 1, duration: 300 });
        }, 100);
      }
    }
  }, [nodes, setNodes, reactFlowInstance]);

  // UI event handlers
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
    (connection: Connection) => setEdges((eds: Edge[]) => addEdge(connection, eds)),
    [setEdges]
  );

  const onMove = useCallback(() => {
    handleUserInteraction();
  }, [handleUserInteraction]);

  const filteredNodes = searchTerm
    ? nodes.filter((node: Node) => {
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

      {/* Render fullscreen chat view with smooth fade + scale animation */}
      {(fullscreenState.isFullscreen || fullscreenState.isTransitioning) && (
        <div
          className="absolute inset-0 z-40"
          style={{
            opacity: animateToFullscreen
              ? 1
              : animateFromFullscreen
                ? 0
                : fullscreenState.isFullscreen
                  ? 1
                  : 0,

            transform: animateToFullscreen
              ? 'scale(1) translateZ(0)'
              : animateFromFullscreen
                ? 'scale(0.96) translateZ(0)'
                : fullscreenState.isFullscreen
                  ? 'scale(1) translateZ(0)'
                  : 'scale(0.96) translateZ(0)',

            transition: (animateToFullscreen || animateFromFullscreen)
              ? 'opacity 400ms cubic-bezier(0.4, 0.0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0.0, 0.2, 1)'
              : 'none',

            willChange: (animateToFullscreen || animateFromFullscreen)
              ? 'opacity, transform'
              : 'auto',

            pointerEvents: animateFromFullscreen ? 'none' : 'auto',
          }}
        >
          <FullscreenChatView
            messages={fullscreenState.conversationThread}
            onSendMessage={handleFullscreenMessage}
            onClose={exitFullscreenMode}
            isLoading={isFullscreenLoading}
            isTransitioning={fullscreenState.isTransitioning}
            sidebarOpen={sidebarOpen}
          />
        </div>
      )}

      {/* Network status indicator */}
      <NetworkStatusIndicator
        isOnline={isOnline}
        show={fullscreenState.isFullscreen}
      />

      {/* Render canvas when not in fullscreen mode */}
      {!fullscreenState.isFullscreen && (
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMove={onMove}
          nodeTypes={nodeTypes}
          minZoom={0.01}
          maxZoom={2}
          noWheelClassName="nowheel"
          noDragClassName="nodrag"
          noPanClassName="nopan"
          zoomOnScroll={true}
          panOnScroll={false}
          panOnDrag={true}
          nodesDraggable={false}
          elementsSelectable={false}
          selectNodesOnDrag={false}
          selectionOnDrag={false}
          zoomActivationKeyCode={null}
          preventScrolling={true}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: false,
          }}
        >
        <Background variant={BackgroundVariant.Dots} color="rgba(14, 165, 233, 0.03)" gap={40} size={1} />
        {nodes.length > 0 && (
          <>
            <CanvasControls
              onZoomIn={() => reactFlowInstance.zoomIn()}
              onZoomOut={() => reactFlowInstance.zoomOut()}
              onFitView={() => reactFlowInstance.fitView({ padding: 0.2 })}
            />

            <MiniMap
              className="!bg-[hsl(223,28%,10%)] !border-[hsl(220,18%,22%)] !rounded-lg !shadow-2xl !overflow-hidden backdrop-blur-sm"
              maskColor="rgba(13, 17, 23, 0.6)"
              nodeColor="hsl(215, 20%, 65%)"
              nodeStrokeColor="hsl(215, 15%, 45%)"
              nodeBorderRadius={6}
              maskStrokeColor="hsl(220, 18%, 35%)"
              maskStrokeWidth={1}
            />
          </>
        )}

        {/* Empty canvas state */}
        {nodes.length === 0 && (
          <CanvasEmptyState
            welcomeMessage={welcomeMessage}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onStartConversation={handleStartConversation}
            isLoading={isLoading}
          />
        )}

        </ReactFlow>
      )}

      <FollowUpDialog
        open={isAddingFollowUp}
        onOpenChange={setIsAddingFollowUp}
        followUpQuestion={followUpQuestion}
        onFollowUpQuestionChange={setFollowUpQuestion}
        onSubmit={handleSubmitFollowUp}
        isLoading={isLoading}
      />

      <ExitConfirmationDialog
        open={showExitConfirmation}
        onOpenChange={setShowExitConfirmation}
        onConfirmExit={() => {
          setShowExitConfirmation(false);
          exitFullscreenMode(true);
        }}
      />

      {/* Undo Delete Toast */}
      <UndoToast show={showUndoToast} onUndo={undoDelete} />
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

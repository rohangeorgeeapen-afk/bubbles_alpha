import { useCallback, useState, useRef, useEffect } from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import { ViewportManager } from '@/lib/utils/viewport-manager';

interface PanQueueItem {
  parentId: string;
  childId: string;
  nodes: Node[];
}

/**
 * Hook for managing smart panning behavior in the canvas
 * Ensures parent and child nodes are visible after node creation
 */
export function useSmartPanning() {
  const reactFlowInstance = useReactFlow();
  const [isPanning, setIsPanning] = useState(false);
  const panQueue = useRef<PanQueueItem[]>([]);
  const userInteracting = useRef(false);
  
  // Using a ref to store the internal handler to break circular dependency
  const handleSmartPanningInternalRef = useRef<(parentId: string, childId: string, nodes: Node[]) => void>(() => {});

  // Process the next item in the panning queue
  const processPanQueue = useCallback(() => {
    // Don't process queue if user is interacting
    if (userInteracting.current) {
      return;
    }
    
    if (panQueue.current.length === 0) {
      return;
    }
    
    const nextPan = panQueue.current.shift();
    if (nextPan) {
      handleSmartPanningInternalRef.current(nextPan.parentId, nextPan.childId, nextPan.nodes);
    }
  }, []);

  // Internal function that performs the actual panning
  const handleSmartPanningInternal = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    try {
      if (!reactFlowInstance) {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!parentId || !childId) {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!currentNodes || !Array.isArray(currentNodes) || currentNodes.length === 0) {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      const parentNode = currentNodes.find(n => n.id === parentId);
      const childNode = currentNodes.find(n => n.id === childId);

      if (!parentNode || !childNode) {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!parentNode.position || typeof parentNode.position.x !== 'number' || typeof parentNode.position.y !== 'number') {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!childNode.position || typeof childNode.position.x !== 'number' || typeof childNode.position.y !== 'number') {
        setIsPanning(false);
        processPanQueue();
        return;
      }

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

      let viewport, zoom, viewportWidth, viewportHeight;
      try {
        viewport = reactFlowInstance.getViewport();
        zoom = reactFlowInstance.getZoom();
        
        const reactFlowWrapper = document.querySelector('.react-flow');
        viewportWidth = reactFlowWrapper?.clientWidth || window.innerWidth;
        viewportHeight = reactFlowWrapper?.clientHeight || window.innerHeight;
      } catch {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!viewport || typeof zoom !== 'number' || !viewportWidth || !viewportHeight) {
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

      let visibilityResult;
      try {
        visibilityResult = ViewportManager.areBothNodesVisible(
          parentBounds,
          childBounds,
          viewportInfo,
          50
        );
      } catch {
        setIsPanning(false);
        processPanQueue();
        return;
      }

      if (!visibilityResult.isVisible) {
        let combinedBounds;
        try {
          combinedBounds = ViewportManager.calculateCombinedBounds(
            parentBounds,
            childBounds,
            50
          );
        } catch {
          setIsPanning(false);
          processPanQueue();
          return;
        }

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
              padding: 0.01,
            }
          );
          
          setTimeout(() => {
            setIsPanning(false);
            processPanQueue();
          }, 500);
        } catch {
          setIsPanning(false);
          processPanQueue();
          return;
        }
      } else {
        setIsPanning(false);
        processPanQueue();
      }
    } catch {
      setIsPanning(false);
      processPanQueue();
    }
  }, [reactFlowInstance, processPanQueue]);
  
  // Update the ref after handleSmartPanningInternal is defined
  useEffect(() => {
    handleSmartPanningInternalRef.current = handleSmartPanningInternal;
  }, [handleSmartPanningInternal]);

  // Public function that handles queueing
  const handleSmartPanning = useCallback((parentId: string, childId: string, currentNodes: Node[]) => {
    if (userInteracting.current) {
      return;
    }
    
    if (isPanning) {
      panQueue.current.push({ parentId, childId, nodes: currentNodes });
      return;
    }
    
    setIsPanning(true);
    handleSmartPanningInternal(parentId, childId, currentNodes);
  }, [isPanning, handleSmartPanningInternal]);

  // Handle user interaction to cancel auto-panning
  const handleUserInteraction = useCallback(() => {
    if (isPanning || panQueue.current.length > 0) {
      userInteracting.current = true;
      panQueue.current = [];
      setIsPanning(false);
      
      setTimeout(() => {
        userInteracting.current = false;
      }, 1000);
    }
  }, [isPanning]);

  return {
    handleSmartPanning,
    handleUserInteraction,
    isPanning,
    reactFlowInstance,
  };
}

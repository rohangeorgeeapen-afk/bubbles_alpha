import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/lib/supabase-client';

export interface CanvasData {
  id: string;
  name: string;
  createdAt: string;
  nodes: Node[];
  edges: Edge[];
}

interface UseCanvasDataOptions {
  userId?: string;
  onAuthError?: () => void;
}

export function useCanvasData({ userId, onAuthError }: UseCanvasDataOptions) {
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const tempSaveInFlightRef = useRef<Set<string>>(new Set());
  
  // Handle userId changes - reset initialization when user changes
  useEffect(() => {
    if (!userId) {
      // No user - stop loading but don't mark as initialized
      // so that when user logs in, canvases will be loaded
      setLoading(false);
    } else {
      // User changed - reset so canvases will be reloaded
      setHasInitialized(false);
      setLoading(true);
    }
  }, [userId]);

  // Load canvases from Supabase
  const loadCanvases = useCallback(async (isInitialLoad = false) => {
    if (!userId) {
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('session') || error.message?.includes('JWT')) {
          setCanvases([]);
          setCurrentCanvasId(null);
          onAuthError?.();
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        const formattedCanvases: CanvasData[] = [];
        const corruptedCanvases: string[] = [];
        
        for (const canvas of data) {
          try {
            if (!canvas.id || !canvas.name) {
              corruptedCanvases.push(canvas.id || 'unknown');
              continue;
            }
            
            let nodes = canvas.nodes || [];
            let edges = canvas.edges || [];
            
            if (!Array.isArray(nodes)) nodes = [];
            if (!Array.isArray(edges)) edges = [];
            
            const validNodes = nodes.filter((node: any) => 
              node && typeof node === 'object' && node.id && node.type
            );
            
            // Fix stuck streaming nodes (nodes that were saved mid-stream)
            const fixedNodes = validNodes.map((node: any) => {
              if (node.data?.isStreaming) {
                console.warn(`⚠️ Fixing stuck streaming node: ${node.id}`);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    isStreaming: false,
                    // If no response, add a placeholder
                    response: node.data.response || 'Response was interrupted. Please try again.',
                  }
                };
              }
              return node;
            });
            
            // Get set of valid node IDs for edge validation
            const validNodeIds = new Set(fixedNodes.map((n: any) => n.id));
            
            // Filter edges: must have valid structure AND reference existing nodes
            const validEdges = edges.filter((edge: any) => {
              if (!edge || typeof edge !== 'object' || !edge.id || !edge.source || !edge.target) {
                return false;
              }
              // Ensure both source and target nodes exist
              if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) {
                console.warn(`⚠️ Removing orphaned edge: ${edge.id} (${edge.source} -> ${edge.target})`);
                return false;
              }
              // Prevent self-referencing edges
              if (edge.source === edge.target) {
                console.warn(`⚠️ Removing self-referencing edge: ${edge.id}`);
                return false;
              }
              return true;
            });
            
            formattedCanvases.push({
              id: canvas.id,
              name: canvas.name,
              createdAt: canvas.created_at,
              nodes: fixedNodes,
              edges: validEdges,
            });
          } catch {
            corruptedCanvases.push(canvas.id);
          }
        }
        
        if (corruptedCanvases.length > 0) {
          alert(`Warning: ${corruptedCanvases.length} corrupted canvas(es) were skipped.`);
        }
        
        setCanvases(prev => {
          if (prev.length === formattedCanvases.length &&
              prev.every((p, idx) => p.id === formattedCanvases[idx].id)) {
            return prev;
          }
          return formattedCanvases;
        });
        
        setCurrentCanvasId(prevId => {
          if (prevId && formattedCanvases.some(c => c.id === prevId)) {
            return prevId;
          }
          return formattedCanvases.length > 0 ? formattedCanvases[0].id : null;
        });
      } else {
        setCanvases([]);
        setCurrentCanvasId(null);
      }
    } catch (error) {
      console.error('Failed to load canvases:', error);
      setCanvases(prev => prev.length === 0 ? [] : prev);
    } finally {
      if (isInitialLoad) setLoading(false);
      setHasInitialized(true);
    }
  }, [userId, onAuthError]);

  // Generate unique canvas name
  const generateUniqueCanvasName = useCallback((existingCanvases: CanvasData[]): string => {
    const existingNames = new Set(existingCanvases.map(c => c.name.toLowerCase()));
    let counter = 1;
    let name = `Canvas ${counter}`;
    
    while (existingNames.has(name.toLowerCase())) {
      counter++;
      name = `Canvas ${counter}`;
    }
    
    return name;
  }, []);

  const isGeneratedCanvasName = useCallback((name: string): boolean => {
    return /^Canvas \d+$/i.test(name.trim());
  }, []);

  const generateCanvasNameFromRootPrompt = useCallback((nodes: Node[], edges: Edge[], fallback: string): string => {
    const targetIds = new Set(edges.map(edge => edge.target));
    const rootNode = nodes.find(node => !targetIds.has(node.id)) || nodes[0];
    const rootPrompt = typeof rootNode?.data?.question === 'string'
      ? rootNode.data.question.replace(/\s+/g, ' ').trim()
      : '';

    if (!rootPrompt) return fallback;
    return rootPrompt.length > 60 ? `${rootPrompt.slice(0, 57)}...` : rootPrompt;
  }, []);

  const persistTempCanvas = useCallback(async (
    tempId: string,
    name: string,
    nodes: Node[],
    edges: Edge[]
  ) => {
    if (!userId || tempSaveInFlightRef.current.has(tempId)) return;

    tempSaveInFlightRef.current.add(tempId);

    try {
      const { data, error } = await supabase
        .from('canvases')
        .insert({
          user_id: userId,
          name,
          nodes,
          edges,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create canvas:', error);
        return;
      }

      if (data) {
        const realCanvas: CanvasData = {
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          nodes: data.nodes || nodes,
          edges: data.edges || edges,
        };

        setCanvases(prev => prev.map(canvas => canvas.id === tempId ? realCanvas : canvas));
        setCurrentCanvasId(prev => prev === tempId ? realCanvas.id : prev);
      }
    } catch (error) {
      console.error('Exception during canvas creation:', error);
    } finally {
      tempSaveInFlightRef.current.delete(tempId);
    }
  }, [userId]);

  // Create new canvas
  const createCanvas = useCallback(async () => {
    if (!userId) {
      alert('Please sign in to create a canvas');
      return;
    }

    const uniqueName = generateUniqueCanvasName(canvases);
    const tempId = `temp-${Date.now()}`;
    const tempCanvas: CanvasData = {
      id: tempId,
      name: uniqueName,
      createdAt: new Date().toISOString(),
      nodes: [],
      edges: [],
    };

    setCanvases(prev => [tempCanvas, ...prev]);
    setCurrentCanvasId(tempId);
  }, [userId, canvases, generateUniqueCanvasName]);

  // Rename canvas
  const renameCanvas = useCallback(async (id: string, newName: string) => {
    if (!userId) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert('Canvas name cannot be empty');
      return;
    }

    const isDuplicate = canvases.some(
      c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      alert(`A canvas named "${trimmedName}" already exists.`);
      return;
    }

    const oldCanvases = canvases;
    setCanvases(prev => prev.map(c => c.id === id ? { ...c, name: trimmedName } : c));

    if (id.startsWith('temp-')) return;

    try {
      const { error } = await supabase
        .from('canvases')
        .update({ name: trimmedName })
        .eq('id', id);

      if (error) {
        setCanvases(oldCanvases);
        alert(`Failed to rename canvas: ${error.message}`);
      }
    } catch (error: any) {
      setCanvases(oldCanvases);
      alert(`Failed to rename canvas: ${error.message || 'Network error'}`);
    }
  }, [userId, canvases]);

  // Delete canvas
  const deleteCanvas = useCallback(async (id: string) => {
    if (!userId) return;

    const oldCanvases = canvases;
    const oldCurrentId = currentCanvasId;

    const newCanvases = canvases.filter(c => c.id !== id);
    setCanvases(newCanvases);

    if (currentCanvasId === id) {
      setCurrentCanvasId(newCanvases.length > 0 ? newCanvases[0].id : null);
    }

    if (id.startsWith('temp-')) return;

    try {
      const { error } = await supabase.from('canvases').delete().eq('id', id);

      if (error) {
        setCanvases(oldCanvases);
        setCurrentCanvasId(oldCurrentId);
        alert(`Failed to delete canvas: ${error.message}`);
      }
    } catch (error: any) {
      setCanvases(oldCanvases);
      setCurrentCanvasId(oldCurrentId);
      alert(`Failed to delete canvas: ${error.message || 'Network error'}`);
    }
  }, [userId, canvases, currentCanvasId]);

  // Update canvas nodes/edges
  const updateCanvas = useCallback(async (nodes: Node[], edges: Edge[]) => {
    if (!userId) return;

    if (!currentCanvasId && nodes.length > 0) {
      const uniqueName = generateCanvasNameFromRootPrompt(
        nodes,
        edges,
        generateUniqueCanvasName(canvases)
      );
      const tempId = `temp-${Date.now()}`;
      const tempCanvas: CanvasData = {
        id: tempId,
        name: uniqueName,
        createdAt: new Date().toISOString(),
        nodes,
        edges,
      };

      setCanvases(prev => [tempCanvas, ...prev]);
      setCurrentCanvasId(tempId);
      await persistTempCanvas(tempId, uniqueName, nodes, edges);
      return;
    }

    if (!currentCanvasId) return;

    const currentCanvas = canvases.find(canvas => canvas.id === currentCanvasId);
    const shouldAutoName = !!currentCanvas &&
      currentCanvas.nodes.length === 0 &&
      nodes.length > 0 &&
      isGeneratedCanvasName(currentCanvas.name);
    const canvasName = shouldAutoName
      ? generateCanvasNameFromRootPrompt(nodes, edges, currentCanvas.name)
      : currentCanvas?.name;

    setCanvases(prev =>
      prev.map(canvas =>
        canvas.id === currentCanvasId
          ? { ...canvas, name: canvasName || canvas.name, nodes, edges }
          : canvas
      )
    );

    if (currentCanvasId.startsWith('temp-')) {
      if (nodes.length > 0) {
        await persistTempCanvas(
          currentCanvasId,
          canvasName || generateUniqueCanvasName(canvases),
          nodes,
          edges
        );
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('canvases')
        .update({
          ...(canvasName ? { name: canvasName } : {}),
          nodes,
          edges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCanvasId);

      if (error) {
        console.error('Failed to save canvas:', error);
      }
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  }, [
    userId,
    currentCanvasId,
    canvases,
    generateUniqueCanvasName,
    generateCanvasNameFromRootPrompt,
    isGeneratedCanvasName,
    persistTempCanvas,
  ]);

  // Clear all data (for sign out)
  const clearData = useCallback(() => {
    setCanvases([]);
    setCurrentCanvasId(null);
    setHasInitialized(false);
  }, []);

  // Current canvas
  const currentCanvas = useMemo(
    () => canvases.find(c => c.id === currentCanvasId),
    [canvases, currentCanvasId]
  );

  // Canvas summaries for sidebar
  const canvasSummaries = useMemo(
    () => canvases.map(canvas => ({
      id: canvas.id,
      name: canvas.name,
      createdAt: canvas.createdAt,
      nodeCount: canvas.nodes.length,
      searchableText: canvas.nodes
        .map(node => {
          const question = typeof node.data?.question === 'string' ? node.data.question : '';
          const response = typeof node.data?.response === 'string' ? node.data.response : '';
          return `${question}\n${response}`;
        })
        .join('\n'),
    })),
    [canvases]
  );

  return {
    canvases,
    currentCanvasId,
    currentCanvas,
    canvasSummaries,
    loading,
    hasInitialized,
    setCurrentCanvasId,
    loadCanvases,
    createCanvas,
    renameCanvas,
    deleteCanvas,
    updateCanvas,
    clearData,
  };
}

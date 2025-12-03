import { useState, useCallback, useEffect, useMemo } from 'react';
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
            
            const validEdges = edges.filter((edge: any) => 
              edge && typeof edge === 'object' && edge.id && edge.source && edge.target
            );
            
            formattedCanvases.push({
              id: canvas.id,
              name: canvas.name,
              createdAt: canvas.created_at,
              nodes: validNodes,
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

    try {
      const { data, error } = await supabase
        .from('canvases')
        .insert({
          user_id: userId,
          name: tempCanvas.name,
          nodes: [],
          edges: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Database save failed:', error);
        return;
      }

      if (data) {
        const realCanvas: CanvasData = {
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          nodes: data.nodes || [],
          edges: data.edges || [],
        };

        setCanvases(prev => prev.map(c => c.id === tempId ? realCanvas : c));
        setCurrentCanvasId(realCanvas.id);
      }
    } catch (error) {
      console.error('Exception during canvas creation:', error);
    }
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
      const uniqueName = generateUniqueCanvasName(canvases);
      const tempId = `temp-${Date.now()}`;
      const tempCanvas: CanvasData = {
        id: tempId,
        name: uniqueName,
        createdAt: new Date().toISOString(),
        nodes,
        edges,
      };

      setCanvases([tempCanvas]);
      setCurrentCanvasId(tempId);

      try {
        const { data, error } = await supabase
          .from('canvases')
          .insert({
            user_id: userId,
            name: tempCanvas.name,
            nodes,
            edges,
          })
          .select()
          .single();

        if (!error && data) {
          const realCanvas: CanvasData = {
            id: data.id,
            name: data.name,
            createdAt: data.created_at,
            nodes: data.nodes || [],
            edges: data.edges || [],
          };

          setCanvases([realCanvas]);
          setCurrentCanvasId(realCanvas.id);
        }
      } catch (error) {
        console.error('Failed to save canvas:', error);
      }
      return;
    }

    if (!currentCanvasId) return;

    setCanvases(prev =>
      prev.map(canvas =>
        canvas.id === currentCanvasId ? { ...canvas, nodes, edges } : canvas
      )
    );

    if (currentCanvasId.startsWith('temp-')) return;

    try {
      const { error } = await supabase
        .from('canvases')
        .update({
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
  }, [userId, currentCanvasId, canvases, generateUniqueCanvasName]);

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

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ConversationCanvas from './ConversationCanvas';
import Sidebar from '@/components/layout/Sidebar';
import AuthModal from '@/components/auth/AuthModal';
import { Node, Edge } from '@xyflow/react';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';

interface CanvasData {
  id: string;
  name: string;
  createdAt: string;
  nodes: Node[];
  edges: Edge[];
}

export default function CanvasManager() {
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();

  const loadCanvases = useCallback(async (isInitialLoad = false) => {
    if (!user) {
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    // Only show loading spinner on initial load, not on background refreshes
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If auth error, just clear state silently
        if (error.message?.includes('session') || error.message?.includes('JWT')) {
          setCanvases([]);
          setCurrentCanvasId(null);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        const formattedCanvases = data.map((canvas) => ({
          id: canvas.id,
          name: canvas.name,
          createdAt: canvas.created_at,
          nodes: canvas.nodes || [],
          edges: canvas.edges || [],
        }));
        
        // Only update canvases if data has actually changed
        setCanvases(prevCanvases => {
          // If we have the same number of canvases with the same IDs, don't update
          if (prevCanvases.length === formattedCanvases.length &&
              prevCanvases.every((prev, idx) => prev.id === formattedCanvases[idx].id)) {
            // Keep existing canvas objects to prevent unnecessary re-renders
            return prevCanvases;
          }
          return formattedCanvases;
        });
        
        // Only set current canvas if none is selected, or if the current one no longer exists
        setCurrentCanvasId(prevId => {
          // If we already have a canvas selected and it still exists, keep it
          if (prevId && formattedCanvases.some(c => c.id === prevId)) {
            return prevId;
          }
          // Otherwise, select the first canvas
          return formattedCanvases[0].id;
        });
      } else {
        // No canvases yet
        setCanvases([]);
        setCurrentCanvasId(null);
      }
    } catch (error) {
      console.error('Failed to load canvases:', error);
      setCanvases([]);
      setCurrentCanvasId(null);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      setHasInitialized(true);
    }
  }, [user]);

  // Load canvases from Supabase on mount
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    // Only load canvases once on initial mount
    if (!hasInitialized) {
      setAuthModalOpen(false);
      loadCanvases(true); // Pass true for initial load
    }
  }, [user, authLoading, loadCanvases, hasInitialized]);







  const handleNewCanvas = async () => {
    if (!user) {
      console.error('No user logged in');
      alert('Please sign in to create a canvas');
      return;
    }

    console.log('Creating new canvas...');

    // Create temporary canvas for optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const tempCanvas: CanvasData = {
      id: tempId,
      name: `Canvas ${canvases.length + 1}`,
      createdAt: new Date().toISOString(),
      nodes: [],
      edges: [],
    };

    console.log('Temp canvas created:', tempCanvas);

    // Optimistic update - show immediately
    setCanvases((prev) => [tempCanvas, ...prev]);
    setCurrentCanvasId(tempId);

    console.log('Canvas added to state, attempting database save...');

    // Save to database in background
    try {
      const { data, error } = await supabase
        .from('canvases')
        .insert({
          user_id: user.id,
          name: tempCanvas.name,
          nodes: [],
          edges: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Database save failed:', error);
        // Keep the temp canvas - it will work locally
        return;
      }

      if (data) {
        console.log('Database save successful:', data);
        // Replace temp canvas with real one from database
        const realCanvas: CanvasData = {
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          nodes: data.nodes || [],
          edges: data.edges || [],
        };

        setCanvases((prev) =>
          prev.map((c) => (c.id === tempId ? realCanvas : c))
        );
        setCurrentCanvasId(realCanvas.id);
      }
    } catch (error: any) {
      console.error('Exception during canvas creation:', error);
      // Keep the temp canvas - it will work locally
    }
  };

  const handleSelectCanvas = (id: string) => {
    setCurrentCanvasId(id);
  };

  const handleDeleteCanvas = async (id: string) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Store old state for rollback
    const oldCanvases = canvases;
    const oldCurrentId = currentCanvasId;

    // Optimistic update - update UI immediately
    const newCanvases = canvases.filter((c) => c.id !== id);
    setCanvases(newCanvases);

    // If we deleted the current canvas, switch to another or null
    if (currentCanvasId === id) {
      setCurrentCanvasId(newCanvases.length > 0 ? newCanvases[0].id : null);
    }

    // If it's a temporary canvas (not yet saved), just remove from UI
    if (id.startsWith('temp-')) {
      return;
    }

    // Delete from database in background
    try {
      const { error } = await supabase.from('canvases').delete().eq('id', id);

      if (error) {
        console.error('Failed to delete canvas:', error);
        // Rollback on error
        setCanvases(oldCanvases);
        setCurrentCanvasId(oldCurrentId);
        alert(`Failed to delete canvas: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Failed to delete canvas:', error);
      // Rollback on error
      setCanvases(oldCanvases);
      setCurrentCanvasId(oldCurrentId);
      alert(`Failed to delete canvas: ${error.message || 'Network error'}`);
    }
  };

  const handleCanvasUpdate = useCallback(async (nodes: Node[], edges: Edge[]) => {
    if (!user) {
      console.log('No user, skipping canvas update');
      return;
    }

    // If no canvas exists and we have nodes, create one automatically
    if (!currentCanvasId && nodes.length > 0) {
      const tempId = `temp-${Date.now()}`;
      const tempCanvas: CanvasData = {
        id: tempId,
        name: `Canvas ${canvases.length + 1}`,
        createdAt: new Date().toISOString(),
        nodes,
        edges,
      };

      // Add to local state immediately
      setCanvases([tempCanvas]);
      setCurrentCanvasId(tempId);

      // Try to save to database (but don't block if it fails)
      try {
        const { data, error } = await supabase
          .from('canvases')
          .insert({
            user_id: user.id,
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
        console.error('Failed to save canvas to database:', error);
        // Canvas still works locally with temp ID
      }
      return;
    }

    if (!currentCanvasId) {
      return;
    }

    // Update local state first
    setCanvases((prev) =>
      prev.map((canvas) =>
        canvas.id === currentCanvasId ? { ...canvas, nodes, edges } : canvas
      )
    );

    // Don't try to save temporary canvases to database
    if (currentCanvasId.startsWith('temp-')) {
      return;
    }

    // Try to save to Supabase (but don't block if it fails)
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
  }, [user, currentCanvasId, canvases.length]);

  const handleSignOut = useCallback(async () => {
    console.log('handleSignOut called');
    
    try {
      console.log('Calling signOut...');
      await signOut();
      console.log('Sign out complete');
      
      // Clear local state
      setCanvases([]);
      setCurrentCanvasId(null);
      setHasInitialized(false);
      
      // The auth state listener will handle the UI update
    } catch (error) {
      console.error('Error during sign out:', error);
      // Clear state anyway
      setCanvases([]);
      setCurrentCanvasId(null);
      setHasInitialized(false);
    }
  }, [signOut]);

  // Memoize current canvas to prevent unnecessary re-renders
  const currentCanvas = React.useMemo(
    () => canvases.find((c) => c.id === currentCanvasId),
    [canvases, currentCanvasId]
  );

  const canvasSummaries = React.useMemo(
    () => canvases.map((canvas) => ({
      id: canvas.id,
      name: canvas.name,
      createdAt: canvas.createdAt,
      nodeCount: canvas.nodes.length,
    })),
    [canvases]
  );

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-[#212121] items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3a3a3a] border-t-[#ececec] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex h-screen bg-[#212121] items-center justify-center">
          <div className="text-center">
            <h1 
              className="text-6xl mb-3 font-bold tracking-tight" 
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontWeight: 700, 
                backgroundImage: 'linear-gradient(90deg, #7dd3fc, #60a5fa)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent'
              }}
            >
              bubbles
            </h1>
            <p className="text-[#b4b4b4] text-lg mb-8">Think in branches, not lines</p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-6 py-2.5 bg-[#2a2a2a] text-[#ececec] text-sm rounded-lg font-medium border border-[#3a3a3a] transition-all duration-200 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
        <AuthModal 
          open={authModalOpen && !user} 
          onOpenChange={setAuthModalOpen} 
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#212121]">
      <Sidebar
        canvases={canvasSummaries}
        currentCanvasId={currentCanvasId}
        onSelectCanvas={handleSelectCanvas}
        onNewCanvas={handleNewCanvas}
        onDeleteCanvas={handleDeleteCanvas}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {hasInitialized && (
          <ConversationCanvas
            key={currentCanvasId || 'empty-canvas'}
            initialNodes={currentCanvas?.nodes || []}
            initialEdges={currentCanvas?.edges || []}
            onUpdate={handleCanvasUpdate}
            sidebarOpen={sidebarOpen}
          />
        )}
      </div>

      <AuthModal open={authModalOpen && !user} onOpenChange={setAuthModalOpen} />
    </div>
  );
}

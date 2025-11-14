"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ConversationCanvas from './ConversationCanvas';
import Sidebar from '@/components/layout/Sidebar';
import AuthModal from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Node, Edge } from '@xyflow/react';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase-client';

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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();

  // Check for mobile and show warning
  useEffect(() => {
    // Only detect actual mobile devices, not just small windows
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768 && window.innerHeight < 1024;
    
    // Only show warning if it's actually a mobile device (has touch + small screen + mobile UA)
    const isMobile = isMobileDevice && isTouchDevice && isSmallScreen;
    const hasSeenWarning = localStorage.getItem('mobile-warning-dismissed');
    
    if (isMobile && !hasSeenWarning) {
      setShowMobileWarning(true);
    }
  }, []);

  const handleDismissMobileWarning = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem('mobile-warning-dismissed', 'true');
    }
    setShowMobileWarning(false);
  };

  // Handle scroll to hide indicator (only for landing page)
  useEffect(() => {
    if (user) return; // Only run on landing page

    // Set initial state on mount (client-only)
    setShowScrollIndicator(true);

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  const scrollToFeatures = () => {
    window.scrollTo({
      top: window.innerHeight * 0.8,
      behavior: 'smooth'
    });
  };

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
      console.log('📡 Calling Supabase to load canvases...');
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📡 Supabase response:', { hasData: !!data, hasError: !!error, dataLength: data?.length });

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
        // Validate and clean canvas data to handle corrupted data
        const formattedCanvases: CanvasData[] = [];
        const corruptedCanvases: string[] = [];
        
        for (const canvas of data) {
          try {
            // Validate canvas has required fields
            if (!canvas.id || !canvas.name) {
              corruptedCanvases.push(canvas.id || 'unknown');
              continue;
            }
            
            // Validate and clean nodes/edges arrays
            let nodes = canvas.nodes || [];
            let edges = canvas.edges || [];
            
            if (!Array.isArray(nodes)) {
              nodes = [];
            }
            
            if (!Array.isArray(edges)) {
              edges = [];
            }
            
            // Filter out invalid nodes
            const validNodes = nodes.filter((node: any) => {
              return node && typeof node === 'object' && node.id && node.type;
            });
            
            // Filter out invalid edges
            const validEdges = edges.filter((edge: any) => {
              return edge && typeof edge === 'object' && edge.id && edge.source && edge.target;
            });
            
            formattedCanvases.push({
              id: canvas.id,
              name: canvas.name,
              createdAt: canvas.created_at,
              nodes: validNodes,
              edges: validEdges,
            });
          } catch (canvasError) {
            corruptedCanvases.push(canvas.id);
          }
        }
        
        if (corruptedCanvases.length > 0) {
          alert(`Warning: ${corruptedCanvases.length} corrupted canvas(es) were skipped. You may want to delete them from the Supabase dashboard.`);
        }
        
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
          // Otherwise, select the first canvas (if any exist)
          return formattedCanvases.length > 0 ? formattedCanvases[0].id : null;
        });
      } else {
        // No canvases yet
        setCanvases([]);
        setCurrentCanvasId(null);
      }
    } catch (error: any) {
      console.error('Failed to load canvases:', error);
      
      // Don't clear canvases if we already have some loaded
      if (canvases.length === 0) {
        setCanvases([]);
        setCurrentCanvasId(null);
      }
    } finally {
      console.log('✅ loadCanvases finally block - setting hasInitialized to true');
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
      setHasInitialized(true);
      return;
    }

    // Only load canvases once on initial mount
    if (!hasInitialized) {
      setAuthModalOpen(false);
      loadCanvases(true); // Pass true for initial load
    }
  }, [user, authLoading, loadCanvases, hasInitialized]);

  // Helper function to generate a unique canvas name
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

  const handleNewCanvas = async () => {
    if (!user) {
      console.error('No user logged in');
      alert('Please sign in to create a canvas');
      return;
    }

    console.log('Creating new canvas...');

    // Generate unique name
    const uniqueName = generateUniqueCanvasName(canvases);

    // Create temporary canvas for optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const tempCanvas: CanvasData = {
      id: tempId,
      name: uniqueName,
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

  const handleRenameCanvas = async (id: string, newName: string) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Trim the name
    const trimmedName = newName.trim();
    
    // Validate name is not empty
    if (!trimmedName) {
      alert('Canvas name cannot be empty');
      return;
    }

    // Check for duplicate names (case-insensitive, excluding current canvas)
    const isDuplicate = canvases.some(
      c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      alert(`A canvas named "${trimmedName}" already exists. Please choose a different name.`);
      return;
    }

    // Store old state for rollback
    const oldCanvases = canvases;

    // Optimistic update - update UI immediately
    setCanvases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmedName } : c))
    );

    // If it's a temporary canvas (not yet saved), just update locally
    if (id.startsWith('temp-')) {
      return;
    }

    // Update in database in background
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ name: trimmedName })
        .eq('id', id);

      if (error) {
        console.error('Failed to rename canvas:', error);
        // Rollback on error
        setCanvases(oldCanvases);
        alert(`Failed to rename canvas: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Failed to rename canvas:', error);
      // Rollback on error
      setCanvases(oldCanvases);
      alert(`Failed to rename canvas: ${error.message || 'Network error'}`);
    }
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
      const uniqueName = generateUniqueCanvasName(canvases);
      const tempId = `temp-${Date.now()}`;
      const tempCanvas: CanvasData = {
        id: tempId,
        name: uniqueName,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentCanvasId]);

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
        <div className="min-h-screen bg-[#1a1a1a] overflow-y-auto">
          {/* Hero Section */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 md:pt-32 pb-20 md:pb-24 border-b border-[#2a2a2a] relative">
            <div className="mb-8 md:mb-12">
              <div className="flex flex-col items-center mb-8">
                {/* Logo Image */}
                <div 
                  className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-4 cursor-pointer group transition-all duration-500"
                  style={{
                    filter: 'drop-shadow(0 0 0 transparent)',
                    transition: 'filter 0.5s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'drop-shadow(0 12px 40px rgba(0, 213, 255, 0.5))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'drop-shadow(0 0 0 transparent)';
                  }}
                  onClick={(e) => {
                    const img = e.currentTarget.querySelector('img');
                    if (img) {
                      const currentRotation = parseInt(img.style.rotate || '0');
                      img.style.rotate = `${currentRotation + 360}deg`;
                    }
                  }}
                >
                  <img 
                    src="/logo.png" 
                    alt="Bubbles Logo" 
                    className="w-full h-full object-contain animate-bubble-pop transition-all duration-500 ease-out"
                    style={{ 
                      background: 'transparent',
                      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), rotate 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <h1 
                    className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-none text-center" 
                    style={{ 
                      fontFamily: '"Montserrat", sans-serif', 
                      fontWeight: 700, 
                      backgroundImage: 'linear-gradient(to bottom, #ffffff 30%, #e0f2fe 70%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    bubbles
                  </h1>
                  <span className="text-xs sm:text-sm font-semibold px-2 py-1 bg-[#00D5FF]/20 text-[#00D5FF] rounded border border-[#00D5FF]/30">
                    BETA
                  </span>
                </div>
              </div>
              <p className="text-[#b4b4b4] text-base sm:text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed text-center px-2">
                Explore every question without losing your train of thought.
                <br />
                <span className="text-[#8e8e8e] text-sm sm:text-base">Branch conversations naturally. Follow curiosity freely.</span>
              </p>
              <div className="flex justify-center">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="group relative px-6 sm:px-8 md:px-6 py-3 sm:py-3.5 md:py-2.5 bg-white text-[#212121] text-base sm:text-lg md:text-base rounded-xl font-semibold overflow-hidden inline-flex items-center gap-2 touch-manipulation"
                style={{
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 213, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <svg 
                    className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              </div>
            </div>
            
            {/* Scroll Indicator - Minimalistic dots */}
            <div className="flex justify-center w-full absolute bottom-8 left-0 right-0">
              <button
                onClick={scrollToFeatures}
                className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-500 ${
                  showScrollIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
                aria-label="Scroll to features"
              >
              <div className="flex flex-col gap-1.5 group-hover:gap-2 transition-all duration-300">
                <div 
                  className="w-1 h-1 rounded-full bg-[#00D5FF] group-hover:w-1.5 group-hover:h-1.5 transition-all duration-300"
                  style={{
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: '0s'
                  }}
                ></div>
                <div 
                  className="w-1 h-1 rounded-full bg-[#00D5FF] group-hover:w-1.5 group-hover:h-1.5 transition-all duration-300"
                  style={{
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: '0.3s'
                  }}
                ></div>
                <div 
                  className="w-1 h-1 rounded-full bg-[#00D5FF] group-hover:w-1.5 group-hover:h-1.5 transition-all duration-300"
                  style={{
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: '0.6s'
                  }}
                ></div>
              </div>
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24 border-b border-[#2a2a2a]">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
              <div className="text-center group">
                <img 
                  src="/icon-curiosity.png" 
                  alt="Follow Your Curiosity" 
                  className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                />
                <h3 className="text-[#ececec] text-lg sm:text-xl font-semibold mb-3">Follow Your Curiosity</h3>
                <p className="text-[#8e8e8e] text-sm sm:text-base leading-relaxed">
                  Ask follow-up questions on any topic without derailing your main conversation
                </p>
              </div>

              <div className="text-center group">
                <img 
                  src="/icon-organized.png" 
                  alt="Stay Organized" 
                  className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                />
                <h3 className="text-[#ececec] text-lg sm:text-xl font-semibold mb-3">Stay Organized</h3>
                <p className="text-[#8e8e8e] text-sm sm:text-base leading-relaxed">
                  See your entire conversation tree at a glance. Navigate between topics effortlessly
                </p>
              </div>

              <div className="text-center group">
                <img 
                  src="/icon-context.png" 
                  alt="Keep Context" 
                  className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                />
                <h3 className="text-[#ececec] text-lg sm:text-xl font-semibold mb-3">Keep Context</h3>
                <p className="text-[#8e8e8e] text-sm sm:text-base leading-relaxed">
                  Each branch maintains its own context. Return to any conversation thread anytime
                </p>
              </div>
            </div>
          </section>

          {/* How It Works & CTA Section */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <h2 className="text-[#ececec] text-2xl sm:text-3xl md:text-4xl font-bold mb-6">How It Works</h2>
              <div className="space-y-4 sm:space-y-6 text-left mb-8 sm:mb-12">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00D5FF] text-[#1a1a1a] font-bold flex items-center justify-center text-sm sm:text-base">1</div>
                  <div>
                    <h4 className="text-[#ececec] font-semibold mb-1 text-sm sm:text-base">Ask your question</h4>
                    <p className="text-[#8e8e8e] text-sm sm:text-base">Start with any question or topic you&apos;re curious about</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00D5FF] text-[#1a1a1a] font-bold flex items-center justify-center text-sm sm:text-base">2</div>
                  <div>
                    <h4 className="text-[#ececec] font-semibold mb-1 text-sm sm:text-base">Branch off naturally</h4>
                    <p className="text-[#8e8e8e] text-sm sm:text-base">When something sparks your curiosity, create a new branch to explore it</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00D5FF] text-[#1a1a1a] font-bold flex items-center justify-center text-sm sm:text-base">3</div>
                  <div>
                    <h4 className="text-[#ececec] font-semibold mb-1 text-sm sm:text-base">Navigate your knowledge tree</h4>
                    <p className="text-[#8e8e8e] text-sm sm:text-base">Switch between branches, zoom in on details, or step back to see the big picture</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[#b4b4b4] text-base sm:text-lg mb-6">Ready to think differently?</p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="group relative px-8 sm:px-10 md:px-12 py-3.5 sm:py-4 md:py-5 bg-white text-[#212121] text-base sm:text-lg rounded-xl font-semibold overflow-hidden inline-flex items-center gap-2 touch-manipulation"
                style={{
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 213, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Exploring
                  <svg 
                    className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <p className="text-[#6e6e6e] text-xs sm:text-sm mt-4">Free to use • No credit card required</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 border-t border-[#2a2a2a]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[#6e6e6e] text-xs sm:text-sm">
                © 2025 Bubbles. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a 
                  href="/privacy" 
                  className="text-[#8e8e8e] hover:text-[#ececec] transition-colors text-xs sm:text-sm"
                >
                  Privacy Policy
                </a>
                <a 
                  href="mailto:rohan@chynex.com" 
                  className="text-[#8e8e8e] hover:text-[#ececec] transition-colors text-xs sm:text-sm"
                >
                  Contact
                </a>
              </div>
            </div>
          </footer>
        </div>
        
        <AuthModal 
          open={authModalOpen && !user} 
          onOpenChange={setAuthModalOpen} 
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#212121] overflow-hidden">
      <Sidebar
        canvases={canvasSummaries}
        currentCanvasId={currentCanvasId}
        onSelectCanvas={handleSelectCanvas}
        onNewCanvas={handleNewCanvas}
        onDeleteCanvas={handleDeleteCanvas}
        onRenameCanvas={handleRenameCanvas}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {hasInitialized && typeof window !== 'undefined' && (
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

      {/* Mobile Warning Dialog */}
      <Dialog open={showMobileWarning} onOpenChange={(open) => !open && handleDismissMobileWarning(false)}>
        <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-[#ececec] font-semibold text-lg flex items-center gap-2 pr-8">
              <span className="text-2xl">📱</span>
              Mobile Experience Notice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-[#b4b4b4] text-sm leading-relaxed">
              This app hasn&apos;t been fully optimized for mobile devices yet. You may experience bugs or layout issues.
            </p>
            <p className="text-[#8e8e8e] text-xs">
              For the best experience, we recommend using a desktop or tablet.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => handleDismissMobileWarning(true)} 
                className="w-full bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium"
              >
                Got it, don&apos;t show again
              </Button>
              <Button 
                onClick={() => handleDismissMobileWarning(false)} 
                variant="outline"
                className="w-full border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg"
              >
                Remind me later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

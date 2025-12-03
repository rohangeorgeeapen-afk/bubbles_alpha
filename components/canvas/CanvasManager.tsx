"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ConversationCanvas from './ConversationCanvas';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import Sidebar from '@/components/layout/Sidebar';
import AuthModal from '@/components/auth/AuthModal';
import MobileWarningDialog from './MobileWarningDialog';
import LandingPage from '@/components/landing/LandingPage';
import { useCanvasData } from './hooks';
import { useAuth } from '@/lib/contexts/auth-context';

export default function CanvasManager() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();

  // Canvas data management hook
  const {
    currentCanvas,
    currentCanvasId,
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
  } = useCanvasData({ userId: user?.id });

  // Check for mobile and show warning
  useEffect(() => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768 && window.innerHeight < 1024;
    const isMobile = isMobileDevice && isTouchDevice && isSmallScreen;
    const hasSeenWarning = localStorage.getItem('mobile-warning-dismissed');
    
    if (isMobile && !hasSeenWarning) {
      setShowMobileWarning(true);
    }
  }, []);

  // Load canvases on mount
  useEffect(() => {
    if (authLoading) return;

    if (!user) return;

    if (!hasInitialized) {
      setAuthModalOpen(false);
      loadCanvases(true);
    }
  }, [user, authLoading, loadCanvases, hasInitialized]);

  const handleDismissMobileWarning = useCallback((neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem('mobile-warning-dismissed', 'true');
    }
    setShowMobileWarning(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      clearData();
    } catch (error) {
      console.error('Error during sign out:', error);
      clearData();
    }
  }, [signOut, clearData]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-[#212121] items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3a3a3a] border-t-[#ececec] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  if (!user) {
    return (
      <>
        <LandingPage onGetStarted={() => setAuthModalOpen(true)} />
        <AuthModal 
          open={authModalOpen && !user} 
          onOpenChange={setAuthModalOpen} 
        />
      </>
    );
  }

  // Main app for authenticated users
  return (
    <div className="flex h-screen bg-[#212121] overflow-hidden">
      <Sidebar
        canvases={canvasSummaries}
        currentCanvasId={currentCanvasId}
        onSelectCanvas={setCurrentCanvasId}
        onNewCanvas={createCanvas}
        onDeleteCanvas={deleteCanvas}
        onRenameCanvas={renameCanvas}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {hasInitialized && typeof window !== 'undefined' && (
          <CanvasErrorBoundary
            key={`error-boundary-${currentCanvasId || 'empty'}`}
            onReset={() => {
              if (currentCanvasId) {
                loadCanvases(true);
              }
            }}
          >
            <ConversationCanvas
              key={currentCanvasId || 'empty-canvas'}
              initialNodes={currentCanvas?.nodes || []}
              initialEdges={currentCanvas?.edges || []}
              onUpdate={updateCanvas}
              sidebarOpen={sidebarOpen}
            />
          </CanvasErrorBoundary>
        )}
      </div>

      <AuthModal open={authModalOpen && !user} onOpenChange={setAuthModalOpen} />

      <MobileWarningDialog 
        open={showMobileWarning} 
        onDismiss={handleDismissMobileWarning} 
      />
    </div>
  );
}

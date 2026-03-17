"use client";

import React, { createContext, useContext } from 'react';

export interface CanvasCallbackContextType {
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onBranchFromSelection: (
    nodeId: string,
    selectedText: string,
    question: string,
    startOffset: number,
    endOffset: number,
    isFromQuestion: boolean
  ) => Promise<void>;
  onNavigateToNode: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onMaximize: (nodeId: string) => void;
}

const CanvasCallbackContext = createContext<CanvasCallbackContextType | undefined>(undefined);

export interface CanvasCallbackProviderProps {
  children: React.ReactNode;
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onBranchFromSelection: (
    nodeId: string,
    selectedText: string,
    question: string,
    startOffset: number,
    endOffset: number,
    isFromQuestion: boolean
  ) => Promise<void>;
  onNavigateToNode: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onMaximize: (nodeId: string) => void;
}

export function CanvasCallbackProvider({
  children,
  onAddFollowUp,
  onBranchFromSelection,
  onNavigateToNode,
  onDelete,
  onMaximize,
}: CanvasCallbackProviderProps) {
  return (
    <CanvasCallbackContext.Provider
      value={{
        onAddFollowUp,
        onBranchFromSelection,
        onNavigateToNode,
        onDelete,
        onMaximize,
      }}
    >
      {children}
    </CanvasCallbackContext.Provider>
  );
}

export function useCanvasCallbacks() {
  const context = useContext(CanvasCallbackContext);
  if (context === undefined) {
    throw new Error('useCanvasCallbacks must be used within a CanvasCallbackProvider');
  }
  return context;
}

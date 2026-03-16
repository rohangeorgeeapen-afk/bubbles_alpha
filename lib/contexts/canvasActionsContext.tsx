"use client";

import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Interface for canvas actions that nodes can invoke
 */
export interface CanvasActionsContextValue {
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onDelete: (nodeId: string) => void;
  onMaximize: (nodeId: string) => void;
}

/**
 * Context for stable canvas action callbacks
 * This prevents callbacks from being recreated on every render
 */
const CanvasActionsContext = createContext<CanvasActionsContextValue | null>(null);

/**
 * Props for CanvasActionsProvider
 */
interface CanvasActionsProviderProps {
  children: ReactNode;
  value: CanvasActionsContextValue;
}

/**
 * Provider component for canvas actions
 * Wraps the canvas to provide stable callback references to all nodes
 */
export function CanvasActionsProvider({ children, value }: CanvasActionsProviderProps) {
  return (
    <CanvasActionsContext.Provider value={value}>
      {children}
    </CanvasActionsContext.Provider>
  );
}

/**
 * Hook to access canvas actions from within a node component
 * @throws Error if used outside of CanvasActionsProvider
 */
export function useCanvasActions(): CanvasActionsContextValue {
  const context = useContext(CanvasActionsContext);

  if (!context) {
    throw new Error('useCanvasActions must be used within CanvasActionsProvider');
  }

  return context;
}

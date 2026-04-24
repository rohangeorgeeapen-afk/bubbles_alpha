"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';

interface UndoToastProps {
  show: boolean;
  onUndo: () => void;
  message?: string;
}

export default function UndoToast({ show, onUndo, message = "Node deleted" }: UndoToastProps) {
  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
      <div className="bg-surface border border-border-default rounded-lg shadow-depth-lg px-5 py-3 flex items-center gap-4">
        <span className="text-text-secondary text-sm font-medium">{message}</span>
        {/* Undo is a primary action in this context */}
        <Button onClick={onUndo} className="h-8 px-4 bg-action-primary hover:bg-action-primary-hover text-action-primary-text rounded-md font-medium text-sm flex items-center gap-2 transition-colors">
          <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
          Undo
        </Button>
      </div>
    </div>
  );
}

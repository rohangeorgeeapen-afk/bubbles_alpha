"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';

interface UndoToastProps {
  show: boolean;
  onUndo: () => void;
  message?: string;
}

export default function UndoToast({ 
  show, 
  onUndo, 
  message = "Node deleted" 
}: UndoToastProps) {
  return (
    <div 
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
        show 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 backdrop-blur-sm">
        <span className="text-[#ececec] text-sm font-medium">
          {message}
        </span>
        <Button
          onClick={onUndo}
          className="h-8 px-4 bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
          Undo
        </Button>
      </div>
    </div>
  );
}

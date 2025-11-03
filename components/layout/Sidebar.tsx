"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, User, LogOut } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Canvas {
  id: string;
  name: string;
  createdAt: string;
  nodeCount: number;
}

interface SidebarProps {
  canvases: Canvas[];
  currentCanvasId: string | null;
  onSelectCanvas: (id: string) => void;
  onNewCanvas: () => void;
  onDeleteCanvas: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}

export default function Sidebar({
  canvases,
  currentCanvasId,
  onSelectCanvas,
  onNewCanvas,
  onDeleteCanvas,
  isOpen,
  onToggle,
  userEmail,
  onSignOut,
}: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-[#171717] transition-all duration-300 z-40 flex flex-col ${
          isOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        {/* Header with toggle button */}
        <div className="p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8"></div>
            <Button
              onClick={onToggle}
              className="bg-transparent hover:bg-[#212121] text-[#ececec] rounded-lg p-2 border-0 flex-shrink-0"
              size="sm"
            >
              <PanelLeftClose className="w-5 h-5" />
            </Button>
          </div>
          <button
            onClick={onNewCanvas}
            className="w-full bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm border border-[#4a4a4a] h-11 whitespace-nowrap overflow-hidden shadow-md transition-all duration-200 flex items-center justify-center hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 relative"
            style={{
              background: 'rgba(42, 42, 42, 0.8)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
            }}
          >
            <Plus className="w-4 h-4 absolute left-4 text-blue-400" strokeWidth={2} />
            <span className="truncate">New canvas</span>
          </button>
        </div>

        {/* Canvas List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0">
            {canvases.length === 0 ? (
              <div className="text-center py-8 text-[#b4b4b4] text-sm px-4">
                No canvases yet
              </div>
            ) : (
              canvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className={`group relative rounded-lg transition-colors ${
                    currentCanvasId === canvas.id
                      ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-l-2 border-blue-500'
                      : 'hover:bg-[#212121]'
                  }`}
                >
                  <button
                    onClick={() => onSelectCanvas(canvas.id)}
                    className="w-full text-left px-3 py-3 pr-10"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${currentCanvasId === canvas.id ? 'text-blue-400' : 'text-[#b4b4b4]'}`} strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#ececec] truncate">
                          {canvas.name}
                        </div>
                        <div className="text-xs text-[#b4b4b4] mt-1">
                          {canvas.nodeCount} nodes
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCanvas(canvas.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#2f2f2f] transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-[#b4b4b4] hover:text-[#ef4444]" strokeWidth={2} />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with user info */}
        <div className="p-3 border-t border-[#2f2f2f] flex-shrink-0 space-y-2">
          <div className="text-xs text-[#b4b4b4]">
            {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
          </div>
          {userEmail && (
            <div className="flex items-center justify-between gap-2 bg-[#212121] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="w-4 h-4 text-[#b4b4b4] flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-[#ececec] truncate">{userEmail}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1 hover:bg-[#2f2f2f] rounded transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-[#b4b4b4]" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          onClick={onToggle}
          className="fixed top-3 left-3 z-[60] bg-[#212121] hover:bg-[#2f2f2f] text-[#ececec] rounded-lg p-2 border-0 shadow-lg"
          size="sm"
          aria-label="Open sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Overlay for when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}

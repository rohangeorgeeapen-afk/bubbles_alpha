"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, User, LogOut, Pencil, Check, X, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

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
  onRenameCanvas: (id: string, newName: string) => void;
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
  onRenameCanvas,
  isOpen,
  onToggle,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleStartEdit = (canvas: Canvas, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditingName(canvas.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onRenameCanvas(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleToggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) {
      setSearchQuery('');
    }
  };

  const filteredCanvases = searchQuery.trim()
    ? canvases.filter((canvas) =>
        canvas.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : canvases;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-[#171717] transition-all duration-300 z-40 flex flex-col ${
          isOpen ? 'w-full sm:w-80 md:w-64' : 'w-0'
        } overflow-hidden`}
      >
        {/* Header with logo and toggle button */}
        <div className="p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 sm:gap-10">
              <img 
                src="/logo.png" 
                alt="Bubbles Logo" 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <h1 
                className="text-lg sm:text-xl font-bold tracking-tight" 
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
            </div>
            <Button
              onClick={onToggle}
              className="bg-transparent hover:bg-[#212121] text-[#ececec] rounded-lg p-2 border-0 flex-shrink-0 touch-manipulation"
              size="sm"
            >
              <PanelLeftClose className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          </div>
          {isSearching ? (
            <div className="flex gap-2 items-center">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search canvases..."
                className="flex-1 h-11 bg-[#2a2a2a] border-[#4a4a4a] text-[#ececec] placeholder:text-[#6e6e6e] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00D5FF]/50"
                autoFocus
              />
              <button
                onClick={handleToggleSearch}
                className="flex-shrink-0 bg-[#2a2a2a] text-[#ececec] rounded-lg border border-[#4a4a4a] h-11 w-11 shadow-md transition-all duration-200 flex items-center justify-center hover:border-[#ef4444]/50 hover:shadow-lg hover:shadow-[#ef4444]/30"
                title="Close search"
              >
                <X className="w-4 h-4 text-[#b4b4b4]" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onNewCanvas}
                className="flex-1 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm sm:text-base border border-[#4a4a4a] h-11 sm:h-12 whitespace-nowrap overflow-hidden shadow-md transition-all duration-200 flex items-center hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 relative pl-4 touch-manipulation"
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
                <Plus className="w-4 h-4 text-[#00D5FF] mr-2" strokeWidth={2} />
                <span className="truncate">New canvas</span>
              </button>
              <button
                onClick={handleToggleSearch}
                className="flex-shrink-0 bg-[#2a2a2a] text-[#ececec] rounded-lg border border-[#4a4a4a] h-11 w-11 sm:h-12 sm:w-12 shadow-md transition-all duration-200 flex items-center justify-center hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 touch-manipulation"
                style={{
                  background: 'rgba(42, 42, 42, 0.8)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                }}
                title="Search chats"
              >
                <Search className="w-4 h-4 text-[#00D5FF]" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Canvas List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0">
            {filteredCanvases.length === 0 ? (
              <div className="text-center py-8 text-[#b4b4b4] text-sm px-4">
                {searchQuery ? 'No canvases found' : 'No canvases yet'}
              </div>
            ) : (
              filteredCanvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className={`group relative rounded-lg transition-colors ${
                    currentCanvasId === canvas.id
                      ? 'bg-gradient-to-r from-[#00D5FF]/10 to-[#00D5FF]/10 border-l-2 border-[#00D5FF]'
                      : 'hover:bg-[#212121]'
                  }`}
                >
                  {editingId === canvas.id ? (
                    /* Editing mode */
                    <div className="px-3 py-3 pr-20">
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentCanvasId === canvas.id ? 'text-[#00D5FF]' : 'text-[#b4b4b4]'}`} strokeWidth={2} />
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(canvas.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="h-7 text-sm bg-[#2a2a2a] border-[#565656] text-[#ececec] focus-visible:ring-0 focus-visible:ring-offset-0"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          onClick={() => handleSaveEdit(canvas.id)}
                          className="p-1.5 rounded hover:bg-[#2f2f2f] transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4 text-green-400" strokeWidth={2} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded hover:bg-[#2f2f2f] transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4 text-[#b4b4b4]" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal mode */
                    <>
                      <button
                        onClick={() => onSelectCanvas(canvas.id)}
                        className="w-full text-left px-3 py-3 pr-20"
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${currentCanvasId === canvas.id ? 'text-[#00D5FF]' : 'text-[#b4b4b4]'}`} strokeWidth={2} />
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
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEdit(canvas, e)}
                          className="p-1.5 rounded hover:bg-[#2f2f2f] transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-4 h-4 text-[#b4b4b4] hover:text-[#ececec]" strokeWidth={2} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCanvas(canvas.id);
                          }}
                          className="p-1.5 rounded hover:bg-[#2f2f2f] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#b4b4b4] hover:text-[#ef4444]" strokeWidth={2} />
                        </button>
                      </div>
                    </>
                  )}
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
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}

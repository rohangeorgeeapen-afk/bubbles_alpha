"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, PanelLeftClose, PanelLeft, User, LogOut, Pencil, Check, X, Search, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
  const [logoHovered, setLogoHovered] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<Canvas | null>(null);
  const [deletingCanvasId, setDeletingCanvasId] = useState<string | null>(null);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  // Check if there's an empty canvas (0 nodes)
  const hasEmptyCanvas = canvases.some(canvas => canvas.nodeCount === 0);

  const handleStartEdit = (canvas: Canvas, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditingName(canvas.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      // Limit canvas name to 30 characters
      const trimmedName = editingName.trim().substring(0, 30);
      onRenameCanvas(id, trimmedName);
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

  const handleNewCanvasClick = () => {
    if (hasEmptyCanvas) {
      // Find the empty canvas and switch to it
      const emptyCanvas = canvases.find(canvas => canvas.nodeCount === 0);
      if (emptyCanvas) {
        onSelectCanvas(emptyCanvas.id);
      }
    } else {
      onNewCanvas();
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-[#171717] transition-all duration-300 z-40 flex flex-col ${
          isOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        {/* Header with logo and toggle button */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="relative w-8 h-8 cursor-pointer group transition-all duration-500 flex-shrink-0"
                style={{
                  filter: logoHovered ? 'drop-shadow(0 12px 40px rgba(0, 213, 255, 0.5))' : 'drop-shadow(0 0 0 transparent)',
                  transition: 'filter 0.5s ease'
                }}
                onMouseEnter={() => setLogoHovered(true)}
                onMouseLeave={() => setLogoHovered(false)}
                onClick={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    const currentRotation = parseInt(img.style.rotate || '0');
                    img.style.rotate = `${currentRotation + 360}deg`;
                  }
                }}
              >
                <Image 
                  src="/logo.png" 
                  alt="Bubbles Logo"
                  width={32}
                  height={32}
                  className={`w-full h-full object-contain animate-bubble-pop transition-all duration-500 ease-out ${logoHovered ? 'scale-[1.4]' : 'scale-100'}`}
                  style={{ 
                    background: 'transparent',
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), rotate 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 
                  className="text-xl font-bold tracking-tight" 
                  style={{ 
                    fontFamily: 'var(--font-montserrat), sans-serif', 
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
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-[#00D5FF]/20 text-[#00D5FF] rounded border border-[#00D5FF]/30 flex-shrink-0">
                  BETA
                </span>
              </div>
            </div>
            <Button
              onClick={onToggle}
              className="bg-transparent hover:bg-[#212121] text-[#ececec] rounded-lg p-2 border-0 flex-shrink-0 touch-manipulation"
              size="sm"
            >
              <PanelLeftClose className="w-6 h-6" />
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
                onClick={handleNewCanvasClick}
                className="flex-1 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-base border border-[#4a4a4a] h-12 whitespace-nowrap overflow-hidden shadow-md transition-all duration-200 flex items-center hover:border-[#00D5FF]/50 hover:shadow-md hover:shadow-[#00D5FF]/20 hover:-translate-y-[2px] relative pl-4 touch-manipulation"
                style={{ background: 'rgba(42, 42, 42, 0.8)' }}
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
                className="flex-shrink-0 bg-[#2a2a2a] text-[#ececec] rounded-lg border border-[#4a4a4a] h-12 w-12 shadow-md transition-all duration-200 flex items-center justify-center hover:border-[#00D5FF]/50 hover:shadow-md hover:shadow-[#00D5FF]/20 hover:-translate-y-[2px] touch-manipulation"
                style={{ background: 'rgba(42, 42, 42, 0.8)' }}
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
                        className={`group relative rounded-lg ${
                          deletingCanvasId === canvas.id
                            ? 'opacity-0 scale-95 -translate-x-4 transition-all duration-300'
                            : ''
                        } ${
                          currentCanvasId === canvas.id
                            ? 'bg-gradient-to-r from-[#00D5FF]/10 to-[#00D5FF]/10 border-l-2 border-[#00D5FF]'
                            : 'hover:bg-[#212121]'
                        }`}
                      >
                        {editingId === canvas.id ? (
                          /* Editing mode */
                          <div className="px-3 py-2 pr-20">
                            <div className="flex items-center gap-2">
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
                              className="w-full text-left px-3 py-2 pr-20"
                            >
                              <div className="flex items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-[#ececec] truncate">
                                    {canvas.name.length > 15 ? canvas.name.substring(0, 15) + '...' : canvas.name}
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
                                  setCanvasToDelete(canvas);
                                  setDeleteDialogOpen(true);
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
                  onClick={() => setSignOutDialogOpen(true)}
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

      {/* Overlay removed - sidebar now behaves consistently at all window sizes */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#2a2a2a] border border-[#4a4a4a] text-[#ececec] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#ececec]">
              <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              Delete Canvas
            </DialogTitle>
            <DialogDescription className="text-[#b4b4b4] pt-2">
              Are you sure you want to delete <span className="text-[#ececec] font-medium">&quot;{canvasToDelete?.name}&quot;</span>?
              <br />
              <span className="text-[#8e8e8e] text-sm">This action cannot be undone. All nodes and conversations will be permanently deleted.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCanvasToDelete(null);
              }}
              className="bg-transparent border-[#4a4a4a] text-[#ececec] hover:bg-[#3a3a3a] hover:text-[#ececec]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (canvasToDelete) {
                  setDeletingCanvasId(canvasToDelete.id);
                  setDeleteDialogOpen(false);
                  
                  // Wait for animation to complete before actually deleting
                  setTimeout(() => {
                    onDeleteCanvas(canvasToDelete.id);
                    setDeletingCanvasId(null);
                    setCanvasToDelete(null);
                  }, 300);
                }
              }}
              className="bg-[#ef4444] text-white hover:bg-[#dc2626]"
            >
              Delete Canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="bg-[#2a2a2a] border border-[#4a4a4a] text-[#ececec] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#ececec]">
              <LogOut className="w-5 h-5 text-[#ef4444]" />
              Sign Out
            </DialogTitle>
            <DialogDescription className="text-[#b4b4b4] pt-2">
              Are you sure you want to sign out?
              <br />
              <span className="text-[#8e8e8e] text-sm">You&apos;ll need to sign in again to access your canvases.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setSignOutDialogOpen(false)}
              className="bg-transparent border-[#4a4a4a] text-[#ececec] hover:bg-[#3a3a3a] hover:text-[#ececec]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSignOutDialogOpen(false);
                onSignOut?.();
              }}
              className="bg-[#ef4444] text-white hover:bg-[#dc2626]"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

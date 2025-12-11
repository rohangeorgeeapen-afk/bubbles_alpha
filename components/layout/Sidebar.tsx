"use client";

import React, { useState } from 'react';
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

  const hasEmptyCanvas = canvases.some(canvas => canvas.nodeCount === 0);

  const handleStartEdit = (canvas: Canvas, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditingName(canvas.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onRenameCanvas(id, editingName.trim().substring(0, 30));
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
    if (isSearching) setSearchQuery('');
  };

  const filteredCanvases = searchQuery.trim()
    ? canvases.filter((canvas) => canvas.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : canvases;

  const handleNewCanvasClick = () => {
    if (hasEmptyCanvas) {
      const emptyCanvas = canvases.find(canvas => canvas.nodeCount === 0);
      if (emptyCanvas) onSelectCanvas(emptyCanvas.id);
    } else {
      onNewCanvas();
    }
  };

  return (
    <>
      {/* Sidebar - uses void bg (darkest) to create depth against main content */}
      <div className={`fixed top-0 left-0 h-full bg-void border-r border-border-subtle transition-all duration-300 z-40 flex flex-col ${isOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        
        {/* Header */}
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
                <img 
                  src="/logo.png" 
                  alt="Bubbles Logo" 
                  className="w-full h-full object-contain animate-bubble-pop transition-all duration-500 ease-out"
                  style={{ 
                    background: 'transparent',
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), rotate 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    transform: logoHovered ? 'scale(1.4)' : 'scale(1)'
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 
                  className="text-xl font-bold tracking-tight" 
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
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-[#00D5FF]/20 text-[#00D5FF] rounded border border-[#00D5FF]/30 flex-shrink-0">
                  BETA
                </span>
              </div>
            </div>
            {/* Ghost button - minimal visual weight */}
            <button onClick={onToggle} className="btn-icon flex-shrink-0" aria-label="Close sidebar">
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>
          
          {isSearching ? (
            <div className="flex gap-2 items-center">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search canvases..."
                className="flex-1 h-10 bg-surface border-border-default text-text-primary placeholder:text-text-disabled focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border-focus"
                autoFocus
              />
              <button onClick={handleToggleSearch} className="btn-secondary h-10 w-10 flex items-center justify-center" title="Close search">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Primary action button */}
              <button onClick={handleNewCanvasClick} className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 touch-manipulation">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>New canvas</span>
              </button>
              {/* Secondary action - subtle styling */}
              <button onClick={handleToggleSearch} className="btn-secondary h-10 w-10 flex items-center justify-center touch-manipulation" title="Search">
                <Search className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Canvas List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5">
            {filteredCanvases.length === 0 ? (
              <div className="text-center py-8 text-text-disabled text-sm px-4">
                {searchQuery ? 'No canvases found' : 'No canvases yet'}
              </div>
            ) : (
              filteredCanvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className={`group relative rounded-md ${
                    deletingCanvasId === canvas.id ? 'opacity-0 scale-95 -translate-x-4 transition-all duration-300' : ''
                  } ${
                    currentCanvasId === canvas.id
                      ? 'bg-elevated border-l-2 border-action-primary' /* Selected state - instant, no transition */
                      : 'hover:bg-surface transition-colors duration-150' /* Only hover transitions */
                  }`}
                >
                  {editingId === canvas.id ? (
                    <div className="px-3 py-2 pr-20">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(canvas.id);
                          else if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="h-7 text-sm bg-surface border-border-default text-text-primary focus-visible:ring-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button onClick={() => handleSaveEdit(canvas.id)} className="p-1.5 rounded hover:bg-elevated transition-colors" title="Save">
                          <Check className="w-4 h-4 text-success" strokeWidth={2} />
                        </button>
                        <button onClick={handleCancelEdit} className="p-1.5 rounded hover:bg-elevated transition-colors" title="Cancel">
                          <X className="w-4 h-4 text-text-tertiary" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onSelectCanvas(canvas.id)} className="w-full text-left px-3 py-2 pr-20">
                        <div className="text-sm text-text-primary truncate">{canvas.name.length > 18 ? canvas.name.substring(0, 18) + '...' : canvas.name}</div>
                        <div className="text-xs text-text-disabled mt-0.5">{canvas.nodeCount} nodes</div>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleStartEdit(canvas, e)} className="p-1.5 rounded hover:bg-elevated transition-colors" title="Rename">
                          <Pencil className="w-3.5 h-3.5 text-text-disabled hover:text-text-secondary" strokeWidth={2} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setCanvasToDelete(canvas); setDeleteDialogOpen(true); }} className="p-1.5 rounded hover:bg-error-muted transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-text-disabled hover:text-error" strokeWidth={2} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle flex-shrink-0 space-y-2">
          <div className="text-xs text-text-disabled font-mono">{canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}</div>
          {userEmail && (
            <div className="flex items-center justify-between gap-2 bg-surface rounded-md px-3 py-2 border border-border-subtle">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="w-4 h-4 text-text-disabled flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-text-secondary truncate">{userEmail}</span>
              </div>
              {onSignOut && (
                <button onClick={() => setSignOutDialogOpen(true)} className="p-1 hover:bg-elevated rounded transition-colors flex-shrink-0" title="Sign out">
                  <LogOut className="w-4 h-4 text-text-disabled hover:text-text-secondary" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle button when closed */}
      {!isOpen && (
        <button onClick={onToggle} className="fixed top-3 left-3 z-[60] btn-secondary p-2.5 shadow-depth-md animate-fade-in" aria-label="Open sidebar">
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* Delete Dialog - uses error semantic color */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-surface border border-border-default text-text-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <AlertTriangle className="w-5 h-5 text-error" />
              Delete Canvas
            </DialogTitle>
            <DialogDescription className="text-text-secondary pt-2">
              Are you sure you want to delete <span className="text-text-primary font-medium">&quot;{canvasToDelete?.name}&quot;</span>?
              <br />
              <span className="text-text-tertiary text-sm">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => { setDeleteDialogOpen(false); setCanvasToDelete(null); }} className="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button onClick={() => { if (canvasToDelete) { setDeletingCanvasId(canvasToDelete.id); setDeleteDialogOpen(false); setTimeout(() => { onDeleteCanvas(canvasToDelete.id); setDeletingCanvasId(null); setCanvasToDelete(null); }, 300); }}} className="btn-danger px-4 py-2 text-sm">
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="bg-surface border border-border-default text-text-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <LogOut className="w-5 h-5 text-warning" />
              Sign Out
            </DialogTitle>
            <DialogDescription className="text-text-secondary pt-2">
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setSignOutDialogOpen(false)} className="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button onClick={() => { setSignOutDialogOpen(false); onSignOut?.(); }} className="btn-primary px-4 py-2 text-sm bg-warning hover:bg-warning/90">
              Sign Out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

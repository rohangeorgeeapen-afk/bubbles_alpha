"use client";

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AsciiBox } from '@/components/ui/ascii-box';

interface Canvas {
  id: string;
  name: string;
  createdAt: string;
  nodeCount: number;
  searchableText?: string;
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
    ? canvases.filter((canvas) => {
        const normalizedQuery = searchQuery.toLowerCase();
        return (
          canvas.name.toLowerCase().includes(normalizedQuery) ||
          (canvas.searchableText || '').toLowerCase().includes(normalizedQuery)
        );
      })
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
            <div
              className="flex items-center gap-[1ch] flex-1 min-w-0 cursor-pointer group"
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
            >
              {/* Mini ASCII logo: 7-circle hex with all 6 outer circles
                  connected to the center via diagonals + horizontals. */}
              <pre
                className={`text-[9px] leading-[1] font-mono whitespace-pre flex-shrink-0 transition-colors ${
                  logoHovered ? 'text-action-primary-hover' : 'text-action-primary'
                }`}
                aria-hidden
              >
{String.raw`o   o
 \ /
o-O-o
 / \
o   o`}
              </pre>
              <div className="flex items-baseline gap-[1ch] min-w-0">
                <h1 className="text-[15px] font-mono font-bold tracking-tight text-text-primary">
                  bubbles
                </h1>
                <span className="text-[10px] font-mono text-action-primary flex-shrink-0">
                  [beta]
                </span>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-text-tertiary hover:text-text-primary flex-shrink-0 px-[1ch]"
              aria-label="Close sidebar"
            >
              [&lt;]
            </button>
          </div>
          
          {isSearching ? (
            <div className="flex gap-2 items-center min-w-0">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search…"
                className="flex-1 min-w-0 h-9 bg-surface border-border-default text-text-primary placeholder:text-text-disabled focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border-focus text-[13px] font-mono"
                autoFocus
              />
              <button
                onClick={handleToggleSearch}
                className="flex-shrink-0 h-9 px-[2ch] flex items-center justify-center text-text-tertiary hover:text-text-primary border border-border-default hover:border-border-strong text-[12px]"
                title="Close search"
              >
                close
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-[0.5lh]">
              <button
                onClick={handleNewCanvasClick}
                className="w-full h-10 flex items-center justify-center gap-[1ch] bg-action-primary text-action-primary-text hover:bg-action-primary-hover transition-colors font-bold tracking-wider text-[13px] active:scale-[0.99]"
              >
                <span className="text-[15px]">+</span>
                <span>NEW CANVAS</span>
              </button>
              <button
                onClick={handleToggleSearch}
                className="w-full h-8 px-[2ch] flex items-center justify-center gap-[1ch] text-text-tertiary hover:text-text-primary border border-border-default hover:border-border-strong text-[12px]"
                title="Search canvases"
              >
                <span>[search]</span>
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
                    <div className="px-3 py-2 flex flex-col gap-[0.5lh]">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(canvas.id);
                          else if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="h-7 text-[13px] font-mono bg-surface border-border-default text-text-primary focus-visible:ring-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-end gap-[2ch] text-[12px]">
                        <button onClick={() => handleSaveEdit(canvas.id)} className="text-action-primary hover:text-action-primary-hover" title="Save">
                          [save]
                        </button>
                        <button onClick={handleCancelEdit} className="text-text-tertiary hover:text-text-primary" title="Cancel">
                          [cancel]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onSelectCanvas(canvas.id)} className="w-full text-left px-3 py-2 pr-20">
                        <div className="text-sm text-text-primary truncate">{canvas.name.length > 18 ? canvas.name.substring(0, 18) + '...' : canvas.name}</div>
                        <div className="text-xs text-text-disabled mt-0.5">{canvas.nodeCount} nodes</div>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-[1ch] text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleStartEdit(canvas, e)} className="text-text-disabled hover:text-text-secondary" title="Rename">
                          [rename]
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setCanvasToDelete(canvas); setDeleteDialogOpen(true); }} className="text-text-disabled hover:text-error" title="Delete">
                          [delete]
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
            <div className="flex items-center justify-between gap-[1ch] px-[1ch] py-[0.25lh] border border-border-default text-[12px]">
              <div className="flex items-baseline gap-[1ch] min-w-0 flex-1">
                <span className="text-text-tertiary flex-shrink-0">@</span>
                <span className="text-text-secondary truncate">{userEmail}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={() => setSignOutDialogOpen(true)}
                  className="text-text-tertiary hover:text-text-primary flex-shrink-0"
                  title="Sign out"
                >
                  [exit]
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="theme-terminal font-mono fixed top-3 left-3 z-[60] px-[2ch] py-[0.25lh] text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong bg-base text-[13px]"
          aria-label="Open sidebar"
        >
          [&gt;]
        </button>
      )}

      {/* Delete Dialog - uses error semantic color */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="theme-terminal font-mono bg-base text-text-primary max-w-md p-0 border-0 shadow-none [&>button:last-child]:hidden">
          <AsciiBox title="confirm · delete canvas" variant="strong" className="text-[13px]" contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[1lh]">
            <DialogTitle className="sr-only">Delete Canvas</DialogTitle>
            <DialogDescription className="sr-only">
              Are you sure you want to delete &quot;{canvasToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
            <div className="text-text-secondary">
              <div>delete <span className="text-text-primary">&ldquo;{canvasToDelete?.name}&rdquo;</span> ?</div>
              <div className="text-text-tertiary mt-[0.5lh]">! this action cannot be undone</div>
            </div>
            <div className="flex justify-end gap-[2ch]">
              <button
                onClick={() => { setDeleteDialogOpen(false); setCanvasToDelete(null); }}
                className="text-text-tertiary hover:text-text-secondary"
              >
                [ cancel ]
              </button>
              <button
                onClick={() => { if (canvasToDelete) { setDeletingCanvasId(canvasToDelete.id); setDeleteDialogOpen(false); setTimeout(() => { onDeleteCanvas(canvasToDelete.id); setDeletingCanvasId(null); setCanvasToDelete(null); }, 300); } }}
                className="text-error hover:text-error/80"
              >
                [ delete ]
              </button>
            </div>
          </AsciiBox>
        </DialogContent>
      </Dialog>

      {/* Sign Out Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="theme-terminal font-mono bg-base text-text-primary max-w-md p-0 border-0 shadow-none [&>button:last-child]:hidden">
          <AsciiBox title="confirm · sign out" variant="strong" className="text-[13px]" contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[1lh]">
            <DialogTitle className="sr-only">Sign Out</DialogTitle>
            <DialogDescription className="sr-only">Are you sure you want to sign out?</DialogDescription>
            <div className="text-text-secondary">sign out of this session?</div>
            <div className="flex justify-end gap-[2ch]">
              <button
                onClick={() => setSignOutDialogOpen(false)}
                className="text-text-tertiary hover:text-text-secondary"
              >
                [ cancel ]
              </button>
              <button
                onClick={() => { setSignOutDialogOpen(false); onSignOut?.(); }}
                className="text-warning hover:text-warning/80"
              >
                [ sign out ]
              </button>
            </div>
          </AsciiBox>
        </DialogContent>
      </Dialog>
    </>
  );
}

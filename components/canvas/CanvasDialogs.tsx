"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUpQuestion: string;
  onFollowUpQuestionChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function FollowUpDialog({ open, onOpenChange, followUpQuestion, onFollowUpQuestionChange, onSubmit, isLoading }: FollowUpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border border-border-default rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-semibold text-lg">Add Follow-up Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter your follow-up question..."
            value={followUpQuestion}
            onChange={(e) => onFollowUpQuestionChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }}}
            disabled={isLoading}
            className="bg-void border border-border-default text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:ring-0 rounded-md"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="border-border-default text-text-secondary hover:bg-elevated rounded-md">
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isLoading || !followUpQuestion.trim()} className="bg-action-primary hover:bg-action-primary-hover text-action-primary-text rounded-md font-medium">
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ExitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmExit: () => void;
}

export function ExitConfirmationDialog({ open, onOpenChange, onConfirmExit }: ExitConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border border-border-default rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-semibold text-lg">Exit Fullscreen?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">AI is still generating a response. If you exit now, the response will be cancelled.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border-default text-text-secondary hover:bg-elevated rounded-md">
              Stay
            </Button>
            {/* Destructive action uses error color */}
            <Button onClick={onConfirmExit} className="bg-error hover:bg-error/90 text-white rounded-md font-medium">
              Exit Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

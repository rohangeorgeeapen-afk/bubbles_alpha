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

export function FollowUpDialog({
  open,
  onOpenChange,
  followUpQuestion,
  onFollowUpQuestionChange,
  onSubmit,
  isLoading,
}: FollowUpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#ececec] font-semibold text-lg">
            Add Follow-up Question
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter your follow-up question..."
            value={followUpQuestion}
            onChange={(e) => onFollowUpQuestionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={isLoading}
            className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] focus:border-[#565656] focus:ring-0 rounded-lg"
          />
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isLoading} 
              className="border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg"
            >
              Cancel
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={isLoading || !followUpQuestion.trim()} 
              className="bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium"
            >
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

export function ExitConfirmationDialog({
  open,
  onOpenChange,
  onConfirmExit,
}: ExitConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#ececec] font-semibold text-lg">
            Exit Fullscreen?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-[#ececec] text-sm">
            AI is still generating a response. If you exit now, the response will be cancelled.
          </p>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg"
            >
              Stay
            </Button>
            <Button 
              onClick={onConfirmExit}
              className="bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium"
            >
              Exit Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

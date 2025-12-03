"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MobileWarningDialogProps {
  open: boolean;
  onDismiss: (neverShowAgain: boolean) => void;
}

export default function MobileWarningDialog({ open, onDismiss }: MobileWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss(false)}>
      <DialogContent className="bg-surface border border-border-default rounded-lg max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-semibold text-lg flex items-center gap-2 pr-8">
            <span className="text-2xl">📱</span>
            Mobile Experience Notice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-text-secondary text-sm leading-relaxed">
            This app hasn&apos;t been fully optimized for mobile devices yet. You may experience bugs or layout issues.
          </p>
          {/* Warning semantic color for the hint */}
          <p className="text-warning text-xs">
            For the best experience, we recommend using a desktop or tablet.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {/* Primary action */}
            <Button onClick={() => onDismiss(true)} className="w-full bg-action-primary hover:bg-action-primary-hover text-action-primary-text rounded-md font-medium">
              Got it, don&apos;t show again
            </Button>
            {/* Secondary action */}
            <Button onClick={() => onDismiss(false)} variant="outline" className="w-full border-border-default text-text-secondary hover:bg-elevated rounded-md">
              Remind me later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

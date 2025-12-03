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
      <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-[#ececec] font-semibold text-lg flex items-center gap-2 pr-8">
            <span className="text-2xl">📱</span>
            Mobile Experience Notice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-[#b4b4b4] text-sm leading-relaxed">
            This app hasn&apos;t been fully optimized for mobile devices yet. You may experience bugs or layout issues.
          </p>
          <p className="text-[#8e8e8e] text-xs">
            For the best experience, we recommend using a desktop or tablet.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={() => onDismiss(true)} 
              className="w-full bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium"
            >
              Got it, don&apos;t show again
            </Button>
            <Button 
              onClick={() => onDismiss(false)} 
              variant="outline"
              className="w-full border-[#4d4d4d] text-[#ececec] hover:bg-[#212121] rounded-lg"
            >
              Remind me later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

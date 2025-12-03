"use client";

import React from 'react';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  show: boolean;
}

export default function NetworkStatusIndicator({ isOnline, show }: NetworkStatusIndicatorProps) {
  if (isOnline || !show) return null;
  
  return (
    <div 
      className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-error-muted border border-error/50 rounded-md px-4 py-2 shadow-depth-md"
      role="alert"
      aria-live="polite"
    >
      {/* Error semantic color for network issues */}
      <span className="text-error text-sm font-medium">No internet connection</span>
    </div>
  );
}

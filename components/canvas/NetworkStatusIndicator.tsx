"use client";

import React from 'react';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  show: boolean;
}

export default function NetworkStatusIndicator({ 
  isOnline, 
  show 
}: NetworkStatusIndicatorProps) {
  if (isOnline || !show) return null;
  
  return (
    <div 
      className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 rounded-lg px-4 py-2 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <span className="text-white text-sm font-medium">No internet connection</span>
    </div>
  );
}

"use client";

import React from 'react';

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export default function CanvasControls({
  onZoomIn,
  onZoomOut,
  onFitView,
}: CanvasControlsProps) {
  const buttonClass = "w-10 h-10 bg-[#2a2a2a] text-[#ececec] rounded-lg font-normal text-sm border border-[#4a4a4a] shadow-md transition-all duration-200 hover:border-[#00D5FF]/50 hover:shadow-lg hover:shadow-[#00D5FF]/30 hover:-translate-y-0.5 flex items-center justify-center";
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2))';
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
  };

  return (
    <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
      <button
        onClick={onZoomIn}
        className={buttonClass}
        style={{ background: 'rgba(42, 42, 42, 0.8)' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Zoom in"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-4 h-4"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      
      <button
        onClick={onZoomOut}
        className={buttonClass}
        style={{ background: 'rgba(42, 42, 42, 0.8)' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Zoom out"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-4 h-4"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      
      <button
        onClick={onFitView}
        className={buttonClass}
        style={{ background: 'rgba(42, 42, 42, 0.8)' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Fit view"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      </button>
    </div>
  );
}

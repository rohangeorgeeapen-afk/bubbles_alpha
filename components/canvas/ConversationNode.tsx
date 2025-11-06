"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, Maximize2, X } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';

export interface ConversationNodeData extends Record<string, unknown> {
  question: string;
  response: string;
  timestamp: string;
  onAddFollowUp: (nodeId: string, question: string) => Promise<void>;
  onDelete?: (nodeId: string) => void;
  onMaximize?: (nodeId: string) => void;
}

export default function ConversationNode({ id, data }: NodeProps<any>) {
  const totalLength = data.question.length + data.response.length;
  const isLongContent = totalLength > 600;
  const [followUpText, setFollowUpText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showFooter = isHovered || isInputFocused;
  
  // Detect OS, mobile, and motion preferences
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  React.useEffect(() => {
    // Detect if user is on macOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMac(userAgent.includes('mac'));
    
    // Detect if user is on mobile
    setIsMobile(window.innerWidth < 768);
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    mediaQuery.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', handleResize);
    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Completely prevent ReactFlow from handling any mouse events in text areas
  const preventReactFlowEvents = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-[#565656] rounded-full" />
      <Card 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        className={`w-[min(450px,calc(100vw-2rem))] bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl shadow-lg overflow-hidden flex flex-col nowheel select-none ${prefersReducedMotion ? '' : 'transition-all duration-300 ease-in-out'} ${
          isLongContent 
            ? (showFooter ? 'h-[468px]' : 'h-[400px]')
            : (showFooter ? '' : '')
        }`}
        role="article"
        aria-label="Conversation node"
      >
        {/* Header with OS-specific window control buttons */}
        <div className="h-8 bg-[#2a2a2a] border-b border-[#4d4d4d] flex items-center px-3 flex-shrink-0 justify-between">
          {data.onDelete && (
            <>
              {isMac ? (
                /* macOS-style buttons on the left */
                <div className="flex gap-2 nodrag nopan">
                  {/* Red button - Close/Delete */}
                  <button
                    onClick={() => data.onDelete?.(id)}
                    className={`w-3 h-3 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-200'} group relative ${
                      isHovered 
                        ? 'bg-[#ff5f57] hover:bg-[#ff3b30]' 
                        : 'bg-[#5a5a5a]'
                    }`}
                    aria-label="Delete this node and all its children"
                    title="Delete this node and all its children"
                  >
                    {isHovered && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="text-[#4a0000]">
                          <path d="M1 1L5 5M5 1L1 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                  
                  {/* Yellow button - Minimize */}
                  <button
                    className={`w-3 h-3 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-200'} cursor-default ${
                      isHovered 
                        ? 'bg-[#ffbd2e] hover:bg-[#ffaa00]' 
                        : 'bg-[#5a5a5a]'
                    }`}
                    aria-label="Minimize (decorative)"
                    title="Minimize (decorative)"
                    aria-hidden="true"
                  >
                  </button>
                  
                  {/* Green button - Maximize */}
                  <button
                    onClick={() => data.onMaximize?.(id)}
                    className={`w-3 h-3 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-200'} group relative ${
                      isHovered 
                        ? 'bg-[#28c840] hover:bg-[#20a034] cursor-pointer' 
                        : 'bg-[#5a5a5a] cursor-default'
                    }`}
                    aria-label="Maximize to fullscreen"
                    title="Maximize to fullscreen"
                  >
                    {isHovered && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="text-[#004a00]">
                          <path d="M1 3L3 1L5 3M3 1V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                /* Windows-style buttons on the right */
                <div className="ml-auto flex nodrag nopan">
                  {/* Minimize button */}
                  <button
                    className={`w-11 h-8 flex items-center justify-center ${prefersReducedMotion ? '' : 'transition-colors'} ${
                      isHovered 
                        ? 'hover:bg-[#3a3a3a]' 
                        : ''
                    }`}
                    aria-label="Minimize (decorative)"
                    title="Minimize (decorative)"
                    aria-hidden="true"
                  >
                    <svg width="10" height="1" viewBox="0 0 10 1" className="text-[#ececec]">
                      <rect width="10" height="1" fill="currentColor"/>
                    </svg>
                  </button>
                  
                  {/* Maximize button */}
                  <button
                    onClick={() => data.onMaximize?.(id)}
                    className={`w-11 h-8 flex items-center justify-center rounded ${prefersReducedMotion ? '' : 'transition-colors'} ${
                      isHovered 
                        ? 'hover:bg-[#3a3a3a] cursor-pointer' 
                        : 'cursor-default'
                    }`}
                    aria-label="Maximize to fullscreen"
                    title="Maximize to fullscreen"
                  >
                    <Maximize2 className="w-4 h-4 text-[#ececec]" />
                  </button>
                  
                  {/* Close button */}
                  <button
                    onClick={() => data.onDelete?.(id)}
                    className={`w-11 h-8 flex items-center justify-center rounded ${prefersReducedMotion ? '' : 'transition-colors'} ${
                      isHovered 
                        ? 'hover:bg-[#e81123]' 
                        : ''
                    }`}
                    aria-label="Delete this node and all its children"
                    title="Delete this node and all its children"
                  >
                    <X className="w-4 h-4 text-[#ececec]" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className={`p-6 space-y-4 scrollbar-thin ${isLongContent ? 'flex-1 overflow-y-auto' : ''}`}>
          <div 
            className="nodrag nopan cursor-text select-text"
            onPointerDown={preventReactFlowEvents}
            onPointerUp={preventReactFlowEvents}
            onPointerMove={preventReactFlowEvents}
            onMouseDown={preventReactFlowEvents}
            onMouseUp={preventReactFlowEvents}
            onMouseMove={preventReactFlowEvents}
            onClick={preventReactFlowEvents}
            onDoubleClick={preventReactFlowEvents}
          >
            <div className="text-[15px] text-[#ececec] whitespace-pre-wrap break-words leading-relaxed cursor-text select-text">
              {data.question}
            </div>
          </div>

          <div className="border-t border-[#4d4d4d]"></div>

          <div 
            className="nodrag nopan cursor-text select-text"
            onPointerDown={preventReactFlowEvents}
            onPointerUp={preventReactFlowEvents}
            onPointerMove={preventReactFlowEvents}
            onMouseDown={preventReactFlowEvents}
            onMouseUp={preventReactFlowEvents}
            onMouseMove={preventReactFlowEvents}
            onClick={preventReactFlowEvents}
            onDoubleClick={preventReactFlowEvents}
          >
            <MarkdownContent content={data.response} className="text-[15px] text-[#ececec] leading-relaxed cursor-text select-text" />
          </div>
        </div>

        <div className={`border-t border-[#4d4d4d] bg-[#212121] select-none ${prefersReducedMotion ? '' : 'transition-all duration-300 ease-in-out'} ${
          showFooter 
            ? 'h-[68px] opacity-100' 
            : 'h-0 opacity-0'
        }`}>
          <div className={`px-6 py-4 select-none ${prefersReducedMotion ? '' : 'transition-opacity duration-300'} ${showFooter ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative select-none">
              <label htmlFor={`follow-up-${id}`} className="sr-only">
                Ask a follow-up question
              </label>
              <Input
                id={`follow-up-${id}`}
                type="text"
                placeholder="Ask a follow-up..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && followUpText.trim() && !isSubmitting) {
                    const question = followUpText.trim();
                    setFollowUpText('');
                    setIsSubmitting(true);
                    
                    // Small delay to ensure React flushes the state update
                    await new Promise(resolve => setTimeout(resolve, 0));
                    
                    try {
                      await data.onAddFollowUp(id, question);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                disabled={isSubmitting}
                aria-label="Follow-up question input"
                className="w-full h-9 bg-[#2f2f2f] border border-[#565656] text-[#ececec] placeholder:text-[#8e8e8e] rounded-lg px-3 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm nodrag nopan"
              />
              <Button
                onClick={async () => {
                  if (followUpText.trim() && !isSubmitting) {
                    const question = followUpText.trim();
                    setFollowUpText('');
                    setIsSubmitting(true);
                    
                    // Small delay to ensure React flushes the state update
                    await new Promise(resolve => setTimeout(resolve, 0));
                    
                    try {
                      await data.onAddFollowUp(id, question);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                disabled={!followUpText.trim() || isSubmitting}
                aria-label={isSubmitting ? 'Sending follow-up' : 'Send follow-up question'}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-md bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] disabled:opacity-30 disabled:cursor-not-allowed ${prefersReducedMotion ? '' : 'transition-opacity'} select-none`}
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#565656] border-t-[#0d0d0d] rounded-full animate-spin"></div>
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-[#565656] rounded-full" />
    </>
  );
}

"use client";

import React, { useRef, useEffect, useState, useMemo, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowDown } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';
import ChatInput from './ChatInput';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  nodeId?: string;
  isError?: boolean;
}

interface FullscreenChatViewProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  onRetry?: (messageId: string) => Promise<void>;
  isTransitioning?: boolean;
  sidebarOpen?: boolean;
}



// Typing indicator component
function TypingIndicator() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return (
    <div 
      className="flex justify-start mb-4"
      role="status"
      aria-live="polite"
      aria-label="AI is typing"
    >
      <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-[#2f2f2f]">
        <div className="flex items-center gap-1.5">
          {prefersReducedMotion ? (
            <span className="text-[#b4b4b4] text-sm">AI is typing...</span>
          ) : (
            <>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Message pair component - displays question and answer together
const MessagePair = memo(function MessagePair({ 
  question, 
  answer, 
  isError,
  messageId,
  onRetry 
}: { 
  question: string;
  answer: string;
  isError?: boolean;
  messageId?: string;
  onRetry?: (messageId: string) => Promise<void>;
}) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleRetry = async () => {
    if (!messageId || !onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry(messageId);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div 
      className={`mb-20 border border-[#00D5FF]/30 rounded-2xl p-6 bg-[#2a2a2a]/30 ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}
      style={{ 
        willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 213, 255, 0.05)'
      }}
      role="article"
      aria-label="Conversation exchange"
    >
      {/* User Question */}
      <div className="mb-5">
        <div className="text-[24px] font-semibold text-[#ececec] leading-[1.4] whitespace-pre-wrap break-words" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 213, 255, 0.1)' }}>
          {question}
        </div>
      </div>

      {/* Separator Line */}
      <div className="border-t border-[#4d4d4d] mb-6"></div>

      {/* AI Response */}
      <div className={isError ? 'text-red-400' : ''}>
        <MarkdownContent content={answer} className="text-[16px] leading-[1.7] text-[#ececec]" />
        {isError && onRetry && messageId && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`mt-4 h-8 px-3 bg-red-700 hover:bg-red-600 ${prefersReducedMotion ? '' : 'hover:scale-105 active:scale-95'} text-white rounded-lg text-sm font-medium ${prefersReducedMotion ? '' : 'transition-all duration-200'}`}
            aria-label="Retry sending message"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
});

export default function FullscreenChatView({
  messages,
  onSendMessage,
  onClose,
  isLoading,
  onRetry,
  isTransitioning = false,
  sidebarOpen = true,
}: FullscreenChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMac, setIsMac] = useState(false);
  
  // Detect OS
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMac(userAgent.includes('mac'));
  }, []);
  
  // Virtual scrolling state - only render visible messages when there are 50+
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: messages.length });
  const useVirtualScrolling = messages.length >= 50;
  
  // Calculate visible messages based on scroll position
  const updateVisibleRange = useMemo(() => {
    if (!useVirtualScrolling) return () => {};
    
    return () => {
      if (!messagesContainerRef.current) return;
      
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Estimate message height (average ~100px per message)
      const estimatedMessageHeight = 100;
      const overscan = 5; // Render 5 extra messages above and below viewport
      
      const startIndex = Math.max(0, Math.floor(scrollTop / estimatedMessageHeight) - overscan);
      const endIndex = Math.min(
        messages.length,
        Math.ceil((scrollTop + containerHeight) / estimatedMessageHeight) + overscan
      );
      
      setVisibleRange({ start: startIndex, end: endIndex });
    };
  }, [useVirtualScrolling, messages.length]);
  
  // Get visible messages for rendering
  const visibleMessages = useMemo(() => {
    if (!useVirtualScrolling) return messages;
    return messages.slice(visibleRange.start, visibleRange.end);
  }, [messages, visibleRange, useVirtualScrolling]);
  
  // Calculate offset for virtual scrolling
  const topOffset = useMemo(() => {
    if (!useVirtualScrolling) return 0;
    return visibleRange.start * 100; // Estimated message height
  }, [visibleRange.start, useVirtualScrolling]);
  
  const bottomOffset = useMemo(() => {
    if (!useVirtualScrolling) return 0;
    return (messages.length - visibleRange.end) * 100; // Estimated message height
  }, [messages.length, visibleRange.end, useVirtualScrolling]);
  
  // Detect viewport size and motion preferences on mount
  useEffect(() => {
    const checkViewportSize = () => {
      setIsMobile(window.innerWidth < 768); // Mobile breakpoint at 768px
    };
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    checkViewportSize();
    window.addEventListener('resize', checkViewportSize);
    mediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
      window.removeEventListener('resize', checkViewportSize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Auto-scroll to bottom when new message is added
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesContainerRef.current && !userHasScrolled) {
      const container = messagesContainerRef.current;
      const targetScroll = container.scrollHeight - container.clientHeight;
      
      if (smooth && !prefersReducedMotion) {
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = targetScroll;
      }
    }
  }, [userHasScrolled, prefersReducedMotion]);

  // Maintain scroll position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (messagesContainerRef.current && !userHasScrolled) {
        // If user hasn't scrolled, keep them at the bottom
        scrollToBottom(false);
      }
      // If user has scrolled, maintain their current position (browser handles this automatically)
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userHasScrolled, scrollToBottom]);

  // Handle virtual keyboard on mobile - scroll to bottom when keyboard appears
  useEffect(() => {
    if (!isMobile) return;

    const handleVisualViewportResize = () => {
      // When virtual keyboard appears, the visual viewport shrinks
      // Scroll to bottom to keep input visible
      if (!userHasScrolled) {
        setTimeout(() => scrollToBottom(false), 100);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
      };
    }
  }, [isMobile, userHasScrolled, scrollToBottom]);

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  // Track if user has manually scrolled - with virtual scrolling support
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setUserHasScrolled(!isAtBottom);
      setShowScrollButton(!isAtBottom);
      
      // Update visible range for virtual scrolling
      if (useVirtualScrolling) {
        updateVisibleRange();
      }
    }
  };

  // Scroll to bottom manually when button is clicked
  const scrollToBottomManually = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const targetScroll = container.scrollHeight - container.clientHeight;
      
      if (prefersReducedMotion) {
        container.scrollTop = targetScroll;
      } else {
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
      setUserHasScrolled(false);
      setShowScrollButton(false);
    }
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && !isTransitioning) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isTransitioning]);
  
  // Announce new messages to screen readers
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setAnnouncement(`AI responded: ${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? '...' : ''}`);
      } else {
        setAnnouncement(`You said: ${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? '...' : ''}`);
      }
      // Clear announcement after it's been read
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    // Reset scroll tracking when new message is sent
    setUserHasScrolled(false);
    await onSendMessage(message);
  };

  return (
    <div 
      className="absolute inset-0 z-50 bg-[#212121] flex flex-col"
      role="dialog"
      aria-label="Maximized chat conversation"
      aria-modal="true"
    >
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Header with OS-specific window controls */}
      <div className={`${isMobile ? 'h-12' : 'h-14'} bg-[#2a2a2a] border-b border-[#4d4d4d] flex items-center ${isMobile ? 'px-4' : 'px-6'} ${!sidebarOpen && !isMobile ? 'pl-16' : ''} flex-shrink-0 ${!isMac ? 'justify-end' : ''}`}>
        {isMac ? (
          /* macOS window controls - left side */
          <div className="flex gap-2 nodrag nopan">
            {/* Red button - Disabled/Greyed out */}
            <button
              disabled
              className="w-3 h-3 rounded-full bg-[#5a5a5a] cursor-default"
              aria-label="Close (disabled)"
              aria-hidden="true"
              title="Close (disabled)"
            >
            </button>
            
            {/* Yellow button - Disabled/Greyed out */}
            <button
              disabled
              className="w-3 h-3 rounded-full bg-[#5a5a5a] cursor-default"
              aria-label="Minimize (disabled)"
              aria-hidden="true"
              title="Minimize (disabled)"
            >
            </button>
            
            {/* Green button - Restore to node (only functional button) */}
            <button
              onClick={onClose}
              disabled={isTransitioning}
              className={`w-3 h-3 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-200'} group relative ${
                isTransitioning
                  ? 'bg-[#5a5a5a] cursor-not-allowed'
                  : 'bg-[#28c840] hover:bg-[#20a034] cursor-pointer'
              }`}
              aria-label="Minimize to node view"
              title="Minimize (Esc)"
            >
              {!isTransitioning && (
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#004a00]">
                    <path d="M1 3.5L3.5 3.5L3.5 1M7 4.5L4.5 4.5L4.5 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 3.5L3.5 1M7 4.5L4.5 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Windows window controls - right side */
          <div className="flex nodrag nopan">
            {/* Minimize button - Disabled/Greyed out */}
            <button
              disabled
              className="w-11 h-8 flex items-center justify-center cursor-default opacity-30"
              aria-label="Minimize (disabled)"
              aria-hidden="true"
              title="Minimize (disabled)"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" className="text-[#ececec]">
                <rect width="10" height="1" fill="currentColor"/>
              </svg>
            </button>
            
            {/* Restore button - Only functional button */}
            <button
              onClick={onClose}
              disabled={isTransitioning}
              className={`w-11 h-8 flex items-center justify-center ${prefersReducedMotion ? '' : 'transition-colors'} ${
                isTransitioning
                  ? 'cursor-not-allowed opacity-30'
                  : 'hover:bg-[#3a3a3a] cursor-pointer'
              }`}
              aria-label="Restore to node view"
              title="Restore (Esc)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#ececec]">
                <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            
            {/* Close button - Disabled/Greyed out */}
            <button
              disabled
              className="w-11 h-8 flex items-center justify-center cursor-default opacity-30"
              aria-label="Close (disabled)"
              aria-hidden="true"
              title="Close (disabled)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#ececec]">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Scrollable message container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 py-4' : 'px-6 py-6'} relative`}
        style={{ 
          willChange: 'scroll-position'
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto`}>
          {/* Virtual scrolling: Add spacer for messages above viewport */}
          {useVirtualScrolling && topOffset > 0 && (
            <div style={{ height: `${topOffset}px` }} />
          )}
          
          {/* Render message pairs (question + answer) */}
          {(() => {
            const pairs: Array<{
              question: string;
              answer: string;
              isError?: boolean;
              messageId?: string;
              key: string;
            }> = [];
            
            // Group messages into pairs
            for (let i = 0; i < visibleMessages.length; i += 2) {
              const userMsg = visibleMessages[i];
              const assistantMsg = visibleMessages[i + 1];
              
              if (userMsg && userMsg.role === 'user') {
                if (assistantMsg && assistantMsg.role === 'assistant') {
                  // Complete pair
                  pairs.push({
                    question: userMsg.content,
                    answer: assistantMsg.content,
                    isError: assistantMsg.isError,
                    messageId: assistantMsg.id,
                    key: `pair-${userMsg.id || i}`,
                  });
                } else {
                  // User message without response yet (shouldn't happen in normal flow)
                  pairs.push({
                    question: userMsg.content,
                    answer: '',
                    key: `pair-${userMsg.id || i}`,
                  });
                }
              }
            }
            
            return pairs.map((pair) => (
              <MessagePair
                key={pair.key}
                question={pair.question}
                answer={pair.answer}
                isError={pair.isError}
                messageId={pair.messageId}
                onRetry={onRetry}
              />
            ));
          })()}
          
          {/* Virtual scrolling: Add spacer for messages below viewport */}
          {useVirtualScrolling && bottomOffset > 0 && (
            <div style={{ height: `${bottomOffset}px` }} />
          )}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <div
          className={`sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none ${prefersReducedMotion ? '' : 'transition-opacity duration-300'} ${
            showScrollButton ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Button
            onClick={scrollToBottomManually}
            className={`${isMobile ? 'h-10 w-10' : 'h-9 w-9'} p-0 rounded-full bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ececec] shadow-lg border border-[#565656] pointer-events-auto ${prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-110'}`}
            aria-label="Scroll to bottom of chat"
            title="Scroll to bottom"
          >
            <ArrowDown className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </Button>
        </div>
      </div>

      {/* Fixed input field at bottom */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onEscape={onClose}
        isLoading={isLoading}
        autoFocus={true}
        disabled={isTransitioning}
        isTransitioning={isTransitioning}
        placeholder="Add a follow-up... "
      />
    </div>
  );
}

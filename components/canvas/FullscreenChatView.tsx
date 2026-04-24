"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowDown, Minimize2 } from 'lucide-react';
import ChatInput from './ChatInput';
import MessagePair from './fullscreen/MessagePair';

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
  isTransitioning?: boolean;
  sidebarOpen?: boolean;
}

export default function FullscreenChatView({
  messages,
  onSendMessage,
  onClose,
  isLoading,
  isTransitioning = false,
  sidebarOpen = true,
}: FullscreenChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const messagePairs = useMemo(() => {
    const pairs: Array<{
      question: string;
      answer: string;
      isError?: boolean;
      key: string;
      isLoading?: boolean;
    }> = [];

    for (let i = 0; i < messages.length; i++) {
      const userMsg = messages[i];
      if (!userMsg || userMsg.role !== 'user') continue;

      const assistantMsg = messages[i + 1];
      if (assistantMsg && assistantMsg.role === 'assistant') {
        pairs.push({
          question: userMsg.content,
          answer: assistantMsg.content,
          isError: assistantMsg.isError,
          key: `pair-${userMsg.id || i}`,
        });
        i++;
      } else {
        pairs.push({
          question: userMsg.content,
          answer: '',
          key: `pair-${userMsg.id || i}`,
          isLoading,
        });
      }
    }

    return pairs;
  }, [messages, isLoading]);
  
  // Detect OS
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMac(userAgent.includes('mac'));
  }, []);
  
  // Virtual scrolling state - only render visible pairs when there are 25+
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: messagePairs.length });
  const useVirtualScrolling = messagePairs.length >= 25;
  
  // Calculate visible messages based on scroll position
  const updateVisibleRange = useMemo(() => {
    if (!useVirtualScrolling) return () => {};
    
    return () => {
      if (!messagesContainerRef.current) return;
      
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Estimate pair height (average question + answer block)
      const estimatedPairHeight = 180;
      const overscan = 3; // Render extra pairs above and below viewport
      
      const startIndex = Math.max(0, Math.floor(scrollTop / estimatedPairHeight) - overscan);
      const endIndex = Math.min(
        messagePairs.length,
        Math.ceil((scrollTop + containerHeight) / estimatedPairHeight) + overscan
      );
      
      setVisibleRange({ start: startIndex, end: endIndex });
    };
  }, [useVirtualScrolling, messagePairs.length]);
  
  useEffect(() => {
    if (!useVirtualScrolling) {
      setVisibleRange({ start: 0, end: messagePairs.length });
    }
  }, [messagePairs.length, useVirtualScrolling]);

  // Get visible pairs for rendering
  const visiblePairs = useMemo(() => {
    if (!useVirtualScrolling) return messagePairs;
    return messagePairs.slice(visibleRange.start, visibleRange.end);
  }, [messagePairs, visibleRange, useVirtualScrolling]);
  
  // Calculate offset for virtual scrolling
  const topOffset = useMemo(() => {
    if (!useVirtualScrolling) return 0;
    return visibleRange.start * 180; // Estimated pair height
  }, [visibleRange.start, useVirtualScrolling]);
  
  const bottomOffset = useMemo(() => {
    if (!useVirtualScrolling) return 0;
    return (messagePairs.length - visibleRange.end) * 180; // Estimated pair height
  }, [messagePairs.length, visibleRange.end, useVirtualScrolling]);
  
  // Detect motion preferences on mount
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
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
      className="absolute inset-0 z-50 bg-app-base flex flex-col"
      role="dialog"
      aria-label="Maximized chat conversation"
      aria-modal="true"
    >
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      
      {/* Header */}
      <div className={`h-14 bg-void border-b border-border-subtle flex items-center px-6 ${!sidebarOpen ? 'pl-16' : ''} flex-shrink-0 ${!isMac ? 'justify-end' : ''}`}>
        {isMac ? (
          <div className="flex gap-2 nodrag nopan">
            <button disabled className="w-3 h-3 rounded-full bg-border-strong cursor-default" aria-hidden="true" />
            <button disabled className="w-3 h-3 rounded-full bg-border-strong cursor-default" aria-hidden="true" />
            <button
              onClick={onClose}
              disabled={isTransitioning}
              className={`w-3 h-3 rounded-full transition-colors group relative ${isTransitioning ? 'bg-border-strong cursor-not-allowed' : 'bg-success hover:bg-success/80 cursor-pointer'}`}
              aria-label="Minimize to node view"
              title="Minimize (Esc)"
            >
              {!isTransitioning && (
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Minimize2 className="w-2 h-2 text-void" />
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex nodrag nopan">
            <button disabled className="w-11 h-8 flex items-center justify-center cursor-default opacity-40" aria-hidden="true">
              <div className="w-2.5 h-0.5 bg-text-tertiary" />
            </button>
            <button onClick={onClose} disabled={isTransitioning} className={`w-11 h-8 flex items-center justify-center rounded transition-colors ${isTransitioning ? 'cursor-not-allowed opacity-40' : 'hover:bg-elevated cursor-pointer'}`} aria-label="Restore" title="Restore (Esc)">
              <Minimize2 className="w-4 h-4 text-text-secondary" />
            </button>
            <button disabled className="w-11 h-8 flex items-center justify-center cursor-default opacity-40" aria-hidden="true">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable message container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 relative"
        style={{ 
          willChange: 'scroll-position'
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="max-w-4xl mx-auto">
          {/* Virtual scrolling: Add spacer for messages above viewport */}
          {useVirtualScrolling && topOffset > 0 && (
            <div style={{ height: `${topOffset}px` }} />
          )}
          
          {/* Render message pairs (question + answer) */}
          {visiblePairs.map((pair) => (
            <MessagePair
              key={pair.key}
              question={pair.question}
              answer={pair.answer}
              isError={pair.isError}
              isLoading={pair.isLoading}
            />
          ))}
          
          {/* Virtual scrolling: Add spacer for messages below viewport */}
          {useVirtualScrolling && bottomOffset > 0 && (
            <div style={{ height: `${bottomOffset}px` }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <div className={`sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none ${prefersReducedMotion ? '' : 'transition-opacity duration-300'} ${showScrollButton ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            onClick={scrollToBottomManually}
            className={`h-9 w-9 p-0 rounded-full bg-surface hover:bg-elevated text-text-secondary shadow-depth-md border border-border-default pointer-events-auto ${prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-110'}`}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
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
        placeholder="Add a follow-up... "
      />
    </div>
  );
}

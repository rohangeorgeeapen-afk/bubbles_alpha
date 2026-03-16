import { useCallback, useRef } from 'react';
import { Message } from '@/lib/stores/canvasStore';

interface AIStreamingOptions {
  timeout?: number;
}

interface AIStreamingResult {
  response: string;
  error?: Error;
}

/**
 * Hook for handling AI API streaming requests
 *
 * Provides functionality to send messages to the AI API with abort control,
 * timeout handling, and error management.
 */
export function useAIStreaming(options: AIStreamingOptions = {}) {
  const { timeout = 30000 } = options;
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message to the AI API
   *
   * @param messages - Conversation history to send to the API
   * @returns Promise with AI response or error
   */
  const sendMessage = useCallback(async (
    messages: Message[]
  ): Promise<AIStreamingResult> => {
    try {
      console.log('Sending request to /api/chat with messages:', messages);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      abortControllerRef.current = null;

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to get AI response: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      return { response: data.response };
    } catch (error) {
      console.error('Error fetching AI response:', error);

      let errorMessage = 'Sorry, I encountered an error: ';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error';
      }
      errorMessage += '. Please try again.';

      abortControllerRef.current = null;

      return {
        response: errorMessage,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [timeout]);

  /**
   * Abort the current request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.error('Error aborting request:', error);
      }
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Check if a request is currently in progress
   */
  const isActive = useCallback(() => {
    return abortControllerRef.current !== null;
  }, []);

  return {
    sendMessage,
    abort,
    isActive,
  };
}

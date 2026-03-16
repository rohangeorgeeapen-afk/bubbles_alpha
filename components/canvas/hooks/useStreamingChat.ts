import { useCallback, useRef } from 'react';

export interface StreamChatOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stream?: boolean;
  timeoutMs?: number;
}

export interface StreamChatCallbacks {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for streaming chat responses from the API.
 * Consolidates duplicate SSE parsing logic that was in createConversationNode and createBranchFromSelection.
 *
 * This hook manages:
 * - SSE stream parsing (buffer management, line splitting, JSON extraction)
 * - Timeout management with AbortController
 * - Error handling with user-friendly messages
 */
export function useStreamingChat() {
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stream a chat response from the API.
   * Parses SSE stream and calls callbacks as chunks arrive.
   *
   * @param options - API request options
   * @param callbacks - Callbacks for stream events
   * @returns Full response text (also provided via onComplete)
   */
  const streamChatResponse = useCallback(async (
    options: StreamChatOptions,
    callbacks: StreamChatCallbacks = {}
  ): Promise<string> => {
    const { messages, stream = true, timeoutMs = 60000 } = options;
    const { onChunk, onComplete, onError } = callbacks;

    let fullResponse = '';

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get a clean error message, but don't include raw HTML/JSON payloads
        let errorMessage = `Request failed (${response.status})`;
        try {
          const errorText = await response.text();
          // Only use the error text if it's a clean JSON error message
          if (errorText.startsWith('{')) {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) errorMessage = errorJson.error;
          } else if (errorText.length < 200 && !errorText.includes('<')) {
            errorMessage = errorText;
          }
        } catch { /* ignore parsing errors */ }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      // Parse SSE stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch { /* skip malformed JSON */ }
          }
        }
      }

      onComplete?.(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Streaming error:', error);

      // Provide user-friendly error messages
      let errorMessage: string;
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Unknown error';
      }

      const finalError = new Error(errorMessage);
      onError?.(finalError);

      // If we have partial response, return it
      if (fullResponse) {
        onComplete?.(fullResponse);
        return fullResponse;
      }

      throw finalError;
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Abort the current streaming request
   */
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.error('Error aborting stream:', error);
      }
      abortControllerRef.current = null;
    }
  }, []);

  return {
    streamChatResponse,
    abortStream,
  };
}

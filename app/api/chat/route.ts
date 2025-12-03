import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Input validation schemas
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Validation constants
const MAX_MESSAGE_LENGTH = 32000; // Max characters per message
const MAX_MESSAGES = 100; // Max messages in conversation history
const MAX_TOTAL_CONTENT_LENGTH = 128000; // Max total content length

/**
 * Validates and sanitizes the messages array
 * Returns sanitized messages or throws an error
 */
function validateMessages(messages: unknown): Message[] {
  // Check if messages is an array
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }

  // Check message count
  if (messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  if (messages.length > MAX_MESSAGES) {
    throw new Error(`Too many messages. Maximum allowed: ${MAX_MESSAGES}`);
  }

  let totalContentLength = 0;
  const validatedMessages: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Check message structure
    if (!msg || typeof msg !== 'object') {
      throw new Error(`Invalid message at index ${i}: must be an object`);
    }

    // Validate role
    const role = msg.role;
    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      throw new Error(`Invalid role at index ${i}: must be 'user', 'assistant', or 'system'`);
    }

    // Validate content
    const content = msg.content;
    if (typeof content !== 'string') {
      throw new Error(`Invalid content at index ${i}: must be a string`);
    }

    // Check content length
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message at index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    totalContentLength += content.length;

    // Sanitize content - remove potential injection attempts
    const sanitizedContent = content
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Limit consecutive newlines
      .replace(/\n{5,}/g, '\n\n\n\n');

    validatedMessages.push({
      role: role as Message['role'],
      content: sanitizedContent,
    });
  }

  // Check total content length
  if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
    throw new Error(`Total content length exceeds maximum of ${MAX_TOTAL_CONTENT_LENGTH} characters`);
  }

  // Ensure the last message is from the user (for chat completion)
  const lastMessage = validatedMessages[validatedMessages.length - 1];
  if (lastMessage.role !== 'user') {
    throw new Error('Last message must be from the user');
  }

  return validatedMessages;
}

const SYSTEM_PROMPT = `You are a passionate educator helping someone explore topics completely new to them. Make learning feel like a genuine conversation that respects their intelligence and curiosity.

CRITICAL CONTEXT RULES:
1. If the user asks about something YOU mentioned in your last response: Give a brief clarification (2-3 paragraphs), then reconnect to the original topic
2. If the user asks a new question: Treat it as a fresh topic and explain it fully
3. DO NOT reference previous context that doesn't exist - never say "that's why I mentioned..." when you didn't mention it before

When explaining new topics:
- Start with what makes this interesting or the problem it solves
- Include meaningful technical detail - don't oversimplify or talk down to the learner
- Explain the "how" along with the "why" - what's actually happening, what techniques are used, what makes it work
- Share the engineering challenges, trade-offs, and constraints involved
- Weave in history and human context naturally when relevant
- Use analogies to clarify concepts, but always come back to the actual technical reality
- Make the learner curious about the details and complexity, not just give them a simplified overview
- Build progressively: start accessible, then add layers of depth

Think of your audience as intelligent people exploring outside their domain - they want to understand the real substance, not just a gentle introduction.

AVOID:
- Oversimplified explanations that skip important details
- Treating complex topics like they're explaining to a child
- Labeled sections ("The Why Behind...", "The Human Story...")
- Same structural patterns repeatedly
- References to context that doesn't exist
- Bullet points unless truly needed for clarity

Be engaging AND substantive. Make them think "oh wow, that's actually really clever/complex/interesting" rather than "okay, I get the basic idea."`;

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5) {
  let lastError: string = '';
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        // Rate limit hit - wait longer with exponential backoff
        const waitTime = Math.pow(2, i) * 2000; // 2s, 4s, 8s, 16s, 32s
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // For non-429 errors or last retry, capture error and return response
      const errorData = await response.text();
      lastError = errorData;
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      if (i === maxRetries - 1) {
        throw new Error(lastError);
      }
      // Wait before retrying on network errors
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { messages: rawMessages } = body as { messages?: unknown };

    // Validate and sanitize messages
    let messages: Message[];
    try {
      messages = validateMessages(rawMessages);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid messages' },
        { status: 400 }
      );
    }

    // Check rate limit
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const identifier = getRateLimitIdentifier(user?.id, ip);
    
    // Generous limits: 20/hour for anonymous, 100/hour for authenticated
    const maxRequests = user ? 100 : 20;
    const rateLimit = checkRateLimit(identifier, maxRequests);
    
    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetTime);
      const minutesUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return NextResponse.json(
        { 
          error: `You've reached your hourly limit. ${user ? 'Try again' : 'Sign in for more messages or try again'} in ${minutesUntilReset} minutes.` 
        },
        { status: 429 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (geminiApiKey) {
      // Prepend system prompt to guide the AI's teaching style
      const messagesWithSystem = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages
      ];

      const response = await fetchWithRetry(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${geminiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: messagesWithSystem,
            temperature: 0.7,
            top_p: 0.9,
          }),
        }
      );

      if (!response.ok) {
        // Log error without exposing sensitive details
        // Only log status code and generic info, not full response which may contain API keys in error messages
        console.error('Gemini API error:', {
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString(),
        });
        
        // Handle rate limiting with user-friendly message
        if (response.status === 429) {
          return NextResponse.json(
            { error: 'The AI is receiving too many requests right now. Please wait a moment and try again.' },
            { status: 429 }
          );
        }
        
        // Generic error for other issues - don't expose internal error details
        return NextResponse.json(
          { error: 'Unable to get a response from the AI. Please try again.' },
          { status: 500 }
        );
      }

      const data = await response.json();
      return NextResponse.json({ response: data.choices[0].message.content });
    } else if (perplexityApiKey) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${perplexityApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      return NextResponse.json({ response: data.choices[0].message.content });
    } else {
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      const mockResponse = `This is a mock response to: "${lastUserMessage}". To enable real AI responses, add your GEMINI_API_KEY or PERPLEXITY_API_KEY to the .env file.`;
      return NextResponse.json({ response: mockResponse });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

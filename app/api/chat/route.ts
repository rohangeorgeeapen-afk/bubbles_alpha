import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MAX_MESSAGE_LENGTH = 32000;
const MAX_MESSAGES = 100;
const MAX_TOTAL_CONTENT_LENGTH = 128000;
const CHAT_RATE_LIMIT = 60;
const CHAT_RATE_WINDOW_MS = 60 * 60 * 1000;

function validateMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) throw new Error('Messages must be an array');
  if (messages.length === 0) throw new Error('Messages array cannot be empty');
  if (messages.length > MAX_MESSAGES) throw new Error(`Too many messages. Maximum: ${MAX_MESSAGES}`);

  let totalContentLength = 0;
  const validatedMessages: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') throw new Error(`Invalid message at index ${i}`);
    
    const role = msg.role;
    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      throw new Error(`Invalid role at index ${i}`);
    }

    const content = msg.content;
    if (typeof content !== 'string') throw new Error(`Invalid content at index ${i}`);
    if (content.length > MAX_MESSAGE_LENGTH) throw new Error(`Message ${i} too long`);

    totalContentLength += content.length;
    const sanitizedContent = content.trim().replace(/\0/g, '').replace(/\n{5,}/g, '\n\n\n\n');
    validatedMessages.push({ role: role as Message['role'], content: sanitizedContent });
  }

  if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
    throw new Error('Total content too long');
  }

  if (validatedMessages[validatedMessages.length - 1].role !== 'user') {
    throw new Error('Last message must be from user');
  }

  return validatedMessages;
}

function createTextStreamResponse(content: string): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      userId: null,
      response: NextResponse.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 503 }
      ),
    };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Chat requests only need to verify the current user. Middleware handles refresh cookies.
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      userId: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { userId: user.id, response: null };
}

const SYSTEM_PROMPT = `You are a passionate educator helping someone explore topics completely new to them. Make learning feel like a genuine conversation that respects their intelligence and curiosity.

CRITICAL CONTEXT RULES:
1. If the user asks about something YOU mentioned in your last response: Give a brief clarification (2-3 paragraphs), then reconnect to the original topic
2. If the user asks a new question: Treat it as a fresh topic and explain it fully
3. DO NOT reference previous context that doesn't exist

When explaining new topics:
- Include meaningful technical detail - don't oversimplify
- Explain the "how" along with the "why"
- Share engineering challenges, trade-offs, and constraints
- Weave in history and human context naturally when relevant
- Build progressively: start accessible, then add depth

AVOID:
- Oversimplified explanations
- Labeled sections
- Same structural patterns repeatedly
- References to context that doesn't exist
- Bullet points unless truly needed

Be engaging AND substantive.`;

// Convert messages to Gemini format
function convertToGeminiFormat(messages: Message[]) {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  let systemInstruction = '';
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += msg.content + '\n';
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  return { contents, systemInstruction: systemInstruction.trim() };
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { messages: rawMessages, stream = false } = body as { messages?: unknown; stream?: boolean };

    let messages: Message[];
    try {
      messages = validateMessages(rawMessages);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid messages' },
        { status: 400 }
      );
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth.userId) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const rateLimit = checkRateLimit(
      getRateLimitIdentifier(auth.userId, forwardedFor),
      CHAT_RATE_LIMIT,
      CHAT_RATE_WINDOW_MS
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 0),
            'X-RateLimit-Limit': String(CHAT_RATE_LIMIT),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!geminiApiKey && !perplexityApiKey) {
      const mockResponse = `Mock response. Add GEMINI_API_KEY or PERPLEXITY_API_KEY to enable AI.`;
      if (stream) {
        return createTextStreamResponse(mockResponse);
      }
      return NextResponse.json({ response: mockResponse });
    }

    // Add system prompt to messages
    const messagesWithSystem = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages];
    const { contents, systemInstruction } = convertToGeminiFormat(messagesWithSystem);

    // Use native Gemini API (more reliable than OpenAI-compatible endpoint)
    if (geminiApiKey) {
      const model = 'gemini-2.5-flash';
      const endpoint = stream 
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${geminiApiKey}&alt=sse`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      
      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
        }
      };
      
      if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', errorData);
        
        if (response.status === 429) {
          return NextResponse.json({ error: 'Rate limit reached. Please wait and try again.' }, { status: 429 });
        }
        if (response.status === 503) {
          return NextResponse.json({ error: 'AI service is temporarily busy. Please try again.' }, { status: 503 });
        }
        return NextResponse.json({ error: 'AI request failed.' }, { status: 500 });
      }

      // STREAMING RESPONSE
      if (stream) {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                      continue;
                    }
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                      }
                    } catch {
                      // Skip malformed JSON
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream error:', error);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // NON-STREAMING RESPONSE
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return NextResponse.json({ response: responseText });
    }

    // Perplexity fallback
    if (perplexityApiKey) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${perplexityApiKey}`,
        },
        body: JSON.stringify({ model: 'llama-3.1-sonar-small-128k-online', messages }),
      });

      if (!response.ok) throw new Error('Perplexity API error');
      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || 'No response generated.';
      if (stream) {
        return createTextStreamResponse(responseText);
      }
      return NextResponse.json({ response: responseText });
    }

    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

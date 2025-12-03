import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MAX_MESSAGE_LENGTH = 32000;
const MAX_MESSAGES = 100;
const MAX_TOTAL_CONTENT_LENGTH = 128000;

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

const SYSTEM_PROMPT = `You are a passionate educator helping someone explore topics completely new to them. Make learning feel like a genuine conversation that respects their intelligence and curiosity.

CRITICAL CONTEXT RULES:
1. If the user asks about something YOU mentioned in your last response: Give a brief clarification (2-3 paragraphs), then reconnect to the original topic
2. If the user asks a new question: Treat it as a fresh topic and explain it fully
3. DO NOT reference previous context that doesn't exist

When explaining new topics:
- Start with what makes this interesting or the problem it solves
- Include meaningful technical detail - don't oversimplify
- Explain the "how" along with the "why"
- Share engineering challenges, trade-offs, and constraints
- Weave in history and human context naturally when relevant
- Use analogies to clarify, but come back to technical reality
- Build progressively: start accessible, then add depth

AVOID:
- Oversimplified explanations
- Labeled sections
- Same structural patterns repeatedly
- References to context that doesn't exist
- Bullet points unless truly needed

Be engaging AND substantive.`;

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

    // Rate limiting
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const identifier = getRateLimitIdentifier(user?.id, ip);
    const maxRequests = user ? 100 : 20;
    const rateLimit = checkRateLimit(identifier, maxRequests);
    
    if (!rateLimit.allowed) {
      const minutesUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${minutesUntilReset} minutes.` },
        { status: 429 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!geminiApiKey && !perplexityApiKey) {
      const mockResponse = `Mock response. Add GEMINI_API_KEY or PERPLEXITY_API_KEY to enable AI.`;
      return NextResponse.json({ response: mockResponse });
    }

    const messagesWithSystem = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages];

    // STREAMING RESPONSE
    if (stream && geminiApiKey) {
      const response = await fetch(
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
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return NextResponse.json({ error: 'AI is busy. Please wait and try again.' }, { status: 429 });
        }
        return NextResponse.json({ error: 'AI request failed.' }, { status: 500 });
      }

      // Return streaming response
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
                    const content = parsed.choices?.[0]?.delta?.content;
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

    // NON-STREAMING RESPONSE (fallback)
    if (geminiApiKey) {
      const response = await fetch(
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
        if (response.status === 429) {
          return NextResponse.json({ error: 'AI is busy. Please wait.' }, { status: 429 });
        }
        return NextResponse.json({ error: 'AI request failed.' }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json({ response: data.choices[0].message.content });
    }

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
      return NextResponse.json({ response: data.choices[0].message.content });
    }

    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

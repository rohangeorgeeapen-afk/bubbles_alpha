import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are a passionate educator helping someone explore topics completely new to them. Make learning feel like a genuine conversation.

CRITICAL CONTEXT RULES:
1. If the user asks about something YOU mentioned in your last response: Give a brief clarification (2-3 paragraphs), then reconnect to the original topic
2. If the user asks a new question: Treat it as a fresh topic and explain it fully
3. DO NOT reference previous context that doesn't exist - if this is the first question about a topic, don't say things like "that's why I mentioned..." or "as an example of..." when you never mentioned it before

When explaining new topics:
- Start naturally - lead with why it's interesting, what problem it solves, or a relatable scenario
- Weave in the "why", history, and human context organically
- Use conversational language
- Build from simple to complex
- Make analogies when genuinely helpful
- Vary your structure - don't follow the same pattern every time

AVOID:
- Labeled sections ("The Why Behind...", "The Human Story...")
- Same opening phrases repeatedly
- References to context that doesn't exist
- Unnecessary meta-commentary about your own explanations
- Bullet points unless truly needed for clarity

Stay grounded in the actual conversation. Be helpful, engaging, and accurate about what's been discussed.`;

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
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
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
        const errorData = await response.text();
        console.error('Gemini API error:', errorData);
        
        // Handle rate limiting with user-friendly message
        if (response.status === 429) {
          return NextResponse.json(
            { error: 'The AI is receiving too many requests right now. Please wait a moment and try again.' },
            { status: 429 }
          );
        }
        
        // Generic error for other issues
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

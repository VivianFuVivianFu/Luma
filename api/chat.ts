// Vercel Edge Function for direct Claude integration
// This runs on Vercel's edge network, bypassing CORS and API key exposure

export const config = {
  runtime: 'edge',
};

interface ChatRequest {
  message: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get user from request headers (Supabase auth)
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, history = [] }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Claude API configuration
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('[Vercel Chat API] Claude API key not configured');
      return new Response(
        JSON.stringify({ 
          reply: getFallbackResponse(message),
          fallback: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare messages for Claude API
    const messages = [
      ...history.slice(-10), // Keep last 10 messages for context
      {
        role: 'user' as const,
        content: message
      }
    ];

    const systemPrompt = `You are Luma, an AI emotional companion. You provide warm, empathetic support with brief responses (2-3 sentences max). Focus on validation, understanding, and gentle guidance. Respond naturally in the language the user is using.`;

    const requestBody = {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    };

    console.log('[Vercel Chat API] Making Claude API request...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vercel Chat API] Claude API error: ${response.status} ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          reply: getFallbackResponse(message),
          fallback: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    const reply = data.content[0].text.trim();
    console.log(`[Vercel Chat API] Success: "${reply.substring(0, 50)}..."`);
    
    return new Response(
      JSON.stringify({
        reply,
        fallback: false,
        model: 'claude-3-5-haiku-20241022'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Vercel Chat API] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        reply: getFallbackResponse(message || 'hello'),
        fallback: true 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fallback responses when Claude API is unavailable
 */
function getFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Check for greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey') || message.includes('你好')) {
    return "Hi there! How are you feeling today? I'm here to listen and support you.";
  }
  
  // Check for emotional content
  if (message.includes('sad') || message.includes('upset') || message.includes('hurt') || message.includes('难过') || message.includes('伤心')) {
    return "I hear that you're going through something difficult. Your feelings are valid, and I'm here to listen. Would you like to share more about what's happening?";
  }
  
  // Check for anxiety/worry
  if (message.includes('anxious') || message.includes('worried') || message.includes('stress') || message.includes('焦虑') || message.includes('担心')) {
    return "I can sense you're feeling anxious. That's completely understandable. Sometimes taking slow, deep breaths can help. What's been weighing on your mind?";
  }
  
  // General supportive response
  return "I'm here with you. Whatever you're going through, you don't have to face it alone. What's on your mind today?";
}
// Updated Chat API - Routes to Enhanced Chat with Intelligent Orchestration
// This now uses the memory-first architecture with intelligent LLM routing

export const config = {
  runtime: 'edge',
};

interface ChatRequest {
  message: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userId?: string;
}

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extract userId from authorization header if available
  let userId: string | undefined;
  const authorization = req.headers.get('authorization');
  if (authorization) {
    try {
      // Attempt to extract user ID from Bearer token or other auth methods
      const token = authorization.replace('Bearer ', '');
      // For now, we'll use a simple approach - in production you'd decode JWT
      console.log('[Chat API] Authenticated request detected');
    } catch (error) {
      console.warn('[Chat API] Could not extract user ID from authorization');
    }
  }

  let message: string = '';

  try {
    const { message: requestMessage, history = [], userId: requestUserId }: ChatRequest = await req.json();
    message = requestMessage;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Chat API] Routing to enhanced chat system for message: "${message.substring(0, 60)}..."`);

    // Import the enhanced chat handler
    const enhancedChatHandler = await import('./enhancedChat');
    
    // Create a new request with the enhanced payload
    const enhancedRequest = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        message,
        history,
        userId: requestUserId || userId
      })
    });

    // Route to enhanced chat handler
    const response = await enhancedChatHandler.default(enhancedRequest);
    return response;

  } catch (error) {
    console.error('[Chat API] Error:', error);
    
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
 * Fallback responses when enhanced chat is unavailable
 */
function getFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Check for greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hi! I'm here to support you. How are you feeling today?";
  }
  
  // Check for emotional content
  if (message.includes('sad') || message.includes('upset') || message.includes('hurt')) {
    return "I hear that you're going through something difficult. Your feelings are valid, and I'm here to listen.";
  }
  
  // Check for anxiety/worry
  if (message.includes('anxious') || message.includes('worried') || message.includes('stress')) {
    return "I can sense you're feeling anxious. That's completely understandable. What's been weighing on your mind?";
  }
  
  // General supportive responses with variety
  const supportiveResponses = [
    "I'm here with you. Whatever you're going through, you don't have to face it alone. What's on your mind today?",
    "Your thoughts and feelings are important to me. I'm here to listen and support you. How can I help right now?",
    "I want you to know that I'm fully present with you in this moment. What would be most helpful to talk about?",
    "You've taken a brave step by reaching out. I'm here to support you through whatever you're experiencing. What's weighing on your heart?",
    "I'm committed to being here with you. Your wellbeing matters deeply to me. What's going through your mind right now?"
  ];
  
  const randomIndex = Math.floor(Math.random() * supportiveResponses.length);
  return supportiveResponses[randomIndex];
}
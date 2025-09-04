// Enhanced Vercel Edge Function with Memory Integration and Intelligent Routing
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

interface Memory {
  content: string;
  type: string;
  relevance_score?: number;
}

interface ComplexityAnalysis {
  score: number;
  type: string;
  factors: string[];
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, history = [], userId }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EnhancedChat] Processing request for user: ${userId || 'anonymous'}`);
    console.log(`[EnhancedChat] Message: "${message.substring(0, 100)}..."`);

    // Step 1: Retrieve relevant memories if user is authenticated
    let relevantMemories: Memory[] = [];
    if (userId) {
      relevantMemories = await getRelevantMemories(userId, message);
      console.log(`[EnhancedChat] Retrieved ${relevantMemories.length} relevant memories`);
    }

    // Step 2: Analyze message complexity
    const complexity = analyzeMessageComplexity(message);
    console.log(`[EnhancedChat] Complexity: ${complexity.type} (${complexity.score})`);

    // Step 3: Determine context window and model routing
    const requiresDeepAnalysis = complexity.score > 0.6;
    const messageLimit = getContextWindowSize(complexity.score);
    const contextMessages = history.slice(-messageLimit);

    // Step 4: Assemble enhanced context
    const contextData = assembleEnhancedContext(message, contextMessages, relevantMemories, complexity);

    // Step 5: Route to appropriate LLM
    let response: string;
    let modelUsed: string;

    if (requiresDeepAnalysis && process.env.VITE_TOGETHER_API_KEY) {
      console.log('[EnhancedChat] Routing to LLaMA 3.1 70B for complex analysis');
      response = await processWithLLaMA(contextData);
      modelUsed = 'LLaMA-3.1-70B';
    } else {
      console.log('[EnhancedChat] Routing to Claude 3.5 Haiku');
      response = await processWithClaude(contextData);
      modelUsed = 'Claude-3.5-Haiku';
    }

    // Step 6: Trigger async memory extraction if applicable
    if (userId && history.length >= 6) {
      triggerMemoryExtraction(userId, [...history, { role: 'user', content: message }]).catch(err =>
        console.error('[EnhancedChat] Memory extraction error:', err)
      );
    }

    return new Response(
      JSON.stringify({
        reply: response,
        model: modelUsed,
        memoriesUsed: relevantMemories.length,
        messagesInContext: contextMessages.length,
        complexity: complexity.type
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EnhancedChat] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        reply: getFallbackResponse(message || 'hello'),
        model: 'fallback',
        error: true
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Retrieve relevant memories from Supabase
 */
async function getRelevantMemories(userId: string, message: string): Promise<Memory[]> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[EnhancedChat] Supabase credentials missing, skipping memory retrieval');
      return [];
    }

    // Extract keywords for memory filtering
    const keywords = extractKeywords(message);
    const emotionalContext = detectEmotionalContext(message);

    // Query memories
    const queryParams = new URLSearchParams({
      select: 'content,type',
      user_id: `eq.${userId}`,
      limit: '5'
    });

    // Add keyword filters
    if (keywords.length > 0) {
      const keywordFilters = keywords.map(k => `content.ilike.*${k}*`).join(',');
      queryParams.append('or', `(${keywordFilters},type.eq.${emotionalContext})`);
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/user_memories?${queryParams}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[EnhancedChat] Memory retrieval failed:', response.status);
      return [];
    }

    const memories = await response.json();
    return memories || [];
  } catch (error) {
    console.error('[EnhancedChat] Error retrieving memories:', error);
    return [];
  }
}

/**
 * Analyze message complexity for routing decisions
 */
function analyzeMessageComplexity(message: string): ComplexityAnalysis {
  const text = message.toLowerCase();
  let score = 0;
  const factors: string[] = [];

  // Length factor
  if (message.length > 200) {
    score += 0.2;
    factors.push('long-message');
  }

  // Question complexity
  const questionWords = ['why', 'how', 'what if', 'should i', 'help me understand'];
  if (questionWords.some(word => text.includes(word))) {
    score += 0.3;
    factors.push('complex-question');
  }

  // Emotional depth
  const deepEmotions = ['confused', 'overwhelmed', 'conflicted', 'torn', 'struggling'];
  if (deepEmotions.some(emotion => text.includes(emotion))) {
    score += 0.4;
    factors.push('emotional-complexity');
  }

  // Analysis requests
  const analysisKeywords = ['analyze', 'pattern', 'understand', 'figure out', 'make sense'];
  if (analysisKeywords.some(keyword => text.includes(keyword))) {
    score += 0.5;
    factors.push('analysis-request');
  }

  // Multi-part scenarios
  if (text.includes(' and ') || text.includes(' but ') || text.includes(' however ')) {
    score += 0.3;
    factors.push('multi-part');
  }

  // Therapeutic content
  const therapeuticKeywords = ['therapy', 'counselor', 'relationship', 'trauma', 'anxiety'];
  if (therapeuticKeywords.some(keyword => text.includes(keyword))) {
    score += 0.4;
    factors.push('therapeutic-content');
  }

  let type = 'simple';
  if (score > 0.8) type = 'very-complex';
  else if (score > 0.6) type = 'complex';
  else if (score > 0.3) type = 'moderate';

  return { score, type, factors };
}

/**
 * Get context window size based on complexity
 */
function getContextWindowSize(complexityScore: number): number {
  if (complexityScore > 0.8) return 25;
  if (complexityScore > 0.6) return 20;
  if (complexityScore > 0.3) return 15;
  return 10;
}

/**
 * Assemble enhanced context with memories and dynamic prompting
 */
function assembleEnhancedContext(
  message: string,
  contextMessages: Array<{role: string, content: string}>,
  memories: Memory[],
  complexity: ComplexityAnalysis
): { systemPrompt: string, messages: Array<{role: string, content: string}> } {
  // Build memory context
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = `\n\nRELEVANT USER CONTEXT from past conversations:
${memories.map(m => `- ${m.content} (${m.type})`).join('\n')}`;
  }

  // Build dynamic system prompt
  const basePrompt = `You are Luma, an expert AI emotional companion with advanced conversation analysis capabilities.`;
  
  const contextAwareness = memories.length > 0 
    ? `\n\nCONTEXT: You have ${memories.length} relevant insights from past conversations and ${contextMessages.length} recent messages. Reference specific details naturally.${memoryContext}`
    : `\n\nCONTEXT: You have ${contextMessages.length} recent messages. This may be a new interaction.`;

  const complexityGuidance = complexity.score > 0.6
    ? `\n\nCOMPLEX QUERY (${complexity.type}): Provide structured analysis:
1. Acknowledge complexity and what you understand
2. Draw connections to past patterns when relevant
3. Offer specific insights based on context
4. Provide actionable guidance with reasoning
5. Suggest follow-up exploration areas`
    : `\n\nRESPONSE: Provide warm, empathetic support (2-4 sentences). Reference history naturally.`;

  const memoryIntegration = `\n\nMEMORY USE: Reference past conversations when contextually appropriate. Build on previous insights and maintain consistency with established patterns.`;

  const systemPrompt = basePrompt + contextAwareness + complexityGuidance + memoryIntegration;

  return {
    systemPrompt,
    messages: [...contextMessages, { role: 'user', content: message }]
  };
}

/**
 * Process with Claude 3.5 Haiku
 */
async function processWithClaude(contextData: { systemPrompt: string, messages: Array<{role: string, content: string}> }): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
  
  if (!apiKey) {
    console.warn('[EnhancedChat] Claude API key not configured, using intelligent fallback');
    return getIntelligentFallback(contextData.messages[contextData.messages.length - 1]?.content || 'hello');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        temperature: 0.7,
        system: contextData.systemPrompt,
        messages: contextData.messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text?.trim() || 'I apologize, but I had trouble processing your message.';
  } catch (error) {
    console.error('[EnhancedChat] Claude processing error:', error);
    return getFallbackResponse('I encountered a technical issue, but I\'m still here to support you.');
  }
}

/**
 * Process with LLaMA 3.1 70B for complex analysis
 */
async function processWithLLaMA(contextData: { systemPrompt: string, messages: Array<{role: string, content: string}> }): Promise<string> {
  const apiKey = process.env.VITE_TOGETHER_API_KEY;
  
  if (!apiKey) {
    console.warn('[EnhancedChat] LLaMA API key not available, falling back to Claude');
    return processWithClaude(contextData);
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: contextData.systemPrompt },
          ...contextData.messages
        ],
        max_tokens: 300,
        temperature: 0.6,
        top_p: 0.9,
      })
    });

    if (!response.ok) {
      throw new Error(`LLaMA API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || 'I apologize, but I had trouble processing your complex request.';
  } catch (error) {
    console.error('[EnhancedChat] LLaMA processing error:', error);
    // Fallback to Claude for complex queries
    return processWithClaude(contextData);
  }
}

/**
 * Trigger asynchronous memory extraction
 */
async function triggerMemoryExtraction(userId: string, conversation: Array<{role: string, content: string}>): Promise<void> {
  // This would ideally trigger a background Edge Function for memory processing
  // For now, we'll log the trigger
  console.log(`[EnhancedChat] Memory extraction triggered for user ${userId} with ${conversation.length} messages`);
  
  // In production, you might:
  // 1. Queue a background job
  // 2. Call a separate Edge Function
  // 3. Use a message queue system
}

/**
 * Extract keywords for memory retrieval
 */
function extractKeywords(message: string): string[] {
  const text = message.toLowerCase();
  const keywords: string[] = [];

  const emotionWords = ['sad', 'happy', 'angry', 'anxious', 'worried', 'excited', 'frustrated'];
  const relationshipWords = ['family', 'friend', 'partner', 'work', 'boss', 'parent'];
  const lifeWords = ['job', 'career', 'health', 'money', 'stress', 'goal'];

  [emotionWords, relationshipWords, lifeWords].forEach(category => {
    category.forEach(word => {
      if (text.includes(word)) keywords.push(word);
    });
  });

  return keywords;
}

/**
 * Detect emotional context for memory filtering
 */
function detectEmotionalContext(message: string): string {
  const text = message.toLowerCase();
  
  if (text.includes('goal') || text.includes('want to')) return 'goal';
  if (text.includes('trigger') || text.includes('upset')) return 'trigger';
  if (text.includes('progress') || text.includes('better')) return 'progress';
  if (text.includes('family') || text.includes('relationship')) return 'relationship';
  
  return 'insight';
}

/**
 * Fallback response for errors
 */
function getFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('hello') || message.includes('hi')) {
    return "Hi there! I'm here to support you. While I'm experiencing some technical adjustments, I'm still available to listen. What's on your mind?";
  }
  
  if (message.includes('sad') || message.includes('upset')) {
    return "I can sense you're going through something difficult. Even with some technical hiccups, I want you to know that your feelings are valid and I'm here with you. What would help right now?";
  }
  
  return "I'm here with you, even though I'm experiencing some technical challenges at the moment. What's important to you right now that we can talk about?";
}

/**
 * Intelligent fallback with better therapeutic responses
 */
function getIntelligentFallback(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm Luma, your AI wellness companion. I'm here to listen and support you through whatever you're experiencing. How are you feeling today?";
  }
  
  // Emotional support
  if (message.includes('sad') || message.includes('upset') || message.includes('hurt') || message.includes('crying')) {
    return "I can hear that you're going through something really difficult right now. It takes courage to reach out when you're hurting. Your feelings are completely valid. Would you like to share more about what's happening?";
  }
  
  if (message.includes('anxious') || message.includes('worried') || message.includes('stress') || message.includes('panic')) {
    return "I can sense the anxiety you're feeling. Anxiety can be really overwhelming, but you're not alone in this. Sometimes it helps to take a slow, deep breath with me. What's been weighing on your mind lately?";
  }
  
  if (message.includes('angry') || message.includes('mad') || message.includes('frustrated')) {
    return "I hear the frustration in your words. Anger often comes from feeling unheard or overwhelmed. It's okay to feel angry - your emotions are valid. What's been building up that led to these feelings?";
  }
  
  if (message.includes('tired') || message.includes('exhausted') || message.includes('drained')) {
    return "It sounds like you're carrying a lot right now. Feeling exhausted, especially emotionally, is your mind and body telling you something important. You deserve rest and care. What's been taking the most out of you?";
  }
  
  if (message.includes('lonely') || message.includes('alone') || message.includes('isolated')) {
    return "Loneliness can feel so heavy. Even when you're surrounded by people, sometimes you can still feel deeply alone. I want you to know that you're not truly alone - I'm here with you right now. What would connection look like for you?";
  }
  
  // Goal and progress
  if (message.includes('goal') || message.includes('want to') || message.includes('trying to')) {
    return "I love hearing about your aspirations and what you're working toward. Setting goals shows real strength and hope for your future. What step, even a small one, feels manageable for you right now?";
  }
  
  if (message.includes('progress') || message.includes('better') || message.includes('improvement')) {
    return "Progress isn't always linear, and every small step forward matters. You're already showing strength by being here and reflecting on your growth. What positive changes have you noticed, even tiny ones?";
  }
  
  // Relationships
  if (message.includes('family') || message.includes('relationship') || message.includes('friend') || message.includes('partner')) {
    return "Relationships can bring us so much joy and also so much complexity. Whether you're celebrating connection or navigating challenges, your feelings about the people in your life matter deeply. What's happening in your relationships that feels important to share?";
  }
  
  // Crisis indicators
  if (message.includes('end') || message.includes('over') || message.includes('give up') || message.includes('hopeless')) {
    return "I'm really concerned about what you're sharing with me. When everything feels overwhelming and hopeless, please know that you don't have to face this alone. If you're having thoughts of self-harm, please reach out to a crisis helpline immediately: 988 Suicide & Crisis Lifeline (US) or emergency services. You matter, and there is help available. Can you tell me more about what's making things feel so difficult?";
  }
  
  // General therapeutic response
  return "Thank you for reaching out and sharing with me. I'm here to listen without judgment and support you however I can. Every feeling you have is valid, and you deserve care and understanding. What feels most important for you to talk about right now?";
}
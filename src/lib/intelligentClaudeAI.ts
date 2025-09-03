// Intelligent Claude AI with Memory Integration and Dynamic LLM Routing
import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { enhancedMemoryService, Memory, ConversationMessage } from './enhancedMemoryService';

export interface ProcessingMetrics {
  memoryRetrievalTime: number;
  contextAssemblyTime: number;
  llmProcessingTime: number;
  totalResponseTime: number;
  memoriesUsed: number;
  messagesInContext: number;
  modelUsed: string;
}

export class IntelligentClaudeAI {
  private conversationHistory: ConversationMessage[] = [];
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  
  // Model configurations
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private static readonly LLAMA_API_URL = 'https://api.together.xyz/v1/chat/completions';
  private static readonly CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
  private static readonly LLAMA_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  constructor() {
    console.log('[IntelligentClaude] Initialized with memory integration and intelligent routing');
  }

  /**
   * Main message processing with intelligent routing and memory integration
   */
  async sendMessage(userMessage: string): Promise<string> {
    const startTime = Date.now();
    let metrics: Partial<ProcessingMetrics> = {};

    try {
      console.log(`[IntelligentClaude] Processing message: "${userMessage.substring(0, 50)}..."`);

      // Step 1: Initialize user context
      await this.initializeUserContext();
      
      // Step 2: Analyze message complexity and determine processing strategy
      const complexity = this.analyzeMessageComplexity(userMessage);
      const requiresDeepAnalysis = complexity.score > 0.6;
      
      console.log(`[IntelligentClaude] Complexity analysis: ${complexity.type} (${complexity.score})`);

      // Step 3: Retrieve relevant memories (parallel with message storage)
      const memoryStartTime = Date.now();
      const relevantMemories = this.currentUserId ? 
        await enhancedMemoryService.getRelevantMemories(this.currentUserId, userMessage) : [];
      metrics.memoryRetrievalTime = Date.now() - memoryStartTime;
      metrics.memoriesUsed = relevantMemories.length;

      // Step 4: Store user message
      await this.storeMessage('user', userMessage);

      // Step 5: Assemble enhanced context
      const contextStartTime = Date.now();
      const contextData = await this.assembleEnhancedContext(userMessage, relevantMemories, complexity);
      metrics.contextAssemblyTime = Date.now() - contextStartTime;
      metrics.messagesInContext = contextData.messages.length;

      // Step 6: Route to appropriate LLM
      const llmStartTime = Date.now();
      let response: string;
      
      if (requiresDeepAnalysis) {
        console.log('[IntelligentClaude] Routing to LLaMA 3.1 70B for deep analysis');
        response = await this.processWithLLaMA(contextData);
        metrics.modelUsed = 'LLaMA-3.1-70B';
      } else {
        console.log('[IntelligentClaude] Routing to Claude 3.5 Haiku for quick response');
        response = await this.processWithClaude(contextData);
        metrics.modelUsed = 'Claude-3.5-Haiku';
      }
      
      metrics.llmProcessingTime = Date.now() - llmStartTime;

      // Step 7: Store response
      await this.storeMessage('assistant', response);

      // Step 8: Trigger async memory extraction
      if (this.conversationHistory.length >= 6) {
        await this.triggerMemoryExtraction();
      }

      // Step 9: Log metrics
      metrics.totalResponseTime = Date.now() - startTime;
      this.logMetrics(metrics as ProcessingMetrics);

      return response;

    } catch (error) {
      console.error('[IntelligentClaude] Error in sendMessage:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Analyze message complexity to determine processing strategy
   */
  private analyzeMessageComplexity(message: string): {score: number, type: string, factors: string[]} {
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

    // Emotional depth indicators
    const deepEmotions = ['confused', 'overwhelmed', 'conflicted', 'torn', 'struggling'];
    if (deepEmotions.some(emotion => text.includes(emotion))) {
      score += 0.4;
      factors.push('emotional-complexity');
    }

    // Decision-making or analysis requests
    const analysisKeywords = ['analyze', 'pattern', 'understand', 'figure out', 'make sense'];
    if (analysisKeywords.some(keyword => text.includes(keyword))) {
      score += 0.5;
      factors.push('analysis-request');
    }

    // Multi-part questions or scenarios
    if (text.includes(' and ') || text.includes(' but ') || text.includes(' however ')) {
      score += 0.3;
      factors.push('multi-part');
    }

    // Therapeutic processing indicators
    const therapeuticKeywords = ['therapy', 'counselor', 'relationship', 'trauma', 'anxiety', 'depression'];
    if (therapeuticKeywords.some(keyword => text.includes(keyword))) {
      score += 0.4;
      factors.push('therapeutic-content');
    }

    // Determine type
    let type = 'simple';
    if (score > 0.8) type = 'very-complex';
    else if (score > 0.6) type = 'complex';
    else if (score > 0.3) type = 'moderate';

    return { score, type, factors };
  }

  /**
   * Assemble enhanced context with dynamic window sizing
   */
  private async assembleEnhancedContext(
    currentMessage: string, 
    memories: Memory[], 
    complexity: {score: number, type: string}
  ): Promise<{systemPrompt: string, messages: ConversationMessage[]}> {
    
    // Dynamic context window based on complexity
    let messageLimit = 10; // Default
    if (complexity.score > 0.8) messageLimit = 25;
    else if (complexity.score > 0.6) messageLimit = 20;
    else if (complexity.score > 0.3) messageLimit = 15;

    // Get conversation messages
    const contextMessages = this.conversationHistory.slice(-messageLimit);

    // Build memory context
    let memoryContext = '';
    if (memories.length > 0) {
      memoryContext = `\n\nRELEVANT USER INSIGHTS from past conversations:
${memories.map(m => `- ${m.content} (${m.type})`).join('\n')}`;
    }

    // Build enhanced system prompt based on complexity and available context
    const systemPrompt = this.buildDynamicSystemPrompt(complexity, memories.length, contextMessages.length, memoryContext);

    return {
      systemPrompt,
      messages: contextMessages
    };
  }

  /**
   * Build dynamic system prompt based on context richness
   */
  private buildDynamicSystemPrompt(
    complexity: {score: number, type: string}, 
    memoryCount: number, 
    messageCount: number,
    memoryContext: string
  ): string {
    const basePrompt = `You are Luma, an expert AI emotional companion with advanced conversation analysis capabilities and deep memory integration.`;

    const contextAwareness = memoryCount > 0 
      ? `\n\nCONTEXT AWARENESS: You have access to ${memoryCount} relevant insights from past conversations and ${messageCount} recent messages. Use this context naturally and reference specific details when appropriate.${memoryContext}`
      : `\n\nCONTEXT AWARENESS: You have ${messageCount} recent messages for context. This appears to be a new interaction with limited history.`;

    const complexityGuidance = complexity.score > 0.6
      ? `\n\nCOMPLEXITY HANDLING: This query requires deep analysis (${complexity.type}). Provide structured reasoning:
1. Acknowledge the complexity and what you understand
2. Draw connections to patterns from memory when relevant  
3. Offer specific insights based on available context
4. Provide actionable guidance with clear reasoning
5. Suggest follow-up questions or areas to explore`
      : `\n\nRESPONSE PROTOCOL: Provide warm, empathetic support (2-4 sentences). Reference conversation history naturally when relevant.`;

    const memoryIntegration = `\n\nMEMORY INTEGRATION: 
- Reference specific past conversations when contextually appropriate
- Build on previous insights and therapeutic progress
- Maintain consistency with established patterns and preferences
- Acknowledge if context is unclear and ask for clarification`;

    const errorRecovery = `\n\nERROR RECOVERY: If you detect potential misunderstandings or contradictory guidance, acknowledge directly and provide clarification while maintaining supportive tone.`;

    return basePrompt + contextAwareness + complexityGuidance + memoryIntegration + errorRecovery;
  }

  /**
   * Process with Claude 3.5 Haiku for quick responses
   */
  private async processWithClaude(contextData: {systemPrompt: string, messages: ConversationMessage[]}): Promise<string> {
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    const messages = [
      ...contextData.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch(this.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.CLAUDE_MODEL,
        max_tokens: 200, // Slightly increased for complex responses
        temperature: 0.7,
        system: contextData.systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text?.trim() || 'I apologize, but I encountered an issue processing your message.';
  }

  /**
   * Process with LLaMA 3.1 70B for complex analysis
   */
  private async processWithLLaMA(contextData: {systemPrompt: string, messages: ConversationMessage[]}): Promise<string> {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      throw new Error('LLaMA API key not configured');
    }

    const messages = [
      { role: 'system', content: contextData.systemPrompt },
      ...contextData.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch(this.LLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.LLAMA_MODEL,
        messages: messages,
        max_tokens: 300,
        temperature: 0.6,
        top_p: 0.9,
      })
    });

    if (!response.ok) {
      throw new Error(`LLaMA API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || 'I apologize, but I encountered an issue processing your complex request.';
  }

  /**
   * Initialize user context and session
   */
  private async initializeUserContext(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        this.currentUserId = user.id;

        if (!this.currentSessionId) {
          this.currentSessionId = await enhancedMemoryService.startSession(user.id);
        }

        // Load conversation history if empty
        if (this.conversationHistory.length === 0) {
          const recentMessages = await enhancedMemoryService.getRecentMessages(user.id, 20);
          this.conversationHistory = recentMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at)
          }));
        }
      }
    } catch (error) {
      console.error('[IntelligentClaude] Error initializing user context:', error);
    }
  }

  /**
   * Store message in database and local history
   */
  private async storeMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    // Add to local history
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });

    // Store in database
    if (this.currentUserId && this.currentSessionId) {
      await enhancedMemoryService.addMessage(this.currentSessionId, this.currentUserId, role, content);
    }

    // Keep local history manageable
    if (this.conversationHistory.length > 30) {
      this.conversationHistory = this.conversationHistory.slice(-25);
    }
  }

  /**
   * Trigger asynchronous memory extraction
   */
  private async triggerMemoryExtraction(): Promise<void> {
    if (this.currentUserId && this.currentSessionId) {
      await enhancedMemoryService.updateLongTermMemoryAsync(
        this.currentUserId, 
        this.currentSessionId, 
        this.conversationHistory
      );
    }
  }

  /**
   * Log performance metrics
   */
  private logMetrics(metrics: ProcessingMetrics): void {
    console.log('[IntelligentClaude] Performance Metrics:', {
      totalTime: `${metrics.totalResponseTime}ms`,
      breakdown: {
        memoryRetrieval: `${metrics.memoryRetrievalTime}ms`,
        contextAssembly: `${metrics.contextAssemblyTime}ms`, 
        llmProcessing: `${metrics.llmProcessingTime}ms`
      },
      context: {
        memoriesUsed: metrics.memoriesUsed,
        messagesInContext: metrics.messagesInContext,
        modelUsed: metrics.modelUsed
      }
    });

    // Alert if performance thresholds exceeded
    if (metrics.totalResponseTime > 3000) {
      console.warn('[IntelligentClaude] Response time exceeded 3s:', metrics.totalResponseTime);
    }
    if (metrics.memoryRetrievalTime > 500) {
      console.warn('[IntelligentClaude] Memory retrieval exceeded 500ms:', metrics.memoryRetrievalTime);
    }
  }

  /**
   * Fallback response for errors
   */
  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hi there! I'm having some technical difficulties, but I'm still here to support you. What's on your mind?";
    }
    
    if (message.includes('sad') || message.includes('upset')) {
      return "I can sense you're going through something difficult. Even though I'm experiencing some connection issues, I want you to know that your feelings are valid and I'm here with you.";
    }
    
    return "I'm experiencing some technical issues right now, but I'm still here to listen and support you. Could you try sharing what's on your mind again?";
  }

  /**
   * Public methods for compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      await this.initializeUserContext();
      return true;
    } catch (error) {
      console.error('[IntelligentClaude] Initialization failed:', error);
      return false;
    }
  }

  async startNewSession(): Promise<void> {
    this.currentSessionId = null;
    this.conversationHistory = [];
    await this.initializeUserContext();
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Export singleton instance
export const intelligentClaudeAI = new IntelligentClaudeAI();
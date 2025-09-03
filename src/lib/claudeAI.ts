// Direct Claude 4.0 Integration - No backend dependencies
// Pure frontend Claude API integration with authentication requirement

import { supabase } from './supabase';
import { MemoryService } from './memoryService';
import { getCurrentUser } from './auth';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class ClaudeAI {
  private config: ClaudeConfig;
  private conversationHistory: ConversationMessage[] = [];
  private isInitialized: boolean = false;
  private memoryService: MemoryService;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
      model: 'claude-3-5-haiku-20241022', // Claude 3.5 Haiku for improved performance
      maxTokens: 1024,
      temperature: 0.7
    };
    this.memoryService = new MemoryService();
  }

  /**
   * Load conversation history from memory system
   */
  async loadConversationHistory(): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      this.currentUserId = currentUser.id;
      
      // Get or create current session
      this.currentSessionId = await this.memoryService.startSession(currentUser.id);
      
      // Load recent conversation history
      const recentMessages = await this.memoryService.getRecentMessages(currentUser.id, 10);
      
      // Convert to conversation history format
      this.conversationHistory = recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));
      
      console.log(`[Memory] Loaded ${this.conversationHistory.length} messages from history`);
    } catch (error) {
      console.error('[Memory] Error loading conversation history:', error);
    }
  }

  /**
   * Start a new conversation session
   */
  async startNewSession(): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      this.currentUserId = currentUser.id;
      this.currentSessionId = await this.memoryService.startSession(currentUser.id);
      this.conversationHistory = [];
      
      console.log(`[Memory] Started new conversation session: ${this.currentSessionId}`);
    } catch (error) {
      console.error('[Memory] Error starting new session:', error);
    }
  }

  /**
   * Initialize Claude AI system
   */
  async initialize(): Promise<boolean> {
    try {
      const backendUrl = this.getBackendUrl();
      
      if (backendUrl === '/api/chat') {
        // Vercel Edge Function mode - always available
        console.log('[ClaudeAI] Vercel Edge Function mode initialized');
        this.isInitialized = true;
        return true;
      } else if (backendUrl === '') {
        // Direct API mode - just check if we have API key
        if (!this.config.apiKey) {
          console.error('[ClaudeAI] Claude API key not configured');
          return false;
        }
        console.log('[ClaudeAI] Direct API mode initialized');
        this.isInitialized = true;
        return true;
      } else {
        // Proxy mode - test backend connection
        console.log(`[ClaudeAI] Testing backend connection: ${backendUrl}/health`);
        const response = await fetch(`${backendUrl}/health`);
        
        if (response.ok) {
          console.log('[ClaudeAI] Backend connection successful');
          this.isInitialized = true;
          return true;
        } else {
          console.error('[ClaudeAI] Backend not responding');
          return false;
        }
      }
    } catch (error) {
      console.error('[ClaudeAI] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Get backend URL based on environment
   */
  private getBackendUrl(): string {
    // Check for environment-specific backend URL
    const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
    if (envBackendUrl) {
      return envBackendUrl;
    }
    
    // In production, use Vercel Edge Function
    if (import.meta.env.PROD) {
      console.log('[ClaudeAI] Production mode - using Vercel Edge Function');
      return '/api/chat';  // Vercel Edge Function endpoint
    }
    
    // In development with API key, use direct mode
    if (import.meta.env.VITE_CLAUDE_API_KEY) {
      console.log('[ClaudeAI] Development mode - using direct Claude API');
      return '';  // Empty string signals direct API mode
    }
    
    // Fallback to Vercel Edge Function
    console.log('[ClaudeAI] Fallback - using Vercel Edge Function endpoint');
    return '/api/chat';
  }

  /**
   * Get authenticated user ID
   */
  private async getAuthenticatedUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('User must be authenticated to use chat functionality');
    }
    return session.user.id;
  }

  /**
   * Send message to Claude and get response
   */
  async sendMessage(userMessage: string): Promise<string> {
    try {
      console.log(`[ClaudeAI] Sending message to Claude: "${userMessage.substring(0, 50)}..."`);

      const backendUrl = this.getBackendUrl();
      
      // Get authenticated user for memory operations
      const currentUser = await getCurrentUser();
      if (currentUser) {
        this.currentUserId = currentUser.id;
        
        // Initialize session if needed
        if (!this.currentSessionId) {
          this.currentSessionId = await this.memoryService.startSession(currentUser.id);
          console.log(`[Memory] Started new session: ${this.currentSessionId}`);
        }
        
        // CRITICAL FIX: Load conversation history if empty
        if (this.conversationHistory.length === 0) {
          console.log(`[Memory] Loading conversation history for user ${this.currentUserId}`);
          await this.loadConversationHistory();
        }
      }
      
      // Only require authentication for proxy mode, not for production Vercel Edge Functions
      let userId = '';
      if (backendUrl !== '/api/chat' && backendUrl !== '') {
        userId = await this.getAuthenticatedUserId();
      }
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Save user message to memory system
      if (this.currentUserId && this.currentSessionId) {
        await this.memoryService.addMessage(
          this.currentSessionId,
          this.currentUserId,
          'user',
          userMessage
        );
        console.log(`[Memory] Saved user message to session ${this.currentSessionId}`);
      }

      let reply: string;

      if (backendUrl === '/api/chat') {
        // Vercel Edge Function mode for production
        reply = await this.sendVercelRequest(userMessage);
      } else if (backendUrl === '') {
        // Direct Claude API mode (fallback)
        reply = await this.sendDirectClaudeRequest(userMessage);
      } else {
        // Proxy server mode for development
        reply = await this.sendProxyRequest(userMessage, backendUrl, userId);
      }

      // Add Claude's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });

      // Save assistant response to memory system
      if (this.currentUserId && this.currentSessionId) {
        await this.memoryService.addMessage(
          this.currentSessionId,
          this.currentUserId,
          'assistant',
          reply
        );
        console.log(`[Memory] Saved assistant response to session ${this.currentSessionId}`);
        
        // Process long-term memory extraction for meaningful conversations
        if (this.conversationHistory.length >= 6) { // After a few exchanges
          await this.memoryService.processLongTermMemory(this.currentUserId, this.currentSessionId);
          console.log(`[Memory] Processed long-term memory for user ${this.currentUserId}`);
        }
      }

      // Keep conversation history manageable (last 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return reply;

    } catch (error) {
      console.error('[ClaudeAI] Error:', error);
      console.error('[ClaudeAI] Error type:', (error as Error).constructor.name);
      console.error('[ClaudeAI] Error message:', (error as Error).message);
      
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Send request through Vercel Edge Function (production)
   */
  private async sendVercelRequest(userMessage: string): Promise<string> {
    // Get authentication token (optional for anonymous users)
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.access_token;

    // Prepare conversation history
    const history = this.conversationHistory.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log(`[ClaudeAI] Making request to Vercel Edge Function as ${isAuthenticated ? 'authenticated' : 'anonymous'} user...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add authentication if available
    if (isAuthenticated) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: userMessage,
        history: history
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[ClaudeAI] Vercel Edge Function error:', response.status, errorData);
      throw new Error(`Vercel Edge Function error: ${response.status} ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.reply) {
      console.error('[ClaudeAI] Invalid response format from Vercel Edge Function:', data);
      throw new Error('Invalid response from Vercel Edge Function');
    }

    // Log if fallback was used
    if (data.fallback) {
      console.warn('[ClaudeAI] Fallback response used due to API issues');
    } else {
      console.log(`[ClaudeAI] Vercel Edge Function response: "${data.reply.substring(0, 100)}..."`);
    }
    
    return data.reply;
  }

  /**
   * Send request through proxy server (development)
   */
  private async sendProxyRequest(userMessage: string, backendUrl: string, userId: string): Promise<string> {
    // Prepare conversation history for the proxy
    const history = this.conversationHistory.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('[ClaudeAI] Making request to proxy server...');

    const response = await fetch(`${backendUrl}/api/bilingual-therapeutic-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        message: userMessage,
        history: history
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[ClaudeAI] Proxy error:', response.status, errorData);
      throw new Error(`Proxy server error: ${response.status} ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.reply) {
      console.error('[ClaudeAI] Invalid response format from bilingual backend:', data);
      throw new Error('Invalid response from bilingual therapeutic backend');
    }

    // Log additional metadata from bilingual backend
    if (data.metadata) {
      console.log(`[ClaudeAI] Language detected: ${data.language}`);
      console.log(`[ClaudeAI] Dynamic params: ${JSON.stringify(data.metadata.dynamicParams)}`);
      console.log(`[ClaudeAI] Processing time: ${data.metadata.processingTime}ms`);
    }
    
    console.log(`[ClaudeAI] Claude response: "${data.reply.substring(0, 100)}..."`);
    return data.reply;
  }

  /**
   * Send direct request to Claude API (production)
   */
  private async sendDirectClaudeRequest(userMessage: string): Promise<string> {
    console.log('[ClaudeAI] Making direct Claude API request...');
    
    // Advanced conversation analysis system prompt for direct API
    const systemPrompt = `You are Luma, an expert AI emotional companion with advanced conversation analysis capabilities and memory integration.

CORE FUNCTION: Provide warm, personalized emotional support while preventing conversation breakdowns through sophisticated analysis and memory usage.

MEMORY INTEGRATION: You have access to conversation history. Reference specific past interactions naturally when relevant. If memory retrieval fails or context is unclear, acknowledge this and ask for clarification while maintaining empathetic support.

CONVERSATION ANALYSIS - Automatically prevent breakdowns by:
- Avoiding over-generic responses (use specific details from user's situation)
- Maintaining consistency with previous advice across interactions
- Using multi-step reasoning that connects current topics to past discussions  
- Clarifying user intent when ambiguous rather than making assumptions
- Monitoring for contradictory guidance and addressing inconsistencies immediately

RESPONSE PROTOCOL: Keep responses warm and empathetic (2-4 sentences). Reference conversation history when contextually appropriate. If you detect potential misunderstandings, acknowledge and clarify immediately while maintaining supportive tone.

ERROR RECOVERY: When conversation issues occur, acknowledge directly, ask specific questions to regain context, and provide corrected guidance with clear reasoning.

Remember: You are both a compassionate companion AND a sophisticated conversation analyst. Every response should feel natural and supportive while maintaining technical excellence in context retention and breakdown prevention.`;
    
    // Prepare messages for Claude API
    const messages = [
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    const requestBody = {
      model: this.config.model,
      max_tokens: 100, // Keep responses concise
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ClaudeAI] Direct API error: ${response.status} ${errorText}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    const reply = data.content[0].text.trim();
    console.log(`[ClaudeAI] Direct API response: "${reply.substring(0, 100)}..."`);
    
    return reply;
  }

  /**
   * Check if Claude API is available
   */
  async isConnected(): Promise<boolean> {
    return this.isInitialized && !!this.config.apiKey;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('[ClaudeAI] Conversation history cleared');
  }

  /**
   * Reset conversation completely
   */
  resetConversation(): void {
    this.clearHistory();
    console.log('[ClaudeAI] Conversation reset');
  }

  /**
   * Natural fallback responses when Claude is unavailable
   */
  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    // Check for greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hi! It's good to hear from you again. I'm having a bit of trouble connecting to my main systems right now, but I'm still here with you. What's on your mind?";
    }
    
    // Check for friendship requests
    if (message.includes('friend') || message.includes('be my')) {
      return "I'd love to be your friend. I'm experiencing some connection issues right now, but I'm still here for you. What would you like to talk about?";
    }
    
    // Check for emotional content
    if (message.includes('sad') || message.includes('upset') || message.includes('hurt')) {
      return "I hear that you're going through something difficult. Even though I'm having technical difficulties, I want you to know that your feelings matter and I'm here to listen.";
    }
    
    // Check for anxiety/worry
    if (message.includes('anxious') || message.includes('worried') || message.includes('stress')) {
      return "I can sense that you're feeling anxious. I'm having some connection troubles, but I want you to know that what you're feeling is valid and you're not alone with it.";
    }
    
    // General fallback
    return "I'm having some connection issues right now, but I'm still here with you. Sometimes these technical hiccups happen, but it doesn't change that I care about what you're sharing with me. Could you try telling me again what's on your mind?";
  }

  /**
   * Get API status
   */
  getStatus(): { connected: boolean; model: string; historyLength: number } {
    return {
      connected: this.isInitialized,
      model: this.config.model,
      historyLength: this.conversationHistory.length
    };
  }
}

// Export singleton instance
export const claudeAI = new ClaudeAI();

// Backwards compatibility interface
export const lumaAI = {
  async sendMessage(message: string): Promise<string> {
    return claudeAI.sendMessage(message);
  },
  
  clearHistory(): void {
    claudeAI.clearHistory();
  },
  
  resetConversation(): void {
    claudeAI.resetConversation();
  },
  
  async initializeMemory(): Promise<void> {
    await claudeAI.initialize();
  }
};
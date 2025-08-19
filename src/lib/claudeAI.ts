// Direct Claude 4.0 Integration - No backend dependencies
// Pure frontend Claude API integration

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

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
      model: 'claude-3-haiku-20240307', // Claude Haiku for fast responses
      maxTokens: 1024,
      temperature: 0.7
    };
  }

  /**
   * Initialize Claude AI system
   */
  async initialize(): Promise<boolean> {
    try {
      // Test proxy connection
      console.log('[ClaudeAI] Testing proxy server connection...');
      const response = await fetch('http://localhost:3001/health');
      
      if (response.ok) {
        console.log('[ClaudeAI] Proxy server connection successful');
        this.isInitialized = true;
        return true;
      } else {
        console.error('[ClaudeAI] Proxy server not responding');
        return false;
      }
    } catch (error) {
      console.error('[ClaudeAI] Failed to connect to proxy server:', error);
      return false;
    }
  }

  /**
   * Send message to Claude and get response
   */
  async sendMessage(userMessage: string): Promise<string> {
    try {
      console.log(`[ClaudeAI] Sending message to Claude: "${userMessage.substring(0, 50)}..."`);

      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Claude API not initialized');
        }
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Prepare conversation history for the proxy
      const history = this.conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('[ClaudeAI] Making request to proxy server...');

      const response = await fetch('http://localhost:3001/api/bilingual-therapeutic-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-' + Date.now(), // Generate a temporary user ID
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

      const reply = data.reply;
      
      // Log additional metadata from bilingual backend
      if (data.metadata) {
        console.log(`[ClaudeAI] Language detected: ${data.language}`);
        console.log(`[ClaudeAI] Dynamic params: ${JSON.stringify(data.metadata.dynamicParams)}`);
        console.log(`[ClaudeAI] Processing time: ${data.metadata.processingTime}ms`);
      }
      
      console.log(`[ClaudeAI] Claude response: "${reply.substring(0, 100)}..."`);

      // Add Claude's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });

      // Keep conversation history manageable (last 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return reply;

    } catch (error) {
      console.error('[ClaudeAI] Error:', error);
      console.error('[ClaudeAI] Error type:', (error as Error).constructor.name);
      console.error('[ClaudeAI] Error message:', (error as Error).message);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[ClaudeAI] Network error - likely proxy server not running on localhost:3001');
        console.error('[ClaudeAI] Make sure to run: npm run dev:full');
      }
      
      return this.getFallbackResponse(userMessage);
    }
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
      return "Hi there! I'm having a bit of trouble connecting to my main systems right now, but I'm here with you. What's on your mind?";
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